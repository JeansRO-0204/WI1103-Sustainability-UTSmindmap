#!/usr/bin/env python3
"""Parse knowledge/quiz/quiz2.md VERBATIM into knowledge/quiz/quiz2.raw.json (stem/options/answer text untouched)."""
import json, re
from pathlib import Path
K = Path(__file__).resolve().parent.parent / "knowledge" / "quiz"
text = (K / "quiz2.md").read_text(encoding="utf-8")
out = []
for block in re.split(r"\n---\n", text):
    m = re.search(r"\*\*Question (\d+)\*\*\n(.*)", block, re.S)
    if not m: continue
    n, body = int(m.group(1)), m.group(2)
    stem_lines, opts, ans = [], [], None
    for line in body.splitlines():
        if line.startswith("*   "): opts.append(line[4:].rstrip())
        elif line.startswith("**Correct Answer:**"): ans = line[len("**Correct Answer:**"):].strip()
        elif line.strip() and not opts: stem_lines.append(line.rstrip())
    idx = [i for i, o in enumerate(opts) if o == ans]
    out.append({"id": f"q2-{n:02d}", "source": "quiz2", "n": n, "stem": "\n".join(stem_lines), "options": opts,
                "answerText": ans, "answer": idx, "keyStatus": "given" if idx else "missing"})
(K / "quiz2.raw.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(len(out), "questions;", "no key:", [q["n"] for q in out if not q["answer"]], "| option counts:", sorted({len(q["options"]) for q in out}))
