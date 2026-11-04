#!/usr/bin/env python3
"""Validate knowledge/graph.json (or a path given as argv[1]) against PLAN.md section 2."""
import json, sys, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TYPES = {"root","module","topic","concept","definition","framework","example","case-study","data","policy","debate"}
EDGE_TYPES = {"related","causes","example-of","contrasts","applies-to","builds-on"}

def main():
    gp = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT/"knowledge"/"graph.json"
    if not gp.exists():
        print(f"ERROR: {gp} not found"); return 1
    g = json.loads(gp.read_text(encoding="utf-8"))
    slides = set()
    for line in (ROOT/"knowledge"/"chunks.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip():
            c = json.loads(line); slides.add((c["module"], c["slide"]))
    errs, warns = [], []
    nodes, edges = g.get("nodes", []), g.get("edges", [])
    mods = {m["id"] for m in g.get("modules", [])}
    ids = {}
    for n in nodes:
        i = n.get("id")
        if not i: errs.append(f"node without id: {n.get('label')}"); continue
        if i in ids: errs.append(f"duplicate id {i}")
        ids[i] = n
    roots = [i for i, n in ids.items() if not n.get("parent")]
    if len(roots) != 1: errs.append(f"expected exactly 1 root, found {len(roots)}: {roots[:5]}")
    for i, n in ids.items():
        for f in ("label", "type", "summary", "importance"):
            if n.get(f) in (None, ""): errs.append(f"{i}: missing {f}")
        if n.get("type") not in TYPES: errs.append(f"{i}: bad type {n.get('type')!r}")
        if n.get("importance") not in (1, 2, 3): errs.append(f"{i}: bad importance {n.get('importance')!r}")
        p = n.get("parent")
        if p and p not in ids: errs.append(f"{i}: parent {p} does not exist")
        if n.get("module") and mods and n["module"] not in mods: errs.append(f"{i}: unknown module {n['module']}")
        if len(n.get("summary", "").split()) > 30: warns.append(f"{i}: summary > 30 words")
        srcs = n.get("sources", [])
        if n.get("type") != "root" and not srcs: errs.append(f"{i}: no sources")
        for s in srcs:
            for sl in s.get("slides", []):
                if (s.get("module"), sl) not in slides: errs.append(f"{i}: source slide {s.get('module')} s{sl} not in chunks.jsonl")
        if n.get("type") not in ("root", "module") and not n.get("details"): warns.append(f"{i}: no details")
    # cycles
    for i in ids:
        seen, cur = set(), i
        while cur:
            if cur in seen: errs.append(f"cycle through {i}"); break
            seen.add(cur); cur = ids.get(cur, {}).get("parent")
    for e in edges:
        for k in ("source", "target"):
            if e.get(k) not in ids: errs.append(f"edge {e}: {k} does not exist")
        if e.get("type") not in EDGE_TYPES: errs.append(f"edge {e.get('source')}->{e.get('target')}: bad type {e.get('type')!r}")
    cov = collections.defaultdict(set)
    for n in ids.values():
        for s in n.get("sources", []):
            for sl in s.get("slides", []): cov[s["module"]].add(sl)
    print(f"Validated {gp}")
    print(f"  nodes: {len(ids)}   cross edges: {len(edges)}")
    per = collections.Counter(n.get("module") or "-" for n in ids.values())
    for m in sorted(per):
        tot = sum(1 for (mm, _) in slides if mm == m)
        print(f"  {m:>3}: {per[m]:3d} nodes, slide coverage {len(cov[m])}/{tot}")
    imp = collections.Counter(n.get("importance") for n in ids.values())
    print("  importance:", {k: imp[k] for k in sorted(imp, key=str)})
    for w in warns[:30]: print("  warn:", w)
    for e in errs[:80]: print("  ERROR:", e)
    print(f"{len(errs)} error(s), {len(warns)} warning(s)")
    return 1 if errs else 0

if __name__ == "__main__":
    sys.exit(main())
