"""Independent synthetic cursor/field oracle from source fallback labels L1885–L1a7e.
No BLE traffic, owner capture, firmware inference or network operations.
"""
import json,pathlib
out=pathlib.Path(__file__).parent/'vectors.json'
def expected(a):
    n=len(a);b=(18 if n>=18 else n);p=b+1;packet=None;layout='direct'
    if n>=b+10:
        length=a[b+9]
        if length<=20 and n>=b+14+length:
            packet=int.from_bytes(bytes(a[b+1:b+3]),'big');p=b+10+length;layout='newer'
    if layout=='direct' and n>=p+7:
        length=a[p+6]
        if length<=20 and n>=p+11+length:p+=7+length;layout='legacy'
    start=p;startup=a[p] if p<n else None
    if p<n:p+=1
    warm=int.from_bytes(bytes(a[p:p+2]),'big') if p+2<=n else None
    if warm is not None:p+=2
    volume=a[p] if p<n else None
    raw=a[8] if n>8 else None
    return {'layout':layout,'tail':start,'startup':startup,'warmUp':warm,'volume':volume,'capacity':raw if raw is not None and 1<=raw<=99 else 9,'capacityKnown':raw is not None and 1<=raw<=99,'packet':packet if packet is not None and 1<=packet<=4096 else 1024,'packetKnown':packet is not None and 1<=packet<=4096}
cases=[]
for n in range(1,65):
    a=[31]+[(i*17+3)%256 for i in range(1,n)];cases.append({'payload':a,'expected':expected(a)})
for kind in ('newer','legacy'):
 for L in (0,1,2,20,21):
  for packet in (0,1,4096,4097):
   for delta in (-2,-1,0,1,2):
    tail=(28 if kind=='newer' else 26)+L;n=max(28,tail+4+delta);a=[0]*n;a[0]=31;a[8]=99;a[18]=7
    if kind=='newer':a[19:21]=list(packet.to_bytes(2,'big'));a[27]=L
    else:a[25]=L;a[27]=255
    if tail<n:a[tail]=3
    if tail+1<n:a[tail+1]=0x12
    if tail+2<n:a[tail+2]=0x34
    if tail+3<n:a[tail+3]=88
    cases.append({'payload':a,'expected':expected(a)})
request=bytes([1,0,2,5,31,3]);assert request.hex()=='010002051f03'
out.write_text(json.dumps({'note':'264 synthetic source-offset vectors; not captured device packets','request':list(request),'cases':cases},separators=(',',':'))+'\n')
print(len(cases),'source-offset vectors written')
