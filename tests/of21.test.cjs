const test=require("node:test"),assert=require("node:assert/strict");
const OF=require("../of21-protocol.js"),OA=require("../lotus-protocol.js");
const hex=bytes=>Buffer.from(bytes).toString("hex").toUpperCase();
test("OF21 microphone rhythm IDs are hexadecimal 0x80–0x87, never decimal 80–87",()=>{
 for(let index=0;index<8;index++){
  assert.equal(hex(OF.command("mic-rhythm",0x80+index)),`7E07038${index}04FFFF00EF`);
  assert.throws(()=>OF.command("mic-rhythm",0x50+index));
 }
 for(const value of [0x7f,0x88,128.5,NaN,"128"])assert.throws(()=>OF.command("mic-rhythm",value));
});
test("OF21 exact identity remains distinct from OA10 and unsupported near-matches",()=>{
 assert.equal(OF.profile("MELK-OF21 1D"),"melk-of21");assert.equal(OF.profile("MELK-OF21"),"melk-of21");assert.equal(OA.profile("MELK-OF21 1D"),null);
 for(const name of ["MELK-OA10","MELK-OA21","MELK-OF210","MELK-OF21x","NOKINS"])assert.equal(OF.profile(name),null);
});
test("OF21 core exactly matches source-derived APK E1 vectors, including distinct length and flags",()=>{
 const vectors=[
  ["power",true,"7E0704FF00010201EF"],["power",false,"7E07040000000201EF"],["rgb-power",true,"7E0704FF01010201EF"],["rgb-power",false,"7E07040001000201EF"],
  ["color","#ff0000","7E070503FF000010EF"],["brightness",50,"7E04013201FF0201EF"],
  ["speed",50,"7E070232FFFFFF00EF"],["effect",1,"7E07030106FFFF00EF"],["scene",1,"7E07310107FFFF00EF"],
  ["sensitivity",50,"7E070632FFFFFF00EF"],["microphone",true,"7E070701FFFFFF00EF"],["microphone",false,"7E070700FFFFFF00EF"]
 ];
 for(const [kind,value,expected] of vectors){const result=OF.command(kind,value);assert.equal(result.length,9);assert.equal(hex(result),expected);}
 assert.equal(hex(OF.command("color","#ff0000",{music:true})),"7E070503FF000020EF");
 assert.equal(hex(OF.command("clock",{hour:12,minute:34,second:56,weekday:3})),"7E06830C22380300EF");
 assert.notDeepEqual(OF.command("speed",50),OA.nativeModeCommands("melk-oa10",1,{speed:50,brightness:50})[1]);
 assert.notDeepEqual(OF.command("brightness",50),OA.commands("melk-oa10",{on:true,color:"#ff0000",brightness:50}).at(-1));
});
test("OF21 guards prevent wrapping and invented catalogs while plans label unresolved ranges and transport",()=>{
 for(const n of [-1,256,1.5,NaN])for(const kind of ["brightness","speed","sensitivity"])assert.throws(()=>OF.command(kind,n));
 assert.equal(OF.effects.length,234);assert.equal(OF.scenes.length,33);assert.equal(hex(OF.command("effect",233)),"7E0703E906FFFF00EF");assert.throws(()=>OF.command("effect",234));for(const id of [0,100,151,153,157])assert.throws(()=>OF.command("scene",id));assert.equal(hex(OF.command("brightness",50,{target:"all"})),"7E04013200FF0201EF");for(const kind of ["brightness","speed"])assert.throws(()=>OF.command(kind,101));
 assert.throws(()=>OF.command("power",1));assert.throws(()=>OF.command("color","#zz0000"));assert.throws(()=>OF.command("clock",{hour:24,minute:0,second:0,weekday:0}));
 const p=OF.examples();assert.equal(p.liveEnabled,false);assert.equal(p.hardwareVerified,false);assert.equal(p.rangesSourceVerified,true);assert.equal(p.catalogSourceVerified,true);assert.equal(p.transport.writeMode,"discovered-properties");assert.equal(p.transport.notify,"discovered-properties");assert.match(p.transport.read,/fff3/);
});
test("OF21 DIY matches native-shaped static/dynamic fixtures and rejects invalid geometry",()=>{
 const colors=Array.from({length:10},(_,i)=>i%2?"#0000ff":"#ff0000");
 const p=OF.diy({nodeCount:10,totalNodes:10,colors});
 assert.deepEqual(p.packets.map(hex),["7E07370A00010100EF","7E321E001605FFFFEF","7E33FF00000000FF01","7E33FF00000000FF02","7E33FF00000000FF03","7E33FF00000000FF04","7E33FF00000000FF05","7E34000032FFFFFFEF"]);assert.equal(p.checksum,0x1605);
 const dynamic=OF.diy({nodeCount:10,totalNodes:10,colors:["#ff0000","#0000ff"],mode:1});assert.deepEqual(dynamic.packets.map(hex),["7E07370A00010100EF","7E3206000B24FFFFEF","7E33FF00000000FF01","7E34010032FFFFFFEF"]);
 assert.equal(OF.diy({nodeCount:10,totalNodes:600,colors}).checksum,p.checksum,"geometry preamble is excluded from SUM16");
 const odd=OF.diy({nodeCount:10,totalNodes:10,colors:["#ff0000","#00ff00","#0000ff"],mode:1});assert.deepEqual(odd.packets[3],[0x7e,0x33,0,0,255,255,255,255,2]);
 for(const nodeCount of [0,2,9,31,256,1.5])assert.throws(()=>OF.diy({nodeCount,totalNodes:10,colors}));
 assert.throws(()=>OF.diy({nodeCount:10,totalNodes:65535,colors}));assert.throws(()=>OF.diy({nodeCount:10,totalNodes:10,colors,mode:7}));assert.throws(()=>OF.diy({nodeCount:10,totalNodes:10,colors:["#ff0000","#0000ff"]}));
 assert.equal(p.uploadEnabled,false);assert.equal(p.hardwareVerified,false);
});
test("OF21 total-node query/parser is bounded and does not apply a generic 50-node cap",()=>{
 assert.equal(hex(OF.command("geometry-query")),"7E0737FFFFFF00FFEF");
 assert.equal(OF.parseGeometry([0x7e,7,0x37,96,0,255,0,0x88,0xef]).totalNodes,96);
 assert.equal(OF.parseGeometry([0x7e,7,0x37,96,0,255,0,0x87,0xef]),null);assert.equal(OF.parseGeometry(Array(1025).fill(0)),null);
});

test("OF21 two timer slots encode all weekday/enable masks and reject query echoes or malformed responses",()=>{
 assert.equal(hex(OF.command('timer',{kind:0,hour:7,minute:30,days:31,enabled:true})), '7E0782071E00009FEF');
 assert.equal(hex(OF.command('timer',{kind:1,hour:22,minute:15,days:96,enabled:true})), '7E0782160F0001E0EF');
 assert.equal(hex(OF.command('timer',{kind:0,hour:7,minute:30,days:0,enabled:true})), '7E0782071E000080EF');
 assert.equal(hex(OF.command('timer',{kind:0,hour:7,minute:30,days:31,enabled:false})), '7E0782071E00001FEF');
 for(let mask=0;mask<256;mask++)for(const kind of [0,1]){
  const timer={kind,hour:23,minute:59,days:mask&127,enabled:!!(mask&128)},bytes=OF.command('timer',timer);
  assert.equal(bytes[7],mask);assert.deepEqual(OF.parseTimer(bytes),timer);
 }
 for(let day=0;day<7;day++)assert.equal(OF.command('timer',{kind:0,hour:7,minute:30,days:1<<day,enabled:true})[7],0x80|(1<<day));
 assert.equal(hex(OF.command('timer-query',0)),'7E0782FFFFFF0000EF');assert.equal(hex(OF.command('timer-query',1)),'7E0782FFFFFF0100EF');
 for(const kind of [0,1])assert.equal(OF.parseTimer(OF.command('timer-query',kind)),null);
 const valid=OF.command('timer',{kind:0,hour:7,minute:30,days:127,enabled:true});
 for(const [offset,value] of [[0,0],[1,6],[2,0x37],[3,24],[4,60],[5,255],[6,2],[8,0]]){const bytes=valid.slice();bytes[offset]=value;assert.equal(OF.parseTimer(bytes),null);}
 assert.equal(OF.parseTimer(valid.slice(0,8)),null);assert.equal(OF.parseTimer([...valid,0]),null);
 for(const timer of [{kind:2},{hour:24},{minute:60},{days:128},{enabled:1}])assert.throws(()=>OF.command('timer',{kind:0,hour:7,minute:30,days:0,enabled:true,...timer}));
});

test("OF21 source configuration vectors distinguish order permutations, count bounds, collapse and mic range",()=>{
 const orders={RGB:[1,2,3],RBG:[1,3,2],GRB:[2,1,3],GBR:[2,3,1],BRG:[3,1,2],BGR:[3,2,1]};
 for(const [name,codes] of Object.entries(orders))assert.deepEqual(OF.command('wire-order',name),[0x7e,7,0x81,...codes,255,0,0xef]);
 assert.equal(hex(OF.command('wire-order','GRB')),'7E0781020103FF00EF');
 for(const value of ['',0,'RRG','RG','RGBW','rgb'])assert.throws(()=>OF.command('wire-order',value));
 for(const [value,expected] of [[10,'7E07210A0000FF00EF'],[300,'7E07212C0100FF00EF'],[1000,'7E0721E80300FF00EF']])assert.equal(hex(OF.command('point-count',value)),expected);
 for(const value of [9,1001,300.5,'300',NaN])assert.throws(()=>OF.command('point-count',value));
 assert.equal(hex(OF.command('collapse',true)),'7E072201FFFFFF00EF');assert.equal(hex(OF.command('collapse',false)),'7E072200FFFFFF00EF');assert.throws(()=>OF.command('collapse',0));
 for(const value of [0,50,100])assert.equal(OF.command('sensitivity',value)[3],value);for(const value of [-1,101,255,0.5])assert.throws(()=>OF.command('sensitivity',value));
 assert.equal(OF.parseGeometry([0x7e,7,0x37,44,1,255,0,0x88,0xef]).totalNodes,300);
 for(const [offset,value] of [[0,0],[1,6],[2,0x82],[6,1],[7,0],[8,0]]){const b=[0x7e,7,0x37,44,1,255,0,0x88,0xef];b[offset]=value;assert.equal(OF.parseGeometry(b),null);}
});

test("OF21 native geometry combinations fit section fields and HSV brightness replaces rather than compounds value",()=>{
 assert.equal(OF.hsvValue('#804000',100),'#ff8000');assert.equal(OF.hsvValue('#ff8000',50),'#804000');assert.equal(OF.hsvValue(OF.hsvValue('#ff8000',50),50),'#804000');assert.equal(OF.hsvValue('#000000',50),'#808080');
 for(const b of [0,101,50.5,NaN])assert.throws(()=>OF.hsvValue('#ff0000',b));
 let count=0;for(let totalNodes=10;totalNodes<=1000;totalNodes++)for(let nodeCount=10;nodeCount<=30;nodeCount++){
  const p=OF.diy({nodeCount,totalNodes,colors:['#804000','#0000ff'],mode:1,brightness:100});
  assert.equal(p.sectionCount,Math.ceil(totalNodes/nodeCount));assert.ok(p.sectionCount>=1&&p.sectionCount<=100);assert.ok(p.packets.every(bytes=>bytes.length===9));count++;
 }
 assert.equal(count,20811);
 for(const totalNodes of [9,1001,65535])assert.throws(()=>OF.diy({nodeCount:10,totalNodes,colors:['#ff0000','#0000ff'],mode:1}));
});
