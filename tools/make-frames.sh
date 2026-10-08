#!/usr/bin/env bash
# Turn a video into scroll-scrubbed frames for the build scene.
#
#   tools/make-frames.sh hero-16x9.mp4 [hero-9x16.mp4]
#
# Writes assets/hero/d/0001.webp ... (desktop), assets/hero/m/... (phones, optional)
# and assets/hero/manifest.json. Needs ffmpeg and python3.
# FRAMES=150 sets how many frames to cut (more = smoother scrubbing, bigger download).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/hero
N=${FRAMES:-150}

cut() { # input, folder, width
  local in=$1 dir=$2 w=$3 dur fps
  rm -rf "${OUT:?}/$dir"; mkdir -p "$OUT/$dir"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
  fps=$(python3 -c "print($N / $dur)")
  ffmpeg -loglevel error -i "$in" -vf "fps=$fps,scale=$w:-2:flags=lanczos" -frames:v "$N" -c:v libwebp -q:v 72 "$OUT/$dir/%04d.webp"
  ls "$OUT/$dir" | wc -l
}

d=$(cut "$1" d 1600)
m=0
if [ $# -ge 2 ]; then m=$(cut "$2" m 900); fi
count=$d; if [ "$m" -gt 0 ] && [ "$m" -lt "$count" ]; then count=$m; fi

python3 - "$count" "$m" > "$OUT/manifest.json" <<'PY'
import json, sys
count, mobile = int(sys.argv[1]), int(sys.argv[2])
m = {"count": count, "ext": "webp",
     "desktop": {"dir": "d/", "focusX": 0.62, "focusY": 0.5},
     "steps": [0.03, 0.14, 0.29, 0.425, 0.545, 0.635, 0.775, 0.875]}
if mobile:
    m["mobile"] = {"dir": "m/", "focusX": 0.5, "focusY": 0.35}
print(json.dumps(m, indent=2))
PY
echo "Wrote $count frames per set and $OUT/manifest.json"
du -sh "$OUT"
