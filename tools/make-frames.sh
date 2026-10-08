#!/usr/bin/env bash
# Turn a video into scroll-scrubbed frames for the build scene.
#
#   tools/make-frames.sh hero-16x9.mp4 [hero-9x16.mp4]
#
# Writes assets/hero/d/0001.webp ... (desktop), assets/hero/m/... (phones, optional)
# and assets/hero/manifest.json. Needs ffmpeg and python3.
# FRAMES=96 (default) sets how many frames to cut (more = smoother scrubbing, bigger download).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/hero
N=${FRAMES:-96}
Q=${QUALITY:-58}

cut() { # input, folder, width
  local in=$1 dir=$2 w=$3 dur fps
  rm -rf "${OUT:?}/$dir"; mkdir -p "$OUT/$dir"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
  fps=$(python3 -c "print($N / $dur)")
  ffmpeg -loglevel error -i "$in" -vf "fps=$fps,scale=$w:-2:flags=lanczos" -frames:v "$N" -c:v libwebp -q:v "$Q" "$OUT/$dir/%04d.webp"
  ls "$OUT/$dir" | wc -l
}

d=$(cut "$1" d 1440)
m=0
if [ $# -ge 2 ]; then m=$(cut "$2" m 720); fi
count=$d; if [ "$m" -gt 0 ] && [ "$m" -lt "$count" ]; then count=$m; fi

python3 - "$count" "$m" > "$OUT/manifest.json" <<'PY'
import json, sys
count, mobile = int(sys.argv[1]), int(sys.argv[2])
m = {"count": count, "ext": "webp",
     "desktop": {"dir": "d/", "focusX": 0.5, "focusY": 0.5,
                 "steps": [0.02, 0.18, 0.34, 0.45, 0.56, 0.66, 0.8, 0.9]},
     "steps": [0.02, 0.18, 0.34, 0.45, 0.56, 0.66, 0.8, 0.9]}
if mobile:
    m["mobile"] = {"dir": "m/", "focusX": 0.5, "focusY": 0.5,
                   "steps": [0.02, 0.19, 0.4, 0.5, 0.57, 0.8, 0.88, 0.94]}
print(json.dumps(m, indent=2))
PY
echo "Wrote $count frames per set and $OUT/manifest.json"
du -sh "$OUT"
