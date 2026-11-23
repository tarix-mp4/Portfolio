#!/usr/bin/env python3
"""Remove the original SVG's matte and trace a separate, pixel-aligned front layer.

Usage: python3 prepare-box.py 'supplied box.svg' <output directory>
The supplied 64×64 artwork is a set of horizontal runs; no vector resampling or
color conversion is needed. The matching PNG is an independent user asset.
"""
import argparse
from collections import deque
from pathlib import Path
import xml.etree.ElementTree as ET

SIZE = 64
MATTE = "#fdf8f4"
# Light, desaturated pixels sampled from the old matte at the silhouette edge.
EDGE_MATTE = {"#ddd5d0", "#bdaca4", "#9c857f"}
# Actual inner edge of the two front flaps: x run starts at the specified y row.
RIM = [
    (0, 26), (12, 27), (15, 28), (18, 29), (20, 30), (23, 31),
    (26, 32), (28, 33), (31, 34), (33, 35), (35, 35), (37, 34),
    (38, 33), (40, 32), (42, 31), (44, 30), (46, 29), (48, 28),
    (50, 27), (52, 26),
]

def remove_matte(grid):
    seen = set()
    queue = deque([(0, 0)])
    while queue:
        x, y = queue.popleft()
        if not (0 <= x < SIZE and 0 <= y < SIZE) or (x, y) in seen:
            continue
        if grid[y][x] not in {MATTE, *EDGE_MATTE}:
            continue
        seen.add((x, y))
        grid[y][x] = None
        queue.extend(((x-1, y), (x+1, y), (x, y-1), (x, y+1)))
    assert seen and all(MATTE not in row for row in grid)

def save(grid, path):
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 64 64" shape-rendering="crispEdges">']
    for y, row in enumerate(grid):
        x = 0
        while x < SIZE:
            value = row[x]
            end = x+1
            while end < SIZE and row[end] == value:
                end += 1
            if value:
                svg.append(f'<rect x="{x}" y="{y}" width="{end-x}" height="1" fill="{value}"/>')
            x = end
    path.write_text("\n".join([*svg, "</svg>", ""]), encoding="utf-8")

def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("original", type=Path)
    args.add_argument("output", type=Path)
    files = args.parse_args()
    original = ET.parse(files.original).getroot()
    assert original.get("viewBox") == "0 0 64 64"
    grid = [[None]*SIZE for _ in range(SIZE)]
    for child in original:
        assert child.tag.endswith("}rect") and child.get("height") == "1"
        x, y, width = (int(child.get(key)) for key in ("x", "y", "width"))
        grid[y][x:x+width] = [child.get("fill")]*width
    remove_matte(grid)
    files.output.mkdir(parents=True, exist_ok=True)
    save(grid, files.output / "cardboard-box.svg")
    rim = [next(yy for xx, yy in reversed(RIM) if xx <= x) for x in range(SIZE)]
    save([[color if y >= rim[x] else None for x, color in enumerate(row)]
          for y, row in enumerate(grid)], files.output / "cardboard-box-front.svg")

if __name__ == "__main__":
    main()
