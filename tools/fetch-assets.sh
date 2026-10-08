#!/usr/bin/env bash
# Download the Higgsfield-generated photos and video, shrink them for the web,
# and cut the scroll frames. Run from anywhere: tools/fetch-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CDN=https://d8j0ntlcm91z4.cloudfront.net/user_3H1NhQTXykQPnr9UDS7ZJLbysXr
TMP=$(mktemp -d)
# Kling 3.0 scroll videos (16:9 desktop, 9:16 phones). Set either to "" to skip.
VIDEO_URL=${VIDEO_URL-$CDN/hf_20261008_023812_d8568419-5cf0-43b5-a42c-f4dba710e6de.mp4}
VIDEO_URL_MOBILE=${VIDEO_URL_MOBILE-$CDN/hf_20261008_024057_a20351c9-a835-4b56-8096-8928ada2bb71.mp4}
mkdir -p assets/img

# gallery-N.webp, in the order the zoom gallery uses them (1 = centre)
gallery=(
  "hf_20261008_023619_2ecdcf72-face-494f-9137-aea3e3d59f24.png"  # wood-fired oven
  "hf_20261008_023619_963ace8a-012d-442b-83f7-c7a8ecbd4231.png"  # dining room
  "hf_20261008_023619_cee4d157-2e5e-4f9e-b5ea-a48a0faa14b2.png"  # gnocchi
  "hf_20261008_023619_df6394f9-0035-47d1-b3f1-10a4dd1bbf3e.png"  # stretching dough
  "hf_20261008_023619_937ee1c6-be72-4dc1-b616-a9b5f79cff37.png"  # calamari
  "hf_20261008_023620_72b6da68-07e3-4af5-b9ef-b0de8360b7c3.png"  # cheese pull
  "hf_20261008_023619_556c737b-e54d-48b8-bc81-de51eac81772.png"  # ingredients
)
i=1
for f in "${gallery[@]}"; do
  curl -fsSL -m 120 -o "$TMP/g$i.png" "$CDN/$f"
  # the centre photo fills the whole screen at the end, so it gets more pixels
  w=1400; [ $i -eq 1 ] && w=2200
  ffmpeg -loglevel error -y -i "$TMP/g$i.png" -vf "scale='min($w,iw)':-2:flags=lanczos" -c:v libwebp -q:v 78 "assets/img/gallery-$i.webp"
  i=$((i + 1))
done

# keyframes: the finished pizza doubles as a poster while frames load
curl -fsSL -m 120 -o "$TMP/end.png" "$CDN/hf_20261008_023605_e2141407-eeb0-47ba-83d7-696defcb9d5a.png"
ffmpeg -loglevel error -y -i "$TMP/end.png" -vf "scale=1600:-2:flags=lanczos" -c:v libwebp -q:v 78 assets/img/pizza-finished.webp

# scroll video -> frames
if [ -n "${VIDEO_URL:-}" ]; then
  curl -fsSL -m 300 -o "$TMP/hero.mp4" "$VIDEO_URL"
  args=("$TMP/hero.mp4")
  if [ -n "${VIDEO_URL_MOBILE:-}" ]; then
    curl -fsSL -m 300 -o "$TMP/hero-m.mp4" "$VIDEO_URL_MOBILE"; args+=("$TMP/hero-m.mp4")
  fi
  tools/make-frames.sh "${args[@]}"
fi
rm -rf "$TMP"
du -sh assets/*
