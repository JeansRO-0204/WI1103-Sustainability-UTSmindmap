# WI1103 Sustainability midterm study kit

Course WI1103 (ITB), midterm Sat 7 Nov 2026, weeks 1-7 (M1-M7). Source slides in `ppt/`.

## Layout
- `ppt/` originals (do not edit). `build/extract.py` -> `knowledge/chunks.jsonl` (one line per slide: id `M3-s21`, title, text, notes, image) and `knowledge/corpus.md` (all slides, readable).
- `build/render.sh` renders slide images + PDFs into `app/public/slides/Mx/NNN.jpg` (+`thumb/`) and `app/public/pdf/Mx.pdf`.
- `knowledge/fragments/Mx.json` per-module content -> `build/merge.py` -> `knowledge/graph.json` (schema: PLAN.md section 2). `knowledge/graph.sample.json` is a small fallback sample. `knowledge/INDEX.md` is a compact outline of every node.
- `build/validate.py` checks graph.json (unique ids, single root, parents/edges exist, no cycles, enums, source slides exist). Non-zero exit on error.
- `tools/query.py` GraphRAG-lite CLI. `app/` Vite + React + TS mindmap (loads graph.json + chunks.jsonl at runtime via a Vite plugin; no code change needed for content updates).

## Answering study questions
1. Run `python3 tools/query.py "the question" -k 6 --hops 1` (add `--json` for structured output). It returns matching nodes, neighbours and quoted slide text.
2. For broad or cross-module questions read `knowledge/INDEX.md` first, then pull details with query.py, or load `knowledge/corpus.md` whole (about 16k tokens).
3. Always cite sources as `[M6 s16]` (module, slide). Slide text may be thin: image at `app/public/slides/Mx/NNN.jpg` can be read. Speaker notes (often Indonesian) are in chunks/corpus.
4. Do not invent facts beyond the slides; flag general knowledge as such.

## Rebuild
```
python3 build/extract.py            # pptx/pdf -> chunks.jsonl, corpus.md
bash build/render.sh                # slide images + PDFs (needs LibreOffice, pdftoppm)
python3 build/merge.py              # fragments -> graph.json
python3 build/validate.py           # must exit 0
cd app && npm install && npm run build   # static site in app/dist
npm run dev                         # dev server on :5173 (preview config "mindmap" in .claude/launch.json)
```
`npm run preview` serves dist on :4173. Originals (`ppt/`) and PDFs (`app/public/pdf/`) are published with the site. Pushing to `main` deploys app/dist to GitHub Pages via .github/workflows/pages.yml.
