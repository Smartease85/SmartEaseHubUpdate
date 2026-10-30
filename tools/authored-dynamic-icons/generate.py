"""Authored UI geometry, not original-image modification. Requires Pillow."""
from PIL import Image,ImageDraw
from pathlib import Path
import hashlib,json,math
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'native-coolled-dynamic/assets'
def make(kind):
 s=4;im=Image.new('RGBA',(72*s,72*s));px=im.load()
 top,bottom=((255,166,111),(245,65,55)) if kind=='bg' else ((243,150,246),(204,43,238))
 for y in range(72*s):
  for x in range(72*s):
   if (x+.5-36*s)**2+(y+.5-36*s)**2<=(36*s)**2:
    t=y/(72*s-1);px[x,y]=tuple(round(a+(b-a)*t) for a,b in zip(top,bottom))+(255,)
 d=ImageDraw.Draw(im);W=(255,255,255,255)
 def box(v):return tuple(round(x*s) for x in v)
 def line(points,width=3):d.line([(round(x*s),round(y*s)) for x,y in points],fill=W,width=round(width*s),joint='curve')
 if kind=='bg':
  d.rounded_rectangle(box((16,20,56,53)),radius=4*s,outline=W,width=3*s)
  d.ellipse(box((24,27,30,33)),fill=W)
  line([(18,44),(27,37),(35,43),(45,33),(54,40)],3)
 else:
  d.arc(box((17,17,55,55)),start=55,end=315,fill=W,width=3*s)
  d.polygon([(49*s,15*s),(56*s,25*s),(44*s,25*s)],fill=W)
  line([(29,31),(47,31)],3);line([(38,31),(38,53)],3)
 return im.resize((72,72),Image.Resampling.LANCZOS)
if __name__=='__main__':
 OUT.mkdir(parents=True,exist_ok=True);entries=[]
 for kind in ('bg','mode'):
  n=f'ic_dynamic_text_{kind}.png';p=OUT/n;make(kind).save(p)
  entries.append({'path':'native-coolled-dynamic/assets/'+n,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'size':[72,72],'mode':'RGBA','meaning':'Background landscape' if kind=='bg' else 'Dynamic text motion mode'})
 p=ROOT/'docs/authored-dynamic-icons/manifest.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps({'basis':'Independently authored simple geometric UI symbols','files':entries},indent=2)+'\n')
