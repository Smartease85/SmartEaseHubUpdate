const test=require("node:test"),assert=require("node:assert/strict");
const D=require("../display-project.js"),X=require("../coolled-protocol.js");
test("display project rejects hostile, truncated and oversized imports and normalizes metadata",()=>{
 const p=D.create(8,8);p.programs[0].name="a".repeat(100);assert.equal(D.validate(p).programs[0].name.length,40);
 for(const mutate of [p=>p.width=NaN,p=>p.height=7,p=>p.version=2,p=>p.programs=[],p=>p.programs[0].frames[0].pixels.pop(),p=>p.programs[0].frames[0].pixels[0]=-1,p=>p.programs[0].frames[0].duration=0]){
  const raw=D.create(8,8);mutate(raw);assert.throws(()=>D.validate(raw));
 }
 const full=D.create(128,64);full.programs[0].frames=Array.from({length:9},()=>D.frame(128,64));assert.throws(()=>D.validate(full),/full/);
});
test("resize preserves coordinates, pads black and never mutates the old project",()=>{
 const p=D.create(8,8);p.programs[0].frames[0].pixels[9]=0x123456;
 const large=D.resize(p,16,16);assert.equal(large.programs[0].frames[0].pixels[17],0x123456);assert.equal(large.programs[0].frames[0].pixels[255],0);
 assert.equal(p.width,8);assert.equal(p.programs[0].frames[0].pixels.length,64);
 assert.deepEqual(D.resize(large,8,8),p);
});
test("pixel shifts do not wrap and mirror is reversible; alpha composites onto black",()=>{
 const p=D.create(8,8);p.programs[0].frames[0].pixels[0]=0xff0000;
 assert.equal(D.transform(p,0,0,"left").some(Boolean),false);
 assert.equal(D.transform(p,0,0,"right")[1],0xff0000);
 p.programs[0].frames[0].pixels=D.transform(p,0,0,"mirror");assert.equal(p.programs[0].frames[0].pixels[7],0xff0000);
 assert.equal(D.transform(p,0,0,"mirror")[0],0xff0000);
 assert.deepEqual(D.imagePixels([255,0,0,128,255,255,255,0],2,1),[0x800000,0]);
});
test("playlist honors still hold, frame durations, repeats and program order",()=>{
 const p=D.create(8,8);p.programs[0].hold=2;p.programs[0].repeat=2;
 p.programs.push({name:"Animation",hold:3,repeat:1,frames:[D.frame(8,8),{duration:450,pixels:Array(64).fill(1)}]});
 assert.deepEqual(D.sequence(p),[{program:0,frame:0,duration:2000},{program:0,frame:0,duration:2000},{program:1,frame:0,duration:200},{program:1,frame:1,duration:450}]);
});
test("CoolLEDX framing matches independent Rust command fixtures; zero remains unescaped",()=>{
 assert.deepEqual(X.command("mode",1),[1,0,2,6,6,2,5,3]);
 assert.deepEqual(X.command("power",false),[1,0,2,6,9,0,3]);
 assert.deepEqual(X.command("power",true),[1,0,2,6,9,2,5,3]);
 assert.deepEqual(X.command("brightness",16),[1,0,2,6,8,16,3]);
 assert.deepEqual(X.envelope([0,1,2,3]),[1,0,4,0,2,5,2,6,2,7,3]);
 assert.throws(()=>X.command("brightness",-1));assert.throws(()=>X.command("mode",9));assert.equal(X.hardwareVerified,false);
});
function decode(packet){
 assert.equal(packet[0],1);assert.equal(packet.at(-1),3);const data=[];
 for(let i=1;i<packet.length-1;i++)data.push(packet[i]===2?packet[++i]^4:packet[i]);
 assert.equal((data[0]<<8)|data[1],data.length-2);return data.slice(2);
}
test("CoolLEDX candidate image is column-major RGB bitplanes, top pixel MSB",()=>{
 const pixels=Array(64).fill(0);pixels[0]=0xff0000;pixels[56]=0x00ff00;pixels[1]=0x0000ff;
 const planes=X.planes(8,8,pixels);assert.equal(planes[0][0],128);assert.equal(planes[1][0],1);assert.equal(planes[2][1],128);
 const payload=decode(X.image(8,8,pixels)[0]);assert.equal(payload[0],3);assert.deepEqual(payload.slice(1,7),[0,0,50,0,0,50]);
 assert.deepEqual(payload.slice(7,31),Array(24).fill(0));assert.deepEqual(payload.slice(31,33),[0,24]);
 assert.equal(payload.slice(1).reduce((a,b)=>a^b,0),0);
 assert.throws(()=>X.image(48,12,Array(576).fill(0)),/divisible/);
});
test("CoolLEDX chunks reassemble with per-packet lengths and XOR; animation planes span frames",()=>{
 const data=Array.from({length:300},(_,i)=>i&255),packets=X.chunks(3,data),restored=[];
 packets.forEach((packet,i)=>{const p=decode(packet);assert.equal(p[0],3);assert.equal((p[2]<<8)|p[3],300);assert.equal((p[4]<<8)|p[5],i);assert.equal(p[6],p.length-8);assert.equal(p.slice(1).reduce((a,b)=>a^b,0),0);restored.push(...p.slice(7,-1));});assert.deepEqual(restored,data);
 const red=Array(64).fill(0xff0000),blue=Array(64).fill(0x0000ff),p=decode(X.animation(8,8,[red,blue],200)[0]);
 const body=p.slice(7,-1);assert.deepEqual(body.slice(24,27),[2,0,200]);
 assert.deepEqual(body.slice(27,43),[...Array(8).fill(255),...Array(8).fill(0)]);
 assert.deepEqual(body.slice(-16),[...Array(8).fill(0),...Array(8).fill(255)]);
});
