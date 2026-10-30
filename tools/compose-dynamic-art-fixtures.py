"""Independent Pillow decoding and Python protocol composition for authored-art fixtures."""
import json,hashlib,pathlib,sys
from PIL import Image
root=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path(__file__).resolve().parent.parent
out=root/'tests/fixtures/dynamic-gif'
frames=json.loads((out/'frame-wire-map.json').read_text())
def uint(n,k): return n.to_bytes(k,'big')
def content(data): return uint(len(data)+4,4)+data
def rect(layer): return bytes([layer])+uint(0,2)*2+uint(96,2)+uint(16,2)
def q(c): return 15 if c>=238 else 0 if c<=47 else (c-47)//14+1
def raster(p):
 result=bytearray()
 for x in range(96):
  for y in range(16):
   c=p[y*96+x];result.extend([q(c>>16),16*q((c>>8)&255)+q(c&255)])
 return result
cases=[]
for c in json.loads((out/'generation-inputs.json').read_text())['cases']:
 image=Image.open(out/c['gif']);assert image.size==(96,16)
 count=8 if c['mode']==7 else 7;assert image.n_frames==count
 decoded=[];delays=[]
 for index in range(image.n_frames):
  image.seek(index);decoded.append([(r<<16)|(g<<8)|b for r,g,b in image.convert('RGB').getdata()]);delays.append(image.info['duration'])
 assert delays==[200]*(count-1)+[2000 if c['stay'] else 200]
 assert delays==[int(t//10)*10 for t in c.pop('requestedDelays')]
 assert c['frameSpeed']==230 and c['frameShowType']==1
 animation=content(bytes([3,1])+bytes(6)+rect(0)+bytes(1)+uint(count,2)+b''.join(uint(t,2)for t in delays)+b''.join(raster(p)for p in decoded))
 contents=[animation]
 if c['frame']:
  f=frames[c['frame']-1];contents.append(content(bytes([4])+bytes(7)+rect(1)+bytes([c['frameShowType'],c['frameSpeed'],f['constant']])+uint(len(f['palette']),2)+bytes(f['palette'])))
 program=bytes(8)+bytes([len(contents),0])+b''.join(contents)
 cases.append({**c,'frames':decoded,'delays':delays,'byteLength':len(program),'sha256':hashlib.sha256(program).hexdigest()})
(out/'composition.json').write_text(json.dumps({'note':'Current licensed fonts and independently authored mask rasters decoded by Pillow; independent Python protocol composition, not native-app capture or proof of exact original raster appearance. Protocol constants/frame palette map unchanged.', 'cases':cases},separators=(',',':'))+'\n')
print('36 independent Pillow+Python authored-art composition fixtures produced')
