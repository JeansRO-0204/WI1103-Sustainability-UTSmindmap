# WI1103 Sustainability — midterm mindmap

Interactive study mindmap for ITB WI1103 (weeks 1–7): 255 concepts, 229 cross-links, every slide linked.

**Live site:** https://jeansro-0204.github.io/WI1103-Sustainability-UTSmindmap/

## Ask questions from the knowledge base (any AI tool)
```bash
git clone https://github.com/JeansRO-0204/WI1103-Sustainability-UTSmindmap.git && cd WI1103-Sustainability-UTSmindmap
```
Everything is plain files + stdlib Python (no API keys, no provider lock-in):
- **Agentic tools** (Claude Code, Codex, Gemini CLI, Cursor, Copilot): open the folder; they read `AGENTS.md` (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules`, `.github/copilot-instructions.md` all point to it).
- **MCP**: `.mcp.json` registers `tools/mcp_server.py` (tools `search_knowledge`, `get_concept`) for any MCP client.
- **Any chat/LLM**: `python3 tools/query.py "question" --prompt | pbcopy`, then paste into any model or pipe it to any LLM CLI. Or use the app's **Copy AI context** button, or paste `knowledge/corpus.md` (~16k tokens).
- **Web crawlers/LLMs**: `llms.txt` on the site points to `data/graph.json` and `data/chunks.jsonl`.

## Layout
- `knowledge/` graph.json (concepts), chunks.jsonl + corpus.md (slide text and speaker notes), INDEX.md
- `app/` Vite + React mindmap; `app/public/slides/` rendered slide images
- `build/`, `tools/` pipeline, validator, query CLI, MCP server

Original lecture files (`ppt/`) and PDFs are included. Content is the author's study notes derived from course slides; check slides for exam-critical figures.
