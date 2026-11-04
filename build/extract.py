#!/usr/bin/env python3
"""Extract slide text from ppt/ (pptx + pdf) into knowledge/chunks.jsonl and knowledge/corpus.md.

Stdlib only. Slides are numbered in *presentation order* (from presentation.xml sldIdLst),
which is the same order LibreOffice renders them, so slide N text <-> image N.
"""
import json
import re
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PPT = ROOT / "ppt"
OUT = ROOT / "knowledge"

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def module_id(name: str) -> str:
    m = re.search(r"_(M\d)", name)
    if not m:
        sys.exit(f"cannot find module id in {name}")
    return m.group(1)


def clean(s: str) -> str:
    s = s.replace("\u000b", " ").replace("\xa0", " ")
    return re.sub(r"[ \t]+", " ", s).strip()


def rels(z: zipfile.ZipFile, path: str) -> dict:
    p = Path(path)
    rp = str(p.parent / "_rels" / (p.name + ".rels"))
    if rp not in z.namelist():
        return {}
    root = ET.fromstring(z.read(rp))
    out = {}
    for r in root.findall("rel:Relationship", NS):
        tgt = r.get("Target")
        if r.get("TargetMode") == "External":
            continue
        out[r.get("Id")] = (r.get("Type").rsplit("/", 1)[-1], tgt[1:] if tgt.startswith("/") else _norm(p.parent / tgt))
    return out


def _norm(p: Path) -> str:
    parts = []
    for part in p.parts:
        if part == "..":
            parts.pop()
        elif part != ".":
            parts.append(part)
    return "/".join(parts)


def shape_paragraphs(sp) -> list[str]:
    paras = []
    for para in sp.iter(f"{{{NS['a']}}}p"):
        t = "".join(x.text or "" for x in para.iter(f"{{{NS['a']}}}t"))
        t = clean(t)
        if t:
            paras.append(t)
    return paras


def slide_text(xml: bytes):
    root = ET.fromstring(xml)
    title, lines = "", []
    for sp in root.iter(f"{{{NS['p']}}}sp"):
        ph = sp.find(".//p:nvPr/p:ph", NS)
        paras = shape_paragraphs(sp)
        if not paras:
            continue
        if ph is not None and ph.get("type") in ("title", "ctrTitle") and not title:
            title = " ".join(paras)
        else:
            lines.extend(paras)
    # tables (graphicFrame) are not p:sp
    for gf in root.iter(f"{{{NS['p']}}}graphicFrame"):
        for tr in gf.iter(f"{{{NS['a']}}}tr"):
            cells = [" ".join(shape_paragraphs(tc)) for tc in tr.iter(f"{{{NS['a']}}}tc")]
            if any(cells):
                lines.append(" | ".join(cells))
    hidden = root.get("show") == "0"
    return title, lines, hidden


def notes_text(z, notes_path):
    root = ET.fromstring(z.read(notes_path))
    out = []
    for sp in root.iter(f"{{{NS['p']}}}sp"):
        ph = sp.find(".//p:nvPr/p:ph", NS)
        if ph is not None and ph.get("type") == "body":
            out.extend(shape_paragraphs(sp))
    return out


def extract_pptx(path: Path, mid: str):
    z = zipfile.ZipFile(path)
    pres = ET.fromstring(z.read("ppt/presentation.xml"))
    prels = rels(z, "ppt/presentation.xml")
    chunks = []
    ids = pres.findall("p:sldIdLst/p:sldId", NS)
    for n, sid in enumerate(ids, 1):
        rid = sid.get(f"{{{NS['r']}}}id")
        spath = prels[rid][1]
        title, lines, hidden = slide_text(z.read(spath))
        notes = []
        for typ, tgt in rels(z, spath).values():
            if typ == "notesSlide" and tgt in z.namelist():
                notes = notes_text(z, tgt)
        if not title and lines and len(lines[0]) < 120:
            title = lines[0]
        chunks.append(make_chunk(mid, n, title, lines, notes, hidden, len(ids)))
    return chunks


def extract_pdf(path: Path, mid: str):
    txt = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=True).stdout
    pages = txt.split("\f")
    if pages and not pages[-1].strip():
        pages = pages[:-1]
    chunks = []
    for n, page in enumerate(pages, 1):
        lines = [clean(l) for l in page.splitlines() if clean(l)]
        title = lines[0] if lines else ""
        chunks.append(make_chunk(mid, n, title, lines[1:], [], False, len(pages)))
    return chunks


def make_chunk(mid, n, title, lines, notes, hidden, total):
    title = clean(title)[:160]
    # drop bare slide numbers
    lines = [l for l in lines if not re.fullmatch(r"\d{1,3}", l)]
    return {
        "id": f"{mid}-s{n}",
        "module": mid,
        "slide": n,
        "slideCount": total,
        "title": title,
        "text": "\n".join(lines),
        "notes": "\n".join(notes),
        "hidden": hidden,
        "image": f"slides/{mid}/{n:03d}.jpg",
        "thumb": f"slides/{mid}/thumb/{n:03d}.jpg",
        "nodeIds": [],
    }


def main():
    OUT.mkdir(exist_ok=True)
    files = sorted(PPT.glob("*"), key=lambda p: module_id(p.name))
    all_chunks, modules = [], []
    for f in files:
        if f.suffix.lower() not in (".pptx", ".pdf"):
            continue
        mid = module_id(f.name)
        ch = extract_pptx(f, mid) if f.suffix.lower() == ".pptx" else extract_pdf(f, mid)
        all_chunks.extend(ch)
        modules.append({"id": mid, "file": f"ppt/{f.name}", "slideCount": len(ch)})
        print(f"{mid}: {len(ch)} slides  ({f.name})")
    with open(OUT / "chunks.jsonl", "w") as fh:
        for c in all_chunks:
            fh.write(json.dumps(c, ensure_ascii=False) + "\n")
    (OUT / "modules.extracted.json").write_text(json.dumps(modules, indent=2))
    with open(OUT / "corpus.md", "w") as fh:
        fh.write("# WI1103 Sustainability — full slide corpus\n\nCite as [Mx sN].\n")
        cur = None
        for c in all_chunks:
            if c["module"] != cur:
                cur = c["module"]
                fh.write(f"\n\n# {cur}\n")
            fh.write(f"\n## [{c['module']} s{c['slide']}] {c['title']}{' (hidden)' if c['hidden'] else ''}\n")
            if c["text"]:
                fh.write(c["text"] + "\n")
            if c["notes"]:
                fh.write("\n> Notes: " + c["notes"].replace("\n", " ") + "\n")
    print(f"total {len(all_chunks)} chunks -> {OUT}")


if __name__ == "__main__":
    main()
