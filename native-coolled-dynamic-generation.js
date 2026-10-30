/* Shared corrected preview/wire generation: semantic draft → effects → GIF89a → decoded RGB. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./native-coolled-dynamic-model'),require('./native-coolled-dynamic-preparation'),require('./native-coolled-dynamic-gif-encoder'),require('./native-coolled-dynamic-gif-decoder'));else r.SmartEaseUXDynamicGeneration=f(r.SmartEaseUXDynamicModel,r.SmartEaseUXDynamicPreparation,r.SmartEaseUXDynamicGifEncoder,r.SmartEaseUXDynamicGifDecoder);})(globalThis,function(M,P,Encoder,Decoder){'use strict';
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function create({effects,masks,loaders}={}){
 if(typeof effects?.generate!=='function'||!masks||!loaders)throw Error('Reviewed effects, original masks and resource loaders required');
 const assets=freeze(M.clone(masks));
 async function generate(draft,{isCurrent,signal}={}){
  if(typeof isCurrent!=='function')throw Error('Explicit immutable-selection guard required');
  const check=()=>{if(signal?.aborted||isCurrent()!==true){const e=Error('Dynamic generation cancelled or selection changed');e.name='AbortError';throw e;}};
  check();const d=freeze(M.clone(draft));M.validate(d);
  if(d.background)throw Error('Dynamic background wire conversion is unsupported; firmware and resampling are separate gates');
  const guarded={};for(const name of ['loadFont','loadEmoji'])if(typeof loaders[name]==='function')guarded[name]=async(...args)=>{check();const resource=await loaders[name](...args);check();if(resource instanceof Uint8Array)return resource.slice();return M.clone(resource);};
  const prepared=await P.prepare(d,guarded);check();if(!prepared.supported)throw Error(prepared.reason||'Original pixel preparation unavailable');
  const generated=effects.generate(prepared.frames,{mode:d.mode,delayMs:d.speed,stayMs:d.stayTime*1000,masks:assets});check();if(!generated.supported)throw Error(generated.reason||'Original effect unavailable');
  if(!generated.frames?.length||generated.delays?.length!==generated.frames.length)throw Error('Invalid generated frame count');
  if(10+24+generated.frames.length*(2+96*16*2)>160000)throw Error('Dynamic program exceeds 160000-byte browser-tested raw bound');
  // Exact GifUtils variable-delay overload: quality1 per-frame NeuQuant, setDelay(integer ms/10).
  const gif=Encoder.encode(generated.frames,{delays:generated.delays});check();
  const decoded=Decoder.decode(gif);check();
  if(decoded.truncated||decoded.sourceFrameCount!==generated.frames.length||decoded.width!==96||decoded.height!==16)throw Error('Dynamic generated GIF frame/geometry mismatch');
  return freeze({supported:true,format:'smartease-dynamic-decoded-gif',version:2,width:96,height:16,frames:decoded.frames.map(f=>({width:96,height:16,pixels:Array.from(f.pixels,c=>c&0xffffff)})),delays:decoded.frames.map(f=>Math.max(20,f.delay)),fidelity:generated.fidelity,notice:'Source GIF quantization/timing applied; Android rasterizer sampling and physical/iOS equivalence remain unverified.'});
 }
 return Object.freeze({generate});
}
// Plug into the cleared editor's renderer interface. Cancellation is checked after each original loader;
// the unchanged editor also rejects stale render promises by its own epoch/revision guard.
function renderer({effects,masks,isCurrent,signal}={}){if(typeof isCurrent!=='function')throw Error('Preview lifecycle guard required');return{tokenize:P.tokenize,async render(d,loaders){try{const result=await create({effects,masks,loaders}).generate(d,{isCurrent:()=>isCurrent(d),signal});return{...result,frameAt:n=>result.frames[n%result.frames.length]};}catch(e){if(e.name==='AbortError')throw e;return{supported:false,reason:e.message};}}};}
return Object.freeze({create,renderer});});
