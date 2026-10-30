/* Authored offline DPT/GIF interoperability utility. No URL, DOM or device access.
 * DPT is an XOR wrapper, not encryption/security: only its first32 bytes XOR0xda.
 * See docs/coolled-material-codec/README.md. Original Animation defaults unchanged. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./native-coolled-animation-gif-decoder'));else r.SmartEaseUXMaterialCodec=f(r.SmartEaseUXGifDecoder);})(globalThis,function(Decoder){'use strict';
const LIMITS=Object.freeze({bytes:8*1024*1024,frames:1024,totalPixels:16*1024*1024,width:96,height:16});
function signature(a){return a.length>=6&&a[0]===71&&a[1]===73&&a[2]===70&&a[3]===56&&(a[4]===55||a[4]===57)&&a[5]===97;}
const typedProto=Object.getPrototypeOf(Uint8Array.prototype),typedTag=Object.getOwnPropertyDescriptor(typedProto,Symbol.toStringTag).get,typedLength=Object.getOwnPropertyDescriptor(typedProto,'byteLength').get,arrayBufferLength=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get,copyBytes=Uint8Array.prototype.set;
function copyInput(input){
 let length,kind;
 try{if(typedTag.call(input)==='Uint8Array'){length=typedLength.call(input);kind='bytes';}}catch{}
 if(!kind){try{length=arrayBufferLength.call(input);kind='buffer';}catch{throw Error('Material input must be Uint8Array or ArrayBuffer');}}
 if(length>LIMITS.bytes)throw Error('Material exceeds8 MiB');
 const out=new Uint8Array(length);
 try{copyBytes.call(out,kind==='bytes'?input:new Uint8Array(input));}catch{throw Error('Material input buffer unavailable');}
 return out;
}
function decode(input,options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))throw Error('Invalid Material options');
 if(!Decoder||typeof Decoder.decode!=='function')throw Error('GIF decoder unavailable');
 const expectedWidth=options.expectedWidth===undefined?LIMITS.width:options.expectedWidth,expectedHeight=options.expectedHeight===undefined?LIMITS.height:options.expectedHeight,maxFrames=options.maxFrames===undefined?LIMITS.frames:options.maxFrames;
 if(!Number.isInteger(expectedWidth)||!Number.isInteger(expectedHeight)||expectedWidth<1||expectedHeight<1||expectedWidth*expectedHeight>Decoder.LIMITS.pixels)throw Error('Invalid Material dimensions');
 if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>LIMITS.frames)throw Error('Invalid Material frame limit');
 const originalBytes=copyInput(input),gifBytes=originalBytes.slice();let format='gif';
 if(!signature(gifBytes)){
  if(gifBytes.length<32)throw Error('Not a complete DPT/GIF header');
  for(let i=0;i<32;i++)gifBytes[i]^=0xda;
  if(!signature(gifBytes))throw Error('Not a GIF or DPT-wrapped GIF');
  format='dpt-gif';
 }
 if(gifBytes.length<10)throw Error('Truncated GIF dimensions');
 const width=gifBytes[6]|gifBytes[7]<<8,height=gifBytes[8]|gifBytes[9]<<8;
 if(width!==expectedWidth||height!==expectedHeight)throw Error('Material dimensions do not match target');
 const decoded=Decoder.decode(gifBytes,{maxFrames,strictFrameLimit:true,preserveDelays:true,materialCompatibility:true});
 if(decoded.truncated||decoded.frames.length!==decoded.sourceFrameCount)throw Error('Incomplete Material frame decode');
 const rawDelays=decoded.frames.map(f=>f.delay),frames=decoded.frames.map(({normalizedDelay,...frame})=>({...frame,delay:normalizedDelay}));
 return{format,width:decoded.width,height:decoded.height,frames,rawDelays,delays:frames.map(f=>f.delay),loop:decoded.loop,sourceFrameCount:decoded.sourceFrameCount,truncated:false,ignoredTrailingBytes:decoded.ignoredTrailingBytes,originalBytes,gifBytes};
}
return Object.freeze({decode,LIMITS});});
