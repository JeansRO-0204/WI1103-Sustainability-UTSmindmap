#!/usr/bin/env bash
# Render every deck in ppt/ to app/public/slides/Mx/NNN.jpg (+ thumb/NNN.jpg) and app/public/pdf/Mx.pdf
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOFFICE="${SOFFICE:-/Applications/LibreOffice.app/Contents/MacOS/soffice}"
OUT="$ROOT/app/public"
TMP="$(mktemp -d)"
mkdir -p "$OUT/pdf"
for f in "$ROOT"/ppt/*; do
  base="$(basename "$f")"
  mid="$(echo "$base" | grep -o '_M[0-9]' | head -1 | tr -d _)"
  [ -z "$mid" ] && continue
  pdf="$OUT/pdf/$mid.pdf"
  case "$f" in
    *.pdf) cp "$f" "$pdf" ;;
    *.pptx)
      if [ ! -f "$pdf" ]; then
        cp "$f" "$TMP/$mid.pptx"
        "$SOFFICE" --headless --convert-to pdf --outdir "$TMP" "$TMP/$mid.pptx" >/dev/null 2>&1
        mv "$TMP/$mid.pdf" "$pdf"
      fi ;;
    *) continue ;;
  esac
  d="$OUT/slides/$mid"; mkdir -p "$d/thumb"
  pdftoppm -jpeg -jpegopt quality=82 -scale-to 1600 "$pdf" "$TMP/$mid-full"
  pdftoppm -jpeg -jpegopt quality=70 -scale-to 320 "$pdf" "$TMP/$mid-thumb"
  for p in "$TMP/$mid-full"-*.jpg; do n=$((10#$(basename "$p" .jpg | sed 's/.*-//'))); mv "$p" "$d/$(printf %03d $n).jpg"; done
  for p in "$TMP/$mid-thumb"-*.jpg; do n=$((10#$(basename "$p" .jpg | sed 's/.*-//'))); mv "$p" "$d/thumb/$(printf %03d $n).jpg"; done
  echo "$mid: $(ls "$d"/*.jpg | wc -l | tr -d ' ') slides"
done
rm -rf "$TMP"
