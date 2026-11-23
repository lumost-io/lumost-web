#!/usr/bin/env python3
"""Regenerate public/indonesia-dots.svg.

The hero map is a dot raster of Indonesia, not a traced illustration: dots are
sampled on a 5 px grid inside the country's polygons so the mark stays crisp at
any size and reads as "many signals, one place".

Source: https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia.geojson
Requires: pillow. Output: 1000 x 383 SVG, brand teal #14b8a6, ~2.6k dots.
"""
import json
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = "https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia.geojson"
OUT = ROOT / "public" / "indonesia-dots.svg"
LON0, LON1 = 94.5, 141.5
LAT0, LAT1 = 6.5, -11.5
W, H, STEP = 1000, 383, 5

data = json.loads(urllib.request.urlopen(SRC, timeout=60).read())
mask = Image.new("L", (W, H), 0)
draw = ImageDraw.Draw(mask)


def px(lon, lat):
    return ((lon - LON0) / (LON1 - LON0) * W, (LAT0 - lat) / (LAT0 - LAT1) * H)


for feature in data["features"]:
    geom = feature.get("geometry") or {}
    coords = geom.get("coordinates", [])
    polys = [coords] if geom.get("type") == "Polygon" else coords if geom.get("type") == "MultiPolygon" else []
    for poly in polys:
        for ring in poly[:1]:
            pts = [px(c[0], c[1]) for c in ring]
            if len(pts) > 2:
                draw.polygon(pts, fill=255)

dots = []
for y in range(0, H, STEP):
    for x in range(0, W, STEP):
        if all(mask.getpixel(p) > 0 for p in ((x, y), (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
            dots.append((x, y))

parts = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-hidden="true">',
    '<g fill="#14b8a6">',
]
for i, (x, y) in enumerate(dots):
    jx = ((i * 37) % 5 - 2) * 0.28
    jy = ((i * 53) % 5 - 2) * 0.28
    parts.append(f'<circle cx="{x + jx:.1f}" cy="{y + jy:.1f}" r="1.35"/>')
parts.append("</g></svg>")
OUT.write_text("\n".join(parts))
print(f"{OUT} — {len(dots)} dots")
