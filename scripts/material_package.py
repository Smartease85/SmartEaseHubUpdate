"""Independent local SMUXPKG1 writer. Never downloads or interprets asset data."""
import hashlib,json,os,re,struct,tempfile
from pathlib import Path
MAX_FILE=256*1024*1024;MAX_MANIFEST=4*1024*1024;MAX_ASSET=8*1024*1024;MAX_COUNT=4096
SHA=re.compile(r'^[a-f0-9]{64}$');ID=re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,255}$')
def fail(s):raise ValueError('Material package: '+s)
def exact(o,keys,optional=()):
 if type(o) is not dict or not set(keys)<=o.keys() or not o.keys()<=set(keys)|set(optional):fail('unknown or missing metadata field')
def text(v,n=256):
 if type(v) is not str or not 0<len(v.encode("utf-16-le",errors="surrogatepass"))//2<=n or any(ord(x)<32 or ord(x)==127 or 0xD800<=ord(x)<=0xDFFF for x in v):fail('invalid text')
def ident(v):
 text(v)
 if not ID.fullmatch(v) or '..' in v or v in ('__proto__','prototype','constructor'):fail('invalid identifier')
def integer(v,lo,hi):
 if type(v) is not int or not lo<=v<=hi:fail('integer out of bounds')
def array(v,maximum=MAX_COUNT):
 if type(v) is not list or not 0<len(v)<=maximum:fail('list bounds')
def canonical(m):return json.dumps(m,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')
def validate(m,payload_size):
 exact(m,['format','version','categories','items','assets'],['provenance'])
 if m['format']!='SMUXPKG1' or type(m['version']) is not int or m['version']!=1:fail('unsupported format')
 array(m['categories'],256);array(m['items']);array(m['assets']);integer(payload_size,1,MAX_FILE)
 assets={};cats={};items={};end=0
 for a in m['assets']:
  exact(a,['id','sha256','offset','length','domain','mediaType','width','height'])
  if type(a['sha256']) is not str or not SHA.fullmatch(a['sha256']) or a['id']!=a['sha256'] or a['id'] in assets:fail('asset hash')
  integer(a['offset'],0,MAX_FILE);integer(a['length'],1,MAX_ASSET);integer(a['width'],16,96);integer(a['height'],16,16)
  if a['offset']!=end:fail('asset gap or overlap')
  end+=a['length']
  if end>payload_size:fail('truncated asset')
  if a['domain'] not in ('program96x16','pattern16x16') or a['width']!=(96 if a['domain']=='program96x16' else 16):fail('asset domain mismatch')
  if a['mediaType'] not in ('image/gif','application/x-coolled-dpt'):fail('media type')
  assets[a['id']]=a
 if end!=payload_size:fail('trailing payload bytes')
 for c in m['categories']:
  exact(c,['id','label','domain','itemIds']);ident(c['id']);text(c['label']);array(c['itemIds'])
  if c['id'] in cats or c['domain'] not in ('program96x16','pattern16x16'):fail('category identity/domain')
  cats[c['id']]=c
 used=set()
 for i in m['items']:
  exact(i,['id','label','categoryId','assetId']);ident(i['id']);text(i['label']);ident(i['categoryId'])
  if i['id'] in items or i['categoryId'] not in cats or i['assetId'] not in assets:fail('item identity/reference')
  if assets[i['assetId']]['domain']!=cats[i['categoryId']]['domain']:fail('category geometry mismatch')
  items[i['id']]=i;used.add(i['assetId'])
 ordered=[]
 for c in m['categories']:
  for key in c['itemIds']:
   ident(key)
   if key not in items or items[key]['categoryId']!=c['id']:fail('category item reference')
   ordered.append(key)
 if len(set(ordered))!=len(ordered) or ordered!=[i['id'] for i in m['items']] or len(used)!=len(assets):fail('order/membership/unused asset')
 if 'provenance' in m:
  p=m['provenance'];exact(p,['provider','sourceModel','retrievedAt','sourceCatalogHashes'])
  for k in ('provider','sourceModel','retrievedAt'):text(p[k],128)
  array(p['sourceCatalogHashes'],256)
  if any(type(h) is not str or not SHA.fullmatch(h) for h in p['sourceCatalogHashes']) or len(set(p['sourceCatalogHashes']))!=len(p['sourceCatalogHashes']):fail('provenance hash')
 return m

def digest(path):
 h=hashlib.sha256();size=0
 with open(path,'rb') as f:
  while block:=f.read(1024*1024):
   size+=len(block)
   if size>MAX_ASSET:fail('asset too large')
   h.update(block)
 integer(size,1,MAX_ASSET);return h.hexdigest(),size

def write_package(destination,categories,items,sources,provenance=None):
 """sources: dict logical asset key -> {path,domain,mediaType,width,height}.
 items reference source keys as assetId; output references SHA256. Input is not mutated.
 Destination is explicit caller-owned local path, never taken from a package field.
 """
 if type(sources) is not dict or not 0<len(sources)<=MAX_COUNT:fail('source bounds')
 remap={};unique={};offset=0
 for key,s in sources.items():
  exact(s,['path','domain','mediaType','width','height']);ident(key)
  sha,length=digest(s['path']);remap[key]=sha
  a={'id':sha,'sha256':sha,'offset':offset,'length':length,'domain':s['domain'],'mediaType':s['mediaType'],'width':s['width'],'height':s['height']}
  if sha in unique:
   prior=unique[sha][0]
   if any(a[k]!=prior[k] for k in ('length','domain','mediaType','width','height')):fail('same hash with conflicting metadata')
  else:unique[sha]=(a,Path(s['path']));offset+=length
  if offset>MAX_FILE:fail('package too large')
 logical=[]
 for i in items:
  exact(i,['id','label','categoryId','assetId'])
  if i['assetId'] not in remap:fail('unknown source')
  logical.append({**i,'assetId':remap[i['assetId']]})
 m={'format':'SMUXPKG1','version':1,'categories':categories,'items':logical,'assets':[a for a,p in unique.values()]}
 if provenance is not None:m['provenance']=provenance
 validate(m,offset);encoded=canonical(m)
 if len(encoded)>MAX_MANIFEST or len(encoded)+12+offset>MAX_FILE:fail('package bounds')
 dest=Path(destination);tmp=None
 try:
  with tempfile.NamedTemporaryFile(dir=dest.parent,prefix='.smux-',delete=False) as out:
   tmp=Path(out.name);out.write(b'SMUXPKG1'+struct.pack('>I',len(encoded))+encoded)
   for a,path in unique.values():
    h=hashlib.sha256();n=0
    with path.open('rb') as source:
     while block:=source.read(1024*1024):
      n+=len(block)
      if n>a['length']:fail('source changed')
      h.update(block);out.write(block)
    if n!=a['length'] or h.hexdigest()!=a['sha256']:fail('source changed')
   out.flush();os.fsync(out.fileno())
  os.replace(tmp,dest);tmp=None
 finally:
  if tmp is not None:tmp.unlink(missing_ok=True)
 return {'manifest':m,'packId':hashlib.sha256(encoded).hexdigest(),'size':dest.stat().st_size}

if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('descriptor');p.add_argument('destination');args=p.parse_args()
 def pairs(values):
  obj={}
  for k,v in values:
   if k in obj or k in ('__proto__','prototype','constructor'):fail('duplicate/unsafe descriptor key')
   obj[k]=v
  return obj
 desc=json.loads(Path(args.descriptor).read_text(),object_pairs_hook=pairs)
 exact(desc,['categories','items','sources'],['provenance'])
 result=write_package(args.destination,desc['categories'],desc['items'],desc['sources'],desc.get('provenance'))
 print(json.dumps({'packId':result['packId'],'size':result['size']}))
