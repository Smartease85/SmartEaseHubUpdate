/* Bounded decoded-frame03 only. No file access, firmware guesses or raw GIF path. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./native-coolled-animation-model'),require('./ux-source-program'));else r.SmartEaseUXAnimation03Wire=f(r.SmartEaseUXAnimationModel,r.SmartEaseUXSourceProgram);})(globalThis,function(M,P){
'use strict';const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function validate(record){M.decode(record);const c=record.animation.combinePrograms[0].animationItem.animationProgramContent;
 if(own(c,'imageId')&&c.imageId!==0)throw Error('Animation03 requires absent/zero imageId; source GIF resource or malformed ID is ambiguous');
 if(own(c,'gifFile')&&c.gifFile!==null&&c.gifFile!=='')throw Error('Animation03 refuses source GIF file/cache (including stale edited cache); raw GIF branch not admitted');
 if(own(c,'isGIfFileEncrypted')&&typeof c.isGIfFileEncrypted!=='boolean')throw Error('Malformed animation encryption metadata');
 if(own(c,'delays')&&c.delays!==null&&(!Array.isArray(c.delays)||c.delays.length!==0))throw Error('Animation03 requires uniform stored speed; explicit delay override is not admitted');
 return c;
}
function serialize(record){const c=validate(record);return P.program([P.animation({layer:c.layerType,x:c.startColumn,y:c.startRow,width:c.showWidth,height:c.showHeight,frames:c.mListDrawItems.map(f=>f.map(item=>item.color&0xffffff)),delays:c.mListDrawItems.map(()=>c.speed)})]);}
return Object.freeze({validate,serialize});
});
