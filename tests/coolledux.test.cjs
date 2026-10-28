const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const D=require("../display-project.js"),UX=require("../coolledux-protocol.js"),X=require("../coolled-protocol.js");
const fixture=require("./fixtures/coolledux-reference.json");
const sha=bytes=>crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");
function sample(){
 const p=D.create(10,16);
 const pixels=frame=>Array.from({length:160},(_,i)=>{
  const x=i%10,y=Math.floor(i/10);
  return frame===1?(x===y%10?0xffffff:(x+y)%3?0x0f3050:0):(x+y)%5===0?0:((x*29%256)<<16)|((y*17%256)<<8)|((x+y)*13%256);
 });
 p.programs[0].repeat=2;p.programs[0].frames[0].pixels=pixels(0);
 p.programs.push({name:"Frames",hold:3,repeat:1,frames:[{duration:150,pixels:pixels(0)},{duration:350,pixels:pixels(1)}]});return p;
}
test("CoolLED family resolver keeps UX, X, U and M distinct and rejects ambiguous substrings",()=>{
 assert.equal(UX.family("CoolLEDUX"),"coolledux");assert.equal(UX.family("CoolLEDUX-31B8"),"coolledux");
 assert.equal(UX.family("CoolLEDX-DEVIL"),"coolledx");assert.equal(UX.family("CoolLEDM"),"coolledm");assert.equal(UX.family("CoolLEDU"),"coolledu");
 for(const name of ["CoolLEDUXX","NotCoolLEDUX","CoolLED","TRINKA","MELK-OF21"])assert.equal(UX.family(name),null);
 assert.notDeepEqual(UX.command("power",true),X.command("power",true));assert.notDeepEqual(UX.command("brightness",100),X.command("brightness",100));
});
test("UX direct vectors and CRC match documented distinct command framing",()=>{
 assert.equal(Buffer.from(UX.command("power",true)).toString("hex"),"0100020605020503");
 assert.equal(Buffer.from(UX.command("power",false)).toString("hex"),"01000206050003");
 assert.equal(Buffer.from(UX.command("brightness",255)).toString("hex"),"0100020604ff03");
 assert.equal(Buffer.from(UX.command("info")).toString("hex"),"010002051f03");
 assert.deepEqual(UX.decodeEnvelope(UX.command("solid",0xff0000)),[19,1,15,0]);
 assert.equal(UX.crc32([...Buffer.from("123456789")]),0x0376e6e7);
 for(const kind of ["password","firmware","timer","rotate","rhythm"])assert.throws(()=>UX.command(kind,1));
 assert.throws(()=>UX.command("brightness",256));assert.throws(()=>UX.command("power",1));
});
test("UX RGB444 uses transfer curve and avoids Graffiti white sentinel for every dark shade",()=>{
 assert.deepEqual(UX.pixel(0x303030),[1,17]);assert.deepEqual(UX.pixel(0x2f2f2f),[0,0]);
 assert.deepEqual(UX.pixel(0xffffff),[15,255]);assert.deepEqual(UX.pixel(0,"graffiti"),[0,4]);
 assert.deepEqual(UX.pixel(0x2f2f2f,"graffiti"),[0,4]);assert.deepEqual(UX.pixel(0),[0,0]);
});
test("UX still and animation plans exactly match pinned Python reference golden outputs",()=>{
 const p=sample(),plan=UX.compileProject(p);
 fixture.programs.forEach((expected,i)=>{
  const raw=UX.programBytes(p,i),actual=plan.programs[i];
  assert.equal(raw.data.length,expected.rawLength);assert.equal(sha(raw.data),expected.rawSha256);
  assert.equal(sha(UX.literalLzss(raw.data)),expected.compressedSha256);
  assert.equal(actual.crc32.toString(16).padStart(8,"0"),expected.crc32);
  assert.equal(Buffer.from(actual.packets[0]).toString("hex"),expected.announceHex);
  assert.equal(actual.packets.length,expected.packetCount);assert.equal(sha(actual.packets.flat()),expected.packetsSha256);
  assert.equal(actual.segments,2,"10 columns must become 8 + 2 column tiles");
 });
 assert.equal(plan.uploadEnabled,false);assert.equal(plan.dimensions.verified,false);assert.equal(plan.hardwareVerified,false);assert.equal(plan.transportMtuVerified,false);
});
test("UX packet envelopes, checksums, chunk indices and literal decompression are independently consistent",()=>{
 const p=sample(),plan=UX.compileProject(p);
 plan.programs.forEach((program,i)=>{
  const compressed=[];
  program.packets.slice(1).forEach((packet,index)=>{
   const payload=UX.decodeEnvelope(packet);assert.equal(payload[0],3);
   const size=(payload[8]<<8)|payload[9];assert.equal(size,payload.length-11);assert.ok(size<=128);
   assert.equal((payload[6]<<8)|payload[7],index);assert.equal(payload.slice(1).reduce((a,b)=>a^b,0),0);compressed.push(...payload.slice(10,-1));
  });
  const uncompressed=[];
  for(let offset=0;offset<compressed.length;){const flag=compressed[offset++];for(let bit=0;bit<8&&offset<compressed.length;bit++){assert.equal((flag>>bit)&1,1);uncompressed.push(compressed[offset++]);}}
  assert.deepEqual(uncompressed,UX.programBytes(p,i).data);
 });
});
test("UX capture decoder is bounded, strict and never derives dimensions from info bytes",()=>{
 const payload=[31,1,200,...Array(27).fill(0)];const encoded=UX.envelope(payload),hex=Buffer.from(encoded).toString("hex");
 const info=UX.decodeInfo(UX.parseHex(hex));assert.equal(info.power,true);assert.equal(info.brightness,200);assert.equal(info.dimensions,null);assert.equal(info.hardwareVerified,false);
 assert.deepEqual(UX.parseHex("01:00:02:06"),[1,0,2,6]);
 for(const invalid of [[1,0,2,5,3],[1,0,1,2,4,3],[1,0,0,4,3],Array(1025).fill(0)])assert.throws(()=>UX.decodeEnvelope(invalid));
 for(const invalid of ["a","gg","00 ".repeat(1025),"01<script>"])assert.throws(()=>UX.parseHex(invalid));
 assert.throws(()=>UX.decodeInfo(UX.envelope([31,1,100])));assert.throws(()=>UX.decodeInfo(UX.envelope([31,2,100,...Array(27).fill(0)])));
});
test("UX compiler rejects malformed and oversized projects, while draft height never implies hardware support",()=>{
 const p=D.create(48,12),plan=UX.compileProject(p);assert.equal(plan.dimensions.height,12);assert.equal(plan.dimensions.verified,false);assert.equal(plan.uploadEnabled,false);
 p.programs[0].frames[0].pixels.pop();assert.throws(()=>UX.compileProject(p));
 assert.throws(()=>UX.packetPlan(Array(160001).fill(0)));assert.throws(()=>UX.packetPlan([0],1,1));
});
