from pathlib import Path
from PIL import Image
import json,hashlib,subprocess,sys
R=Path(__file__).resolve().parents[1];c=json.loads((R/'tools/frame-color-contracts.json').read_text());m=json.loads((R/'native-coolled-text/assets/authored-frame-color-provenance.json').read_text());contracts={a['path']:a for a in c['assets']};assert len(m['assets'])==51
for p,h in c['unchangedRuntime'].items():assert hashlib.sha256((R/p).read_bytes()).hexdigest()==h,('runtime changed',p)
for p,row in c.get('wordingOnlyRuntime',{}).items():assert hashlib.sha256((R/p).read_bytes()).hexdigest()==row['sha256'],('approved wording runtime changed',p)
seen=set()
for a in m['assets']:
 p=R/a['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'];im=Image.open(p);assert list(im.size)==contracts[a['path']]['size'];assert list(im.convert('RGBA').getbbox())==contracts[a['path']]['bounds']
 if p.suffix=='.gif':
  assert a['sha256'] not in seen,'duplicate Colorful illustration';seen.add(a['sha256']);dur=[];images=set()
  for i in range(im.n_frames):im.seek(i);dur.append(im.info.get('duration',0));images.add(hashlib.sha256(im.convert('RGB').tobytes()).hexdigest())
  assert dur==a['durations'];assert sum(dur)==sum(contracts[a['path']]['durations']);assert im.info.get('loop',0)==contracts[a['path']]['loop']
  if a['controlFamily']!=2:assert len(images)>1,('missing motion',p)
  else:assert len(images)==1,('static family incorrectly animated',p)
assert len(seen)==28
# Verify each authored edge sample is exactly the existing functional pattern color.
patterns=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./native-coolled-text-frame.js').patterns))"],cwd=R,text=True))
pts=[(x,0) for x in range(0,96,6)]+[(90,y) for y in range(6,96,6)]+[(x,90) for x in range(84,-1,-6)]+[(0,y) for y in range(84,0,-6)]
for id in range(1,21):
 name='ic_coolledu_frame_0.png' if id==1 else f'ic_frame_{id-1}.png';im=Image.open(R/'native-coolled-text/assets'/name);pat=patterns[str(id)]
 for i,(x,y) in enumerate(pts):n=pat[i%len(pat)];assert im.getpixel((x+2,y+2))[:3]==(n>>16&255,n>>8&255,n&255)
print('51 previews verified:28 distinct GIFs,21 frame choices,dimensions/bounds,timelines,exact functional frame colors,4 unchanged runtime files and1 explicitly hash-locked wording-only editor')
# Load only pure geometry/color function definitions, never execute the generator's write loop.
import ast,math
from PIL import ImageDraw
source=ast.parse((R/'tools/generate-frame-color-previews.py').read_text());names={'glyph_mask','palette','interp','color_at'};ns={'Image':Image,'ImageDraw':ImageDraw,'math':math};exec(compile(ast.Module(body=[n for n in source.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'<pure-preview-functions>','exec'),ns)
js="""const W=require('./native-coolled-text-wire.js');console.log(JSON.stringify([9,10,23,24].map(id=>{const b=W.autoContent(id,230,{x:0,y:0,width:96,height:16});return{id,control:b.slice(20,24),palette:b.slice(26)}})));"""
mask=ns['glyph_mask']();stages=0
for desc in json.loads(subprocess.check_output(['node','-e',js],cwd=R,text=True)):
 colors=ns['palette'](desc);at=ns['color_at'];variant=desc['control'][2]
 for j in range(len(colors)*16):
  t=j/(len(colors)*16);row=[at(desc,(x+.5)/198,.5,t) for x in range(198)];assert len(set(row))<=2
  assert sum(row[i]!=row[i-1] for i in range(1,len(row)))<=1
  stages+=1
 # First transition enters from the right for9/23, left for10/24.
 t=.5/len(colors);assert at(desc,.1,.5,t)==colors[1 if variant else 0];assert at(desc,.9,.5,t)==colors[0 if variant else 1]
 for progress in [.25,.75]:
  row=[at(desc,(x+.5)/198,.5,progress/len(colors)) for x in range(198)];n=sum(c==colors[1] for c in row);assert abs(n-198*progress)<=1
 # Encoded artifact core pixels must also carry at most two actual palette colors.
 im=Image.open(R/'native-coolled-text/assets'/f"ic_auto_color{desc['id']}.gif")
 for k in range(im.n_frames):
  im.seek(k);rgb=im.convert('RGB');core={rgb.getpixel((x,y)) for y in range(153) for x in range(198) if mask.getpixel((x,y))==255};assert len(core)<=2,(desc['id'],k,core);assert core<=set(colors)
print(f'Family6: {stages} sampled stages have <=2colors/oneboundary; all4directions and encoded GIF foreground checks pass')
