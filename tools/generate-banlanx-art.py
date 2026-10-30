#!/usr/bin/env python3
"""Independent geometric UI artwork. No input artwork, network, or source font read.
Pillow renders these authored primitives; fontTools packages six authored polygons.
Compatibility names do not imply the replacement is Google's Material Icons font.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math, colorsys, hashlib, json
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'assets/native-banlanx'; manifest=[]
BLUE=(42,154,254,255); WHITE=(255,255,255,255)
BOUNDS={'ic_solid_color_selected.png':(2,2,70,70),'ic_solid_color_unselected.png':(2,2,70,70),'ic_effect_selected.png':(1,1,71,71),'ic_effect_unselected.png':(1,1,71,71),'3x-ic_arrow_up.png':(11,28,97,77),'3x-ic_arrow_down.png':(11,31,97,80),'music_note_1.png':(51,22,459,492),'music_note_2.png':(119,24,392,485),'music_note_3.png':(119,25,390,485),'music_note_4.png':(124,20,391,495),'music_note_5.png':(53,21,457,489),'wave_1.png':(0,254,637,637),'wave_2.png':(0,373,1077,637),'wave_3.png':(0,306,1077,637),'wave_bg.png':(0,936,1440,2560)}
def save(im,name,meaning):
 if name in BOUNDS:
  l,t,r,b=BOUNDS[name];ink=im.crop(im.getbbox()).resize((r-l,b-t),Image.Resampling.LANCZOS);im=Image.new('RGBA',im.size);im.paste(ink,(l,t))
 p=OUT/name;im.save(p);manifest.append(dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),size=list(im.size),alphaBounds=list(im.getbbox()),meaning=meaning,origin='independently authored geometry'))
def canvas(w,h):return Image.new('RGBA',(w*3,h*3))
def finish(im,w,h):return im.resize((w,h),Image.Resampling.LANCZOS)
def poly(d,points,fill):d.polygon([(round(x*3),round(y*3)) for x,y in points],fill=fill)
def line(d,points,fill,width):
 q=[(round(x*3),round(y*3)) for x,y in points];d.line(q,fill=fill,width=round(width*3),joint='curve');r=width*1.5
 for x,y in [q[0],q[-1]]:d.ellipse((x-r,y-r,x+r,y+r),fill=fill)
def ellipse(d,b,fill):d.ellipse(tuple(round(v*3) for v in b),fill=fill)
# Mathematical RGB wheel: red east, magenta south-east, blue south-west,
# cyan west, green north-west, yellow north-east. Equal visual stops match painter.
for name in ['circular_gradient-2x.png','circular_gradient-3x.png']:
 im=Image.new('RGBA',(400,400)); pix=im.load()
 for y in range(400):
  for x in range(400):
   dx=(x+.5-200)/200;dy=(y+.5-200)/200;r=math.hypot(dx,dy)
   if r<=1:
    rgb=colorsys.hsv_to_rgb((-math.atan2(dy,dx)/(2*math.pi))%1,r,1);pix[x,y]=tuple(round(v*255) for v in rgb)+(255,)
 save(im,name,'hue/saturation disk; white center, clockwise reverse RGB hue')
# Wave layers preserve original dimensions and upper transparent extent; newly composed sine curves.
for name,w,h,top in [('wave_1.png',637,637,254),('wave_2.png',1077,637,373),('wave_3.png',1077,637,306),('wave_bg.png',1440,2560,936)]:
 im=Image.new('RGBA',(w,h))
 for phase,amp,base,alpha in [(0,0.11,.11,25),(2.1,.085,.14,21),(4.2,.045,.21,18)]:
  layer=Image.new('RGBA',(w,h));d=ImageDraw.Draw(layer);span=h-top
  pts=[(x,top+span*(base+amp*math.sin(x/w*2*math.pi+phase))) for x in range(w)]+[(w-1,h-1),(0,h-1)]
  d.polygon(pts,fill=(255,255,255,alpha));im=Image.alpha_composite(im,layer)
 save(im,name,'translucent overlapping decorative waves')
for direction in ['up','down']:
 im=canvas(108,108);d=ImageDraw.Draw(im);pts=[(16,72),(54,34),(92,72)] if direction=='up' else [(16,36),(54,74),(92,36)];line(d,pts,BLUE,10);save(finish(im,108,108),'3x-ic_arrow_'+direction+'.png','effect selector '+direction+' chevron')
for selected in [False,True]:
 suffix='selected' if selected else 'unselected'
 im=canvas(72,72);d=ImageDraw.Draw(im);points=[(36,4),(46,26),(68,36),(46,46),(36,68),(26,46),(4,36),(26,26)]
 if selected:poly(d,points,BLUE)
 else:line(d,points+[points[0]],WHITE,4)
 save(finish(im,72,72),'ic_effect_'+suffix+'.png','four-point effects sparkle, '+suffix)
 im=canvas(72,72);d=ImageDraw.Draw(im)
 # Authored asymmetric artist palette, bounded 2..70; independent analytic outline.
 pts=[]
 for i in range(121):
  a=2*math.pi*i/120;r=30*(1-.30*math.exp(-((a-5.3)/.5)**2));pts.append((36+r*math.cos(a),36+r*math.sin(a)))
 if selected:poly(d,pts,BLUE)
 else:line(d,pts,WHITE,4)
 for x,y,r in [(29,20,5),(20,34,4),(28,48,4)]:ellipse(d,(x-r,y-r,x+r,y+r),WHITE)
 save(finish(im,72,72),'ic_solid_color_'+suffix+'.png','artist palette, '+suffix)
for n in range(1,6):
 im=canvas(510,510);d=ImageDraw.Draw(im)
 if n in [1,5]:
  line(d,[(180,425),(180,135),(433,40),(433,350)],WHITE,27)
  if n==1:line(d,[(180,200),(433,105)],WHITE,25)
  ellipse(d,(55,370,183,475),WHITE);ellipse(d,(308,295,436,400),WHITE)
  if n==5:
   ellipse(d,(87,397,151,448),(0,0,0,0));ellipse(d,(340,322,404,373),(0,0,0,0))
 else:
  line(d,[(281,422),(281,40)],WHITE,29);ellipse(d,(122,375,291,482),WHITE)
  if n==2:
   line(d,[(281,77),(384,35)],WHITE,27);line(d,[(281,142),(384,100)],WHITE,27)
  else:
   pts=[(281,60),(302,100),(342,129),(365,169),(374,212),(361,259),(341,291)]
   if n==4:poly(d,[(281,60),(330,110),(378,160),(385,200),(365,244),(342,277),(350,214),(322,183),(281,160)],WHITE)
   else:line(d,pts,WHITE,24)
 save(finish(im,510,510),f'music_note_{n}.png','music note alpha mask '+str(n)+'; existing layout/tint/fade retained')
# Six original polygon glyphs, packaged as CFF OpenType with compatibility codepoints.
fb=FontBuilder(512,isTTF=False); cps={0xe516:'minus',0xe047:'plus',0xe09b:'right',0xe404:'more',0xe190:'copy',0xe0c1:'loop'};order=['.notdef']+list(cps.values());fb.setupGlyphOrder(order);fb.setupCharacterMap(cps)
def rect(x,y,w,h):return [(x,y),(x+w,y),(x+w,y+h),(x,y+h)]
def ringbox(x,y,w,h,t):return [rect(x,y,w,t),rect(x,y+h-t,w,t),rect(x,y,t,h),rect(x+w-t,y,t,h)]
shapes={'minus':[rect(105,236,302,40)],'plus':[rect(105,236,302,40),rect(236,105,40,302)],'right':[rect(87,236,280,40),[(263,397),(409,256),(263,115),(235,143),(350,256),(235,369)]],'more':[], 'copy':ringbox(170,65,255,324,31)+[rect(88,140,31,305),rect(88,414,259,31)],'loop':[]}
for y in [128,256,384]:shapes['more'].append([(256+38*math.cos(i*math.tau/24),y+38*math.sin(i*math.tau/24)) for i in range(24)])
for offset in [0,math.pi]:
 pts=[(256+155*math.cos(a+offset),256+155*math.sin(a+offset)) for a in [i*math.pi/38 for i in range(29)]]+[(256+119*math.cos(a+offset),256+119*math.sin(a+offset)) for a in [i*math.pi/38 for i in reversed(range(29))]];shapes['loop'].append(pts)
 shapes['loop'].append([(256+u*math.cos(offset)-v*math.sin(offset),256+u*math.sin(offset)+v*math.cos(offset)) for u,v in [(110,-40),(175,-40),(142,35)]])
chars={}
for name in order:
 pen=T2CharStringPen(512,None)
 for pts in shapes.get(name,[]):
  if sum(pts[i][0]*pts[(i+1)%len(pts)][1]-pts[(i+1)%len(pts)][0]*pts[i][1] for i in range(len(pts)))<0:pts=list(reversed(pts))
  pen.moveTo(pts[0]);[pen.lineTo(p) for p in pts[1:]];pen.closePath()
 chars[name]=pen.getCharString()
fb.setupCFF('SmartEaseAuthoredUI',{'FullName':'SmartEase Authored UI','FamilyName':'SmartEase Authored UI','Weight':'Regular'},chars,{})
fb.setupHorizontalMetrics({n:(512,0) for n in order});fb.setupHorizontalHeader(ascent=512,descent=0);fb.setupNameTable({'familyName':'SmartEase Authored UI','styleName':'Regular','uniqueFontIdentifier':'SmartEaseAuthoredUI-1','fullName':'SmartEase Authored UI','psName':'SmartEaseAuthoredUI','version':'Version 1.0'});fb.setupOS2(sTypoAscender=512,sTypoDescender=0,usWinAscent=512,usWinDescent=0);fb.setupPost();fb.font['head'].created=fb.font['head'].modified=2082844800;fb.font.recalcTimestamp=False
p=OUT/'MaterialIcons-Regular.otf';fb.save(p);manifest.append(dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),origin='independently authored six-glyph font; compatibility filename only',codepoints={hex(k):v for k,v in cps.items()}))
(OUT/'authored-provenance.json').write_text(json.dumps({'generator':'tools/generate-banlanx-art.py','scope':'17 raster replacements and six-glyph font only; timer-empty.png remains unreplaced','assets':manifest},indent=2)+'\n')
(ROOT/'tests/banlanx-notes-asset-fixtures.json').write_text(json.dumps({Path(a['path']).name:a['sha256'] for a in manifest if 'music_note_' in a['path']},indent=2)+'\n')
