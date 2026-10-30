#!/usr/bin/env python3
"""Independent SmartEase Matrix Sans converter; no upstream program code.
Font build script and generated font data: SIL OFL-1.1; see third-party notices.
Uses integer area sampling (>= 1/3 ink), with per-glyph nonblank safety fallback.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'third-party/smartease-matrix-sans/unifont-16.0.04.hex'
OUT=ROOT/'native-coolled-draw-assets/fonts'
CONFIG=[('8_small',8,False,128),('8_large',8,True,128),('UNICODE12',12,False,65536),('UNICODE12_BOLD',12,True,65536),('32_14_small',14,False,65536),('32_14_large',14,True,65536),('32_16_small',16,False,65536),('32_16_large',16,True,65536)]
def sha(b):return hashlib.sha256(b).hexdigest()
def read_source():
 assert sha(SOURCE.read_bytes()) == "27256eb99d29545aa461e3b318d9fa9eec4b74f2ca8ede53d35e12bf5809fad7", "Pinned upstream HEX hash mismatch"
 glyphs={}
 for line in SOURCE.read_text().splitlines():
  c,h=line.split(':');cp=int(c,16);w=len(h)//4
  if cp<65536:
   assert w in (8,16)
   rows=[int(h[y*w//4:(y+1)*w//4],16) for y in range(16)]
   glyphs[cp]=(w,rows)
 return glyphs

def raster(source,size,bold):
 w,rows=source
 if size==16:
  bitmap=[[int(x<w and bool(rows[y]&(1<<(w-1-x)))) for x in range(size)] for y in range(size)]
  return embolden(bitmap,size) if bold else bitmap
 # Keep 8-column Latin detail, left aligned; full-width glyphs fit square ABI.
 dw=min(w,size)
 bitmap=[[0]*size for _ in range(size)]
 scores=[]
 for y in range(size):
  for x in range(dw):
   ink=0
   for sy in range(y*16//size,min(16,((y+1)*16+size-1)//size)):
    oy=max(0,min((y+1)*16,(sy+1)*size)-max(y*16,sy*size))
    for sx in range(x*w//dw,min(w,((x+1)*w+dw-1)//dw)):
     ox=max(0,min((x+1)*w,(sx+1)*dw)-max(x*w,sx*dw))
     if rows[sy] & (1<<(w-1-sx)):ink+=ox*oy
   bitmap[y][x]=int(ink*3>=w*16)
   scores.append((ink,y,x))
 if any(rows) and not any(map(any,bitmap)):
  _,y,x=max(scores);bitmap[y][x]=1
 if bold:bitmap=embolden(bitmap,size)
 return bitmap

def embolden(bitmap,size):
 # Preserve one-pixel counters instead of filling them into unreadable solid blocks.
 return [[int(row[x] or (x>0 and row[x-1] and not(x+1<size and row[x+1]))) for x in range(size)] for row in bitmap]

def encode(bitmap,size):
 stride=(size+7)//8;b=bytearray(size*stride)
 for y,row in enumerate(bitmap):
  for x,on in enumerate(row):
   if on:b[x*stride+y//8]|=128>>(y%8)
 return b

def main():
 glyphs=read_source();OUT.mkdir(parents=True,exist_ok=True);records=[]
 for name,size,bold,count in CONFIG:
  b=bytearray();nonblank=0
  normal=(OUT/CONFIG[CONFIG.index((name,size,bold,count))-1][0]).read_bytes() if bold else None
  for cp in range(count):
   # No substitute character for absent, surrogate, or noncharacter slots.
   source=glyphs.get(cp,(8,[0]*16))
   if bold:
    stride=(size+7)//8
    bitmap=[[int(bool(normal[(cp*size+x)*stride+y//8]&(128>>(y%8)))) for x in range(size)] for y in range(size)]
    data=encode(embolden(bitmap,size),size)
   else:data=encode(raster(source,size,False),size)
   b.extend(data);nonblank+=bool(any(data))
  (OUT/name).write_bytes(b);records.append(dict(name=name,size=size,bold=bold,entries=count,bytes=len(b),sha256=sha(b),nonblank=nonblank))
 manifest=dict(family='SmartEase Matrix Sans',modified='2026-10-30',license='OFL-1.1',upstream_version='16.0.04',source_archive_sha256='2bd4e4679757126f48e1bf2c1be40b09aa92162bfedda4683ce5fbc70a2a5972',source_url='https://unifoundry.com/pub/unifont/unifont-16.0.04/unifont-16.0.04.tar.gz',source_hex_sha256=sha(SOURCE.read_bytes()),converter_sha256=sha(Path(__file__).read_bytes()),source_BMP_entries=len(glyphs),algorithm='Integer area sampling, ink coverage >= 1/3; strongest pixel fallback only if nonempty source would become blank. Eight-column glyphs retain their horizontal detail; full-width glyphs scale to cell. Bold: rightward one-pixel dilation clipped to cell, preserving single-pixel horizontal counters. Missing slots blank. Column-major MSB-first.',assets=records)
 (ROOT/'third-party/smartease-matrix-sans/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':main()
