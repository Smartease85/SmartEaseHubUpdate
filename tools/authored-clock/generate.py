"""Independent geometric artwork and digit bitmaps. No original pixels/font data read."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,math,hashlib
ROOT=Path(__file__).resolve().parents[2]; CFG=json.loads((Path(__file__).parent/'layout.json').read_text()); AS=ROOT/'native-coolled-clock/assets'
THEMES=['Chasing border','Space explorer','Tropical shore','Winter village','Arcade game','Halloween town','Music bars','Mountain sky','Thunderstorm','Snow friends','Twin clocks','Ticking dials','Hearts','Ducks','Cats','Truck','Plain','Ghosts and candle']
DIGITS=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111']
def digit(n,h):
 a=Image.new('1',(7,16));p=a.load()
 for y in range(h):
  for x in range(5):
   if DIGITS[n][min(4,y*5//h)*3+min(2,x*3//5)]=='1':p[x,y]=1
 return a

def pack(im):
 return [sum((128>>(y%8)) if im.getpixel((x,y)) else 0 for y in range(by*8,(by+1)*8)) for x in range(im.width) for by in range(2)]

def art(i,t,n):
 im=Image.new('RGB',(96,16));d=ImageDraw.Draw(im);q=t/max(n,1);f=t%3
 def rect(box,c):d.rectangle(box,fill=c)
 def line(points,c,w=1):d.line(points,fill=c,width=w)
 def oval(box,c):d.ellipse(box,fill=c)
 def tree(x,y,c='#22dd55'):
  d.polygon([(x,y),(x-4,y+7),(x+4,y+7)],fill=c);rect((x-1,y+7,x,y+9),'#a76d24')
 def heart(x,y,c):
  d.polygon([(x,y+2),(x+2,y),(x+4,y+3),(x+6,y),(x+8,y+2),(x+8,y+5),(x+4,y+9),(x,y+5)],fill=c)
 def clock(x,y,r):
  oval((x-r,y-r,x+r,y+r),'#4cf0c4');oval((x-r+1,y-r+1,x+r-1,y+r-1),'#ffffff');line([(x,y),(x,y-r+2)],'#3446d0');line([(x,y),(x+int((r-2)*math.cos(q*6.28)),y+int((r-2)*math.sin(q*6.28)))],'#3446d0')
 if i==1:
  for x in range(96):
   c=['#ec48da','#714eff','#28dcff'][(x+t)//3%3];rect((x,0,x,0),c);rect((x,15,x,15),c)
  line([(0,0),(0,15)],'#ec48da');line([(95,0),(95,15)],'#28dcff')
 elif i==2:
  oval((87,0,94,7),'#ffe047');x=70;oval((x,2,x+8,8),'#e6f6ff');rect((x+2,4,x+6,6),'#24bdec');rect((x+1,8,x+7,12),'#aebbe4');line([(x+2,12),(x+f,15)],'white',2);line([(x+6,12),(x+8-f,15)],'white',2);line([(x,9),(x-4,7+f)],'#f86cd8',2)
  for x in range(96):rect((x,15,x,15),'#f5d842' if (x+t)%4<2 else '#442a69')
 elif i==3:
  rect((0,14,95,15),'#e9cd4a');d.polygon([(70,15),(95,5),(95,15)],fill='#27ddf2')
  for x,y in [(58,5),(69,8)]:
   line([(x,y),(x+1,14)],'#c2883b',2)
   for dx,dy in [(-5,-2),(5,-2),(-4,2),(4,2)]:line([(x,y),(x+dx,y+dy)],'#28de43',2)
  line([(82+t%3,3),(84+t%3,4),(86+t%3,3)],'white')
 elif i==4:
  for x in range(0,96,8):line([(x,1),(x+4,3),(x+8,1)],'#18d747')
  rect((62,9,70,14),'#5baeff');d.polygon([(60,9),(66,3),(72,9)],fill='#fc526b');rect((65,10,67,14),'#fff3b0');tree(83,6);tree(92,3)
  rect((0,15,95,15),'#d7ffff');rect((74+(t%5),5,74+(t%5),5),'white')
 elif i==5:
  d.rectangle((0,0,47,15),outline='#25e1e1');oval((85,4,94,13),'#f4de32');d.polygon([(90,8),(96,5+f),(96,12-f)],fill='black');oval((89,5,90,6),'black');rect((67+t%9,8,68+t%9,9),'#f97189')
 elif i==6:
  for x in [3,15]:
   oval((x,8,x+9,15),'#ff781f');rect((x+4,6,x+5,8),'#62c337');rect((x+2,10,x+3,11),'#341254');rect((x+6,10,x+7,11),'#341254');line([(x+2,13),(x+7,13)],'#341254')
  for x,y in [(73,8),(83,6),(91,9)]:rect((x,y,x+4,15),'#6138bf');d.polygon([(x-1,y),(x+2,y-4),(x+5,y)],fill='#33a9e8');rect((x+2,y+2,x+2,y+3),'#ffe063')
 elif i==7:
  for x in range(2,95,4):rect((x,15-((x*3+t*2)%4),x+2,15),['#e85cd3','#27e6cd','#ffdf3d'][x%3])
  for x in [2,87]:line([(x+1,10),(x+1,3),(x+6,3),(x+6,8)],'#ff80d3',2);oval((x-1,9,x+2,11),'#ff80d3');oval((x+4,7,x+7,9),'#ff80d3')
 elif i==8:
  rect((0,0,95,15),'#27bfdc');oval((2,1,9,8),'#ffe671')
  for x in [5,18,78,91]:d.polygon([(x-8,15),(x,6),(x+8,15)],fill='#237d9b');d.polygon([(x-3,9),(x,6),(x+3,9)],fill='#e5ffff')
 elif i==9:
  for x in [2,81]:
   oval((x+1,2,x+9,6),'#b6e4ff');oval((x+6,1,x+12,6),'#e7f9ff');rect((x,5,x+14,7),'#c6ebff');d.polygon([(x+8,8),(x+4,12),(x+8,12),(x+5,15)],fill='#ffe046')
  for x in range(0,96,5):rect((x,15,x+2,15),'#22bc83')
 elif i==10:
  for x,y in [(2,1),(13,3)]:
   oval((x,y+5,x+9,15),'white');oval((x+2,y+1,x+7,y+7),'#d9f6ff');rect((x+1,y+1,x+8,y+2),'#ed425e');rect((x+3,y-1,x+6,y+1),'#ed425e');rect((x+4,y+4,x+6,y+4),'#ffae37')
  tree(85,3,'#86f3bd');tree(93,5,'#86f3bd');line([(0,15),(95,15)],'#c8edff')
 elif i in [11,12]:
  clock(7,8,6);clock(88,8,6)
  for x in range(21,75):
   if (x+t)%(4 if i==11 else 2):rect((x,0,x,0),'#e7d652' if i==11 else '#ec64c7');rect((x,15,x,15),'#e7d652' if i==11 else '#ec64c7')
 elif i==13:
  heart(2,3,'#f04b77');heart(85,3,'#f04b77');line([(21,0),(75,0)],'#62e489');line([(21,15),(75,15)],'#62e489')
 elif i==14:
  for x in [3,85]:
   oval((x,7,x+8,12),'#fff5df');oval((x+1,3,x+5,8),'#fff5df');rect((x+5,5,x+7,6),'#ffd735');rect((x+3,4,x+3,4),'#202d4e');line([(x+2,13),(x+2+(t%2),14)],'#e0a536');line([(x+6,13),(x+6-(t%2),14)],'#e0a536')
 elif i==15:
  for x in [2,85]:
   d.polygon([(x,12),(x,3),(x+2,5),(x+6,5),(x+8,3),(x+8,12),(x+6,15),(x+2,15)],fill='#e88c37');oval((x+2,9,x+6,14),'#ffdf72');rect((x+2,7,x+2,8),'#7de8d4');rect((x+6,7,x+6,8),'#7de8d4')
  line([(22,15),(74,15)],'#d78adb')
 elif i==16:
  rect((12,12,80,13),'#2e7ee9');rect((74,3,83,12),'#2e7ee9');rect((76,4,81,8),'#80eaff');oval((21,12,27,15),'#b6c4d9');oval((67,12,73,15),'#b6c4d9');rect((0,15,95,15),'#458a43')
 elif i==18:
  for x in [2,76]:
   oval((x,4,x+8,12),'#a9d6ff');d.polygon([(x,9),(x,14),(x+2,12),(x+4,14),(x+6,12),(x+8,14),(x+8,9)],fill='#a9d6ff');rect((x+2,7,x+2,9),'#263d93');rect((x+6,7,x+6,9),'#263d93')
  rect((89,9,94,15),'#f4c6ed');d.polygon([(92,3),(90,7),(92,8),(94,7)],fill='#ffc24f');line([(17,15),(67,15)],'#32bce0')
 # Theme-specific animation remains meaningful rather than duplicating all frames.
 if i==3:line([(78+t%5,1),(80+t%5,2),(82+t%5,1)],'#e3ffff')
 if i in [4,10]:
  for k in range(4):rect((61+k*8,(k*3+t)%15,61+k*8,(k*3+t)%15),'#e0faff')
 if i==6 and t%2:rect((75,10,75,11),'#ff8659');rect((85,8,85,9),'#ff8659')
 if i==9 and t%2:line([(3,9),(2,11)],'#59b8fc');line([(91,9),(90,11)],'#59b8fc')
 if i==13 and t%2:rect((4,5,5,5),'#ffbbd2');rect((87,5,88,5),'#ffbbd2')
 if i==15 and t%3==2:line([(4,7),(5,7)],'#b36730');line([(87,7),(88,7)],'#b36730')
 if i==16:rect((24+t%2,13,24+t%2,14),'#405474');rect((70+t%2,13,70+t%2,14),'#405474')
 if i==18 and t%2:rect((91,4,91,5),'#ff754b')
 # Keep source-defined numeric/AM-PM fields clear; this is layout metadata, not art.
 s=next(s for s in CFG['styles'] if s['id']==i);g=s['geometry']
 for part in ['hour','spaceHour','minute','spaceMinute','seconds','ampm']:
  x,y,w,h=[g.get(part+k,0) for k in ['StartColumn','StartRow','Width','Height']]
  if w and h:rect((x,y,x+w-1,y+h-1),'black')
 return im

def main():
 backgrounds={};glyphs={};manifest=[];
 for name in ['ic_exit.png','ic_save.png']:
  icon=Image.new('RGBA',(72,72));draw=ImageDraw.Draw(icon)
  if name=='ic_exit.png':draw.line([(45,14),(23,36),(45,58)],fill='white',width=6)
  else:
   draw.rounded_rectangle((15,12,57,60),radius=4,outline='white',width=4);draw.rectangle((24,15,48,30),outline='white',width=3);draw.rectangle((24,41,48,57),outline='white',width=3)
  icon.save(AS/name)
 sheet=Image.new('RGB',(960,18*95),'#20252e');sd=ImageDraw.Draw(sheet)
 for i in range(1,19):
  cfg=CFG['timing'][str(i)];frames=[];s=next(s for s in CFG['styles'] if s['id']==i);h=s['geometry']['numHeight'];nums=[digit(n,h) for n in range(10)];glyphs[f'style{i}NumberData1696']=sum([pack(im) for im in nums],[])
  sep=Image.new('1',(2,16));dd=ImageDraw.Draw(sep);dd.rectangle((0,h//3,1,h//3+1),fill=1);dd.rectangle((0,2*h//3,1,2*h//3+1),fill=1);glyphs[f'style{i}SpaceData1696']=pack(sep)
  amp=Image.new('1',(11,16));ad=ImageDraw.Draw(amp)
  # AM monogram: 5x7 A + 5x7 M, independent line geometry.
  ad.line([(0,6),(0,1),(2,0),(4,1),(4,6)],fill=1);ad.line([(0,3),(4,3)],fill=1);ad.line([(6,6),(6,0),(8,3),(10,0),(10,6)],fill=1)
  pm=amp.copy();pd=ImageDraw.Draw(pm);pd.rectangle((0,0,4,6),fill=0);pd.line([(0,6),(0,0),(3,0),(4,1),(4,2),(3,3),(0,3)],fill=1)
  pack7=lambda im:[sum((128>>y) if im.getpixel((x,y)) else 0 for y in range(7)) for x in range(11)]
  glyphs[f'style{i}AmpmData1696']=pack7(amp)+pack7(pm) if i==7 else []
  for t in range(cfg['count']):frames.append([r*65536+g*256+b for r,g,b in art(i,t,cfg['count']).getdata()])
  backgrounds[str(i)]={'speed':cfg['speed'],'frames':frames};preview=art(i,0,cfg['count']);g=s['geometry']
  for part,ns in [('hour',[1,2]),('minute',[3,4]),('seconds',[5,6])]:
   x,y=g.get(part+'StartColumn',0),g.get(part+'StartRow',0)
   if g.get(part+'Width',0):
    for j,n in enumerate(ns):
     visible=max(0,min(7,g[part+'Width']-j*7))
     if visible:preview.paste('white',(x+j*7,y),nums[n].crop((0,0,visible,h)))
  for part in ['spaceHour','spaceMinute']:
   if g.get(part+'Width',0):preview.paste('white',(g[part+'StartColumn'],g[part+'StartRow']),sep.crop((0,0,2,h)))
  if i==7:preview.paste('#ec71da',(g.get('ampmStartColumn',0),g.get('ampmStartRow',0)),amp)
  preview.resize((960,160),Image.Resampling.NEAREST).save(AS/f'ic_clock_style{i}_1696.gif')
  sheet.paste(preview.resize((768,128),Image.Resampling.NEAREST).resize((480,80),Image.Resampling.NEAREST),(230,(i-1)*95));sd.text((8,(i-1)*95+30),f'{i}: {THEMES[i-1]}',fill='white')
 (AS/'clock-backgrounds-v1.json').write_text(json.dumps({'format':'original-clock-backgrounds','version':1,'artworkVersion':'smartease-authored-clock-1','styles':backgrounds},separators=(',',':')))
 (ROOT/'ux-clock-wire-tables.js').write_text("(function(r,d){if(typeof module==='object'&&module.exports)module.exports=d;else r.SmartEaseUXClockWireTables=d;})(globalThis,"+json.dumps({'artworkVersion':'smartease-authored-clock-1','glyphs':glyphs,'backgrounds':backgrounds},separators=(',',':'))+");\n")
 out=ROOT/'docs/authored-clock';out.mkdir(parents=True,exist_ok=True);sheet.save(out/'contact-sheet.png')
 for p in sorted(AS.glob('ic_clock_style*gif'))+[AS/'ic_exit.png',AS/'ic_save.png',AS/'clock-backgrounds-v1.json',ROOT/'ux-clock-wire-tables.js']:
  manifest.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
 (out/'resources.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':main()
