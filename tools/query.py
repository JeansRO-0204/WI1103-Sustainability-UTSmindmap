#!/usr/bin/env python3
"""GraphRAG-lite: BM25 over graph nodes + slide chunks -> seed nodes -> graph expansion -> cited markdown bundle.

Usage: python3 tools/query.py "question" [-k 6] [--hops 1] [--json] [--graph path]
"""
import argparse, json, math, re, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
K = ROOT / "knowledge"
STOP = set("a an the of and or to in on for is are was were be by with as at from that this it its how what why which who does do not vs than then into about between can should would".split())

def tok(s):
    out = []
    for w in re.findall(r"[a-z0-9]+", s.lower()):
        if w in STOP or len(w) < 2: continue
        out.append(w)
        if len(w) > 4 and w.endswith("s") and not w.endswith("ss"): out.append(w[:-1])
    return out

class BM25:
    def __init__(self, docs, k1=1.4, b=0.75):
        self.k1, self.b = k1, b
        self.tf = [defaultdict(int) for _ in docs]
        self.len = []
        df = defaultdict(int)
        for i, d in enumerate(docs):
            for t in d: self.tf[i][t] += 1
            self.len.append(len(d))
            for t in set(d): df[t] += 1
        self.N = len(docs); self.avg = (sum(self.len) / max(1, self.N)) or 1
        self.idf = {t: math.log(1 + (self.N - c + .5) / (c + .5)) for t, c in df.items()}
    def score(self, q):
        res = []
        for i, tf in enumerate(self.tf):
            s = 0.0
            for t in set(q):
                f = tf.get(t)
                if f: s += self.idf[t] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg))
            if s > 0: res.append((s, i))
        return sorted(res, reverse=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("question"); ap.add_argument("-k", type=int, default=6)
    ap.add_argument("--hops", type=int, default=1); ap.add_argument("--json", action="store_true")
    ap.add_argument("--graph")
    a = ap.parse_args()
    gp = Path(a.graph) if a.graph else (K / "graph.json" if (K / "graph.json").exists() else K / "graph.sample.json")
    g = json.loads(gp.read_text(encoding="utf-8"))
    chunks = [json.loads(l) for l in (K / "chunks.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    cmap = {(c["module"], c["slide"]): c for c in chunks}
    nodes = {n["id"]: n for n in g["nodes"]}
    kids, nbr = defaultdict(list), defaultdict(list)
    for n in nodes.values():
        if n.get("parent") in nodes:
            kids[n["parent"]].append(n["id"]); nbr[n["id"]].append((n["parent"], "parent")); nbr[n["parent"]].append((n["id"], "child"))
    for e in g.get("edges", []):
        nbr[e["source"]].append((e["target"], e["type"])); nbr[e["target"]].append((e["source"], e["type"]))
    slide2nodes = defaultdict(list)
    for n in nodes.values():
        for s in n.get("sources", []):
            for sl in s["slides"]: slide2nodes[(s["module"], sl)].append(n["id"])
    q = tok(a.question)
    nl = list(nodes.values())
    nb = BM25([tok(" ".join([n["label"]] * 3 + [n.get("summary", "")] * 2 + [n.get("details", "")] + n.get("keyTerms", []) * 2)) for n in nl])
    cb = BM25([tok(c["title"] + " " + c["text"] + " " + c.get("notes", "")) for c in chunks])
    nscore = defaultdict(float)
    nhits = nb.score(q)[: a.k * 2]
    top = nhits[0][0] if nhits else 1
    for s, i in nhits: nscore[nl[i]["id"]] += s / top
    chits = cb.score(q)[: a.k * 2]
    ctop = chits[0][0] if chits else 1
    for s, i in chits:
        c = chunks[i]
        for nid in slide2nodes.get((c["module"], c["slide"]), []): nscore[nid] += 0.6 * s / ctop
    seeds = [nid for nid, _ in sorted(nscore.items(), key=lambda x: -x[1])[: a.k]]
    selected, frontier = {s: 0 for s in seeds}, list(seeds)
    for h in range(a.hops):
        nxt = []
        for nid in frontier:
            for m, _ in nbr[nid]:
                if m not in selected and nodes[m]["type"] not in ("root",):
                    selected[m] = h + 1; nxt.append(m)
        frontier = nxt
    order = sorted(selected, key=lambda i: (selected[i], -nscore.get(i, 0)))
    slides_used = []
    for nid in order:
        for s in nodes[nid].get("sources", []):
            for sl in s["slides"]:
                key = (s["module"], sl)
                if key not in slides_used and key in cmap: slides_used.append(key)
    hit_slides = [(chunks[i]["module"], chunks[i]["slide"]) for _, i in chits[: a.k]]
    for k in hit_slides:
        if k in slides_used: slides_used.remove(k)
    slides_final = hit_slides + slides_used[: max(0, 12 - len(hit_slides))]
    def path(nid):
        p, cur = [], nodes[nid]
        while cur: p.append(cur["label"]); cur = nodes.get(cur.get("parent"))
        return " > ".join(reversed(p))
    if a.json:
        print(json.dumps({"question": a.question, "seeds": seeds,
            "nodes": [dict(nodes[i], hop=selected[i], score=round(nscore.get(i, 0), 3), path=path(i)) for i in order],
            "slides": [{"ref": f"[{m} s{s}]", "title": cmap[(m, s)]["title"], "text": cmap[(m, s)]["text"], "notes": cmap[(m, s)].get("notes", "")} for m, s in slides_final if (m, s) in cmap]},
            indent=2, ensure_ascii=False)); return
    out = [f"# Context for: {a.question}", f"_graph: {gp.name}; seeds: {', '.join(seeds) or 'none'}; hops: {a.hops}_", ""]
    out.append("## Concepts")
    for nid in order:
        n = nodes[nid]
        cites = " ".join(f"[{s['module']} s{sl}]" for s in n.get("sources", []) for sl in s["slides"][:6])
        tag = "match" if nid in seeds else f"related (hop {selected[nid]})"
        out += [f"### {n['label']}  `{nid}` · {n['type']} · importance {n.get('importance')} · {tag}",
                f"Path: {path(nid)}", f"**Summary:** {n.get('summary','')}", ""]
        if n.get("details"): out += [n["details"], ""]
        if n.get("examTips"): out += [f"**Exam tip:** {n['examTips']}", ""]
        rel = [f"{t}: {nodes[m]['label']} (`{m}`)" for m, t in nbr[nid] if t not in ("parent", "child")]
        if rel: out += ["Links: " + "; ".join(rel), ""]
        out += [f"Sources: {cites}", ""]
    out.append("## Slide text")
    for m, s in slides_final:
        c = cmap.get((m, s))
        if not c: continue
        txt = c["text"].strip().replace("\n", "\n> ")
        out += [f"**[{m} s{s}] {c['title']}**", f"> {txt}"]
        if c.get("notes"): out.append(f"> _Notes:_ {c['notes'].strip()[:700]}")
        out.append("")
    print("\n".join(out))

if __name__ == "__main__":
    main()
