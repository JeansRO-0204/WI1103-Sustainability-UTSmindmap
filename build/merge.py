#!/usr/bin/env python3
"""Merge knowledge/fragments/M*.json + knowledge/crosslinks.json -> knowledge/graph.json,
back-fill chunk.nodeIds in chunks.jsonl, and write knowledge/INDEX.md."""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
K = ROOT / "knowledge"

COLORS = {"M1": "#6366f1", "M2": "#0ea5e9", "M3": "#f59e0b", "M4": "#10b981",
          "M5": "#e11d48", "M6": "#8b5cf6", "M7": "#14b8a6", "core": "#475569"}


def main():
    extracted = {m["id"]: m for m in json.loads((K / "modules.extracted.json").read_text())}
    chunks = [json.loads(l) for l in (K / "chunks.jsonl").read_text().splitlines() if l.strip()]

    nodes, edges, modules = [], [], []
    nodes.append({
        "id": "root", "label": "WI1103 — Sustainability Principles", "type": "root", "module": "core",
        "parent": None, "importance": 3,
        "summary": "Weeks 1–7 midterm material: from the commons and planetary limits to SDGs, climate change and the nexus.",
        "details": "", "keyTerms": [], "sources": [],
    })
    for f in sorted((K / "fragments").glob("M*.json")):
        frag = json.loads(f.read_text())
        m = frag["module"]
        mid = m["id"]
        modules.append({**m, "file": extracted[mid]["file"], "slideCount": extracted[mid]["slideCount"],
                        "pdf": f"pdf/{mid}.pdf", "color": COLORS[mid]})
        for n in frag["nodes"]:
            n.setdefault("module", mid)
            n.setdefault("keyTerms", [])
            n.setdefault("sources", [])
            n.setdefault("details", "")
            if n["type"] == "module":
                n["parent"] = "root"
            nodes.append(n)
        edges.extend(frag.get("edges", []))

    cl = K / "crosslinks.json"
    if cl.exists():
        extra = json.loads(cl.read_text())
        nodes.extend(extra.get("nodes", []))   # core.* hub nodes
        edges.extend(extra.get("edges", []))

    # theme hubs cite their members' primary slides; core module entry for the app/validator
    byid = {n["id"]: n for n in nodes}
    if cl.exists():
        for hid, members in extra.get("_themeMembers", {}).items():
            srcs = {}
            for m in members:
                if m in byid and byid[m]["sources"]:
                    s0 = byid[m]["sources"][0]
                    srcs.setdefault(s0["module"], []).append(s0["slides"][0])
            byid[hid]["sources"] = [{"module": k, "slides": sorted(set(v))} for k, v in sorted(srcs.items())]
            byid[hid]["details"] += "\n\n**Concepts in this theme:**\n" + "\n".join(
                f"- {byid[m]['label']} ({byid[m]['module']})" for m in members if m in byid)
        byid["core.themes"]["sources"] = [s for h in extra["_themeMembers"] for s in byid[h]["sources"]][:1]
    byid["root"]["sources"] = [{"module": "M1", "slides": [2]}]
    modules.append({"id": "core", "week": 0, "title": "Cross-cutting themes", "summary": "Themes linking several weeks.",
                    "file": "", "slideCount": 0, "pdf": "", "color": COLORS["core"]})

    ids = {n["id"] for n in nodes}
    seen, dedup = set(), []
    for e in edges:
        key = tuple(sorted((e["source"], e["target"])))
        if e["source"] in ids and e["target"] in ids and key not in seen and e["source"] != e["target"]:
            seen.add(key)
            dedup.append(e)
        elif e["source"] not in ids or e["target"] not in ids:
            print(f"WARN dropping edge with unknown endpoint: {e['source']} -> {e['target']}")

    graph = {"meta": {"course": "WI1103", "generated": str(date.today())},
             "modules": sorted(modules, key=lambda m: (m["id"] == "core", m["id"])), "nodes": nodes, "edges": dedup}
    (K / "graph.json").write_text(json.dumps(graph, ensure_ascii=False, indent=1))

    # back-fill chunk -> nodes
    by_slide = {}
    for n in nodes:
        for s in n["sources"]:
            for sl in s["slides"]:
                by_slide.setdefault(f"{s['module']}-s{sl}", []).append(n["id"])
    with open(K / "chunks.jsonl", "w") as fh:
        for c in chunks:
            c["nodeIds"] = by_slide.get(c["id"], [])
            fh.write(json.dumps(c, ensure_ascii=False) + "\n")

    # INDEX.md: compact outline
    kids = {}
    for n in nodes:
        kids.setdefault(n.get("parent"), []).append(n)
    lines = ["# Concept index (id — label — summary)", "",
             "Use with tools/query.py or grep; full details in graph.json.", ""]

    def walk(pid, depth):
        for n in kids.get(pid, []):
            star = "★" * n.get("importance", 1)
            src = "; ".join(f"{s['module']} s{','.join(map(str, s['slides']))}" for s in n["sources"])
            lines.append(f"{'  ' * depth}- `{n['id']}` **{n['label']}** {star} — {n.get('summary', '')} [{src}]")
            walk(n["id"], depth + 1)
    walk(None, 0)
    lines += ["", "## Cross-links", ""]
    lines += [f"- `{e['source']}` —{e.get('type', 'related')}→ `{e['target']}`: {e.get('label', '')}" for e in dedup]
    (K / "INDEX.md").write_text("\n".join(lines) + "\n")

    orphans = [c["id"] for c in chunks if not by_slide.get(c["id"])]
    print(f"graph.json: {len(nodes)} nodes, {len(dedup)} cross-links, {len(modules)} modules")
    print(f"slides not cited by any node: {len(orphans)}")


if __name__ == "__main__":
    main()
