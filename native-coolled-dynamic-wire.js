/* Offline fresh semantic compiler. Never consumes persisted derived pixels or file paths. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./native-coolled-dynamic-model'),require('./native-coolled-dynamic-generation'),require('./ux-source-program'),require('./native-coolled-text-wire'));else root.SmartEaseUXDynamicWire=factory(root.SmartEaseUXDynamicModel,root.SmartEaseUXDynamicGeneration,root.SmartEaseUXSourceProgram,root.SmartEaseUXTextWire);})(globalThis,function(M,G,S,T){'use strict';
const MAX_RAW=160000;
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function create({effects,masks,loaders}={}){
 if(typeof effects?.generate!=='function'||!masks||!loaders)throw Error('Reviewed effects, original masks and resource loaders required');
 const generator=G.create({effects,masks,loaders});
 async function compile(record,{isCurrent,signal}={}){
  if(typeof isCurrent!=='function')throw Error('Explicit immutable-selection guard required');
  const check=()=>{if(signal?.aborted||isCurrent()!==true){const e=Error('Dynamic compilation cancelled or selection changed');e.name='AbortError';throw e;}};
  check();const snapshot=freeze(M.clone(record)),d=freeze(M.decode(snapshot));
  if(d.background)throw Error('Dynamic background wire conversion is unsupported; firmware and resampling are separate gates');
  const generated=await generator.generate(d,{isCurrent,signal});check();
  const frames=generated.frames?.map(f=>f.pixels.slice()),delays=generated.delays?.slice();
  if(!frames?.length||frames.length>400||delays?.length!==frames.length)throw Error('Invalid generated frame count');
  // Fail before raster packing or transport. This is a tested browser allocation bound, NOT device capacity.
  if(10+24+frames.length*(2+96*16*2)>MAX_RAW)throw Error('Dynamic program exceeds 160000-byte browser-tested raw bound');
  const contents=[S.animation({layer:0,x:0,y:0,width:96,height:16,frames,delays})];
  if(d.frameType)contents.push(T.frameContent(d.frameType,d.frameShowType,d.frameSpeed,{layer:1,x:0,y:0,width:96,height:16}));
  const bytes=S.program(contents);check();
  return freeze({format:'smartease-dynamic-wire',version:2,bytes,contents,frameCount:frames.length,delays,fidelity:generated.fidelity,hardwareVerified:false,rawLimit:MAX_RAW});
 }
 return Object.freeze({compile});
}
return Object.freeze({create,MAX_RAW});});
