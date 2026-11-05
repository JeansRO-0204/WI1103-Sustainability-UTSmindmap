# WI1103 Sustainability midterm study kit (tool-agnostic agent instructions)

Course WI1103 (ITB), weeks 1-7 (M1-M7). Everything needed to answer questions is in `knowledge/`; no API keys or network.

## Answering study questions
1. **Best:** call the MCP tool `search_knowledge` if available (server: `python3 tools/mcp_server.py`). Otherwise run `python3 tools/query.py "question" -k 6 --hops 1` (`--json` for structured output, `--prompt` to wrap it as a ready-to-send prompt).
2. For broad or cross-week questions read `knowledge/INDEX.md` first (every concept id, summary, slide cites), or load `knowledge/corpus.md` whole (~16k tokens, all slide text + speaker notes).
3. Cite sources as `[M6 s16]` (module, slide). Slide images: `app/public/slides/Mx/NNN.jpg` (read them when slide text is thin).
4. Stay within the material; label general knowledge as such. Speaker notes are often Indonesian: translate.

## Layout
`knowledge/` graph.json, chunks.jsonl (one line per slide), corpus.md, INDEX.md, fragments/ (per-week source); `tools/` query.py, mcp_server.py; `build/` extract, render, merge, validate; `app/` Vite+React mindmap (incl. Quiz / Cards / Progress study mode); `ppt/` original decks.
`knowledge/quiz/`: `SPEC.md` (contract), `quiz2.raw.json` (verbatim Quiz 2) + `quiz2.tags.json` + `quiz1.raw.json` (verbatim bilingual Quiz 1: English `stem`/`options`, Indonesian `stemId`/`optionsId`, optional `calc`, `enTranslated`) + `quiz1.tags.json` + `generated.M*.json` + `topics.json` are merged and validated by `python3 build/quiz_merge.py` into `quiz.json` (served as `/data/quiz.json`; `quiz.sample.json` is the fallback; `--sample` validates it and the `quiz1.sample.raw/tags.json` pair; missing quiz1 files only warn). Learner progress is browser-local (`mm.quiz`, `mm.reviewed`) with Export/Import in the Progress tab.

## Rebuild
```
python3 build/extract.py && bash build/render.sh   # needs LibreOffice + pdftoppm
python3 build/merge.py && python3 build/validate.py   # must exit 0
cd app && npm install && npm run build
```
Pushing to `main` deploys `app/dist` via `.github/workflows/pages.yml`.
