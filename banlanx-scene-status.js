/* Pure projection only. Caller must establish complete current-request provenance. */
'use strict';
(function(root){
 function loop(bytes){
  if(!(bytes instanceof Uint8Array)&&!Array.isArray(bytes))return null;
  if(bytes.length<90)return null;
  const count=bytes[89];if(!Number.isInteger(count)||count<0||count>5)return null;
  const offset=142+7*count;if(bytes.length<=offset)return null;
  return bytes[offset]===1?true:bytes[offset]===0?false:null;
 }
 const api=Object.freeze({loop});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXSceneStatus=api;
})(globalThis);
