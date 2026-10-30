'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const D=require('../native-coolled-animation-gif-decoder'),M=require('../native-coolled-material-codec');
// Independently authored GIF87a/89a fixture builder. No vendor artwork/source bytes.
// A clear before each pixel keeps this deliberately simple writer at3-bit codes.
function gif({width=96,height=16,frames=1,fw=width,fh=height,delays=Array(frames).fill(10),badFrame=-1,badCodeFrame=-1,signature='GIF89a'}={}){
 const a=Array.from(Buffer.from(signature)),u16=n=>a.push(n&255,n>>8&255);u16(width);u16(height);a.push(0x80,0,0,0,0,0,255,0,0);
 for(let f=0;f<frames;f++){
  a.push(0x21,0xf9,4,0);u16(delays[f]??10);a.push(0,0,0x2c);u16(0);u16(0);u16(fw);u16(fh);a.push(0,2);
  let bit=0,bytes=[];function code(c){for(let j=0;j<3;j++,bit++){const i=bit>>3;bytes[i]=(bytes[i]||0)|((c>>j&1)<<(bit&7));}}
  for(let i=0;i<fw*fh;i++){code(4);code(f===badCodeFrame?6:f===badFrame?2:(f+i)%2);}code(5);
  for(let i=0;i<bytes.length;i+=255)a.push(Math.min(255,bytes.length-i),...bytes.slice(i,i+255));a.push(0);
 }a.push(0x3b);return Uint8Array.from(a);
}
const wrap=b=>{const a=b.slice();for(let i=0;i<32;i++)a[i]^=0xda;return a;};
test('Plain GIF and exact first32-byte DPT wrapper decode identical full content without altering any inputs',()=>{
 const plain=gif({frames:3,delays:[10,20,35]}),dpt=wrap(plain),original=dpt.slice();
 for(const [input,format]of [[plain,'gif'],[dpt,'dpt-gif']]){const r=M.decode(input);A.equal(r.format,format);A.deepEqual(r.gifBytes,plain);A.deepEqual(r.originalBytes,input);A.notEqual(r.gifBytes,input);A.notEqual(r.originalBytes,input);A.deepEqual(r.delays,[100,200,350]);A.equal(r.frames.length,3);A.equal(r.sourceFrameCount,3);A.equal(r.truncated,false);A.equal(r.frames[0].pixels[0],0xff000000);A.equal(r.frames[0].pixels[1],0xffff0000);A.equal(r.frames[1].pixels[0],0xffff0000);}
 A.deepEqual(dpt,original);A.deepEqual(dpt.slice(32),plain.slice(32));
 const r=M.decode(dpt);dpt.fill(0);A.deepEqual(r.gifBytes,plain);A.deepEqual(r.originalBytes,original);r.gifBytes.fill(0);A.deepEqual(r.originalBytes,original);
});
test('Material retains41frames with separate raw and source-normalized timing; Animation default retains40',()=>{
 const delays=Array.from({length:41},(_,i)=>[0,1,2,10,20][i%5]),b=gif({frames:41,delays}),r=M.decode(wrap(b));A.equal(r.frames.length,41);A.deepEqual(r.rawDelays,delays.map(n=>n*10));A.deepEqual(r.delays,delays.map(n=>n<2?100:n*10));A.deepEqual(r.frames.map(f=>f.delay),r.delays);A.equal(r.truncated,false);
 const old=D.decode(b);A.equal(old.frames.length,40);A.equal(old.sourceFrameCount,41);A.equal(old.truncated,true);A.deepEqual(old.frames.slice(0,5).map(f=>f.delay),[100,100,20,100,200]);
 const exact=D.decode(b,{maxFrames:41,strictFrameLimit:true,preserveDelays:true});A.equal(exact.frames.length,41);A.deepEqual(exact.frames.map(f=>f.delay),r.rawDelays);A.deepEqual(exact.frames.map(f=>f.normalizedDelay),r.delays);
 A.throws(()=>M.decode(b,{maxFrames:40}),/strict frame limit/);A.throws(()=>D.decode(b,{strictFrameLimit:true}),/strict frame limit/);
});
test('Missing GCE remains legacy zero while explicit zero/one-centisecond controls normalize to100ms',()=>{
 const a=gif(),without=Uint8Array.from([...a.slice(0,19),...a.slice(27)]),m=M.decode(without),d=D.decode(without);
 A.deepEqual(m.rawDelays,[0]);A.deepEqual(m.delays,[0]);A.equal(d.frames[0].delay,0);
 for(const delay of [0,1]){const bytes=gif({delays:[delay]}),r=M.decode(bytes);A.deepEqual(r.rawDelays,[delay*10]);A.deepEqual(r.delays,[100]);A.equal(r.frames[0].delay,100);A.deepEqual(r.gifBytes,bytes);}
});
test('Every frame is validated beyond40; malformed LZW cannot hide behind truncation',()=>{
 const bad=gif({frames:41,badCodeFrame:40});A.throws(()=>M.decode(bad),/Invalid first GIF code/);A.throws(()=>D.decode(bad),/Invalid first GIF code/);
});
test('Exact GIF signatures only: no arbitrary header repair and no partially transformed short input',()=>{
 for(const sig of ['GIF87a','GIF89a'])A.equal(M.decode(wrap(gif({signature:sig}))).frames.length,1);
 const b=gif();for(const i of [0,1,2,3,4,5]){const c=b.slice();c[i]^=1;A.throws(()=>M.decode(c),/Not a GIF/);A.throws(()=>M.decode(wrap(c)),/Not a GIF/);}
 for(const n of [0,5,6,10,31])A.throws(()=>M.decode(new Uint8Array(n)),/header/);
 const c=wrap(b);c[35]^=0xff;A.throws(()=>M.decode(c));
});
test('Truncation, trailing bytes, corrupt descriptor and target mismatch reject without partial output',()=>{
 const b=gif();for(const n of [6,9,12,20,31,b.length-1])A.throws(()=>M.decode(b.slice(0,n)));
 A.throws(()=>D.decode(Uint8Array.from([...b,0])),/trailing/);
 A.throws(()=>M.decode(gif({width:16,height:96})),/dimensions/);
 A.equal(M.decode(gif({width:16,height:96}),{expectedWidth:16,expectedHeight:96}).frames.length,1);
 A.throws(()=>M.decode(gif({fw:97})),/outside canvas/);
 const a=b.slice();a[6]=0;a[7]=0;A.throws(()=>M.decode(a),/dimensions/);
});
test('Strict frame/input/decoded-work limits reject, never silently truncate',()=>{
 const b=gif({width:1,height:1,frames:1024});A.equal(M.decode(b,{expectedWidth:1,expectedHeight:1}).frames.length,1024);
 A.throws(()=>M.decode(gif({width:1,height:1,frames:1025}),{expectedWidth:1,expectedHeight:1}),/Too many GIF frames/);
 A.throws(()=>M.decode(new Uint8Array(M.LIMITS.bytes+1)),/8 MiB/);
 A.throws(()=>M.decode(gif({width:4096,height:1024,fw:1,fh:1,frames:5}),{expectedWidth:4096,expectedHeight:1024}),/16 megapixels total/);
 for(const maxFrames of [0,1025,1.5,NaN,null,'40']){A.throws(()=>M.decode(b,{maxFrames}));A.throws(()=>D.decode(b,{maxFrames}));}
 for(const options of [null,[],0]){A.throws(()=>M.decode(b,options));A.throws(()=>D.decode(b,options));}
 for(const flag of ['strictFrameLimit','preserveDelays','materialCompatibility'])A.throws(()=>D.decode(b,{[flag]:1}),/flags/);
 for(const input of ['GIF89a',123,[],null,{}])A.throws(()=>M.decode(input),/input/);
});
test('Material source compatibility zero-pads undeclared palette slots and skips zero ARGB, not opaque black',()=>{
 const a=gif({frames:2,badFrame:1}),r=M.decode(a);A.equal(r.frames.length,2);A.deepEqual(r.frames[1].pixels,r.frames[0].pixels);A.equal(r.frames[1].pixels[1],0xffff0000);A.throws(()=>D.decode(a),/palette index/);
 const transparent=gif({badFrame:0});transparent[22]=1;transparent[25]=2;
 const t=M.decode(transparent);A.ok(t.frames[0].pixels.every(c=>c===0));A.throws(()=>D.decode(transparent),/palette index/);
 const padded=D.decode(a,{maxFrames:2,strictFrameLimit:true,materialCompatibility:true});A.deepEqual(padded.frames[1].pixels,padded.frames[0].pixels);A.equal(padded.ignoredTrailingBytes,0);
});
test('Material stops at the first structurally reached trailer, preserves bounded suffix verbatim and reports its size',()=>{
 const base=gif(),suffix=gif({frames:2}),combined=Uint8Array.from([...base,...suffix]),r=M.decode(wrap(combined));
 A.equal(r.frames.length,1);A.equal(r.sourceFrameCount,1);A.equal(r.ignoredTrailingBytes,suffix.length);A.deepEqual(r.gifBytes,combined);A.deepEqual(r.originalBytes,wrap(combined));A.throws(()=>D.decode(combined),/trailing/);
 A.equal(M.decode(base).ignoredTrailingBytes,0);A.equal(Object.hasOwn(D.decode(base),'ignoredTrailingBytes'),false);
 const invalid=Uint8Array.from([...base.slice(0,-1),0,0x3b]);A.throws(()=>M.decode(invalid),/Invalid GIF block/);
 A.throws(()=>M.decode(base.slice(0,-1)),/trailer/);
});
test('Input snapshots use intrinsic byte length and bytes, never custom iterators or shadow properties',()=>{
 const bytes=gif(),tiny=new Uint8Array(1);let calls=0;
 tiny[Symbol.iterator]=function*(){calls++;yield* bytes;};Object.defineProperty(tiny,'byteLength',{value:bytes.length});
 A.throws(()=>M.decode(tiny),/header/);A.equal(calls,0);
 const b=bytes.slice();b[Symbol.iterator]=()=>{throw Error('iterator must not run');};Object.defineProperty(b,'byteLength',{value:1});Object.defineProperty(b,'length',{get(){throw Error('shadow length must not run');}});
 A.deepEqual(M.decode(b).gifBytes,bytes);
 const large=new Uint8Array(M.LIMITS.bytes+1);Object.defineProperty(large,'byteLength',{value:1});A.throws(()=>M.decode(large),/8 MiB/);
 const buffer=bytes.buffer.slice(0);Object.defineProperty(buffer,'byteLength',{get(){throw Error('shadow buffer length must not run');}});A.deepEqual(M.decode(buffer).gifBytes,bytes);
 for(const v of [new Uint16Array(8),new Uint8ClampedArray(8),new DataView(bytes.buffer),new Proxy(bytes,{})])A.throws(()=>M.decode(v),/input/);
 const detached=bytes.buffer.slice(0);structuredClone(detached,{transfer:[detached]});A.throws(()=>M.decode(detached),/unavailable/);
});
test('ArrayBuffer snapshot and browser module load require no DOM, network, BLE or source mutation',()=>{
 const b=gif(),copy=b.buffer.slice(0),r=M.decode(copy);new Uint8Array(copy).fill(0);A.deepEqual(r.gifBytes,b);
 const c=vm.createContext({Uint8Array,Uint16Array,Uint32Array,ArrayBuffer});for(const name of ['native-coolled-animation-gif-decoder.js','native-coolled-material-codec.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),c);
 const out=c.SmartEaseUXMaterialCodec.decode(b);A.equal(out.frames.length,1);A.deepEqual(Array.from(out.gifBytes),Array.from(b));A.equal(c.fetch,undefined);A.equal(c.navigator,undefined);A.equal(Object.isFrozen(c.SmartEaseUXMaterialCodec),true);
 const missing=vm.createContext({Uint8Array,ArrayBuffer});vm.runInContext(fs.readFileSync(path.join(__dirname,'../native-coolled-material-codec.js'),'utf8'),missing);A.throws(()=>missing.SmartEaseUXMaterialCodec.decode(b),/unavailable/);
});
module.exports={gif,wrap};
