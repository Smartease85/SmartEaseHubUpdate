"""Offline authored hardware geometry/provenance/reproducibility checks."""
from pathlib import Path
import json,hashlib,subprocess,sys
from PIL import Image
r=Path(__file__).resolve().parents[1];spec=json.loads((r/'tools/lotus-hardware-spec.json').read_text());prov=json.loads((r/'assets/native-lotus/icons/provenance.json').read_text());rows=prov['records'];assert len(rows)==39
assert [a['key'] for a in spec]==[a['key'] for a in rows]
seen=set();before={}
for a,s in zip(rows,spec):
 p=r/a['src'];raw=p.read_bytes();im=Image.open(p);assert list(im.size)==s['size'];assert list(im.getbbox())==s['alphaBounds'],a['name'];assert im.mode=='RGBA';assert hashlib.sha256(raw).hexdigest()==a['sha256'];assert len(raw)==a['bytes'];assert a['sha256'] not in seen;seen.add(a['sha256']);assert a['meaning'];assert 'apkPath' not in a;before[a['src']]=raw
subprocess.run([sys.executable,str(r/'tools/generate-lotus-hardware.py')],check=True)
for p,v in before.items():assert (r/p).read_bytes()==v
print('39 unique assets: compatible order, dimensions and bounds; hashes and deterministic regeneration passed')
