#!/usr/bin/env python3
"""Make a small static review directory without mutating the V7 checkout."""
import argparse
from pathlib import Path
import re
import shutil

source = Path(__file__).resolve().parents[3]
phase = source / 'v8' / 'phase-1'
required = ('index.html', 'studio.html', 'cut.html', 'shared.css',
            'studio.css', 'cut.css', 'review.css', 'prototype.js', 'sculpture.js')
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path, help='new or empty directory for the static review')
args = parser.parse_args()
output = args.output.resolve()
if output.exists() and any(output.iterdir()):
    parser.error('output must be an empty directory')
if output == source or source in output.parents:
    parser.error('use a directory outside the Git checkout')
paths = {'favicon.png', 'v8/phase-1/media/deer-frame.webp'}
for filename in required:
    paths.add(f'v8/phase-1/{filename}')
    text = (phase / filename).read_text(encoding='utf-8')
    paths.update(re.findall(r'\.\./\.\./(assets/[A-Za-z0-9_.\-/]+)', text))
assert not any(Path(p).suffix.lower() in ('.mp4', '.zip') or 'originals/' in p for p in paths)
for path in sorted(paths):
    target = output / path
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / path, target)
(output / 'index.html').write_text(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">'
    '<meta http-equiv="refresh" content="0;url=v8/phase-1/index.html"><title>V8 Phase 1</title>'
    '<a href="v8/phase-1/index.html">Open the V8 Phase 1 review</a></html>\n',
    encoding='utf-8',
)
print(f'Static review: {len(paths)+1} files; no native MP4s or full-size originals')
