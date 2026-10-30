'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../native-coolled-dynamic-effects'),R=require('../native-coolled-dynamic-resources'),masks=require('../native-coolled-dynamic/assets/masks.json');
const page=color=>({width:96,height:16,pixels:Array(1536).fill(color)});
test('28 authored masks preserve all names, stage order, RGBA bounds and manifest hash',()=>{
 assert.deepEqual(Object.keys(masks),Object.values(E.MASKS).flat());assert.equal(Object.keys(masks).length,28);
 for(const m of Object.values(masks)){assert.equal(m.width,100);assert.equal(m.height,100);assert.equal(m.rgba.length,40000);assert.ok(m.rgba.every(v=>Number.isInteger(v)&&v>=0&&v<=255));}
 const manifest=require('../docs/authored-dynamic-masks/manifest.json');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../',manifest.resource))).digest('hex'),manifest.sha256);
});
test('each family contains five distinct intermediate stages and progressively less opaque cover',()=>{
 const fingerprints=new Set();
 for(const names of Object.values(E.MASKS)){
  let prior=Infinity;
  names.forEach((n,i)=>{const a=masks[n].rgba.filter((_,j)=>j%4===3),total=a.reduce((s,v)=>s+v,0);assert.ok(total<prior,n);prior=total;if(i===0)assert.ok(a.every(v=>v===255));else if(i===6)assert.ok(a.every(v=>v===0));else{assert.ok(a.some(v=>v>0&&v<255),n);const h=crypto.createHash('sha256').update(Buffer.from(a)).digest('hex');assert.ok(!fingerprints.has(h),n);fingerprints.add(h);}});
 }
 assert.equal(fingerprints.size,20);
});
test('all four mask effects start dark, finish exact content and preserve seven-stage cadence',()=>{
 const pages=[page(0),page(0x40b0e0),{width:96,height:16,pixels:Array.from({length:1536},(_,i)=>i%7<3?0xff8040:0)}];
 for(const mode of [4,5,6,8])for(const p of pages){const before=JSON.stringify(p),out=E.generate([p],{mode,delayMs:203,stayMs:1700,masks});assert.ok(out.supported);assert.equal(out.frames.length,7);assert.ok(out.frames[0].pixels.every(v=>v===0));assert.deepEqual(out.frames[6],p);assert.deepEqual(out.delays,[203,203,203,203,203,203,1700]);assert.equal(JSON.stringify(p),before);assert.equal(out.fidelity,'authored-geometric-mask-sequence');}
});
test('Closing remains mirrored while light sweep moves left to right and fan opens from top',()=>{
 const p=page(0xffffff),closing=E.generate([p],{mode:4,masks}).frames;
 for(const f of closing)for(let y=0;y<16;y++)for(let x=0;x<48;x++)assert.equal(f.pixels[y*96+x],f.pixels[y*96+95-x]);
 const sweep=E.generate([p],{mode:5,masks}).frames[3];assert.ok(sweep.pixels[0]>sweep.pixels[95]);
 const fan=E.generate([p],{mode:8,masks}).frames[3];assert.ok(fan.pixels[48]>fan.pixels[15*96+48]);
});
test('Closing shrinks its central cover and reveals both outer edges before the center',()=>{
 const names=E.MASKS[4],frames=E.generate([page(0xffffff)],{mode:4,masks}).frames;
 for(let stage=1;stage<=5;stage++){
  const a=masks[names[stage]].rgba;
  for(const y of [0,49,99]){
   const alpha=x=>a[(y*100+x)*4+3];
   assert.equal(alpha(0),0);assert.equal(alpha(99),0);assert.equal(alpha(49),255);assert.equal(alpha(50),255);
  }
  for(const y of [0,7,15]){
   const row=frames[stage].pixels.slice(y*96,(y+1)*96);
   assert.equal(row[0],0xffffff);assert.equal(row[95],0xffffff);
   assert.equal(row[47],0);assert.equal(row[48],0);
   assert.ok(row[0]>row[47]&&row[95]>row[48]);
  }
 }
 const covers=names.slice(1,6).map(n=>masks[n].rgba.filter((v,i)=>i%4===3&&v>127).length);
 assert.ok(covers.every((n,i)=>i===0||n<covers[i-1]));
});
test('non-mask five modes retain stage counts and missing mask data fails without a fallback animation',()=>{
 for(const mode of [0,1,2,3,7]){const out=E.generate([page(0x80ff40)],{mode,delayMs:200,stayMs:0});assert.ok(out.supported);assert.equal(out.frames.length,mode===7?8:7);assert.ok(out.delays.every(v=>v===200));assert.equal(out.fidelity,'source-math-port-unverified-android-sampling');}
 for(const mode of [4,5,6,8]){const out=E.generate([page(1)],{mode});assert.equal(out.supported,false);assert.deepEqual(out.frames,[]);assert.equal(out.fidelity,'missing-dynamic-resource');}
});
test('RGBA source-over retains RGB pigment behavior and resource copy isolation',async()=>{
 const tinted=JSON.parse(JSON.stringify(masks));tinted.ic_dynamic_six2.rgba=Array.from({length:10000},()=>[255,0,0,128]).flat();const out=E.generate([page(0x0000ff)],{mode:5,masks:tinted});assert.ok(out.frames[1].pixels.every(v=>v===0x80007f));
 let calls=0;const r=R.create({fetch:async()=>{calls++;return{ok:true,text:async()=>JSON.stringify(masks)}}});const a=await r.loadMasks();a.ic_dynamic_five1.rgba[0]=255;assert.equal((await r.loadMasks()).ic_dynamic_five1.rgba[0],0);assert.equal(calls,1);r.clear();await r.loadMasks();assert.equal(calls,2);
});
