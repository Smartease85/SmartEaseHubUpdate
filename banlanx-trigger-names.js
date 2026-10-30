/* Source-backed local SP608E trigger names. No transport; JSON is a browser adaptation. */
'use strict';
(function(root){
 const key='smartease-native-banlanx-trigger-names-v1',LIMIT=1024*1024,FORMAT='smartease-native-banlanx-trigger-names';
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k),object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function identity(id){if(typeof id!=='string'||!id.trim()||id.length>256)throw Error('Exact device ID required');return id;}
 function triggerId(id){if(!Number.isInteger(id)||id<0||id>3)throw Error('Trigger ID must be0–3');return String(id);}
 function name(v){if(typeof v!=='string'||v.length<1||v.length>10)throw Error('Trigger name requires1–10 UTF-16 units');return v;}
 function canonical(value,seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value)))throw Error('JSON extension number is not safely representable');return JSON.stringify(value);}
  if(typeof value!=='object'||seen.has(value))throw Error('Invalid or cyclic JSON extension');seen.add(value);let result;
  if(Array.isArray(value)){const items=[];for(let i=0;i<value.length;i++){if(!own(value,i))throw Error('Sparse JSON extension');items.push(canonical(value[i],seen));}result='['+items.join(',')+']';}
  else result='{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],seen)).join(',')+'}';seen.delete(value);return result;
 }
 function byteLength(raw){if(typeof TextEncoder==='function')return new TextEncoder().encode(raw).length;return new Blob([raw]).size;}

 function shape(value){if(!object(value)||value.format!==FORMAT||value.version!==1||!object(value.devices))throw Error('Unsupported or malformed trigger names');for(const d of Object.values(value.devices)){if(!object(d))throw Error('Invalid device metadata');if(!own(d,'triggers'))continue;if(!object(d.triggers))throw Error('Invalid trigger records');for(let i=0;i<4;i++)if(own(d.triggers,String(i))){const r=d.triggers[i];if(!object(r)||!own(r,'name'))throw Error('Invalid trigger name');name(r.name);}}return value;}
 function validate(raw){if(typeof raw!=='string'||byteLength(raw)>LIMIT)throw Error('Trigger names exceed1MiB UTF-8 or are not text');const v=JSON.parse(raw);shape(v);canonical(v);return v;}
 function project(raw,deviceId){const id=identity(deviceId),v=raw===null?{format:FORMAT,version:1,devices:{}}:validate(raw);return canonical(own(v.devices,id)?v.devices[id]:null);}
 function create(storage){if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error('Storage adapter required');
 const load=()=>{const raw=storage.getItem(key);return raw===null?{format:FORMAT,version:1,devices:{}}:validate(raw);};
 function read(deviceId){const id=identity(deviceId),v=load(),d=own(v.devices,id)?v.devices[id]:null;return Array.from({length:4},(_,i)=>d&&own(d,'triggers')&&own(d.triggers,String(i))?d.triggers[i].name:'Trigger '+(i+1));}
 function rename(deviceId,id,label){const device=identity(deviceId),k=triggerId(id),n=name(label),v=load();if(!own(v.devices,device))Object.defineProperty(v.devices,device,{value:{},enumerable:true,writable:true,configurable:true});const d=v.devices[device];if(!own(d,'triggers'))d.triggers={};if(!own(d.triggers,k))d.triggers[k]={};d.triggers[k].name=n;shape(v);const raw=canonical(v);if(byteLength(raw)>LIMIT)throw Error('Trigger names exceed1MiB UTF-8; nothing saved');storage.setItem(key,raw);return true;}
 return Object.freeze({key,LIMIT,read,rename,validate,project,signature:deviceId=>project(storage.getItem(key),deviceId)});}
 const api={key,LIMIT,validate,canonical,create,name,project};if(typeof module!=='undefined'&&module.exports)module.exports=Object.freeze(api);else root.SmartEaseBanlanXTriggerNames=Object.freeze({...api,...create({getItem:k=>root.localStorage.getItem(k),setItem:(k,v)=>root.localStorage.setItem(k,v)})});
})(globalThis);
