/* Authored pure Material raster fallback. No DOM, network, storage or transport.
 * No firmware authority is accepted here: raw GIF 0x0c is deliberately absent. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./native-coolled-material-import'),require('./ux-source-program'));else r.SmartEaseUXMaterialWire=f(r.SmartEaseUXMaterialImport,r.SmartEaseUXSourceProgram);})(globalThis,function(Import,P){'use strict';
const NOTICE='Raster fallback uses every decoded frame at the first source-normalized GIF delay, uniformly. Variable GIF cadence is not preserved on this source fallback; original bytes and timing remain in the saved record. Raw GIF 0x0c is unavailable without independently verified device capability.';
function createCompiler({decode,isCurrent}={}){
 if(typeof decode!=='function'||typeof isCurrent!=='function')throw Error('Material compiler requires decoder and explicit current-context guard');
 let generation=0,busy=false;
 function cancel(){generation++;}
 async function compile(input,options={}){
  if(busy)throw Error('Material compilation already in progress');
  busy=true;const ticket=generation;
  const check=()=>{if(ticket!==generation||isCurrent()!==true||ticket!==generation)throw Error('Material compilation cancelled or context expired');};
  try{
   // Capture all caller-owned values before any await or injected callback.
   const record=structuredClone(input),settings=structuredClone(options);
   if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(k=>k!=='templateType'))throw Error('Unsupported Material compile options; no firmware override');
   Import.validate(record);const m=record.material;
   let x=0;
   if(m.domain==='program96x16'){if(settings.templateType!==undefined)throw Error('Full Material cannot be a square Template');}
   else if(m.domain==='pattern16x16'){if(settings.templateType!==3&&settings.templateType!==4)throw Error('Square Material requires Template 3 or 4');x=settings.templateType===4?80:0;}
   else throw Error('Unsupported Material geometry');
   check();
   const restored=await Import.reconstruct(record,async(bytes,opts)=>{check();const result=await decode(bytes,opts);check();return result;});
   check();
   const frames=restored.frames.map(f=>Array.from(f.pixels,c=>c&0xffffff));
   const rect={layer:1,x,y:0,width:m.width,height:m.height};
   const staticFrame=frames.length===1;
   const delay=m.sourceRasterDelayMs;
   if(!staticFrame&&(!Number.isInteger(delay)||delay<0||delay>65535))throw Error('First source delay exceeds raster uint16; no coercion');
   const content=staticFrame?P.graffiti({...rect,mode:1,speed:0xf0,stayTime:2,pixels:frames[0]}):P.animation({...rect,frames,delays:Array(frames.length).fill(delay)});
   const bytes=P.program([content]);check();
   return {format:'smartease-material-raster',version:1,content,bytes,rectangle:rect,frameCount:frames.length,nativeProgramType:staticFrame?1:2,repeat:record.repeat,wireType:staticFrame?2:3,uniformDelayMs:staticFrame?null:delay,notice:staticFrame?'Single decoded frame uses source static Graffiti mode 1, speed 0, stay 2.':NOTICE,rawGifEnabled:false};
  }finally{busy=false;}
 }
 return Object.freeze({compile,cancel,get busy(){return busy;}});
}
return Object.freeze({createCompiler,NOTICE});
});
