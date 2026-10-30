#!/usr/bin/env python3
"""33 independently authored thematic scene cards. No original image inputs.
Geometry and palettes are authored here, not traced. 456x588 opaque outputs retain
URL/crop contracts. Photographic originals deliberately become flat illustrations.
"""
from pathlib import Path
import math,random,hashlib,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/native-lotus/scenes';S=2;W,H=456,588
manifest=[]
def hexrgb(c):return tuple(bytes.fromhex(c.lstrip('#')))
def start(top,bottom):
 global im,d
 a,b=hexrgb(top),hexrgb(bottom);im=Image.new('RGB',(W*S,H*S));d=ImageDraw.Draw(im)
 for y in range(H*S):d.line((0,y,W*S,y),fill=tuple(round(a[k]+(b[k]-a[k])*y/(H*S-1)) for k in range(3)))
def pts(p):return [(round(x*S),round(y*S)) for x,y in p]
def poly(p,c):d.polygon(pts(p),fill=c)
def line(p,c,w=3):d.line(pts(p),fill=c,width=max(1,round(w*S)),joint='curve')
def ell(box,c,outline=None,width=2):d.ellipse(tuple(round(v*S) for v in box),fill=c,outline=outline,width=width*S)
def rect(box,c,rad=0,outline=None,width=2):d.rounded_rectangle(tuple(round(v*S) for v in box),radius=rad*S,fill=c,outline=outline,width=width*S)
def star(x,y,r,c):
 poly([(x+(r if i%2==0 else r*.35)*math.sin(i*math.pi/4),y-(r if i%2==0 else r*.35)*math.cos(i*math.pi/4)) for i in range(8)],c)
def stars(seed=1,count=45):
 rng=random.Random(seed)
 for _ in range(count):
  x,y=rng.randrange(20,437),rng.randrange(20,330);r=rng.choice([1,2,2,3]);ell((x-r,y-r,x+r,y+r),'#d5e6fa')
def hills(c,y=430):poly([(0,H),(0,y),(90,y-55),(205,y+15),(315,y-60),(456,y),(456,H)],c)
def heart(x,y,r,c):
 p=[]
 for i in range(100):
  t=math.tau*i/99;p.append((x+r*16*math.sin(t)**3/17,y-r*(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))/17))
 poly(p,c)
def flower(x,y,r,c):
 line([(x,y),(x-12,y+120)],'#47735a',4)
 for i in range(5):
  a=i*math.tau/5;cx=x+r*.6*math.cos(a);cy=y+r*.6*math.sin(a);ell((cx-r*.55,cy-r*.55,cx+r*.55,cy+r*.55),c)
 ell((x-r*.23,y-r*.23,x+r*.23,y+r*.23),'#e9b65e');poly([(x-5,y+65),(x-40,y+42),(x-35,y+75)],'#62967c')
def tree(x,y,h,c):
 rect((x-5,y-h*.2,x+5,y),'#68564d');poly([(x,y-h),(x-h*.32,y-h*.16),(x+h*.32,y-h*.16)],c)
def candle(x,y,h):
 rect((x-21,y-h,x+21,y),'#ffe1a2',5);ell((x-21,y-h-6,x+21,y-h+6),'#fff0c9');line([(x,y-h),(x,y-h-15)],'#78563c',3);poly([(x,y-h-69),(x-14,y-h-34),(x-9,y-h-17),(x+6,y-h-14),(x+13,y-h-35)],'#ffae46');ell((x-5,y-h-40,x+7,y-h-17),'#ffefb0')
def cup(x,y):
 ell((x+46,y+12,x+83,y+48),None,'#f6e8d2',9);rect((x,y,x+60,y+65),'#f6e8d2',9);ell((x+3,y-5,x+57,y+11),'#493738');ell((x-15,y+58,x+80,y+75),'#c2a68b')
def burst(x,y,r,c):
 for i in range(14):
  a=i*math.tau/14;line([(x+math.cos(a)*r*.3,y+math.sin(a)*r*.3),(x+math.cos(a)*r,y+math.sin(a)*r)],c,3)
  ell((x+math.cos(a)*r-3,y+math.sin(a)*r-3,x+math.cos(a)*r+3,y+math.sin(a)*r+3),c)
def moon(x,y,r):ell((x-r,y-r,x+r,y+r),'#f4e8bb')
def waves(y,c,amp=9):
 for off in range(0,150,29):line([(x,y+off+amp*math.sin(x/45+off/25)) for x in range(0,457,4)],c,3)
def finish(name,meaning):
 p=OUT/(name+'.png');out=im.resize((W,H),Image.Resampling.LANCZOS);out.save(p);manifest.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'dimensions':[W,H],'alphaBounds':[0,0,W,H],'meaning':meaning,'origin':'independently authored geometric illustration'})
# Dawn and dusk remain visually distinguishable.
start('eaa09e','ffdca1');ell((160,280,296,416),'#fff1b5');rect((0,382,456,588),'#b6c0b1');waves(408,'#f9d6ab',4);hills('#6c7c82',490);finish('ic_s_sunrise','warm dawn sun lifting over quiet water and distant hills')
start('805477','f7a15b');ell((153,315,303,465),'#ffd278');rect((0,405,456,588),'#735669');waves(425,'#e9a265',6);poly([(0,588),(0,519),(90,482),(190,533),(250,588)],'#353d52');finish('ic_s_sunset','low evening sun and warm sea reflections')
start('8ebdd0','f6dec6');
for x,y,r,c in [(65,310,29,'#e66c6f'),(376,280,38,'#eeaa81'),(108,208,24,'#fff0d8')]:flower(x,y,r,c)
rect((143,370,328,480),'#f7e5ce',12);rect((156,353,315,392),'#e7949a',10);line([(235,353),(235,302)],'#f0c45e',10);poly([(235,273),(225,292),(235,302),(244,290)],'#e47c48');ell((125,468,348,494),'#dcbfa4');finish('ic_s_birthday','celebration cake with candle and bright birthday flowers')
start('1d1420','643d39');ell((92,442,365,506),'#392433');rect((211,355,245,460),'#b57d4d');ell((169,453,286,477),'#cc9b61');candle(228,362,151);finish('ic_s_candlelight','single candle with warm flame on brass holder')
start('202449','6a6587');hills('#262d48',480);line([(235,460),(235,252)],'#cbb39c',3);burst(235,234,98,'#ffd794');burst(235,234,58,'#fa9f8b');finish('ic_s_fireworks','close sparkler with radiating golden sparks')
start('715d75','edaa85');rect((0,400,456,588),'#654c5d');
for x,y,c in [(78,240,'#f0c78c'),(170,285,'#eaae98'),(288,265,'#d3b8a7'),(382,222,'#d8988f')]:
 ell((x-27,y-27,x+27,y+27),c);rect((x-37,y+30,x+37,432),'#4e4b68',22)
for x in range(28,456,56):ell((x-5,115+20*math.sin(x/100),x+5,125+20*math.sin(x/100)),'#ffdf9d')
line([(0,112),(110,136),(235,135),(456,102)],'#694b53',2);ell((58,395,405,470),'#ba8374');finish('ic_s_reunion','party gathering around a table under string lights')
start('956a7c','edb58b');rect((0,430,456,588),'#493b50');ell((100,375,356,434),'#d39b83');
for x,c in [(85,'#d09b80'),(371,'#edc7a0')]:ell((x-30,241,x+30,301),c);poly([(x-32,310),(x+30,310),(x+52,455),(x-48,455)],'#4c425b')
candle(228,390,46);heart(229,208,28,'#e6aaac');finish('ic_s_dating','two people at a candlelit table with heart')
start('0c214e','41649c');stars(42,95);hills('#172d51',490);star(307,146,13,'#fff5d3');finish('ic_s_starry_sky','dense star field above quiet dark hills')
start('96bbcf','f3c6ba');
for x,y,r,c in [(73,360,40,'#e992aa'),(184,270,42,'#f3b3c2'),(306,332,46,'#e8a0b4'),(393,240,28,'#ffcad1')]:flower(x,y,r,c)
heart(232,156,24,'#f5d5d6');finish('ic_s_romantic','pink romantic flower garden with small heart')
start('251d48','803d7c');
for x,c in [(10,'#663e8a'),(180,'#975c92'),(320,'#4d5c91')]:poly([(228,65),(x,430),(x+75,430)],c)
ell((150,68,306,224),'#a9c8cf');
for x in range(169,300,25):line([(x,85),(x,208)],'#54758e',2)
for y in range(95,211,23):line([(162,y),(294,y)],'#54758e',2)
rect((39,420,420,550),'#24233e',9);ell((63,438,191,528),'#64617d');ell((268,438,396,528),'#64617d');ell((107,463,146,503),'#d1a2cc');ell((310,463,350,503),'#d1a2cc');finish('ic_s_disco','mirrored disco ball, beams and twin turntables')
start('d9c9e2','b4d6d8');
for r,c in [(228,'#dc8a8b'),(204,'#eeb477'),(180,'#eadb94'),(156,'#9abea7'),(132,'#86b2c9'),(108,'#9c99bd')]:d.arc((0*S,(275-r)*S,456*S,(275+r)*S),180,360,fill=c,width=25*S)
for x,y in [(65,362),(346,362)]:
 ell((x-66,y-25,x+66,y+27),'#f6eee8');ell((x-31,y-52,x+36,y+26),'#f6eee8')
finish('ic_s_rainbow','six-band rainbow spanning soft clouds')
start('1d2733','5a3c3a');rect((75,132,381,340),'#e8ac79',8);poly([(95,312),(95,181),(230,242)],'#b7836c');poly([(276,170),(357,170),(357,315),(245,315)],'#63494b');
for row,y in enumerate([410,485]):
 for x in range(32,456,85):rect((x,y,x+62,y+87),'#2e2636',12)
finish('ic_s_movie','warm movie screen viewed over theater seats')
start('294940','8ca494');tree(228,493,365,'#28564b');
for x,y,c in [(204,207,'#e6bc75'),(259,264,'#c77c72'),(171,328,'#e7ba74'),(292,366,'#c77c72'),(225,410,'#dbd3a2')]:ell((x-10,y-10,x+10,y+10),c)
star(228,121,23,'#f6d78a');rect((70,466,166,545),'#ae6b70',4);line([(118,466),(118,545)],'#eac89d',9);rect((282,488,380,550),'#d6b68a',4);line([(330,488),(330,550)],'#b26664',9);finish('ic_s_christmas_eve','evergreen with ornaments, star and wrapped gifts')
start('86bcb8','d9ddb0');hills('#658a69',290);poly([(256,320),(197,375),(284,412),(170,472),(266,588),(409,588),(285,483),(347,420),(264,375),(297,320)],'#8cc8ce');
for x,y in [(267,396),(251,457),(306,526)]:line([(x-18,y),(x+22,y-4)],'#d8efdd',4)
for x,y in [(66,420),(390,342)]:flower(x,y,18,'#b7a0c6')
finish('ic_s_running_water','winding flowing stream through green banks and wildflowers')
start('242b4d','806a80');rect((75,115,381,391),'#354569');moon(280,207,37);rect((220,115,230,391),'#49374c');poly([(65,103),(126,103),(103,405),(55,430)],'#30283f');poly([(329,103),(391,103),(401,430),(347,405)],'#30283f');rect((34,441,422,587),'#6f6b8a',18);rect((58,421,184,477),'#a7a2b6',13);line([(222,463),(385,463)],'#9490a8',3);finish('ic_s_sleep','bed and pillows facing a moonlit curtained window')
start('152e51','447ca0');moon(315,138,32);rect((0,331,456,588),'#285773');waves(364,'#8cb8c4',7);poly([(0,588),(0,480),(97,458),(141,495),(205,510),(244,588)],'#233e4e');finish('ic_s_ocean','moonlit ocean with rhythmic waves and rocky shore')
start('a8d2ba','406d61');
for x,y,h,c in [(49,510,390,'#416e59'),(401,538,425,'#3a6455'),(119,436,283,'#62957a'),(326,452,290,'#6c9d7f')]:tree(x,y,h,c)
poly([(216,335),(183,444),(133,588),(324,588),(270,447),(239,335)],'#b7cf9f');line([(227,363),(230,416)],'#d5e2b1',3);finish('ic_s_forest','sunlit forest trail between layered evergreens')
start('b3a094','e4d1b4');rect((0,391,456,588),'#8c7165');poly([(53,249),(225,282),(225,438),(53,402)],'#f6ead2');poly([(225,282),(389,249),(389,403),(225,438)],'#e3d3b5');
for y in [295,318,341,364]:line([(78,y),(202,y+24)],'#b8a687',3);line([(245,y+24),(364,y)],'#b8a687',3)
cup(278,452);finish('ic_s_read','open book and coffee on a warm reading table')
start('b5c9ca','e5d9c7');rect((0,401,456,588),'#a0826a');rect((74,191,352,383),'#536c73',12);rect((89,207,337,363),'#c9e0dc',3);line([(115,245),(268,245)],'#88aba7',7);line([(115,275),(306,275)],'#88aba7',7);poly([(73,381),(351,381),(384,422),(41,422)],'#71908f');cup(323,449);finish('ic_s_work','open laptop with simple work lines and coffee on desk')
start('223d72','8464ac');
for k,c in enumerate(['#6bc7cd','#b8e2dc','#cf9dbd','#807dc4','#56a6c2','#e8b0cd']):poly([(-60+k*80,0),(10+k*80,0),(456-k*30,588),(380-k*45,588)],c)
finish('ic_s_colorful','angular interwoven colorful light ribbons')
start('8cb9ca','e5e3d2');
for x,y,r in [(83,358,39),(221,293,45),(368,374,36)]:flower(x,y,r,'#f5eee0')
finish('ic_s_soft','soft cream daisies against pale blue sky')
start('b4a99b','e4cfb0');
# Paired wedding bands and celebratory floral accents.
ell((97,246,265,414),None,'#bd914d',17);ell((202,246,370,414),None,'#e0b76e',17);star(239,236,18,'#f6e5bd');
for x,y,r in [(65,446,22),(385,440,26)]:flower(x,y,r,'#f3e2cf')
finish('ic_s_wedding_anniversary','two interlocking gold wedding bands and cream flowers')
start('7599bb','dce7e8');moon(91,125,30);hills('#b8cdd8',438);
for x,y,h,c in [(339,470,250,'#607d8f'),(391,500,301,'#547181'),(52,477,173,'#7793a1')]:tree(x,y,h,c)
poly([(177,474),(177,401),(235,352),(294,401),(294,474)],'#8d665c');poly([(164,406),(235,343),(307,406)],'#f0f2e7');rect((221,409,254,448),'#f6ce83',2)
for x,y in [(40,180),(147,233),(302,146),(371,229),(218,85)]:star(x,y,8,'#eaf3ef')
finish('ic_s_snowflake','snow-covered cabin, evergreens and falling snow')
start('341d30','a34435');
for x,y,r,c in [(115,478,110,'#b94e36'),(228,470,180,'#df693a'),(338,495,100,'#c65335')]:poly([(x-r*.65,y),(x-r*.6,y-r*.65),(x-r*.15,y-r*1.5),(x+r*.1,y-r*2),(x+r*.2,y-r*.8),(x+r*.6,y-r*.4),(x+r*.5,y)],c)
poly([(180,495),(181,421),(229,345),(239,419),(278,466),(266,495)],'#ffd08a');line([(103,517),(339,538)],'#584038',20);line([(106,542),(337,513)],'#765043',20);finish('ic_s_flame','layered orange flame rising above crossed logs')
start('33384d','788399');
for x,y,r in [(83,150,80),(190,134,96),(315,163,111),(422,154,86)]:ell((x-r,y-r*.6,x+r,y+r*.6),'#535b6c')
poly([(253,201),(184,326),(229,320),(173,456),(305,283),(253,292),(301,201)],'#fff0b3');rect((0,476,456,588),'#354f62');waves(506,'#71899a',4);finish('ic_s_lightning','forked lightning bolt from storm clouds over water')
start('a95569','edb494');heart(228,280,103,'#bf5f77');heart(228,274,66,'#eab0ae');line([(79,469),(377,469)],'#a66a70',4);ell((83,413,141,471),'#c27583');ell((316,413,374,471),'#c27583');finish('ic_s_valentine_day','large nested Valentine hearts and a pair of rose-colored candles')
start('252c44','62536c');moon(332,124,40);poly([(93,492),(93,304),(155,246),(226,305),(226,493)],'#303447');poly([(222,491),(222,215),(283,171),(337,215),(337,492)],'#333548');
for x,y in [(122,331),(179,331),(251,248),(302,248),(251,351)]:rect((x,y,x+20,y+29),'#d89964',2)
poly([(241,491),(241,431),(272,411),(298,431),(298,491)],'#171f33');line([(35,588),(57,335),(28,248)],'#263146',14);line([(54,388),(108,345)],'#263146',9);finish('ic_s_halloween','haunted house with glowing windows, moon and bare tree')
start('263246','773f4e');poly([(80,437),(228,172),(376,437)],'#e9b76d');poly([(111,418),(228,211),(346,418)],'#773f4e');rect((216,275,240,357),'#f2d49a',10);ell((215,377,241,403),'#f2d49a');rect((0,492,456,588),'#303a4c');finish('ic_s_alarm','prominent warning triangle with exclamation mark in dusk palette')
start('8ba6a7','d0c9ac');
for x,h,c in [(0,222,'#819392'),(75,304,'#637b7c'),(161,259,'#7e9390'),(277,331,'#657e7c'),(365,240,'#80938e')]:rect((x,588-h,x+75,588),c)
ell((111,107,345,341),'#d6d8bf', '#647d7b',8)
for i in range(12):a=i*math.tau/12;line([(228+90*math.sin(a),224-90*math.cos(a)),(228+99*math.sin(a),224-99*math.cos(a))],'#617673',3)
line([(228,224),(228,152)],'#55726f',7);line([(228,224),(284,258)],'#55726f',7)
for x in range(16,456,41):line([(x,354),(x-12,406)],'#b6c6bb',2)
finish('ic_s_time_machine','large analog clock above a rain-streaked city')
start('252b39','af6a46');
for x,w,h,c in [(0,127,455,'#252f3b'),(129,91,330,'#35404a'),(332,124,482,'#26313d')]:rect((x,588-h,x+w,588),c)
poly([(229,588),(272,300),(309,588)],'#d3935b');
for x,y in [(34,193),(83,193),(26,280),(359,147),(410,219),(357,294)]:rect((x,y,x+22,y+43),'#bd7950')
ell((188,127,294,233),None,'#e3b37c',6);line([(241,180),(241,144),(218,165)],'#e3b37c',5);finish('ic_s_time_machine2','amber-lit urban passage with a distinct hovering time dial')
start('193b68','d48799');stars(5,30);hills('#404866',485);line([(113,304),(338,180)],'#a9c9e9',5);line([(206,253),(340,179)],'#e3eff1',3);star(341,179,8,'#f4f1d9');finish('ic_s_meteor','single bright diagonal meteor across blue-pink dusk')
start('192949','5e789a');stars(16,30);hills('#24374f',488);
for x,y in [(75,210),(188,172),(281,226),(376,144)]:line([(x-38,y-94),(x,y)],'#8daed2',3);star(x,y,5,'#dde9e7')
finish('ic_s_meteor2','multiple descending meteor trails above a dark mountain horizon')
start('2a2453','78668f');
for x,y,r,c in [(99,169,70,'#e9b1be'),(288,159,97,'#efcf9b'),(359,316,63,'#b6c9db'),(149,350,61,'#d3acd2')]:burst(x,y,r,c)
for x,h in [(0,81),(51,103),(117,70),(175,122),(244,93),(312,112),(387,86)]:rect((x,588-h,x+55,588),'#343449')
finish('ic_s_fireworks_show','several colorful firework bursts over city silhouettes')
# Keep existing functional catalog fields, replace only art provenance.
p=OUT/'provenance.json';data=json.loads(p.read_text());data['artwork']={'origin':'independently authored geometric illustrations','generator':'tools/generate-lotus-scenes.py','visualDifference':'Photographic scenes replaced by semantic flat illustrations; no original pixels used.'}
by={Path(a['path']).stem:a for a in manifest}
for item in data['scenes']:
 a=by[item['imageResource']];item.pop('apkPath',None);item.update(sha256=a['sha256'],bytes=a['bytes'],asset=a['path'],artworkOrigin='independently authored geometry')
p.write_text(json.dumps(data,indent=2)+'\n')
# Catalog retains source facts/commands but no longer claims original art bytes.
js=ROOT/'native-lotus-catalog-data.js';js.write_text('/* Source-derived catalog facts; scene artwork independently authored. */\nwindow.SmartEaseNativeCatalogData='+json.dumps(data,separators=(',',':'))+';\n')
(OUT/'authored-manifest.json').write_text(json.dumps({'generator':'tools/generate-lotus-scenes.py','assets':manifest},indent=2)+'\n')
# Review sheet contains only authored output.
sheet=Image.new('RGB',(900,6*180),'#303541');sd=ImageDraw.Draw(sheet)
for i,a in enumerate(manifest):
 art=Image.open(ROOT/a['path']);art.thumbnail((130,150));x=i%6*150;y=i//6*180;sheet.paste(art,(x,y));sd.text((x,y+154),Path(a['path']).stem.replace('ic_s_',''),fill='white')
(ROOT/'docs/authored-lotus-scenes/contact-sheet.png').parent.mkdir(parents=True,exist_ok=True);sheet.save(ROOT/'docs/authored-lotus-scenes/contact-sheet.png')
print('Generated',len(manifest),'scene illustrations')
