#!/usr/bin/env python3
"""Stage the corrective review from a verified Git checkout into its existing private Site checkout."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

repo = Path(__file__).resolve().parents[3]
site = Path(sys.argv[1]).resolve()
project = json.loads((site / '.openai/hosting.json').read_text())
if project.get('static', {}).get('directory') != 'dist':
    raise SystemExit('Expected the existing static review checkout.')
dist = site / 'dist'
commit = subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
if not re.fullmatch(r'[a-f0-9]{40}',commit):
    raise SystemExit('Unable to identify the verified commit.')
if subprocess.check_output(['git','-C', str(repo),'status','--porcelain','--','v8/phase-1b','assets']):
    raise SystemExit('Commit the release source before staging.')
original = dist / 'v8/motion-polish'
archive = dist / 'v8/motion-polish-archive'
if not archive.exists():
    if not (original/'motion.css').exists():
        raise SystemExit('The previous motion review is missing; leave it intact.')
    original.rename(archive)
original.mkdir(exist_ok=True)
target = dist / 'v8/correction'
target.mkdir(exist_ok=True)
sources = ('index.html','universe.css','motion.css','correction.css','universe.js','ribbon.js')
local = repo / 'v8/phase-1b'
for name in sources:
    shutil.copyfile(local/name, target/name)
shutil.copytree(local/'media',target/'media',dirs_exist_ok=True)
for name in ('tareq-portrait.webp','sounds/spin.wav'):
    shutil.copyfile(repo/'assets'/name, dist/'assets'/name)
def landing(path, route):
    path.write_text(f"""<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concept C — Latest review</title><meta http-equiv="refresh" content="0;url={route}">
<body style="background:#170f21;color:#f5e3d1;padding:2rem;font:18px system-ui">
<a style="color:#f4c894" href="{route}">Open the latest Concept C interactive review</a>
<script>location.replace({json.dumps(route)} + location.search + location.hash)</script>
</body></html>
""")
landing(dist/'index.html','v8/correction/')
landing(original/'index.html','../correction/')
files = sorted(p for p in target.rglob('*') if p.is_file() and p.name!='release.json')
(target/'release.json').write_text(json.dumps({'commit':commit,'source':'tarix-mp4/Portfolio',
    'route':'/v8/correction/','files':{str(f.relative_to(target)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files}},
    indent=2)+'\n')
print(commit, 'staged at /v8/correction/')
