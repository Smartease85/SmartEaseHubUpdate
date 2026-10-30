'use strict';
// Authored adapter: complete decoded private square -> existing editable raster schema.
const M=require('../template-implementation/template-model.cjs');
function convert(result,type,{editable=false}={}){
 if(result?.asset?.domain!=='pattern16x16')throw Error('Choose a16×16 Material pattern');
 const d=result.material;if(!d||d.width!==16||d.height!==16||d.truncated!==false||!Array.isArray(d.frames)||!d.frames.length||d.frames.length!==d.sourceFrameCount)throw Error('Complete16×16 Material frames required');
 if(d.frames.length>40)throw Error('This Template editor supports at most40 frames. The original Material is unchanged; no frames were discarded.');
 const frames=d.frames.map(f=>{if(!f||!f.pixels||f.pixels.length!==256)throw Error('Exact256-pixel Material frame required');const items=[];for(let i=0;i<256;i++){const color=f.pixels[i];if(!Number.isInteger(color)||color<0||color>0xffffffff)throw Error('Invalid Material pixel');items.push({color:color|0,data:'true',colors:null,index:0});}return items;});
 const rect={layerType:1,...M.region(type,'pattern')};let combine;
 if(frames.length===1)combine={type:1,graffitiItem:{graffitiProgramContent:{...rect,mode:1,speed:240,stayTime:2,mDrawItems:frames[0]}}};
 else{const delay=d.delays?.[0];if(!Number.isInteger(delay)||delay<0||delay>65535)throw Error('Material first playback delay exceeds raster range');if(editable&&delay>950)throw Error('This Animation editor supports delays up to950ms. Use pattern preserves this Material delay; Edit copy is unavailable without changing it.');combine={type:2,animationItem:{animationProgramContent:{...rect,speed:delay,delays:null,mListDrawItems:frames,imageId:0,gifFile:null,isGIfFileEncrypted:false}}};}
 M.pattern(combine);return combine;
}
module.exports={convert};
