# Independent source-formula encoder using SmartEase Matrix Sans (OFL-1.1).
# No JS implementation imported. See third-party/smartease-matrix-sans/NOTICE.txt.
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FONTS=Path(__file__).resolve().parents[4]/'native-coolled-draw-assets/fonts'
def u(v,n): return list(v.to_bytes(n,'big'))
def font(size,bold): return ('8_' if size==8 else '32_'+str(size)+'_')+('large' if bold else 'small')
def trim(a,n):
 occupied=[i for i,v in enumerate(a)if v]
 return a[min(occupied):max(occupied)+1] if occupied else [0]*(n//2)
def rot(a,h,degrees):
 m=[[bool(a[x]&(1<<(15-y))) if x<len(a) else False for x in range(h)]for y in range(h)]
 for _ in range(degrees//90):m=[list(row) for row in zip(*m[::-1])]
 return [sum((1<<(15-y))for y in range(h)if m[y][x])for x in range(h)]
def centerGlyph(a,h):
 def pad(a):return [0]*((h-len(a))//2)+a+[0]*((h-len(a)+1)//2)
 return trim(rot(pad(trim(rot(pad(a),h,90),h)),h,270),h)
def glyph(ch,size,h,bold,deg):
 data=(FONTS/font(size,bold)).read_bytes();stride=(size+7)//8;start=ord(ch)*size*stride;raw=data[start:start+size*stride];p=(h-size)//2
 cols=[0]*p+[int.from_bytes(raw[x*stride:(x+1)*stride],'big')*(256 if stride==1 else 1)>>p for x in range(size)]+[0]*p
 result=trim(rot(cols,h,deg),size)
 return trim(centerGlyph(result,h),size)if deg in[90,270]else result
def encode(s,size=8,h=8,x=0,y=0,w=96,bold=False,deg=0,mode=2,spacing=1):
 ts=[dict(text=c,cols=glyph(c,size,h,bold,deg))for c in s]
 runs=[]
 if mode in[2,3]:runs=[t['cols']+([0]*spacing if i<len(ts)-1 else [])for i,t in enumerate(ts)]
 else:
  joined=[]
  for t in ts:
   rem=len(joined)%w
   if rem:joined.extend([0]*(w-rem if w-rem<len(t['cols'])+spacing else spacing))
   joined.extend(t['cols'])
  centered=[]
  for i in range(0,len(joined),w):
   a=joined[i:i+w];occupied=[j for j,v in enumerate(a)if v]
   if occupied:a=a[min(occupied):max(occupied)+1]
   centered += [0]*((w-len(a))//2)+a+[0]*((w-len(a)+1)//2)
  cursor=0
  for t in ts:
   if t['text']==' ':continue
   a=t['cols'];pos=next(i for i in range(cursor,len(centered)-len(a)+1)if centered[i:i+len(a)]==a)
   end=pos+len(a)
   while end<len(centered)and centered[end]==0:end+=1
   runs.append([0]*(pos-cursor)+a+[0]*(end-pos-len(a)));cursor=end
  assert cursor==len(centered)
 body=[1]+[0]*7+[1]+u(x,2)+u(y,2)+u(w,2)+u(h,2)+[mode,255,3]+u(w,2)+u(len(runs),2)+u(sum(map(len,runs)),4)
 for a in runs:body += [len(a),0]+[b for col in a for b in ([col>>8]if h==8 else u(col,2))]
 return u(len(body)+4,4)+body
cases=[]
for deg in[0,90,180,270]:
 for bold in[False,True]:cases.append(dict(name=f'font8-{deg}-{bold}',args=dict(s='A B',deg=deg,bold=bold,y=8),bytes=encode('A B',deg=deg,bold=bold,y=8)))
for s in['ABC ABC ABC ABC ABC ABC ABC ABC','AB']:
 cases.append(dict(name='static8-'+str(len(s)),args=dict(s=s,mode=1),bytes=encode(s,mode=1)))
for x in[0,16]:cases.append(dict(name='region80-'+str(x),args=dict(s='AB',size=16,h=16,w=80,x=x),bytes=encode('AB',size=16,h=16,w=80,x=x)))
(ROOT/'tests'/'region-vectors.json').write_text(json.dumps(cases)+'\n')
