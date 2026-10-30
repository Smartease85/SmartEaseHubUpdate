#!/usr/bin/env python3
"""Authored hardware pictograms. Input spec is selector IDs + dimensions only.
No source artwork or fonts are read. All geometry below is independently drawn.
"""
from pathlib import Path
import json,math,colorsys,hashlib
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];spec=json.loads((R/'tools/lotus-hardware-spec.json').read_text());S=3
meanings={}
def line(pts,w=5):
 p=[(round(x*S),round(y*S)) for x,y in pts];d.line(p,fill=255,width=round(w*S),joint='curve')
 for x,y in [p[0],p[-1]]:d.ellipse((x-w*S/2,y-w*S/2,x+w*S/2,y+w*S/2),fill=255)
def circle(x,y,r,w=5,fill=False):
 b=((x-r)*S,(y-r)*S,(x+r)*S,(y+r)*S);d.ellipse(b,fill=255 if fill else None,outline=255,width=round(w*S))
def arc(x,y,r,a,b,w=5):line([(x+r*math.cos(t),y+r*math.sin(t)) for t in [a+(b-a)*i/70 for i in range(71)]],w)
def box(x,y,w,h,lw=5):line([(x,y),(x+w,y),(x+w,y+h),(x,y+h),(x,y)],lw)
def bulb(x,y,r):
 arc(x,y,r,math.pi*.75,math.pi*2.25,4);line([(x-r*.7,y+r*.7),(x-r*.5,y+r*1.5),(x+r*.5,y+r*1.5),(x+r*.7,y+r*.7)],4);line([(x-r*.35,y+r*1.8),(x+r*.35,y+r*1.8)],4)
def rays(x,y,r,n=8):
 for i in range(n):
  a=i*math.tau/n;line([(x+(r+10)*math.cos(a),y+(r+10)*math.sin(a)),(x+(r+22)*math.cos(a),y+(r+22)*math.sin(a))],4)
def digit(n,x,y,z=1):
 paths={3:[[(0,0),(15,0),(15,15),(0,15)],[(15,15),(15,30),(0,30)]],4:[[(0,0),(0,15),(15,15)],[(15,0),(15,30)]],5:[[(15,0),(0,0),(0,15),(15,15),(15,30),(0,30)]]}
 for p in paths[n]:line([(x+a*z,y+b*z) for a,b in p],4)
def coil():
 pts=[(112+(20+56*i/300)*math.cos(i/300*math.pi*5),118+(20+56*i/300)*math.sin(i/300*math.pi*5)) for i in range(301)];line(pts,7);line([pts[-1],(212,205)],7)
def wave(y=128,phase=0):return [(x,y+14*math.sin(x/180*math.tau+phase)) for x in range(20,237)]
def ribbon(number,segmented=False,helix=False):
 if helix:pts=[(128+46*math.sin(i/210*math.pi*3),22+i) for i in range(211)]
 else:pts=[(210,35),(45,110),(200,135),(62,215)]
 line(pts,14 if not helix else 8)
 if segmented:
  # Individual LED cells make addressable strip visually distinct from plain ribbon.
  if helix:
   for i in range(8,205,16):
    x=128+46*math.sin(i/210*math.pi*3);y=22+i;d.ellipse(((x-2)*S,(y-2)*S,(x+2)*S,(y+2)*S),fill=0)
  else:
   for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
    for j in range(1,9):
     t=j/9;x=x1+(x2-x1)*t;y=y1+(y2-y1)*t;d.ellipse(((x-3)*S,(y-3)*S,(x+3)*S,(y+3)*S),fill=0)
 digit(number,35 if not helix else 191,20,.8)
def strings(rows=1):
 for row in range(rows):
  y=35+row*105;line([(x,y+22*math.sin((x-20)/215*math.pi)) for x in range(20,236)],4)
  for x in [50,100,150,200]:
   yy=y+22*math.sin((x-20)/215*math.pi);line([(x,yy),(x,yy+22)],3);circle(x,yy+40,15,4)
def star(x,y,r):
 pts=[]
 for i in range(10):a=-math.pi/2+i*math.pi/5;rr=r if i%2==0 else r*.43;pts.append((x+rr*math.cos(a),y+rr*math.sin(a)))
 line(pts+[pts[0]],3)
for rec in spec:
 name=rec['name'];mask=Image.new('L',(256*S,256*S));d=ImageDraw.Draw(mask);rainbow=False;meaning=''
 if name.startswith('ic_colorful') and name[11:12] in '345' and len(name)==14:
  n=int(name[11]);ribbon(n);meaning=f'{n}-channel continuous light strip'
 elif name in ['ic_colorful3_s','ic_colorful4_s','ic_colorful5_s']:
  n=int(name[11]);ribbon(n);meaning=f'{n}-channel continuous light strip'
 elif name in ['ic_symphony3_s','ic_symphony4_s','ic_symphony5_s']:
  n=int(name[11]);ribbon(n,True);rainbow=True;meaning=f'{n}-channel addressable LED strip with discrete cells'
 elif name.startswith('ic_icons'):
  n=int(name[8:])
  if n<=6:ribbon(3+(n-1)%3,True,True);rainbow=n>=4;meaning=f'{3+(n-1)%3}-channel '+('rainbow' if rainbow else 'gradient')+' coiled strip'
  elif n==7:
   line([(128+(.35*i)*math.sin(i*.12),20+i) for i in range(210)],3)
   for i in range(0,210,18):circle(128+(.35*i)*math.sin(i*.12),20+i,6,fill=True)
   meaning='spiral decorative string lights'
  elif n==8:ribbon(3,True);meaning='segmented zigzag light strip'
  elif n==9:
   for k in [-12,0,12]:line([(x,120+k+30*math.sin(x/35)) for x in range(20,236)],5)
   rays(128,95,22,5);meaning='three flexible glowing light cables'
  elif n in [10,12]:
   coil();meaning='light-strip reel'+(' with twin rim' if n==12 else '')
   if n==12:circle(112,118,89,5)
  elif n==11:
   line([(20,100),(236,100)],6);line([(20,170),(236,170)],6)
   for x in range(40,230,35):line([(x,120),(x,150)],5)
   for x in [85,128,171]:line([(x,70),(x+(x-128)*.2,40)],5)
   meaning='linear LED bar with emitters'
  elif n==13:bulb(128,105,65);arc(128,105,90,0,math.pi*1.8,5);meaning='round lamp with outer light ring'
  elif n==14:strings();meaning='hanging globe string lights'
  elif n==15:line([(20,220),(75,220),(75,155),(130,155),(130,90),(185,90),(185,30),(235,30)],8);meaning='stair-edge lights'
  else:
   line([(20,150),(35,100),(70,85),(88,55),(173,55),(192,85),(223,100),(238,150),(238,190),(20,190),(20,150)],5);line([(70,85),(192,85)],4)
   line([(35,120),(75,130)],6);line([(183,130),(222,120)],6);line([(65,170),(90,150),(170,150),(195,170)],4);meaning='front-view vehicle lighting'
 elif name=='ic_br_colorful_sync_light_s':
  bulb(128,123,31)
  for rr in [60,93]:arc(128,128,rr,-.85,.85,7);arc(128,128,rr,math.pi-.85,math.pi+.85,7)
  meaning='wireless synchronized bulb'
 elif name=='ic_colorful_light_s':
  line([(50,165),(50,110),(72,70),(184,70),(206,110),(206,165),(50,165)],6);line([(50,110),(206,110)],5);line([(55,165),(55,185)],7);line([(200,165),(200,185)],7);line([(70,130),(90,130)],7);line([(167,130),(187,130)],7);rays(128,125,105,12);meaning='vehicle accent lighting'
 elif name=='ic_colorful_sync_light_s':strings(2);meaning='two synchronized hanging-light strings'
 elif name=='ic_curtain_lamp_s':
  line(wave(35),5)
  for x in [35,80,125,170,215]:
   line([(x,35),(x,220)],2)
   for y in range(70,230,40):circle(x,y,9,fill=True)
  meaning='five-drop curtain light'
 elif name=='ic_eave_lamp_s':
  line([(35,118),(35,222),(215,222),(215,118)],5);box(103,165,48,57,4);line([(15,115),(125,20),(240,115)],6)
  for i in range(1,12):x=15+i*20;y=115-95*(1-abs(x-125)/110);circle(x,y,4,fill=True)
  rainbow=True;meaning='roof-eave lighting'
 elif name in ['ic_fan_lamp_s','ic_fires_lamp_s']:
  cx=128;cy=105 if 'fires' in name else 128;circle(cx,cy,18,5)
  for i in range(16):
   a=i*math.tau/16;rr=80 if i%2 else 104;line([(cx+20*math.cos(a),cy+20*math.sin(a)),(cx+rr*math.cos(a),cy+rr*math.sin(a))],2);circle(cx+rr*math.cos(a),cy+rr*math.sin(a),7,fill=True)
  if 'fires' in name:
   line([(128,125),(114,200),(137,245)],4)
   for x,y in [(119,170),(117,210),(137,245)]:circle(x,y,5,fill=True)
  meaning='radial firework light'+(' with wired stem' if 'fires' in name else '')
 elif name=='ic_fires_flag_lamp_s':
  circle(128,128,108,17);circle(128,128,25,7)
  for i in range(4):a=math.pi/4+i*math.pi/2;line([(128+30*math.cos(a),128+30*math.sin(a)),(128+95*math.cos(a),128+95*math.sin(a))],13)
  for i in range(6):a=i*math.tau/6;circle(128+88*math.cos(a),128+88*math.sin(a),7,fill=True)
  meaning='spoked light reel'
 elif name=='ic_flowing_light_l':
  for x in [60,128,196]:line([(x+16*math.sin(y/30),y) for y in range(20,237)],12)
  meaning='three flowing light trails'
 elif name=='ic_mesh_lamp_s':
  for y in [65,128,191]:line(wave(y),10)
  meaning='three parallel mesh-light wave rows'
 elif name=='ic_motor_l':
  arc(128,120,90,math.pi*.83,math.pi*2.17,8);line([(51,169),(30,215),(226,215),(205,169)],8);circle(128,120,11,fill=True)
  for i in range(3):a=i*math.tau/3;line([(128,120),(128+48*math.cos(a),120+48*math.sin(a)),(128+48*math.cos(a)-8,120+48*math.sin(a)-14)],9)
  meaning='three-blade motor or fan in housing'
 elif name=='ic_stair_lamp_s':
  line([(15,40),(60,40),(60,95),(105,95),(105,150),(150,150),(150,205),(210,205)],13);line([(125,45),(225,135)],13)
  for i in range(6):line([(140+i*14,30+i*13),(146+i*14,20+i*13)],4)
  meaning='illuminated staircase and handrail'
 elif name=='ic_symphony_one_todd_s':
  box(80,15,96,88,7);circle(128,49,23,5);circle(105,84,6,fill=True);circle(151,84,6,fill=True);line([(128,103),(128,130),(35,130),(35,151)],4);line([(128,130),(221,130),(221,151)],4);line([(128,130),(128,151)],4)
  for x in [22,115,208]:
   box(x,155,26,85,5)
   for y in range(169,234,15):line([(x+8,y),(x+18,y)],3)
  meaning='one controller branching to three addressable strips'
 elif name=='ic_tv_group_s':
  box(20,35,216,145,12);box(36,51,184,113,4);line([(128,182),(128,220)],13);line([(80,223),(176,223)],10);line([(87,92),(127,92)],5);line([(107,92),(107,130)],5);line([(141,92),(156,130),(172,92)],5);meaning='TV backlight group'
 elif name=='ic_two_line_point_lamp_s':
  for x,ys in [(40,[40,125,210]),(210,[82,167])]:
   for y in ys:bulb(x,y,14);rays(x,y,21,5)
  for a,b in [(40,82),(125,82),(125,167),(210,167)]:line([(65,a),(190,b)],3)
  meaning='two-wire branching point lights'
 elif name=='ic_two_wire_s':
  line(wave(30),5);line([(111,34),(111,73),(145,73),(145,34)],6);bulb(128,126,48);rays(128,126,66,8);meaning='large bulb hanging on two-wire cable'
 elif name=='ic_xmas_s':
  star(128,25,18)
  for row in range(1,10):
   y=43+row*21;span=row*10
   for i in range(row+1):circle(128-span+2*span*i/row,y,3+row*.32,fill=True)
  meaning='conical Christmas light tree with star'
 else:raise ValueError(name)
 rgba=Image.new('RGBA',mask.size);px=rgba.load();alpha=mask.load()
 for y in range(mask.height):
  for x in range(mask.width):
   if alpha[x,y]:
    t=x/(mask.width-1);rgb=tuple(round(v*255) for v in colorsys.hsv_to_rgb((.8-t*.8)%1,.8,1)) if rainbow else (round(244*(1-t)+94*t),round(76*(1-t)+151*t),round(91*(1-t)+255*t));px[x,y]=rgb+(alpha[x,y],)
 l,t,rr,b=rec['alphaBounds'];ink=rgba.crop(rgba.getbbox()).resize((rr-l,b-t),Image.Resampling.LANCZOS);im=Image.new('RGBA',rec['size']);im.paste(ink,(l,t));p=R/rec['src'];im.save(p);rec.update(meaning=meaning,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),origin='independently authored geometric pictogram');meanings[name]=meaning
prov={'source':'tools/generate-lotus-hardware.py','note':'Independently authored geometry, not APK bytes. Compatibility IDs and order retained.','records':spec};(R/'assets/native-lotus/icons/provenance.json').write_text(json.dumps(prov,indent=2)+'\n');(R/'native-lotus-icon-data.js').write_text("/* Authored geometric icon catalog; compatibility selector IDs/order retained. */\n'use strict';\nwindow.SmartEaseNativeIconData=Object.freeze("+json.dumps(spec,indent=2)+".map(Object.freeze));\n")
contact=Image.new('RGB',(1000,8*180),'#52606b');d=ImageDraw.Draw(contact)
for i,rec in enumerate(spec):
 im=Image.open(R/rec['src']);im.thumbnail((144,134));x=i%5*200;y=i//5*180;contact.paste(im,(x,y),im);d.text((x,y+140),rec['name'],fill='white')
(R/'docs/authored-lotus-hardware').mkdir(exist_ok=True);contact.save(R/'docs/authored-lotus-hardware/contact-sheet.png')
print('Generated',len(spec),'distinct hardware pictograms')
