/* Shared native trigger draft and sole98 encoder. No BLE, storage or per-port gains. */
'use strict';
(function(root){
 const own=(a,i)=>Object.prototype.hasOwnProperty.call(a,i);
 const int=(v,min,max)=>{if(!Number.isInteger(v)||v<min||v>max)throw Error('Out-of-range integer');return v;};
 function rgb(v){if(!Array.isArray(v)||v.length!==3||![0,1,2].every(i=>own(v,i)&&Number.isInteger(v[i])&&v[i]>=0&&v[i]<=255))throw Error('Dense RGB bytes required');return v.slice();}
 // Source HSV conversion order, positive rounding; black has white chroma, not white output at B0.
 function normalize(value){const c=rgb(value),[r,g,b]=c.map(x=>x/255),v=Math.max(r,Math.max(g,b)),delta=v-Math.min(r,Math.min(g,b)),mod=(x,n)=>{const q=x%n;return q<0?q+n:q;};let h=v===0?0:v===r?60*mod((g-b)/delta,6):v===g?60*((b-r)/delta+2):60*((r-g)/delta+4);if(Number.isNaN(h))h=0;const s=v===0?0:delta/v,C=s,X=C*(1-Math.abs(mod(h/60,2)-1)),m=1-C,p=h<60?[C,X,0]:h<120?[X,C,0]:h<180?[0,C,X]:h<240?[0,X,C]:h<300?[X,0,C]:[C,0,X];return p.map(x=>Math.round((x+m)*255));}
 function config(v){if(!v||typeof v!=='object'||typeof v.reversed!=='boolean')throw Error('Complete config required');if(v.effect!==null)int(v.effect,1,25);return {effect:v.effect,speed:int(v.speed,0,10),length:int(v.length,0,240),reversed:v.reversed,color:rgb(v.color),brightness:int(v.brightness,0,255)};}
 function model(v){if(!v||typeof v.identity!=='string'||!v.identity||!Number.isSafeInteger(v.generation)||v.generation<0||typeof v.custom!=='boolean'||typeof v.proven!=='boolean'||typeof v.enabled!=='boolean')throw Error('Exact session proof required');return {identity:v.identity,generation:v.generation,triggerId:int(v.triggerId,0,3),name:typeof v.name==='string'?v.name:'Trigger '+(v.triggerId+1),custom:v.custom,proven:v.proven,enabled:v.enabled,config:v.config===null?null:config(v.config)};}
 function packet(id,draft){int(id,0,3);const d=config(draft);if(d.effect===null||draft.domain!=='native-shared-authored-v1'||Math.max(...d.color)!==255)throw Error('Explicit supported effect and shared authored chroma required');return Object.freeze([136,152,10,id,d.effect,d.speed,d.length>>8,d.length&255,d.reversed?0:1,...normalize(d.color),d.brightness]);}
 const api=Object.freeze({rgb,normalize,config,model,packet});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseTriggerEditorModel=api;
})(globalThis);
