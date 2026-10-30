"""Verify authored payloads, alpha geometry, wheel semantics and font coverage."""
from pathlib import Path
import hashlib,json,subprocess,sys
from PIL import Image
from fontTools.ttLib import TTFont
r=Path(__file__).resolve().parents[1];m=json.loads((r/'assets/native-banlanx/authored-provenance.json').read_text());assert len(m['assets'])==18
for a in m['assets']:
 p=r/a['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256']
 if p.suffix=='.png':
  im=Image.open(p);assert list(im.size)==a['size'];assert list(im.getbbox())==a['alphaBounds'];assert im.mode=='RGBA'
w=Image.open(r/'assets/native-banlanx/circular_gradient-2x.png')
assert w.getpixel((0,0))[3]==0
assert min(w.getpixel((200,200))[:3])>252
for xy,channel in [((398,200),0),((200,398),2),((1,200),1),((200,1),1)]:assert w.getpixel(xy)[channel]>250
f=TTFont(r/'assets/native-banlanx/MaterialIcons-Regular.otf');assert set(f.getBestCmap())=={0xe516,0xe047,0xe09b,0xe404,0xe190,0xe0c1};assert f['head'].unitsPerEm==512
for name in f.getBestCmap().values():assert f['hmtx'][name]==(512,0)
before={a['path']:(r/a['path']).read_bytes() for a in m['assets']};subprocess.run([sys.executable,str(r/'tools/generate-banlanx-art.py')],check=True)
for p,v in before.items():assert (r/p).read_bytes()==v,p
print('18 assets verified: hashes, raster dimensions/bounds, wheel orientation, six glyphs, deterministic regeneration')
