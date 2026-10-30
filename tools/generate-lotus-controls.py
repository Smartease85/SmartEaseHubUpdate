#!/usr/bin/env python3
"""Independently authored Lotus control geometry and mode demo animations.
Reads dimensions/cadence contracts only, NEVER input artwork or original pixels.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import math,colorsys,json,hashlib
R=Path(__file__).resolve().parents[1];spec=json.loads((R/'tools/lotus-control-contracts.json').read_text());records=[]
S=4
WHITE=(255,255,255,255);GRAY=(75,96,109,255);PALE=(206,219,226,255)
def line(d,pts,c=WHITE,w=6):
 q=[(round(x*S),round(y*S)) for x,y in pts];d.line(q,fill=c,width=round(w*S),joint='curve');rad=w*S/2
 for x,y in [q[0],q[-1]]:d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=c)
def ell(d,b,c=WHITE,outline=None,w=5):d.ellipse(tuple(round(v*S) for v in b),fill=c,outline=outline,width=round(w*S))
def rect(d,b,c=WHITE,outline=None,w=5):d.rectangle(tuple(round(v*S) for v in b),fill=c,outline=outline,width=round(w*S))
def poly(d,p,c=WHITE):d.polygon([(round(x*S),round(y*S)) for x,y in p],fill=c)
def arc(d,b,start,end,c=WHITE,w=6):d.arc(tuple(round(v*S) for v in b),start,end,fill=c,width=round(w*S))
def tint(im,kind):
 if kind=='white':return im
 a=im.getchannel('A');out=Image.new('RGBA',im.size);p=out.load()
 for y in range(im.height):
  for x in range(im.width):
   if kind=='gradient':t=x/max(1,im.width-1);c=tuple(round(a+(b-a)*t) for a,b in zip((246,74,89),(111,151,255)))
   elif kind=='gray':c=GRAY[:3]
   elif kind=='ink':c=(11,25,37)
   elif kind=='amber':c=(255,182,0)
   else:c=PALE[:3]
   p[x,y]=c+(255,)
 out.putalpha(a);return out
def icon(kind):
 im=Image.new('RGBA',(400,400));d=ImageDraw.Draw(im)
 if kind=='power':arc(d,(12,12,88,88),-55,235,w=8);line(d,[(50,6),(50,45)],w=8)
 elif kind in ['play','next','prev','pause']:
  if kind=='pause':line(d,[(36,30),(36,70)],w=9);line(d,[(64,30),(64,70)],w=9);ell(d,(4,4,96,96),None,WHITE,6)
  else:
   if kind=='play':ell(d,(4,4,96,96),None,WHITE,6)
   x=26 if kind=='next' else 35;line(d,[(x,15),(x,85),(75,50),(x,15)],w=7)
   if kind in ['next','prev']:line(d,[(88,15),(88,85)],w=7)
   if kind=='prev':im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 elif kind=='note':
  line(d,[(36,73),(36,23),(83,7),(83,63)],w=7);ell(d,(11,65,37,88),None,WHITE,5);ell(d,(58,55,84,78),None,WHITE,5)
 elif kind=='rhythm':
  line(d,[(39,76),(55,30),(87,41),(72,87)],w=9);ell(d,(20,65,42,87));ell(d,(52,76,74,98));line(d,[(17,39),(9,14),(24,9)],w=7);ell(d,(7,34,25,52))
 elif kind in ['clock','alarm']:
  ell(d,(12,12,88,88),WHITE if kind=='alarm' else None,WHITE,6);line(d,[(50,26),(50,50),(67,66)],(0,0,0,0) if kind=='alarm' else WHITE,6)
  if kind=='alarm':line(d,[(13,10),(24,3)],w=13);line(d,[(77,3),(88,10)],w=13);line(d,[(25,85),(19,96)],w=7);line(d,[(75,85),(81,96)],w=7)
 elif kind=='sliders':
  for x,y in [(20,35),(50,65),(80,24)]:line(d,[(x,5),(x,95)],w=5);ell(d,(x-11,y-11,x+11,y+11),(0,0,0,0),WHITE,5)
 elif kind=='palette':
  pts=[(50+43*math.cos(a)*(1-.25*math.exp(-((a-.9)/.45)**2)),50+43*math.sin(a)) for a in [i*math.tau/100 for i in range(101)]];line(d,pts,w=5)
  for x,y in [(30,24),(47,17),(64,23),(77,38),(64,72)]:ell(d,(x-5,y-5,x+5,y+5))
 elif kind=='clapper':
  line(d,[(10,40),(90,40),(90,90),(10,90),(10,40)],w=6);poly(d,[(10,40),(7,22),(87,5),(91,22)],WHITE);rect(d,(12,49,88,54));
  for x in [24,46,68]:line(d,[(x,40),(x-12,53)],w=4)
 elif kind=='edit':
  line(d,[(46,15),(14,15),(14,87),(86,87),(86,57)],w=10);poly(d,[(36,62),(70,28),(83,41),(49,75),(32,79)]);line(d,[(77,21),(90,34)],w=12)
 elif kind=='default':
  line(d,[(8,15),(14,22),(27,5)],w=5)
  for y in [17,50,83]:line(d,[(40,y),(92,y)],w=6)
  for y in [41,74]:rect(d,(7,y,23,y+16),None,WHITE,4)
 elif kind=='text':
  line(d,[(15,5),(64,5),(88,29),(88,95),(15,95),(15,5)],w=5);line(d,[(63,5),(63,29),(88,29)],w=4)
  for y,x in [(36,30),(54,68),(72,68)]:line(d,[(29,y),(x+8,y)],w=4)
 elif kind=='gif':
  d.rounded_rectangle((5*S,5*S,95*S,95*S),radius=15*S,outline=WHITE,width=5*S)
  # Original stroke-letter G I F; no bundled text font.
  line(d,[(38,36),(23,36),(23,64),(39,64),(39,52),(32,52)],w=3);line(d,[(50,36),(50,64)],w=3);line(d,[(66,64),(66,36),(82,36)],w=3);line(d,[(66,49),(78,49)],w=3);ell(d,(8,8,24,24));ell(d,(76,76,92,92))
 elif kind=='danger':
  line(d,[(50,5),(95,91),(5,91),(50,5)],w=6);line(d,[(50,34),(50,61)],w=7);ell(d,(46,74,54,82))
 elif kind in ['open','closed']:
  d.rounded_rectangle((4*S,23*S,96*S,77*S),radius=27*S,outline=WHITE,width=5*S);cx=70 if kind=='open' else 30;ell(d,(cx-19,31,cx+19,69))
 elif kind=='plus':line(d,[(50,5),(50,95)],w=8);line(d,[(5,50),(95,50)],w=8)
 elif kind=='beehive':
  for x,y in [(28,24),(70,50),(28,77)]:poly(d,[(x+22*math.cos(i*math.tau/6),y+22*math.sin(i*math.tau/6)) for i in range(6)])
 elif kind=='tabs':
  rect(d,(0,29,100,71));ell(d,(18,34,37,53),(0,0,0,0));ell(d,(65,34,84,53),(0,0,0,0));line(d,[(14,63),(40,63)],(0,0,0,0),3);line(d,[(60,63),(88,63)],(0,0,0,0),3)
 elif kind in ['loop','one','shuffle']:
  if kind=='shuffle':line(d,[(5,23),(25,23),(70,77),(92,77)],w=6);line(d,[(5,77),(25,77),(70,23),(92,23)],w=6)
  else:line(d,[(10,40),(10,20),(89,20)],w=6);line(d,[(90,60),(90,80),(11,80)],w=6)
  line(d,[(77,8),(91,20),(77,32)],w=5);line(d,[(23,68),(9,80),(23,92)],w=5)
  if kind=='one':line(d,[(45,40),(53,34),(53,63)],w=4)
 elif kind=='list':
  for y in [25,48,74]:line(d,[(53,y),(94,y)],w=5)
  line(d,[(29,75),(29,10),(43,7)],w=6);ell(d,(7,65,31,85))
 elif kind=='mic':
  ell(d,(24,2,76,47));line(d,[(42,43),(33,73)],w=17);line(d,[(31,83),(21,96)],w=5);line(d,[(26,15),(69,36)],(0,0,0,0),3)
 elif kind=='phone':
  d.rounded_rectangle((32*S,5*S,68*S,60*S),radius=18*S,fill=WHITE);arc(d,(19,23,81,79),0,180,w=7);line(d,[(50,79),(50,94)],w=6);line(d,[(34,94),(66,94)],w=6)
 else:raise ValueError(kind)
 return im

def put(im,row,meaning):
 w,h=row['size'];l,t,r,b=row['bounds'];crop=im.crop(im.getbbox());ink=crop.resize((r-l,b-t),Image.Resampling.LANCZOS);out=Image.new('RGBA',(w,h));out.paste(ink,(l,t));p=R/row['path'];out.save(p);records.append(dict(path=row['path'],size=row['size'],alphaBounds=list(out.getbbox()),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),meaning=meaning,origin='independently authored geometry'))

def gradients(row):
 name=Path(row['path']).stem;w,h=row['size'];im=Image.new('RGBA',(w,h));p=im.load()
 for y in range(h):
  for x in range(w):
   dx=(x+.5-w/2)/(w/2);dy=(y+.5-h/2)/(h/2);r=math.hypot(dx,dy);a=math.atan2(dy,dx)/math.tau
   if r>1:continue
   if name in ['ic_palette_bg','ic_big_solorwheel']:hue=(-a if name=='ic_palette_bg' else a)%1;sat=min(1,r);v=1;alpha=round(255*min(1,(1-r)*min(w,h)/2))
   else:
    # Muted cyclic switch-preview family; white center for RGB preview, green inner marker for ring.
    phase=(a%1)*4;idx=int(phase);anchors=[.75,1,1.14,1.29,1.75];hue=(anchors[idx]+(anchors[idx+1]-anchors[idx])*(phase-idx))%1;sat=min(1,r*r*.86);v=1-.12*r;alpha=255
   rgb=tuple(round(v*255) for v in colorsys.hsv_to_rgb(hue,sat,v))
   if name=='ic_ring' and r<.57:
    rgb=(0,255,32);alpha=255 if r<.28 else round(255*max(0,(.57-r)/.29)**2)
   p[x,y]=rgb+(alpha,)
 put(im,row,'mathematical '+name+'; documented source-compatible orientation')

for row in spec:
 p=Path(row['path']);n=p.stem;folder=p.parent.name
 if p.suffix=='.gif':continue
 if folder=='color':gradients(row);continue
 if folder=='beehive' and n in ['ic_hc_timing','ic_hc_on','ic_hc_mode','ic_hc_rhythm','ic_hc_scene','ic_hc_palette']:
  w,h=row['size'];im=Image.new('RGBA',(w,h));mask=Image.new('L',(w,h));ImageDraw.Draw(mask).polygon([(w/2,0),(w-1,h/4),(w-1,h*3/4),(w/2,h-1),(0,h*3/4),(0,h/4)],fill=255);pix=im.load();center={'timing':(213,230,34),'on':(220,225,222),'mode':(0,180,208),'rhythm':(177,34,130),'scene':(0,150,195),'palette':(0,233,157)}[n[6:]]
  for y in range(h):
   for x in range(w):
    t=math.exp(-7*((x-w/2)**2+(y-h/2)**2)/(w*w));pix[x,y]=tuple(round(65+(v-65)*t) for v in center)+(255,)
  im.putalpha(mask);put(im,row,'hexagonal menu background '+n[6:]);continue
 kind=None;color='white'
 if 'mode_style_' in n:kind=n.split('mode_style_')[1]
 elif folder=='functions':kind='danger';color='amber'
 elif folder=='theme':kind='open' if 'Open' in n else 'closed';color='white' if kind=='open' else 'gray'
 elif folder=='library':kind='plus';color='pale'
 elif n in ['ic_menu_beehive','ic_menu_tab_bar']:kind='beehive' if n.endswith('beehive') else 'tabs'
 elif n.startswith('ic_tab_'):kind={'mode':'sliders','timing':'clock','music':'note','scene':'clapper','palette':'palette'}[n.split('_')[2]];color='gradient' if n.endswith('_s') else 'gray'
 elif n.startswith('ic_bottom_'):
  im=Image.new('RGBA',(400,400));d=ImageDraw.Draw(im);ell(d,(5,5,95,95),WHITE if n.endswith('_on') else GRAY);power=icon('power').resize((220,220));power=tint(power,'ink');im.alpha_composite(power,(90,90));put(im,row,'power button '+n);continue
 elif n.startswith('ic_hc_inner_'):kind={'timing':'alarm','rhythm':'rhythm','mode':'sliders','edit':'edit','scene':'clapper','palette':'palette'}[n[12:]]
 elif n.startswith('ic_hc_on_'):kind='power';color='white' if n.endswith('_s') else 'gray'
 elif n.startswith('ic_rhythm_tab_'):kind={'mic':'mic','music':'note','phone':'phone'}[n.split('_')[3]];color='gradient' if n.endswith('_on') else 'pale'
 elif n.startswith('ic_music_'):kind={'fill':'play','stop':'pause','prev':'prev','next':'next','one':'one','loop':'loop','shuffle':'shuffle'}[n[9:]];color='pale'
 elif n=='music_list':kind='list'
 if not kind:raise ValueError(n)
 put(tint(icon(kind),color),row,kind+' '+color)

# Serpentine light-strip mode illustrations, independent path/animation formulas.
# 428x316 canvas and individual 50ms frame durations/loop counts retained.
path=[]
for x in range(24,405,9):path.append((x,28))
for i in range(1,13):a=-math.pi/2+i*math.pi/12;path.append((392+23*math.cos(a),74+46*math.sin(a)))
for x in range(392,24,-9):path.append((x,120))
for i in range(1,13):a=-math.pi/2-i*math.pi/12;path.append((36+23*math.cos(a),166+46*math.sin(a)))
for x in range(36,393,9):path.append((x,212))
for i in range(1,13):a=-math.pi/2+i*math.pi/12;path.append((392+23*math.cos(a),258+46*math.sin(a)))
for x in range(392,24,-9):path.append((x,304))
for row in spec:
 if not row['path'].endswith('.gif'):continue
 name=Path(row['path']).stem;light=name.startswith('d_');mode=name.replace('d_','').replace('gif_music_','');N=len(row['durations']);frames=[]
 for frame in range(N):
  im=Image.new('RGB',(428,316),(248,250,252) if light else (11,25,37));d=ImageDraw.Draw(im);d.line(path,fill=(218,229,237) if light else (74,91,106),width=12,joint='curve');t=frame/N;beat=(.5+.5*math.sin(t*math.tau*6))
  for i,(x,y) in enumerate(path):
   q=i/(len(path)-1);lit=False;level=1;hue=0
   if mode.startswith('energy'):lit=q<.12+.75*beat;level=max(.18,1-q);hue=q*.85 if mode.endswith('two') else 0
   elif mode.startswith('rhythm'):lit=(i+int(t*180))%18<9;level=.25+.75*beat;hue=(q+t)%1 if mode.endswith('one') else 0
   elif mode.startswith('spectrum'):lit=(i//12)%4<round(1+2*beat);level=.4+.6*beat;hue=(i//12%6)/6 if mode.endswith('one') else 0
   elif mode.startswith('scroll'):lit=(q-t*3)%(.25 if mode.endswith('one') else .12)<.035;hue=0 if mode.endswith('one') else (q+t)%1
   if lit:
    c=tuple(round(v*255) for v in colorsys.hsv_to_rgb(hue,1,level));d.ellipse((x-3,y-3,x+3,y+3),fill=c)
  frames.append(im)
 p=R/row['path'];frames[0].save(p,save_all=True,append_images=frames[1:],duration=row['durations'],loop=row['loop'],optimize=False,disposal=2)
 encoded=Image.open(p);durations=[]
 for j in range(encoded.n_frames):encoded.seek(j);durations.append(encoded.info['duration'])
 records.append(dict(path=row['path'],size=row['size'],frames=encoded.n_frames,durations=durations,sourceTimelineFrames=N,sourceTimelineDuration=sum(row['durations']),loop=row['loop'],sha256=hashlib.sha256(p.read_bytes()).hexdigest(),meaning=mode+' light-strip demonstration, '+('light' if light else 'dark')+' theme',origin='independent geometric animation'))
manifest={'generator':'tools/generate-lotus-controls.py','assets':records,'notice':'Authored replacements, not original APK pixels. Runtime controls, DSP, command mapping and transport unchanged.'}
(R/'assets/native-lotus/authored-controls-provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Generated',len(records),'control/demo assets')
# Replace all accompanying byte-provenance records; never label authored bytes as APK bytes.
for folder,filename,key in [('bottom','provenance.json','assets'),('beehive','provenance.json','assets'),('functions','provenance.json','assets'),('color','provenance.json','records'),('theme','collapse-icons-provenance.json','records'),('rhythm','asset-provenance.json','records')]:
 entries=[]
 for a in records:
  p=Path(a['path'])
  if p.parent.name!=folder:continue
  e=dict(a);e.update(name=p.stem,path=a['path'],src=a['path'],asset=a['path'],bytes=(R/a['path']).stat().st_size)
  if folder=='beehive':e['density']=480
  if folder=='theme':e['getter']=p.stem
  entries.append(e)
 (R/'assets/native-lotus'/folder/filename).write_text(json.dumps({'source':'Independently authored geometric UI artwork','generator':'tools/generate-lotus-controls.py',key:entries},indent=2)+'\n')
for filename in ['music-assets.json','tab-assets.json']:
 p=R/'assets/native-lotus/rhythm'/filename;data=json.loads(p.read_text());items=data if isinstance(data,list) else data['icons']
 for e in items:
  for k in ['apkPath','resourceId','resourceType']:e.pop(k,None)
  name=e['name'];a=next(a for a in records if Path(a['path']).stem==name);e.update(asset=a['path'],sha256=a['sha256'],origin='independently authored geometry')
 p.write_text(json.dumps(data,indent=2)+'\n')
# Authored inspection sheets replace the old source-art bottom sheet too.
def sheet(items,w,cellw,cellh,dest):
 im=Image.new('RGB',(w,math.ceil(len(items)/(w//cellw))*cellh),'#46544c');d=ImageDraw.Draw(im)
 for i,a in enumerate(items):
  art=Image.open(R/a['path']);art.seek(min(getattr(art,'n_frames',1)-1,11));art=art.convert('RGBA');art.thumbnail((cellw-12,cellh-36));x=i%(w//cellw)*cellw;y=i//(w//cellw)*cellh;im.paste(art,(x,y),art);d.text((x,y+cellh-32),Path(a['path']).stem.replace('ic_',''),fill='white')
 im.save(R/dest)
sheet(records,994,142,150,'docs/authored-lotus-controls/contact-sheet.png')
sheet([a for a in records if '/bottom/' in a['path']],600,100,150,'assets/native-lotus/bottom/contact-sheet.png')
