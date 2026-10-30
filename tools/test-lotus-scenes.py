#!/usr/bin/env python3
"""Verify authored scenes without executing application/device code."""
from pathlib import Path
from PIL import Image
import hashlib,json,subprocess,sys
r=Path(__file__).resolve().parents[1];root=r/'assets/native-lotus/scenes';m=json.loads((root/'authored-manifest.json').read_text());p=json.loads((root/'provenance.json').read_text());a=m['assets'];assert len(a)==len(p['scenes'])==33
assert [s['command'] for s in p['scenes']]==list(range(1,29))+[150,152,154,155,156]
assert len({x['sha256'] for x in a})==33,'Every scene must be distinct'
for x in a:
 f=r/x['path'];assert hashlib.sha256(f.read_bytes()).hexdigest()==x['sha256'];im=Image.open(f);assert im.size==(456,588);assert im.getbbox()==(0,0,456,588);assert im.mode=='RGB'
for s in p['scenes']:
 assert 'apkPath' not in s;assert s['artworkOrigin']=='independently authored geometry';assert any(s['asset']==x['path'] and s['sha256']==x['sha256'] and s['bytes']==x['bytes'] for x in a)
raw=(r/'native-lotus-catalog-data.js').read_text();d=json.loads(raw.split('window.SmartEaseNativeCatalogData=',1)[1].strip().removesuffix(';'));assert d==p
before={x['path']:(r/x['path']).read_bytes() for x in a};subprocess.run([sys.executable,str(r/'tools/generate-lotus-scenes.py')],check=True)
for path,b in before.items():assert (r/path).read_bytes()==b
print('33 unique authored images: dimensions, opacity, hashes, metadata, exact command order and deterministic regeneration passed')
