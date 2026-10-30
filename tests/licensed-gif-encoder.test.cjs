'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const A=require('../native-coolled-animation-gif-encoder'), D=require('../native-coolled-dynamic-gif-encoder');
let seed=0x17235121; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed;};
const frames=[0,0xffffff,0xff0000,0x00ff00,0x0000ff].map(c=>new Uint32Array(1536).fill(c));
frames.push(Uint32Array.from({length:1536},(_,i)=>(i%96)*0x020101));
frames.push(Uint32Array.from({length:1536},(_,i)=>i%2?0xffffff:0));
for(let i=0;i<24;i++)frames.push(Uint32Array.from({length:1536},()=>random()&0xffffff));
function parse(bytes) {
  const b=Buffer.from(bytes), word=i=>b.readUInt16LE(i);assert.equal(b.subarray(0,6).toString(),'GIF89a');
  const width=word(6),height=word(8); let at=13, palette=null, delay=0, packed=0, loop=null, out=[];
  if(b[10]&128){palette=b.subarray(at,at+3*(1<<((b[10]&7)+1)));at+=palette.length;}
  while(b[at]!==0x3b){
    const tag=b[at++];
    if(tag===0x21){const label=b[at++];if(label===0xf9){assert.equal(b[at++],4);packed=b[at++];delay=word(at)*10;at+=2;assert.equal(b[at++],0);assert.equal(b[at++],0);}else{const chunks=[];while(b[at]){const n=b[at++];chunks.push(b.subarray(at,at+n));at+=n;}at++;if(label===0xff){assert.equal(chunks[0].toString(),'NETSCAPE2.0');loop=chunks[1].readUInt16LE(1);}}}
    else {assert.equal(tag,0x2c);assert.equal(word(at),0);assert.equal(word(at+2),0);assert.equal(word(at+4),width);assert.equal(word(at+6),height);at+=8;const flags=b[at++];let p=palette;if(flags&128){p=b.subarray(at,at+3*(1<<((flags&7)+1)));at+=p.length;}const start=at++;const sizes=[];while(b[at]){const n=b[at++];sizes.push(n);at+=n;}at++;out.push({palette:p,delay,packed,stream:b.subarray(start,at),sizes,flags});}
    assert.ok(at<b.length);
  }
  assert.equal(at,b.length-1);return {width,height,loop,frames:out};
}
// Independently authored decoder: dictionary of byte strings, GIF LSB-first codes.
function decodeLzw(stream) {
  const min=stream[0], data=[];let at=1;while(stream[at]){const n=stream[at++];data.push(...stream.subarray(at,at+n));at+=n;}
  let bit=0,size=min+1,next,dict,prev=null,clears=0,widths=new Set(),out=[];
  const reset=()=>{dict=Array.from({length:1<<min},(_,i)=>[i]);next=(1<<min)+2;size=min+1;prev=null;};reset();
  while(true){widths.add(size);let code=0;for(let j=0;j<size;j++){assert.ok((bit>>3)<data.length);code|=((data[bit>>3]>>(bit&7))&1)<<j;bit++;}
    if(code===(1<<min)){reset();clears++;continue;}if(code===(1<<min)+1)break;
    const entry=dict[code]??(code===next&&prev?[...prev,prev[0]]:null);assert.ok(entry,'valid LZW code');out.push(...entry);
    if(prev&&next<4096){dict[next++]=[...prev,entry[0]];if(next===(1<<size)&&size<12)size++;}prev=entry;
  }
  return {pixels:Uint8Array.from(out),clears,widths:[...widths]};
}
test('public source provenance: generated algorithm spans and exact preserved notices',()=>{
 for(const name of ['animation','dynamic']){const source=fs.readFileSync(path.join(root,`native-coolled-${name}-gif-encoder.js`),'utf8');assert.ok(source.includes(fs.readFileSync(path.join(root,'tools/licensed-gif-encoder/upstream/gif.js-LICENSE'),'utf8')));assert.ok(source.includes(fs.readFileSync(path.join(root,'tools/licensed-gif-encoder/upstream/glide-LICENSE'),'utf8')));assert.match(source,/function NeuQuant\(pixels, samplefac\)/);assert.match(source,/outer_loop:/);assert.doesNotMatch(source,/new Map\(/);}
});
test('independent LZW decode exercises 9→12-bit width and repeated dictionary reset',()=>{
 for(const [api,length] of [[A,61440],[D,79872]]){const data=Uint8Array.from({length},()=>random()>>>24);const stream=api.lzw(data),decoded=decodeLzw(stream);assert.deepEqual(decoded.pixels,data);assert.ok(decoded.clears>2);assert.deepEqual(decoded.widths,[9,10,11,12]);}
 for(const p of [new Uint8Array([7]),new Uint8Array(4096).fill(0),Uint8Array.from({length:4096},(_,i)=>i%3)])assert.deepEqual(decodeLzw(A.lzw(p)).pixels,p);
});
test('GIF framing, palette ordering, timing flooring, opacity and loop zero',()=>{
 const selected=frames.slice(0,8), delays=[0,9,10,19,257,655350,750,200];const result=parse(D.encode(selected,{delays}));assert.equal(result.width,96);assert.equal(result.height,16);assert.equal(result.loop,0);assert.equal(result.frames.length,8);
 result.frames.forEach((frame,i)=>{const q=D.quantize(selected[i]);assert.deepEqual(Uint8Array.from(frame.palette),q.palette);assert.deepEqual(decodeLzw(frame.stream).pixels,q.indices);assert.equal(frame.delay,Math.floor(delays[i]/10)*10);assert.equal(frame.packed,0);assert.equal(frame.flags,i?0x87:0);assert.ok(frame.sizes.every(n=>n<=254));});
});
test('API bounds, malformed data, alpha stripping, no mutation, browser global and isolation',()=>{
 for(const api of [A,D]){const p=frames[0],opts=api===A?{delayMs:257}:{delays:[257]};assert.throws(()=>api.encode([],opts));assert.throws(()=>api.encode(Array(api.MAX_FRAMES+1).fill(p),opts));assert.throws(()=>api.encode([p]));assert.throws(()=>api.quantize([0]));assert.throws(()=>api.quantize(Array(1536).fill(NaN)));assert.throws(()=>api.quantize(Array(1536).fill(4294967296)));assert.throws(()=>api.lzw(new Uint8Array()));assert.throws(()=>api.lzw(new Uint8Array(api.MAX_FRAMES*1536+1)));assert.deepEqual(api.quantize(Array(1536).fill(-1)),api.quantize(Array(1536).fill(0xffffff)));assert.deepEqual(api.quantize(Array(1536).fill(0xff000000)),api.quantize(p));
 const maxFrames=Array.from({length:api.MAX_FRAMES},(_,i)=>frames[i%2]);const full=api.encode(maxFrames,api===A?{delayMs:9}:{delays:maxFrames.map(()=>9)});assert.equal(parse(full).frames.length,api.MAX_FRAMES);
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,api===A?'native-coolled-animation-gif-encoder.js':'native-coolled-dynamic-gif-encoder.js'),'utf8'),ctx);const key=api===A?'SmartEaseUXGifEncoder':'SmartEaseUXDynamicGifEncoder';assert.deepEqual(Object.keys(ctx),[key]);assert.equal(vm.runInContext(`${key}.quantize(Array(1536).fill(0xff0000)).indices.length`,ctx),1536);assert.equal(vm.runInContext(`${key}.lzw(new Uint8Array([1,2,3])).length>0`,ctx),true);assert.deepEqual(Object.keys(ctx),[key]);
 }
});
