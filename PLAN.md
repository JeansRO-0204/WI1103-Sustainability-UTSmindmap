# WI1103 Sustainability — Interactive Mindmap + Graph Knowledge Base (UTS, Sat 7 Nov 2026)

## 0. What we have (audited)

| Module | File | Slides | Words | Topic |
|---|---|---|---|---|
| M1 | `ppt/*_M1-Intro-Definition-Ethics_W1.pdf` | 31 pages | 2.2k | Intro, definitions of sustainability, environmental ethics (+ course admin) |
| M2 | `*_M2-Tragedy-of-The-Commons…pptx` | 14 | 0.8k | Tragedy of the commons, customary forest example, **planetary boundaries** |
| M3 | `*_M3-MKWI-Sustainability…pptx` | 43 | 2.2k | Carrying capacity, Malthus/Neo-Malthus, Kerala case, **IPAT** (P·A·T), dual role of technology, over/hyper-consumption, **ecological footprint** |
| M4 | `*_M4-…pptx` | 35 | 1.5k | Global North vs South, commons in Global South, **ecosystem services** + valuation/PES, regulating commons (ozone/Montreal, Subak, Dieselgate, Jakarta/Bandung emissions), non-physical commons |
| M5 | `*_M5-…pptx` | 32 | 1.3k | SDGs (targets/indicators), Indonesia (TPB, VNR, 2025 report), ITB, SDG 14/15, IBSAP 2025-2045, NbS, **STI / TFM**, reality check 2023/2026 |
| M6 | `*_M6-…SDGs-Perubahan-Iklim…pptx` | 43 | 1.9k | Climate change & GHGs, SDG13 ↔ other SDGs, **Paris Agreement** (CBDR-RC, transparency/GST, sovereignty), Indonesia NDC2 2025, Kiribati/Semarang/Muara Gembong, urban heat & sustainable cooling, carbon sequestration, **peatlands**, CCUS, AFOLU |
| M7 | `*_M7-…Interlinkages-Nexus…pptx` | 31 | 1.7k | SDG rankings, spillover effects, **SDG interlinkages** (synergy/trade-off), recycling, technology & SDGs, North vs South synergies, **Food-Energy-Water nexus** (drivers, interventions, strategy, challenges) |

Total ≈ 230 slides / **11.6k words (~16k tokens)**. Many slides are chart/photo-heavy (≈325 embedded images) → slide images are essential; text alone loses meaning.

Key consequence: **the whole corpus fits in one LLM context.** A classic GraphRAG stack (vector DB, embeddings, community summaries) is overkill. We build a *structured* graph + lexical index instead — faster, deterministic, zero infra, and equally good at this size.

---

## 1. Architecture

```
ppt/                      (originals, untouched)
build/                    (pipeline scripts — Python stdlib + node)
  extract.py              pptx/pdf → slide text chunks (+ notes) → knowledge/chunks.jsonl
  render.sh               pptx → pdf (LibreOffice headless) → pdftoppm → public/slides/Mx/NNN.webp (+ thumbs)
  validate.py             schema + referential-integrity checks on graph.json
knowledge/                (THE source of truth — used by both the app and AI)
  chunks.jsonl            1 line per slide: {id:"M3-s21", module, slide, title, text, image, nodeIds[]}
  graph.json              concept graph (schema §2)
  corpus.md               all modules, slide-by-slide, human/LLM readable (cat-able into any chat)
  INDEX.md                compact outline: every node id + label + 1-line summary (≈3k tokens)
tools/query.py            GraphRAG-lite CLI: BM25 over chunks+nodes → seed nodes → 1-hop graph expansion → markdown context bundle
CLAUDE.md                 tells future Claude sessions how to answer questions from knowledge/
app/                      Vite + React + TS
  public/slides/…         rendered slide images
  src/…                   mindmap UI (§3)
```

### Why this "GraphRAG-lite" is right here
- **Building**: content agents write `graph.json`; `validate.py` guarantees every node cites real slides and every edge points to real nodes.
- **AI querying**: `tools/query.py "why does CBDR matter for the Global South?"` → returns matching nodes + their neighbors + the exact slide text, with `[M6 s16]` citations. For big questions, just feed `corpus.md` whole (16k tokens).
- **In-app**: every node has **"Copy AI context"** → copies node + neighbors + source slide text as markdown, ready to paste into Claude.
- No embeddings, no server, no API key needed. (Optional later: an in-app "Ask" box calling the Claude API with the same bundle.)

---

## 2. Graph schema (`knowledge/graph.json`) — the contract between content & app tracks

```jsonc
{
  "meta": { "course": "WI1103", "generated": "2026-11-04" },
  "modules": [
    { "id": "M3", "week": 3, "title": "Earth, Overpopulation vs Overconsumption",
      "file": "ppt/…M3….pptx", "slideCount": 43, "color": "#…" }
  ],
  "nodes": [
    {
      "id": "m3.ipat",                 // lowercase, dot-namespaced by module; "core.*" for cross-module hubs
      "label": "IPAT equation",
      "type": "topic",                 // root | module | topic | concept | definition | framework | example | case-study | data | policy | debate
      "module": "M3",
      "parent": "m3.part2",            // tree spine (exactly one parent, except root)
      "summary": "I = P × A × T — environmental impact as product of population, affluence, technology.",   // ≤ 25 words, shown on the card
      "details": "markdown…",          // exam-ready explanation, 80–250 words, own words + key numbers from slides
      "keyTerms": ["affluence", "technology factor"],
      "examTips": "Be able to explain why T can increase OR decrease I (dual role).",  // optional
      "importance": 3,                 // 1 = detail, 2 = should know, 3 = likely exam
      "sources": [ { "module": "M3", "slides": [20, 21, 22] } ]
    }
  ],
  "edges": [
    // tree edges are implied by `parent`; list ONLY cross-links here
    { "source": "m3.ipat", "target": "m5.sti", "type": "related", "label": "technology factor ↔ STI for SDGs" }
    // types: related | causes | example-of | contrasts | applies-to | builds-on
  ]
}
```

Target size: ~150–220 nodes, depth ≤ 4 (root → module → part/topic → concept → example), ~40–70 cross-links.
Must-have cross-links (seed list, content agents add more):
- M2 tragedy of commons ↔ M4 commons in Global South ↔ M4 ozone/Montreal, Subak (solutions to the tragedy)
- M2 planetary boundaries ↔ M6 climate change / GHGs; ↔ M3 carrying capacity / ecological footprint
- M3 IPAT ‘T’ / dual role of technology ↔ M5 STI ↔ M7 technology & SDG relationships
- M3 overconsumption ↔ M3 ecological footprint ↔ M4 Global North vs South
- M4 Global North/South ↔ M6 CBDR-RC ↔ M7 North vs South synergies & spillovers
- M4 ecosystem services ↔ M5 SDG 14/15, IBSAP, NbS ↔ M6 peatlands / AFOLU
- M5 SDGs ↔ M6 SDG13 links ↔ M7 interlinkages & nexus
- M1 definitions/ethics ↔ M5 “definition and positioning of sustainable development”

---

## 3. App spec (what "done" looks like)

**Stack**: Vite + React + TypeScript + `@xyflow/react` (React Flow — DOM-rendered nodes, so text is real, selectable, copyable) + `d3-hierarchy` for radial/tree layout + `minisearch` for search + `react-markdown`. Runs via `npm run dev` and builds to static `app/dist`.

**Layout (3 panes)**
1. **Left sidecar — Materials** (collapsible): module list (week, color) → per module: open original file, slide thumbnail strip, list of that module's topics. Click a topic → canvas flies to it. Global search box at top (searches nodes + slide text; results show node hits and slide hits).
2. **Center — Mindmap canvas**: free-form infinite canvas; smooth wheel/trackpad zoom, drag-to-pan on background, `fitView` with animated transitions, minimap, zoom controls. Starts showing root + 7 modules + their top-level parts. 
   - Click node → expand/collapse children (animated), and select it.
   - Nodes show label + summary + importance dot + small "slides" badge. Color by module. Cross-links drawn as dashed curved edges (toggleable "Show connections").
   - Nodes are draggable by a handle/border only; **text inside nodes is selectable** (`nodrag` + `user-select: text`), so highlight + ⌘C works directly on the canvas.
   - Layout: radial for overview, switchable to left-to-right tree. Positions persist in localStorage after manual drags; "Reset layout" button.
   - Keyboard: `/` focus search, `Esc` close panel, arrow keys move between siblings/parent/child, `Space` toggle expand, `E` expand all in branch, `F` fit view.
3. **Right — Detail panel** (opens on select): label, breadcrumb path (clickable), summary, full `details` markdown, key terms, exam tip, **source slides as clickable thumbnails → lightbox** (full-size slide image, ←/→ through deck, slide text below it, "open original" link), connected concepts (clickable chips), buttons: **Copy text**, **Copy AI context**, **Copy as markdown outline (branch)**.

**Study extras (cheap, high value)**: filter "importance ≥ 3 only" (exam-cram mode); "Highlight path" when searching; mark node as ✓ reviewed (localStorage) with progress per module.

**Non-goals**: no auth, no backend, no editing of content in-app, no mobile polish.

---

## 4. Work breakdown & agent roles

| # | Work | Owner | Depends on |
|---|---|---|---|
| A | `build/extract.py` → `chunks.jsonl`, `corpus.md` | Sonnet (app track) | — |
| B | `build/render.sh` → slide images (needs LibreOffice) | Sonnet (app track) | LibreOffice installed |
| C | **Content: author `graph.json`** per module from `corpus.md` + slide images | **Opus content agents** (M1–M2, M3, M4, M5, M6–M7 → ~5 parallel, then 1 Opus merge pass for cross-links + `core.*` hubs) | A (B helps for chart slides) |
| D | App UI against the schema, using a small hand-written `graph.sample.json` until C lands | Sonnet (app track) | schema only |
| E | `validate.py`, `tools/query.py`, `INDEX.md`, `CLAUDE.md` | Sonnet | C |
| F | Integration + browser QA (preview pane: expand, select, copy, lightbox, search, perf with all nodes) | Sonnet, then Opus spot-check of content accuracy | C, D |

Critical path is C (content quality = exam value). D runs fully in parallel because the schema is fixed.

## 5. Acceptance checklist
- [ ] Every one of the ~230 slides has an image + text chunk; every node cites ≥1 real slide.
- [ ] `validate.py` passes (no dangling parents/edges, ids unique, importance/type valid).
- [ ] Canvas: 60fps pan/zoom with everything expanded; expand/collapse animated; text selectable and copyable on canvas and in panel.
- [ ] Clicking a source thumbnail opens that exact slide; ←/→ navigates the deck.
- [ ] Search finds both concepts and words that appear only in slide text.
- [ ] `python3 tools/query.py "planetary boundaries and climate"` returns cited context.
- [ ] Works offline from `npm run preview` (or `npx serve app/dist`).
