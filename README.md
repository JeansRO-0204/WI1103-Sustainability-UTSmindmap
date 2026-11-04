# WI1103 Sustainability — midterm mindmap

Interactive study mindmap for ITB WI1103 (weeks 1–7): 255 concepts, 229 cross-links, every slide linked.

**Live site:** https://jeansro-0204.github.io/WI1103-Sustainability-UTSmindmap/

## Ask questions from the knowledge base (Claude Code)
```bash
git clone https://github.com/JeansRO-0204/WI1103-Sustainability-UTSmindmap.git
cd WI1103-Sustainability-UTSmindmap
claude          # then ask, e.g. "how does CBDR-RC connect to the Global South?"
```
`CLAUDE.md` tells Claude to use `python3 tools/query.py "question"` (concepts + neighbours + quoted slides, cited `[M6 s16]`), `knowledge/INDEX.md` (outline) or `knowledge/corpus.md` (all slide text).

## Layout
- `knowledge/` graph.json (concepts), chunks.jsonl + corpus.md (slide text and speaker notes), INDEX.md
- `app/` Vite + React mindmap; `app/public/slides/` rendered slide images
- `build/`, `tools/` pipeline, validator, query CLI

Original lecture files are not in this repo. Content is the author's study notes derived from course slides; check slides for exam-critical figures.
