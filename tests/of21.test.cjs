const test=require("node:test"),assert=require("node:assert/strict");
const OF=require("../of21-protocol.js"),OA=require("../lotus-protocol.js");
const hex=bytes=>Buffer.from(bytes).toString("hex").toUpperCase();
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
