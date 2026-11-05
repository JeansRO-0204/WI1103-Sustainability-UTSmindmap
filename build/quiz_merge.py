#!/usr/bin/env python3
"""Merge quiz2.raw.json + quiz2.tags.json + generated.M*.json -> knowledge/quiz/quiz.json (see knowledge/quiz/SPEC.md).

Usage: python3 build/quiz_merge.py [--strict] [--sample]
  --strict  treat warnings (untagged quiz2 questions, missing files, missing explanations) as errors
  --sample  validate knowledge/quiz/quiz.sample.json only (nothing written)

Exit code 0 = merged and valid, 1 = validation errors (quiz.json NOT written).
Missing tags/generated files only warn, so the merge works incrementally while other agents are still writing.
"""
import argparse, datetime, glob, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
K = ROOT / "knowledge" / "quiz"
MODULES = {f"M{i}" for i in range(1, 8)}
KEY_STATUS = {"given", "inferred", "disputed"}
COPY_FROM_TAG = ["module", "topic", "nodeIds", "explanation", "sources", "keyStatus", "dupOf", "note"]

errors, warnings = [], []
def err(msg): errors.append(msg)
def warn(msg): warnings.append(msg)

def load(path, what, required=False):
    if not path.exists():
        (err if required else warn)(f"{what}: {path.relative_to(ROOT)} not found")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(f"{what}: {path.relative_to(ROOT)} is not valid JSON ({e})")
        return None

def tags_by_id(obj):
    """Accept {id: tag}, {"tags"|"questions": {id: tag} | [tag...]}, or [tag...]."""
    if obj is None: return {}
    if isinstance(obj, dict):
        for k in ("tags", "questions"):
            if k in obj and isinstance(obj[k], (dict, list)): return tags_by_id(obj[k])
        return {k: v for k, v in obj.items() if isinstance(v, dict) and not k.startswith("_")}
    if isinstance(obj, list):
        return {t["id"]: t for t in obj if isinstance(t, dict) and "id" in t}
    return {}

def topics_of(obj):
    if obj is None: return None
    if isinstance(obj, dict) and isinstance(obj.get("topics"), (dict, list)): obj = obj["topics"]
    if isinstance(obj, list): return {(t["label"] if isinstance(t, dict) else t) for t in obj}
    return set(obj.keys())

def as_index(a):
    if isinstance(a, list):
        return a[0] if len(a) == 1 else None
    return a

def words(s): return len(re.findall(r"\S+", s))

def check_common(item, where, nodes, topics, is_card=False):
    mod = item.get("module")
    if mod not in MODULES: err(f"{where}: module {mod!r} is not one of M1..M7")
    top = item.get("topic")
    if not top or not isinstance(top, str): err(f"{where}: missing topic")
    elif topics is not None and top not in topics: err(f"{where}: topic {top!r} is not in topics.json")
    srcs = item.get("sources")
    if not srcs: warn(f"{where}: no sources")
    else:
        for s in srcs:
            if not isinstance(s, dict) or s.get("module") not in MODULES or not isinstance(s.get("slides"), list) or not s["slides"] or not all(isinstance(x, int) for x in s["slides"]):
                err(f"{where}: malformed source {s!r} (want {{module, slides:[int]}})")
    ids = [item.get("nodeId")] if is_card else item.get("nodeIds")
    if not ids or not isinstance(ids, list) or ids == [None]:
        err(f"{where}: missing nodeId{'' if is_card else 's'}"); return
    for n in ids:
        if n not in nodes: err(f"{where}: nodeId {n!r} does not exist in graph.json")
    if not is_card and len(ids) > 3: warn(f"{where}: {len(ids)} nodeIds (spec says 1-3)")

def check_question(q, where, nodes, topics):
    opts = q.get("options")
    if not isinstance(q.get("stem"), str) or not q["stem"].strip(): err(f"{where}: empty stem")
    if not isinstance(opts, list) or not (2 <= len(opts) <= 6) or not all(isinstance(o, str) and o.strip() for o in opts):
        err(f"{where}: options must be 2-6 non-empty strings"); return
    if len(set(opts)) != len(opts): err(f"{where}: duplicate options")
    ans = q.get("answer")
    if not isinstance(ans, list) or not ans or not all(isinstance(a, int) and 0 <= a < len(opts) for a in ans):
        err(f"{where}: invalid answer {ans!r} for {len(opts)} options"); return
    if q.get("answerText") != opts[ans[0]]: err(f"{where}: answerText {q.get('answerText')!r} != options[{ans[0]}] {opts[ans[0]]!r}")
    if q.get("keyStatus") not in KEY_STATUS: err(f"{where}: keyStatus {q.get('keyStatus')!r} not in {sorted(KEY_STATUS)}")
    if not q.get("explanation"): warn(f"{where}: no explanation")
    if q.get("keyStatus") == "disputed" and not q.get("note"): warn(f"{where}: disputed without a note")
    check_common(q, where, nodes, topics)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--sample", action="store_true")
    args = ap.parse_args()

    graph = load(ROOT / "knowledge" / "graph.json", "graph", required=True)
    nodes = {n["id"] for n in graph["nodes"]} if graph else set()
    topics = topics_of(load(K / "topics.json", "topics"))

    questions, cards = [], []
    n_quiz2 = 0
    if args.sample:
        s = load(K / "quiz.sample.json", "sample", required=True) or {}
        questions, cards = s.get("questions", []), s.get("flashcards", [])
        for i, q in enumerate(questions): check_question(q, f"sample {q.get('id', i)}", nodes, topics)
    else:
        raw = load(K / "quiz2.raw.json", "quiz2 raw", required=True) or []
        tags = tags_by_id(load(K / "quiz2.tags.json", "quiz2 tags"))
        raw_ids = {r["id"] for r in raw}
        untagged = []
        for tid in tags:
            if tid not in raw_ids: err(f"quiz2.tags.json: unknown question id {tid!r}")
        for r in raw:
            where = r["id"]
            t = tags.get(where)
            if t is None:
                untagged.append(where)
                continue
            for field in ("stem", "options", "answerText"):
                if field == "answerText" and t.get("keyStatus") == "inferred": continue  # raw has no real key; inferred answer is set below
                if field in t and t[field] != r[field]: err(f"{where}: tag overrides {field}; quiz2 text must stay verbatim")
            q = dict(r)
            for f in COPY_FROM_TAG:
                if f in t: q[f] = t[f]
            if q["keyStatus"] == "inferred":
                idx = as_index(t.get("answer"))
                if not isinstance(idx, int) or not 0 <= idx < len(q["options"]):
                    err(f"{where}: keyStatus 'inferred' needs a valid single `answer` index in the tag"); continue
                q["answer"] = [idx]; q["answerText"] = q["options"][idx]
            elif q["keyStatus"] == "missing":
                err(f"{where}: quiz has no key; tag must set keyStatus 'inferred' with an `answer` index"); continue
            elif "answer" in t and as_index(t["answer"]) != (q["answer"][0] if q["answer"] else None) and q["keyStatus"] != "disputed":
                err(f"{where}: tag answer {t['answer']!r} differs from the quiz key {q['answer']!r}; set keyStatus 'disputed' with a note")
            check_question(q, where, nodes, topics)
            questions.append(q)
            n_quiz2 += 1
        questions.sort(key=lambda q: q["n"])
        if untagged: warn(f"{len(untagged)} quiz2 question(s) have no entry in quiz2.tags.json and were skipped: {', '.join(untagged)}")

        files = sorted(glob.glob(str(K / "generated.*.json")), key=lambda p: Path(p).name)
        if not files: warn("no generated.*.json files yet")
        for fp in files:
            fp = Path(fp); fm = re.match(r"generated\.(M\d)\.json$", fp.name)
            def remap(o):  # cross-week "core" items count toward the week of their first source
                if o.get("module") == "core" and o.get("sources"): o["module"] = o["sources"][0]["module"]
                return o
            g = load(fp, fp.name) or {}
            if not isinstance(g, dict): err(f"{fp.name}: top level must be {{questions:[], flashcards:[]}}"); continue
            for i, q in enumerate(g.get("questions", [])):
                where = f"{fp.name} questions[{i}] {q.get('id', '?')}"
                q = remap(dict(q)); q.setdefault("source", "generated")
                if q["source"] != "generated": err(f"{where}: source must be 'generated'")
                if not str(q.get("id", "")).startswith("g-"): err(f"{where}: id must look like g-m6-04")
                if fm and q.get("module") != fm.group(1): warn(f"{where}: module {q.get('module')!r} differs from file {fm.group(1)}")
                if "answerText" not in q and isinstance(q.get("answer"), list) and q["answer"] and isinstance(q.get("options"), list) and all(isinstance(a, int) and 0 <= a < len(q["options"]) for a in q["answer"]):
                    q["answerText"] = q["options"][q["answer"][0]]
                q.setdefault("keyStatus", "given")
                check_question(q, where, nodes, topics)
                questions.append(q)
            for i, c in enumerate(g.get("flashcards", [])):
                c = remap(dict(c)); g["flashcards"][i] = c
                where = f"{fp.name} flashcards[{i}] {c.get('id', '?')}"
                if not str(c.get("id", "")).startswith("fc-"): err(f"{where}: id must start with 'fc-'")
                for f in ("front", "back"):
                    if not isinstance(c.get(f), str) or not c[f].strip(): err(f"{where}: empty {f}")
                if isinstance(c.get("back"), str) and words(c["back"]) > 90: warn(f"{where}: back is {words(c['back'])} words (spec: <= 70)")
                check_common(c, where, nodes, topics, is_card=True)
                cards.append(c)

    # global checks
    seen = set()
    for item in questions + cards:
        i = item.get("id")
        if i in seen: err(f"duplicate id {i!r}")
        seen.add(i)
    qids = {q["id"] for q in questions}
    for q in questions:
        d = q.get("dupOf")
        if not d: continue
        if d == q["id"]: err(f"{q['id']}: dupOf points to itself")
        elif d not in qids and not (not args.sample and d.startswith("q2-")): err(f"{q['id']}: dupOf {d!r} does not exist")

    if args.strict and warnings:
        for w in warnings: err(f"(strict) {w}")
        warnings.clear()
    for w in warnings: print("WARN ", w, file=sys.stderr)
    if errors:
        for e in errors: print("ERROR", e, file=sys.stderr)
        print(f"\nquiz_merge: {len(errors)} error(s), {len(warnings)} warning(s); quiz.json NOT written", file=sys.stderr)
        return 1
    if not questions and not cards and not args.sample:
        print("quiz_merge: nothing to merge yet (no tagged quiz2 questions, no generated files); quiz.json NOT written", file=sys.stderr)
        return 1
    out = {"meta": {"generated": datetime.date.today().isoformat(), "quiz2Count": n_quiz2,
                    "generatedCount": len([q for q in questions if q.get("source") == "generated"]), "flashcardCount": len(cards)},
           "questions": questions, "flashcards": cards}
    if args.sample:
        print(f"sample OK: {len(questions)} questions, {len(cards)} flashcards, {len(warnings)} warning(s)")
        return 0
    (K / "quiz.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    by_mod = {}
    for q in questions: by_mod[q["module"]] = by_mod.get(q["module"], 0) + 1
    print(f"wrote knowledge/quiz/quiz.json: {len(questions)} questions ({n_quiz2} quiz2 + {len(questions) - n_quiz2} generated), {len(cards)} flashcards; per module {dict(sorted(by_mod.items()))}; {len(warnings)} warning(s)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
