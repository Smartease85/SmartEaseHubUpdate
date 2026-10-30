/* Source device_id + scene_index local scene-name persistence; browser JSON adaptation. No BLE. */
'use strict';
(function(root){
 const key='smartease-native-banlanx-scene-names-v1',LIMIT=1024*1024;
 const defaults=Object.freeze(Array.from({length:9},(_,i)=>'Scene '+(i+1)));
 const own=(value,k)=>Object.prototype.hasOwnProperty.call(value,k),object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function identity(id){if(typeof id!=='string'||!id.trim()||id.length>256||['__proto__','constructor','prototype'].includes(id))throw Error('A valid exact device ID is required');return id;}
 function index(i){if(!Number.isInteger(i)||i<0||i>8)throw Error('scene-name slot must be an integer0–8');return String(i);}
 function name(value){if(typeof value!=='string'||value.length===0||value.length>20)throw Error('Scene name requires1–20 UTF-16 code units');return value;}
 function canonical(value,seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value)))throw Error('JSON extension number is not safely representable');return JSON.stringify(value);}
  if(typeof value!=='object'||seen.has(value))throw Error('Invalid or cyclic JSON extension');seen.add(value);let result;
  if(Array.isArray(value)){const items=[];for(let i=0;i<value.length;i++){if(!own(value,i))throw Error('Sparse JSON extension');items.push(canonical(value[i],seen));}result='['+items.join(',')+']';}
  else result='{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],seen)).join(',')+'}';seen.delete(value);return result;
 }
 function byteLength(raw){if(typeof TextEncoder==='function')return new TextEncoder().encode(raw).length;return new Blob([raw]).size;}
 function shape(value){if(!object(value)||!['format','version','devices'].every(k=>own(value,k))||value.format!=='smartease-native-banlanx-scene-names'||value.version!==1||!object(value.devices))throw Error('Unreadable or unsupported Native BanlanX scene-name library');
  for(const id of Object.keys(value.devices)){const device=value.devices[id];if(!object(device))throw Error('Invalid device-scoped scene-name record');if(own(device,'slots')){if(!object(device.slots))throw Error('Invalid scene-name slots');for(let i=0;i<9;i++){const k=String(i);if(own(device.slots,k)){const slot=device.slots[k];if(!object(slot)||!own(slot,'name'))throw Error('Invalid known scene-name slot');name(slot.name);}}}}
  return value;
 }
 function validate(raw){if(typeof raw!=='string')throw Error('Native scene-name backup value must be JSON text');if(byteLength(raw)>LIMIT)throw Error('Native scene-name library exceeds the browser1MiB UTF-8 limit');let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('Unreadable Native BanlanX scene-name JSON; original bytes preserved');}shape(parsed);canonical(parsed);return parsed;}
 const empty=()=>({format:'smartease-native-banlanx-scene-names',version:1,devices:{}});
 function create(storage){if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error('Storage adapter required');
  const load=()=>{const raw=storage.getItem(key);return raw===null?empty():validate(raw);};
  function read(deviceId){const id=identity(deviceId),value=load(),device=own(value.devices,id)?value.devices[id]:null,slots=device&&own(device,'slots')?device.slots:null;return defaults.map((fallback,i)=>slots&&own(slots,String(i))?name(slots[String(i)].name):fallback);}
  function set(deviceId,slotIndex,label){const id=identity(deviceId),k=index(slotIndex),nameCopy=name(label),value=load();if(!own(value.devices,id))Object.defineProperty(value.devices,id,{value:{},enumerable:true,writable:true,configurable:true});const device=value.devices[id];if(!own(device,'slots'))device.slots={};const slots=device.slots;if(!own(slots,k))slots[k]={};slots[k].name=nameCopy;shape(value);const raw=canonical(value);if(byteLength(raw)>LIMIT)throw Error('Native scene-name library exceeds the browser1MiB UTF-8 limit; nothing saved');storage.setItem(key,raw);return true;}
  return Object.freeze({key,KEY:key,LIMIT,read,set,validate,canonical,defaults:()=>[...defaults]});
 }
 const common={key,KEY:key,LIMIT,validate,canonical,create,defaults:()=>[...defaults]};if(typeof module!=='undefined'&&module.exports)module.exports=Object.freeze(common);else {const storage={getItem:k=>root.localStorage.getItem(k),setItem:(k,v)=>root.localStorage.setItem(k,v)};root.SmartEaseBanlanXSceneNames=Object.freeze({...common,...create(storage)});}
})(globalThis);
