"""Independent protocol composition of generated source-math raster fixtures."""
import json, hashlib, pathlib
from PIL import Image
root=pathlib.Path(__file__).parent/'fixtures/dynamic-gif'
frames=json.loads((root/'frame-wire-map.json').read_text())
def uint(n,k): return n.to_bytes(k,'big')
def content(data): return uint(len(data)+4,4)+data
def rect(layer): return bytes([layer])+uint(0,2)*2+uint(96,2)+uint(16,2)
def q(c): return 15 if c>=238 else 0 if c<=47 else (c-47)//14+1
def raster(p):
    out=bytearray()
    for x in range(96):
        for y in range(16):
            c=p[y*96+x];out.extend([q(c>>16),16*q((c>>8)&255)+q(c&255)])
    return out
for c in json.loads((root/'composition.json').read_text())['cases']:
    image=Image.open(root/c['gif'])
    assert image.n_frames==len(c['frames'])
    for index, expected in enumerate(c['frames']):
        image.seek(index)
        assert image.info.get('duration')==c['delays'][index]
        rgb=[(r<<16)|(g<<8)|b for r,g,b in image.convert('RGB').getdata()]
        assert rgb==expected, (c['gif'],index,'Pillow decoder mismatch')
    count=8 if c['mode']==7 else 7
    assert len(c['frames'])==count and len(c['delays'])==count
    assert c['delays']==[200]*(count-1)+[2000 if c['stay'] else 200]
    animation=content(bytes([3,1])+bytes(6)+rect(0)+bytes(1)+uint(count,2)+b''.join(uint(t,2) for t in c['delays'])+b''.join(raster(p) for p in c['frames']))
    contents=[animation]
    if c['frame']:
        f=frames[c['frame']-1]
        contents.append(content(bytes([4])+bytes(7)+rect(1)+bytes([c['frameShowType'],c['frameSpeed'],f['constant']])+uint(len(f['palette']),2)+bytes(f['palette'])))
    program=bytes(8)+bytes([len(contents),0])+b''.join(contents)
    assert len(program)==c['byteLength'] and hashlib.sha256(program).hexdigest()==c['sha256']
print('36 Pillow GIF decode and independent Python composition fixtures passed: nine modes × frame on/off × stay zero/positive')
