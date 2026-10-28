/* CoolLEDUX ONLY. Offline interoperability encoder, no Bluetooth access.
 * Protocol evidence: CharlesLennon/coolledux-ble @ 4f5656d9882adb4926c9dff4dc3fa5783b40a7ac.
 * See docs/COOLLEDUX.md and docs/licenses/coolledux-reference-MIT.txt.
 * No vendor font data, app artwork, password, firmware or timer writers. */
(function(root){
 "use strict";
 const MAX_RAW=160000,MAX_NOTIFY=1024;
 const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
 const bytes=(data,max)=>Array.isArray(data)&&data.length<=max&&data.every(n=>integer(n,0,255));
 const u16=n=>[n>>>8,n&255],u32=n=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255];
 function family(name){
  const match=/^CoolLED(UX|X|M|U)(?:$|[\s_-])/i.exec(String(name||""));
  return match?"coolled"+match[1].toLowerCase():null;
 }
 function envelope(payload){
  if(!bytes(payload,65535))throw Error("Invalid UX payload.");
  const out=[1];for(const b of u16(payload.length).concat(payload)){if(b>=1&&b<=3)out.push(2,b^4);else out.push(b);}out.push(3);return out;
 }
 function decodeEnvelope(raw){
  if(raw instanceof Uint8Array)raw=Array.from(raw);
  if(!bytes(raw,MAX_NOTIFY)||raw.length<4||raw[0]!==1||raw.at(-1)!==3)throw Error("Invalid or oversized UX envelope.");
  const body=[];
  for(let i=1;i<raw.length-1;i++){
   const b=raw[i];
   if(b===2){const next=raw[++i];if(i>=raw.length-1||![5,6,7].includes(next))throw Error("Invalid UX escape sequence.");body.push(next^4);}
   else {if(b===1||b===3)throw Error("Unescaped UX delimiter.");body.push(b);}
  }
  if(body.length<2||((body[0]<<8)|body[1])!==body.length-2)throw Error("UX envelope length mismatch.");
  return body.slice(2);
 }
 function crc32(data){
  if(!bytes(data,MAX_RAW))throw Error("UX program exceeds the offline size limit.");
  let crc=0xffffffff;
  for(const b of data){crc^=b<<24;for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x80000000)?0x04c11db7:0))>>>0;}
  return crc>>>0;
 }
 function literalLzss(data){
  if(!bytes(data,MAX_RAW))throw Error("UX program exceeds the offline size limit.");
  const out=[];for(let offset=0;offset<data.length;offset+=8){const part=data.slice(offset,offset+8);out.push((1<<part.length)-1,...part);}return out;
 }
 function transfer(value){return value>=238?15:value<=47?0:Math.floor((value-47)/14)+1;}
 function pixel(color,kind="animation"){
  if(!integer(color,0,0xffffff)||!["graffiti","animation"].includes(kind))throw Error("Choose a valid UX pixel and content type.");
  const encoded=[transfer(color>>>16),transfer((color>>>8)&255)*16+transfer(color&255)];
  // The reference's Graffiti decoder treats 0000 as white, even for dark
  // shades quantized to zero. 0004 avoids that sentinel (dim blue, not black).
  return kind==="graffiti"&&encoded[0]===0&&encoded[1]===0?[0,4]:encoded;
 }
 function command(kind,value){
  if(kind==="power"&&typeof value==="boolean")return envelope([5,value?1:0]);
  if(kind==="brightness"&&integer(value,0,255))return envelope([4,value]);
  if(kind==="mirror"&&typeof value==="boolean")return envelope([12,value?1:0]);
  if(kind==="solid"&&integer(value,0,0xffffff))return envelope([19,1,...pixel(value)]);
  if(kind==="info"&&value===undefined)return envelope([31]);
  throw Error("Unsupported or invalid UX command.");
 }
 function programBytes(raw,programIndex=0){
  const model=root.SmartEaseDisplay||(typeof require==="function"?require("./display-project.js"):null);
  if(!model)throw Error("Display project model is unavailable.");
  const project=model.validate(raw);
  if(!integer(programIndex,0,project.programs.length-1))throw Error("Choose a valid program.");
  const p=project.programs[programIndex],w=project.width,h=project.height;
  const kind=p.frames.length===1?"graffiti":"animation",segments=[];
  for(let x=0;x<w;x+=8){
   const cols=Math.min(8,w-x),tileFrames=p.frames.map(f=>{
    const pixels=[];for(let column=x;column<x+cols;column++)for(let y=0;y<h;y++)pixels.push(...pixel(f.pixels[y*w+column],kind));return pixels;
   });
   const position=[...u16(x),...u16(0),...u16(cols),...u16(h)];
   const header=kind==="graffiti"?[2,...Array(7).fill(0),0,...position,0,0,p.hold,...u32(tileFrames[0].length)]:
    [3,1,...Array(6).fill(0),1,...position,0,...u16(p.frames.length),...p.frames.flatMap(f=>u16(f.duration))];
   const payload=header.concat(...tileFrames);segments.push(u32(payload.length+4).concat(payload));
  }
  const data=[...Array(8).fill(0),segments.length,0].concat(...segments);
  if(data.length>MAX_RAW)throw Error("UX program exceeds the offline size limit.");
  return {data,kind,segments:segments.length,frames:p.frames.length,index:programIndex,count:project.programs.length,showCount:p.repeat};
 }
 function packetPlan(program,index=0,count=1,showCount=1){
  if(!bytes(program,MAX_RAW)||!program.length||!integer(count,1,16)||!integer(index,0,count-1)||!integer(showCount,1,20))throw Error("Invalid UX program plan.");
  const crc=crc32(program),compressed=literalLzss(program),packets=[envelope([2,...u32(crc),...u32(program.length),index,count,showCount])];
  for(let offset=0,chunk=0;offset<compressed.length;offset+=128,chunk++){
   const data=compressed.slice(offset,offset+128),body=[0,...u32(compressed.length),...u16(chunk),...u16(data.length),...data];
   packets.push(envelope([3,...body,body.reduce((a,b)=>a^b,0)]));
  }
  return {rawLength:program.length,compressedLength:compressed.length,crc32:crc,packets};
 }
 function compileProject(project){
  // programBytes validates the whole project before any plan is returned.
  const first=programBytes(project,0),programs=[];
  for(let index=0;index<first.count;index++){
   const program=index===0?first:programBytes(project,index);
   programs.push({index,name:project.programs[index].name.slice(0,40),kind:program.kind,segments:program.segments,frames:program.frames,
    ...packetPlan(program.data,index,program.count,program.showCount)});
  }
  return {format:"smartease-coolledux-offline-plan",version:1,family:"coolledux",dimensions:{width:project.width,height:project.height,verified:false},
   hardwareVerified:false,uploadEnabled:false,playlistTimingVerified:false,transportMtuVerified:false,
   referenceInterPacketDelayMs:60,compression:"lzss-literals",tileWidth:8,
   caveats:["Dimensions are the draft canvas, not detected hardware.","Reference tested one 64x16 sign; other heights/firmware need evidence.","Graffiti dark background uses dim blue 0004, not true black.","Playlist hold/repeat semantics and chunk delivery are unverified on this controller."],programs};
 }
 function decodeInfo(raw){
  const payload=decodeEnvelope(raw);
  if(payload.length!==30||payload[0]!==31||![0,1].includes(payload[1]))throw Error("This is not the documented 30-byte UX device-info reply.");
  return {family:"coolledux",power:payload[1]===1,brightness:payload[2],dimensions:null,unmappedBytes:27,source:"imported-capture",hardwareVerified:false};
 }
 function parseHex(text){
  if(typeof text!=="string"||text.length>MAX_NOTIFY*3||!/^\s*(?:[\da-f]{2}[\s:]*)+$/i.test(text))throw Error("Paste a bounded hexadecimal capture (up to 1,024 bytes).");
  const raw=text.trim().split(/[\s:]+/).filter(Boolean);
  // Also accept an uninterrupted even-length hex string.
  const joined=raw.join("");if(joined.length%2||joined.length/2>MAX_NOTIFY)throw Error("Invalid capture length.");
  return joined.match(/../g).map(pair=>parseInt(pair,16));
 }
 root.SmartEaseCoolLEDUX={family,envelope,decodeEnvelope,crc32,literalLzss,pixel,command,programBytes,packetPlan,compileProject,decodeInfo,parseHex,hardwareVerified:false};
 if(typeof module!=="undefined")module.exports=root.SmartEaseCoolLEDUX;
})(globalThis);
