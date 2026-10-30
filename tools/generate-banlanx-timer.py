#!/usr/bin/env python3
"""Independent calendar + clock empty-state illustration; no source artwork read."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,math
R=Path(__file__).resolve().parents[1];im=Image.new('RGBA',(693*2,459*2));d=ImageDraw.Draw(im)
def rect(b,c,rad=0):d.rounded_rectangle(tuple(v*2 for v in b),radius=rad*2,fill=c)
def ell(b,c):d.ellipse(tuple(v*2 for v in b),fill=c)
def line(ps,c,w):d.line([(x*2,y*2) for x,y in ps],fill=c,width=w*2,joint='curve')
# Cool blue raised platform, calendar page and a clear unconfigured analog clock.
ell((0,285,692,630),'#b4c6d6');rect((218,92,451,340),'#77b7e8',12);rect((235,114,431,319),'#e0f2ff',9);rect((235,114,431,161),'#a4d7f5',7)
for x in [272,391]:rect((x,69,x+14,137),'#f1faff',7)
for y in [185,222,259]:
 for x in [261,303,345,387]:rect((x,y,x+20,y+16),'#b0d3e8',3)
ell((376,231,536,391),'#72b2e2');ell((388,243,524,379),'#edf8ff')
for i in range(12):
 a=i*math.tau/12;line([(456+53*math.sin(a),311-53*math.cos(a)),(456+59*math.sin(a),311-59*math.cos(a))],'#9fc9e5',3)
line([(456,270),(456,311),(487,330)],'#75a9cd',7);ell((451,306,461,316),'#75a9cd');ell((168,273,229,334),'#a2d4f6');rect((190,325,204,350),'#87bfe5',4)
im=im.resize((693,459),Image.Resampling.LANCZOS)
# Keep exact transparent outer extent of the compatible empty-state slot.
b=im.getbbox();crop=im.crop(b).resize((693,390),Image.Resampling.LANCZOS);im=Image.new('RGBA',(693,459));im.paste(crop,(0,69));p=R/'assets/native-banlanx/timer-empty.png';im.save(p)
a={'path':'assets/native-banlanx/timer-empty.png','size':[693,459],'alphaBounds':list(im.getbbox()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'generator':'tools/generate-banlanx-timer.py','origin':'independently authored geometry','meaning':'calendar and analog clock timer-empty illustration','difference':'Flat cool-blue geometric illustration replaces soft 3D-style rendering; original slot and transparent bounds retained.'}
(R/'assets/native-banlanx/authored-timer-provenance.json').write_text(json.dumps(a,indent=2)+'\n');im.save(R/'docs/authored-banlanx-timer/preview.png')
