#!/usr/bin/env python3
"""Authored picker previews using existing functional palette/state APIs.
No original artwork/font inputs. Does not write runtime models, wire constants or code.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,json,math,hashlib
R=Path(__file__).resolve().parents[1];contracts=json.loads((R/'tools/frame-color-contracts.json').read_text());A=R/'native-coolled-text/assets';records=[]
js="""const F=require('./native-coolled-text-frame.js'),W=require('./native-coolled-text-wire.js'),M=require('./native-coolled-text-model.js');console.log(JSON.stringify({frames:Array.from({length:20},(_,i)=>({id:i+1,name:M.FRAMES[i],pattern:F.patterns[i+1],state:F.state(i+1,2,230,0)})),auto:Array.from({length:28},(_,i)=>{const b=W.autoContent(i+1,230,{x:0,y:0,width:96,height:16});return{id:i+1,control:b.slice(20,24),palette:b.slice(26)}})}));"""
data=json.loads(subprocess.check_output(['node','-e',js],cwd=R,text=True))
def rgb(n):return(n>>16&255,n>>8&255,n&255)
def save(im,row,meaning):
 p=R/row['path'];im.save(p);records.append({'path':row['path'],'size':row['size'],'alphaBounds':list(im.getbbox()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'meaning':meaning})
def glyph_mask():
 # Independently constructed A/B stroke geometry; no installed or bundled font.
 im=Image.new('L',(198*3,153*3));d=ImageDraw.Draw(im)
 def line(points,w):d.line([(round(x*3),round(y*3)) for x,y in points],fill=255,width=w*3,joint='curve')
 line([(17,127),(52,27),(87,127)],12);line([(29,94),(76,94)],10)
 line([(113,127),(113,27),(153,27)],12);line([(113,77),(153,77)],11);line([(113,127),(153,127)],12)
 for b in [(126,27,179,77),(126,77,179,127)]:d.arc(tuple(v*3 for v in b),-90,90,fill=255,width=12*3)
 return im.resize((198,153),Image.Resampling.LANCZOS)
mask=glyph_mask()
def palette(desc):
 p=desc['palette'];return [(p[i]*17,(p[i+1]>>4)*17,(p[i+1]&15)*17) for i in range(0,len(p),2)]
def interp(colors,q):
 q=q%1*len(colors);i=int(q);f=q-i;a=colors[i%len(colors)];b=colors[(i+1)%len(colors)];return tuple(round(x+(y-x)*f) for x,y in zip(a,b))
def color_at(desc,u,v,t):
 family,speed,variant,_=desc['control'];colors=palette(desc);sign=-1 if variant in [1,3,5] else 1
 if family==6:
  # Sequential two-color wipe, not a repeating multiband palette field.
  # Variant0 enters from the right; variant1 enters from the left.
  phase=(t%1)*len(colors);index=int(phase);progress=phase-index
  entering=u>=1-progress if variant==0 else u<progress
  return colors[(index+(1 if entering else 0))%len(colors)]
 if family==1:q=u*.8+sign*t
 elif family==2:q=u
 elif family==3:q=v*.65+sign*t
 elif family==4:q=abs(v-.5)*1.3+sign*t
 elif family==5:q=math.floor(t*len(colors))/len(colors)
 elif family==7:q=(u+v)*.5+sign*t
 elif family==8:q=(u-v)*.6+sign*t
 else:raise ValueError(family)
 return colors[int((q%1)*len(colors))%len(colors)] if family==5 else interp(colors,q)
def auto_frame(desc,t):
 im=Image.new('RGB',(198,153),(43,42,42));px=im.load();mk=mask.load()
 for y in range(153):
  for x in range(198):
   alpha=mk[x,y]/255
   if not alpha:continue
   c=color_at(desc,x/198,y/153,t)
   px[x,y]=tuple(round(43*(1-alpha)+z*alpha) for z in c)
 return im
for row in contracts['assets']:
 name=Path(row['path']).name
 if name.startswith('ic_auto_color'):
  if name=='ic_auto_color.png':save(auto_frame(data['auto'][16],0),row,'static Colorful control illustration with authored AB geometry');continue
  id=int(name[len('ic_auto_color'):-4]);desc=data['auto'][id-1];N=len(row['durations']);images=[auto_frame(desc,i/max(1,N)) for i in range(N)];p=R/row['path'];images[0].save(p,save_all=True,append_images=images[1:],duration=row['durations'],loop=row['loop'],disposal=2,optimize=False)
  im=Image.open(p);dur=[]
  for i in range(im.n_frames):im.seek(i);dur.append(im.info.get('duration',0))
  records.append({'path':row['path'],'size':row['size'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'choiceId':id,'controlFamily':desc['control'][0],'variant':desc['control'][2],'frames':im.n_frames,'durations':dur,'loop':row['loop'],'meaning':'Authored illustrative color math using existing autoContent palette; not hardware animation parity'})
 elif name=='ic_frame_32.png':
  im=Image.new('RGBA',(72,72));d=ImageDraw.Draw(im);d.ellipse((0,0,71,71),fill='#eab73d');d.rectangle((18,16,50,52),outline='white',width=4);d.line([(34,17),(34,51)],fill='white',width=3);d.line([(19,34),(50,34)],fill='white',width=3);d.line([(35,57),(58,33)],fill='white',width=7);save(im,row,'Frame settings: grid with edit pencil')
 else:
  id=0 if name=='ic_no_frame.png' else 1 if name=='ic_coolledu_frame_0.png' else int(name[len('ic_frame_'):-4])+1
  im=Image.new('RGBA',(96,96));d=ImageDraw.Draw(im)
  if id==0:
   d.rectangle((0,0,95,95),outline='#414141',width=6);d.line([(48,6),(48,89)],fill='#414141',width=2);d.line([(6,48),(89,48)],fill='#414141',width=2)
  else:
   pat=data['frames'][id-1]['pattern'];pts=[]
   for x in range(0,96,6):pts.append((x,0))
   for y in range(6,96,6):pts.append((90,y))
   for x in range(84,-1,-6):pts.append((x,90))
   for y in range(84,0,-6):pts.append((0,y))
   for i,(x,y) in enumerate(pts):d.rectangle((x,y,x+5,y+5),fill=rgb(pat[i%len(pat)])+(255,))
  save(im,row,'No frame grid' if id==0 else 'Frame '+str(id)+': '+data['frames'][id-1]['name']+'; square presentation of runtime edge pattern')
manifest={'generator':'tools/generate-frame-color-previews.py','scope':'Preview illustrations only. Original runtime models, palettes, control bytes and wire encoder are unchanged.','assets':records}
(A/'authored-frame-color-provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Contact sheet is generated from authored outputs only.
im=Image.new('RGB',(1050,math.ceil(len(records)/7)*155),'#45505b');d=ImageDraw.Draw(im)
for i,a in enumerate(records):
 art=Image.open(R/a['path']).convert('RGBA');art.thumbnail((140,112));x=i%7*150;y=i//7*155;im.paste(art,(x,y),art);d.text((x,y+115),Path(a['path']).name,fill='white')
im.save(R/'docs/authored-frame-color/contact-sheet.png');print('Generated',len(records),'preview assets')
