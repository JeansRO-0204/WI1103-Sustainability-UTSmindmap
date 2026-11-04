#!/usr/bin/env python3
"""Minimal stdlib MCP server (stdio, JSON-RPC) exposing the knowledge graph to any MCP-capable client.
Tools: search_knowledge(question,k,hops), get_concept(id). No third-party deps, no API keys."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import query

K = Path(__file__).resolve().parent.parent / "knowledge"
TOOLS = [
    {"name": "search_knowledge", "description": "Search the WI1103 sustainability course knowledge graph (7 weeks) and return matching concepts, their neighbours and quoted slide text with [Mx sN] citations.",
     "inputSchema": {"type": "object", "properties": {"question": {"type": "string"}, "k": {"type": "integer", "default": 6}, "hops": {"type": "integer", "default": 1}}, "required": ["question"]}},
    {"name": "get_concept", "description": "Get one concept by id (e.g. 'm6.paris.cbdr') with details, links and sources. Ids are listed in knowledge/INDEX.md.",
     "inputSchema": {"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]}},
]

def call(name, args):
    if name == "search_knowledge":
        return query.run(args["question"], int(args.get("k", 6)), int(args.get("hops", 1)))
    if name == "get_concept":
        g = json.loads((K / "graph.json").read_text(encoding="utf-8"))
        n = next((x for x in g["nodes"] if x["id"] == args["id"]), None)
        return json.dumps(n, ensure_ascii=False, indent=1) if n else f"No concept with id {args['id']!r}. See knowledge/INDEX.md."
    raise ValueError(f"unknown tool {name}")

def reply(i, result=None, error=None):
    m = {"jsonrpc": "2.0", "id": i}
    m.update({"error": error} if error else {"result": result})
    sys.stdout.write(json.dumps(m, ensure_ascii=False) + "\n"); sys.stdout.flush()

for line in sys.stdin:
    if not line.strip(): continue
    req = json.loads(line); m, i = req.get("method"), req.get("id")
    if i is None: continue  # notification
    try:
        if m == "initialize":
            reply(i, {"protocolVersion": req.get("params", {}).get("protocolVersion", "2024-11-05"), "capabilities": {"tools": {}}, "serverInfo": {"name": "wi1103-knowledge", "version": "1.0"}})
        elif m == "tools/list": reply(i, {"tools": TOOLS})
        elif m == "tools/call":
            p = req["params"]; reply(i, {"content": [{"type": "text", "text": call(p["name"], p.get("arguments", {}))}]})
        elif m == "ping": reply(i, {})
        else: reply(i, error={"code": -32601, "message": f"method not found: {m}"})
    except Exception as e:
        reply(i, {"content": [{"type": "text", "text": f"error: {e}"}], "isError": True})
