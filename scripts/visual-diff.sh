#!/bin/sh
# Pixel comparison of two responsive-audit runs (same page, same width), using ImageMagick.
#   sh scripts/visual-diff.sh audit/baseline audit/astro
# Prints the share of differing pixels per screenshot and writes diff images to <new>/diff/.
[ -d "$1/shots" ] && [ -d "$2/shots" ] || { echo "usage: visual-diff.sh <run-a> <run-b>"; exit 1; }
A=$(cd "$1" && pwd); B=$(cd "$2" && pwd)
mkdir -p "$B/diff"
cd "$A/shots" || exit 1
find . -name '*.png' -path './[0-9]*' | sort | while read -r f; do
  other="$B/shots/$f"
  [ -f "$other" ] || { echo "missing  $f"; continue; }
  sa=$(magick identify -format '%wx%h' "$f"); sb=$(magick identify -format '%wx%h' "$other")
  out="$B/diff/$(echo "$f" | sed 's#^\./##; s#/#_#g')"
  if [ "$sa" != "$sb" ]; then
    echo "size     $f  $sa → $sb"
    continue
  fi
  px=$(magick compare -metric AE -fuzz 2% "$f" "$other" "$out" 2>&1 >/dev/null | cut -d' ' -f1)
  total=$(echo "$sa" | awk -Fx '{print $1*$2}')
  echo "$px $total $f" | awk '{ printf "%-8s %6.2f%%  %s\n", ($1 == 0 ? "same" : "diff"), 100 * $1 / $2, $3 }'
done
