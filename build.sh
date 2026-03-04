#!/bin/bash
# Build: concatenate all JS files into a single distributable HTML file
# Usage: bash build.sh [output-file]
# Default output: dist/desert-golfing.html

OUTPUT="${1:-dist/desert-golfing.html}"
mkdir -p "$(dirname "$OUTPUT")"

cat > "$OUTPUT" << 'HTMLHEAD'
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Desert Golfing</title>
<link href="https://fonts.googleapis.com/css2?family=Silkscreen&family=VT323&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #d5ad72; display: flex; align-items: center; justify-content: center; }
  canvas { display: block; cursor: crosshair; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
HTMLHEAD

# Concatenate JS files in load order
for f in src/shared.js src/level-design.js src/art.js src/gameplay.js src/debug.js src/main.js; do
  echo "// ── $(basename "$f") ──" >> "$OUTPUT"
  cat "$f" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
done

cat >> "$OUTPUT" << 'HTMLTAIL'
</script>
</body>
</html>
HTMLTAIL

echo "Built: $OUTPUT ($(wc -l < "$OUTPUT") lines)"
