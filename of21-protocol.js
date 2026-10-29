/* MELK-OF21 SYMPHONY30 standard E1. SOURCE-DERIVED, not hardware-tested.
 * Independent implementation from supplied APK method evidence, not OA10.
 * Provenance and exact vectors: docs/LOTUS_OF21.md. No vendor code/assets. */
(function(root){
 "use strict";
 const byte=n=>Number.isInteger(n)&&n>=0&&n<=255;
 const percent=n=>Number.isInteger(n)&&n>=0&&n<=100;
 const effects=Object.freeze(Array.from({length:234},(_,i)=>i));
 const scenes=Object.freeze([...Array.from({length:28},(_,i)=>i+1),150,152,154,155,156]);
 function profile(name){return /^MELK-OF21(?:\s|$)/i.test(name||"")?"melk-of21":null;}
 function frame(command,params){
  if(![1,2,3,4,5,6,7,0x21,0x22,0x31,0x37,0x81,0x82,0x83].includes(command)||!Array.isArray(params)||params.length!==5||!params.every(byte))throw Error("Invalid OF21 E1 frame.");
  return [0x7e,command===1?4:command===0x83?6:7,command,...params,0xef];
 }
 function command(kind,value,options={}){
  if(["power","rgb-power"].includes(kind)&&typeof value==="boolean")return frame(4,[value?255:0,kind==="power"?0:1,value?1:0,2,1]);
  if(kind==="color"&&typeof value==="string"&&/^#[\da-f]{6}$/i.test(value)&&typeof (options.music??false)==="boolean")return frame(5,[3,...[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)),options.music?0x20:0x10]);
  if(kind==="brightness"&&percent(value)&&[undefined,"rgb","all"].includes(options.target))return frame(1,[value,options.target==="all"?0:1,255,2,1]);
  if(kind==="speed"&&percent(value))return frame(2,[value,255,255,255,0]);
  if(kind==="sensitivity"&&percent(value))return frame(6,[value,255,255,255,0]);
  if(kind==="effect"&&effects.includes(value))return frame(3,[value,6,255,255,0]);
  if(kind==="scene"&&scenes.includes(value))return frame(0x31,[value,7,255,255,0]);
  if(kind==="microphone"&&typeof value==="boolean")return frame(7,[value?1:0,255,255,255,0]);
  if(kind==="mic-rhythm"&&Number.isInteger(value)&&value>=0x80&&value<=0x87)return frame(3,[value,4,255,255,0]);
  if(kind==="clock"&&value&&Number.isInteger(value.hour)&&value.hour>=0&&value.hour<=23&&Number.isInteger(value.minute)&&value.minute>=0&&value.minute<=59&&Number.isInteger(value.second)&&value.second>=0&&value.second<=59&&Number.isInteger(value.weekday)&&value.weekday>=0&&value.weekday<=6)return frame(0x83,[value.hour,value.minute,value.second,value.weekday,0]);
  if(kind==="geometry-query"&&value===undefined)return frame(0x37,[255,255,255,0,255]);
  if(kind==="point-count"&&Number.isInteger(value)&&value>=10&&value<=1000)return frame(0x21,[value&255,value>>>8,0,255,0]);
  if(kind==="collapse"&&typeof value==="boolean")return frame(0x22,[value?1:0,255,255,255,0]);
  if(kind==="wire-order"&&typeof value==="string"&&/^(RGB|RBG|GRB|GBR|BRG|BGR)$/.test(value))return frame(0x81,[...[...value].map(c=>({R:1,G:2,B:3})[c]),255,0]);
  if(kind==="timer-query"&&(value===0||value===1))return frame(0x82,[255,255,255,value,0]);
  if(kind==="timer"&&validTimer(value))return frame(0x82,[value.hour,value.minute,0,value.kind,value.days|(value.enabled?0x80:0)]);
  throw Error("Unsupported OF21 value. Effect/scene catalogs and control ranges are not hardware-verified.");
 }
 function validTimer(t){return !!t&&[0,1].includes(t.kind)&&Number.isInteger(t.hour)&&t.hour>=0&&t.hour<=23&&Number.isInteger(t.minute)&&t.minute>=0&&t.minute<=59&&Number.isInteger(t.days)&&t.days>=0&&t.days<=127&&typeof t.enabled==="boolean";}
 function parseTimer(bytes){
  if(!Array.isArray(bytes)||bytes.length!==9||!bytes.every(byte)||bytes[0]!==0x7e||bytes[1]!==7||bytes[2]!==0x82||bytes[5]!==0||bytes[8]!==0xef)return null;
  const timer={hour:bytes[3],minute:bytes[4],kind:bytes[6],days:bytes[7]&127,enabled:!!(bytes[7]&128)};return validTimer(timer)?timer:null;
 }
 function hsvValue(color,brightness){
  if(typeof color!=="string"||!/^#[\da-f]{6}$/i.test(color)||!Number.isInteger(brightness)||brightness<1||brightness>100)throw Error("DIY brightness must be 1–100.");
  const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),max=Math.max(...channels),v=255*brightness/100;
  // Replacing HSV V preserves the H/S ratios; black has H=0, S=0.
  return '#'+channels.map(c=>Math.round(max?c/max*v:v).toString(16).padStart(2,'0')).join('');
 }
 function diy({nodeCount,totalNodes,colors,mode=0,gradient=0,speed=50,brightness}={}){
  // Native pattern limits are distinct from physical total nodes. Also reject
  // byte-field overflow rather than reproducing wrapping in the app serializer.
  if(!Number.isInteger(nodeCount)||nodeCount<10||nodeCount>30||!Number.isInteger(totalNodes)||totalNodes<10||totalNodes>1000||!Number.isInteger(mode)||mode<0||mode>6||!Number.isInteger(gradient)||gradient<0||gradient>2||(mode<3&&gradient!==0)||!percent(speed)||!Array.isArray(colors)||!colors.every(c=>typeof c==="string"&&/^#[\da-f]{6}$/i.test(c))||(mode===0?colors.length!==nodeCount:colors.length<2||colors.length>8)||colors.length>nodeCount)throw Error("OF21 DIY needs native total nodes 10–1000, pattern length 10–30, native mode 0–6 and a valid static/dynamic palette.");
  const sectionCount=Math.ceil(totalNodes/nodeCount);if(sectionCount>255)throw Error("OF21 DIY section count would overflow its byte field.");
  const rendered=brightness===undefined?colors:colors.map(c=>hsvValue(c,brightness));
  const data=rendered.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))),length=data.length*3;
  const start=[0x7e,0x32,length&255,length>>>8,0,0,255,255,0xef],packets=[];
  for(let offset=0,sequence=1;offset<data.length;offset+=2,sequence++)packets.push([0x7e,0x33,...data[offset],...(data[offset+1]||[255,255,255]),sequence]);
  const end=[0x7e,0x34,mode,gradient,speed,255,255,255,0xef];
  const checksum=start.concat(...packets,end).reduce((sum,b)=>(sum+b)&65535,0);
  start[4]=checksum>>>8;start[5]=checksum&255;
  return {nodeCount,totalNodes,encodedColorCount:data.length,sectionCount,hardwareVerified:false,uploadEnabled:false,brightnessBakedIntoColors:true,referencePacingMs:75,checksum,
   packets:[frame(0x37,[nodeCount,0,sectionCount,1,0]),start,...packets,end]};
 }
 function examples(color="#ff0000"){
  return {format:"smartease-of21-offline-examples",version:1,profile:"melk-of21",deviceType:30,protocol:"E1",encrypted:false,broadcast:false,
   hardwareVerified:false,liveEnabled:false,rangesSourceVerified:true,catalogSourceVerified:true,
   transport:{service:"0000fff0-0000-1000-8000-00805f9b34fb",write:"0000fff3-0000-1000-8000-00805f9b34fb",read:"0000fff3-0000-1000-8000-00805f9b34fb",writeMode:"discovered-properties",notify:"discovered-properties",referencePacingMs:100},
   diyExample:{...diy({nodeCount:10,totalNodes:10,colors:Array.from({length:10},(_,i)=>i%2?"#0000ff":"#ff0000")}),syntheticGeometry:true},
   packets:[{kind:"power-on",bytes:command("power",true)},{kind:"power-off",bytes:command("power",false)},
    {kind:"color",bytes:command("color",color)},{kind:"music-color",bytes:command("color",color,{music:true})},
    {kind:"brightness-example-50",bytes:command("brightness",50)},{kind:"speed-example-50",bytes:command("speed",50)},
    {kind:"symphony-mode-example-1",bytes:command("effect",1)},{kind:"scene-example-1",bytes:command("scene",1)},
    {kind:"sensitivity-example-50",bytes:command("sensitivity",50)},{kind:"microphone-on",bytes:command("microphone",true)},{kind:"microphone-off",bytes:command("microphone",false)}]};
 }
 function parseGeometry(bytes){
  if(!Array.isArray(bytes)||bytes.length!==9||!bytes.every(byte)||bytes[0]!==0x7e||bytes[1]!==7||bytes[2]!==0x37||bytes[6]!==0||bytes[7]!==0x88||bytes[8]!==0xef)return null;
  const totalNodes=bytes[3]|(bytes[4]<<8);return totalNodes?{totalNodes,source:"OF21-37-notification",fullStateReadback:false}:null;
 }
 root.SmartEaseOF21={profile,command,diy,examples,parseGeometry,parseTimer,validTimer,hsvValue,effects,scenes,hardwareVerified:false};
 if(typeof module!=="undefined")module.exports=root.SmartEaseOF21;
})(globalThis);
