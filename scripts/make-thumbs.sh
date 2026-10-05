#!/usr/bin/env bash
# Makes two smaller copies of every photo so pages load quickly:
#   thumbs/  small ones for grids       large/  screen-sized ones for viewing
# The originals in photos/ are never changed. Copies of deleted photos are removed.
set -euo pipefail
command -v convert >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq imagemagick; }
mkdir -p thumbs large
find photos -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) -print0 | while IFS= read -r -d '' f; do
  rel="${f#photos/}"
  for spec in "thumbs:800:80" "large:2200:86"; do
    IFS=: read -r dir size quality <<< "$spec"
    out="$dir/$rel.jpg"
    if [ ! -f "$out" ] || [ "$f" -nt "$out" ]; then
      mkdir -p "$(dirname "$out")"
      convert "$f[0]" -auto-orient -resize "${size}x${size}>" -strip -background black -flatten -interlace Plane -quality "$quality" "$out" || echo "could not shrink $f"
    fi
  done
done
for dir in thumbs large; do
  find "$dir" -type f -name '*.jpg' -print0 | while IFS= read -r -d '' t; do
    src="photos/${t#$dir/}"; src="${src%.jpg}"
    [ -f "$src" ] || rm -f "$t"
  done
done
