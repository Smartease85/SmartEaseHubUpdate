/* Clean protocol implementation from independent CoolLEDX wire references.
 * See docs/NATIVE_ACCEPTANCE.md for pinned evidence. OFFLINE ONLY: not a TRINKA profile.
 * CoolLEDUX/M/U are different protocols even when they share FFF0/FFF1. */
(function(root){
 "use strict";
 const byte=n=>Number.isInteger(n)&&n>=0&&n<=255;
 function envelope(payload){
  if(!Array.isArray(payload)||payload.length>65535||!payload.every(byte))throw Error("Invalid CoolLEDX payload.");
  const data=[payload.length>>8,payload.length&255,...payload],out=[1];
  for(const n of data){if(n>=1&&n<=3)out.push(2,n^4);else out.push(n);}out.push(3);return out;
 }
 function chunks(command,content){
  if(![3,4].includes(command)||!Array.isArray(content)||!content.length||content.length>65535||!content.every(byte))throw Error("Invalid image/animation content.");
  const packets=[];
  for(let offset=0,index=0;offset<content.length;offset+=128,index++){
   const data=content.slice(offset,offset+128),body=[0,content.length>>8,content.length&255,index>>8,index&255,data.length,...data];
   packets.push(envelope([command,...body,body.reduce((a,b)=>a^b,0)]));
  }return packets;
 }
 function planes(width,height,pixels){
  if(!Number.isInteger(width)||width<8||width>128||!Number.isInteger(height)||height<8||height>64||height%8||
   !Array.isArray(pixels)||pixels.length!==width*height||!pixels.every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffff))
   throw Error("CoolLEDX candidate encoding needs 8–128 columns and 8–64 rows, with height divisible by 8.");
  return [16,8,0].map(shift=>{
   const data=[];
   for(let x=0;x<width;x++)for(let row=0;row<height;row+=8){let packed=0;for(let y=0;y<8;y++)packed=(packed<<1)|(((pixels[(row+y)*width+x]>>shift)&255)>=128?1:0);data.push(packed);}
   return data;
  });
 }
 function image(width,height,pixels){
  const data=planes(width,height,pixels).flat();return chunks(3,[...Array(24).fill(0),data.length>>8,data.length&255,...data]);
 }
 function animation(width,height,frames,speed){
  if(!Array.isArray(frames)||frames.length<1||frames.length>255||!Number.isInteger(speed)||speed<1||speed>65535)throw Error("Invalid CoolLEDX animation count or speed.");
  const encoded=frames.map(pixels=>planes(width,height,pixels));
  const data=[0,1,2].flatMap(color=>encoded.flatMap(p=>p[color]));
  return chunks(4,[...Array(24).fill(0),frames.length,speed>>8,speed&255,...data]);
 }
 function command(kind,value){
  if(kind==="power"&&typeof value==="boolean")return envelope([9,value?1:0]);
  if(kind==="brightness"&&byte(value)&&value>=16)return envelope([8,value]);
  if(kind==="speed"&&byte(value)&&value>=16)return envelope([7,value]);
  if(kind==="mode"&&Number.isInteger(value)&&value>=1&&value<=8)return envelope([6,value]);
  throw Error("Unknown or out-of-range CoolLEDX command.");
 }
 root.SmartEaseCoolLEDX={envelope,chunks,planes,image,animation,command,hardwareVerified:false};
 if(typeof module!=="undefined")module.exports=root.SmartEaseCoolLEDX;
})(globalThis);
