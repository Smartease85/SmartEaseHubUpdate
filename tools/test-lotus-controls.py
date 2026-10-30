#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import hashlib,json
R=Path(__file__).resolve().parents[1];m=json.loads((R/'assets/native-lotus/authored-controls-provenance.json').read_text());contracts={x['path']:x for x in json.loads((R/'tools/lotus-control-contracts.json').read_text())}
assert len(m['assets'])==70
for a in m['assets']:
 p=R/a['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'],p;im=Image.open(p);c=contracts[a['path']];assert list(im.size)==c['size']
 if p.suffix=='.png':assert list(im.getbbox())==c['bounds'],(p,im.getbbox(),c['bounds'])
 else:
  actual=[];fingerprints=set()
  for i in range(im.n_frames):
   im.seek(i);actual.append(im.info['duration']);fingerprints.add(hashlib.sha256(im.convert('RGB').tobytes()).hexdigest())
  assert len(fingerprints)>10,p
  assert actual==a['durations'];assert sum(actual)==sum(c['durations']);assert all(d%50==0 for d in actual);assert im.info['loop']==c['loop']
# Opposite hue orientation is functional: the image itself is sampled by pointer controls.
for name,sgn in [('ic_palette_bg',-1),('ic_big_solorwheel',1)]:
 im=Image.open(R/'assets/native-lotus/color'/f'{name}.png');w,h=im.size
 east=im.getpixel((w-3,h//2));west=im.getpixel((2,h//2));south=im.getpixel((w//2,h-3));north=im.getpixel((w//2,2));center=im.getpixel((w//2,h//2))
 assert east[0]>250 and east[1]<10 and east[2]<10;assert west[0]<10 and min(west[1:3])>250;assert min(center[:3])>252
 assert (south[2]>250 and north[1]>250) if sgn<0 else (south[1]>250 and north[2]>250)
# Selected/off power retains a readable contrasting power symbol.
a=Image.open(R/'assets/native-lotus/bottom/ic_bottom_off.png');assert len(set(a.get_flattened_data()))>10
print('70 control/demo assets verified: hashes, exact bounds, all16 GIF timelines, distinct motion, hue orientations, contrast')
