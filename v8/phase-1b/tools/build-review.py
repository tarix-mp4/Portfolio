#!/usr/bin/env python3
"""Assemble only the private design review and its required assets."""
import argparse
from pathlib import Path
import re
import shutil
import subprocess
import sys

source = Path(__file__).resolve().parents[3]
phase = source / 'v8' / 'phase-1b'
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path, help='new or empty directory outside the checkout')
args = parser.parse_args()
out = args.output.resolve()
if out == source or source in out.parents:
    parser.error('output must be outside the checkout')
if out.exists() and any(out.iterdir()):
    parser.error('output must be empty')
subprocess.run([sys.executable, str(source/'v8/phase-1/tools/build-review.py'), str(out)],check=True)
names=('index.html','universe.css','universe.js','ribbon.js',
       'media/reel-review.webm','media/quiet-trail-excerpt.webm','media/trail-strip.webp')
paths=set(f'v8/phase-1b/{n}' for n in names)
for name in names[:4]:
    s=(phase/name).read_text(encoding='utf-8')
    paths.update(re.findall(r'\.\./\.\./(assets/[A-Za-z0-9_.\-/]+)',s))
for name in sorted(paths):
    dst=out/name
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source/name,dst)
assert not list(out.rglob('*.mp4'))
assert not (out/'assets/photography/originals').exists()
print('Concepts A, B and C packaged; original video masters excluded.')
