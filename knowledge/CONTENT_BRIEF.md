# Content brief — authoring a module fragment of the concept graph

You are building study material for a first-year ITB student's **midterm on Saturday 7 Nov 2026** (course WI1103 Introduction to Sustainability Principles). Accuracy and exam usefulness matter more than anything else. Read `PLAN.md` §2 for the full schema.

## Inputs
- `knowledge/corpus.md` — all slide text, slide-by-slide, headed `## [Mx sN] title`. Includes lecturer **speaker notes** (`> Notes:`), often in Indonesian and often richer than the slide — use them (translate to English).
- `knowledge/chunks.jsonl` — same data as JSON lines.
- Slide images (may appear while you work): `app/public/slides/Mx/NNN.jpg` (NNN = zero-padded slide number). Many slides are charts/photos/diagrams with little text. **When a slide's text is thin (< ~15 words) and the image exists, Read the image** to capture what the chart/diagram shows (key numbers, the 9 planetary boundaries, SDG wheel, nexus diagram, etc.). If images aren't there yet, carry on from text and mark such slides in `"needsImageCheck"`.

## Output
Write **one file**: `knowledge/fragments/<ID>.json` (e.g. `M3.json`; if you own two modules write one file per module). Do not touch any other file.

```jsonc
{
  "module": { "id": "M3", "week": 3, "title": "Short human title (≤ 6 words)", "summary": "1–2 sentences: what this week is about" },
  "nodes": [ /* nodes per PLAN.md §2 schema */ ],
  "edges": [ /* cross-links WITHIN this module only (non-tree relations) */ ],
  "crossModuleIdeas": [
    { "from": "m3.ipat", "toModule": "M5", "concept": "Science, Technology & Innovation for SDGs", "type": "related", "reason": "T in IPAT ↔ STI" }
  ],
  "needsImageCheck": [12, 27]
}
```

## Rules
- **Module node**: id `"m3"` (lowercase module id), type `module`, parent `"root"`. Everything else in the module descends from it via `parent`.
- **Ids**: `m3.` + short kebab slug, e.g. `m3.ipat`, `m3.ipat.affluence`. Unique, stable, lowercase.
- **Shape**: follow the lecture's own structure first (e.g. "Part 3.2", "4.3") as `topic` nodes, then concepts/definitions/examples/case studies/data under them. Depth ≤ 4 below the module. Aim **20–40 nodes per module** (M2 may be ~12–18; M1 skip the course-admin/grading slides except one small "course overview" node). Siblings ≤ ~7 per parent — group if more.
- **types**: `topic | concept | definition | framework | example | case-study | data | policy | debate`.
- **summary** ≤ 25 words, standalone, factual — shown on the mindmap card.
- **details**: 80–250 words of markdown, written to be *read the night before an exam*: clear explanation in your own words, the key facts/numbers/years/names from the slides and notes, why it matters, and how it connects to neighbouring ideas. Use bullet lists and **bold** key terms. No fluff. Do not invent facts that are not in the material; if you add widely-known context needed to understand a slide (e.g. what the Montreal Protocol is), keep it brief and standard.
- **sources**: every node cites ≥ 1 real slide `{ "module": "M3", "slides": [..] }`. Topic nodes cite their section's slides.
- **importance**: 3 = central idea / likely exam (frameworks, definitions, principles, named cases the lecturer dwells on); 2 = should know; 1 = supporting detail. Expect ~25% at 3.
- **examTips** (optional, for importance-3 nodes): what a lecturer would likely ask; common confusions; compare/contrast pairs.
- Slides ending in "Discussion" questions: make a `debate` node holding the question(s) and a short model answer outline.
- **crossModuleIdeas**: list 4–10 strong links to concepts you know are in other weeks (course outline: W1 intro/definitions/ethics; W2 tragedy of the commons & planetary boundaries; W3 carrying capacity, Malthus, IPAT, overconsumption, ecological footprint; W4 Global North/South, commons, ecosystem services, regulating commons; W5 SDGs, Indonesia, STI; W6 climate change, Paris Agreement, CBDR, NDC, peatlands, CCUS; W7 SDG interlinkages, spillovers, food-energy-water nexus). The merge pass resolves them to real ids.
- Valid JSON only (no comments, no trailing commas). Validate with `python3 -c "import json;json.load(open('knowledge/fragments/M3.json'))"` before finishing.

Finish by replying with: node count, the importance-3 node labels, and any slides you could not interpret.
