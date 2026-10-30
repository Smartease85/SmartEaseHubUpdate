/* Source device_id + color_index DIY persistence; browser JSON adaptation. No BLE. */
'use strict';
(function(root){
 const key='smartease-native-banlanx-diy-v1',LIMIT=1024*1024;
 const defaults=Object.freeze([[255,0,0],[0,255,0],[0,0,255],[255,255,0],[255,0,255],[0,255,255],[255,255,255]].map(Object.freeze));
 const own=(value,k)=>Object.prototype.hasOwnProperty.call(value,k),object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function identity(id){if(typeof id!=='string'||!id.trim()||id.length>256||['__proto__','constructor','prototype'].includes(id))throw Error('A valid exact device ID is required');return id;}
 function index(i){if(!Number.isInteger(i)||i<0||i>6)throw Error('DIY slot must be an integer0–6');return String(i);}
 function rgb(value){if(!Array.isArray(value)||value.length!==3||![0,1,2].every(i=>own(value,i)&&Number.isInteger(value[i])&&value[i]>=0&&value[i]<=255))throw Error('DIY RGB must contain exactly three dense integer bytes0–255');return [...value];}
 function canonical(value,seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value)))throw Error('JSON extension number is not safely representable');return JSON.stringify(value);}
  if(typeof value!=='object'||seen.has(value))throw Error('Invalid or cyclic JSON extension');seen.add(value);let result;
  if(Array.isArray(value)){const items=[];for(let i=0;i<value.length;i++){if(!own(value,i))throw Error('Sparse JSON extension');items.push(canonical(value[i],seen));}result='['+items.join(',')+']';}
  else result='{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],seen)).join(',')+'}';seen.delete(value);return result;
 }
 function byteLength(raw){if(typeof TextEncoder==='function')return new TextEncoder().encode(raw).length;return new Blob([raw]).size;}
 function shape(value){if(!object(value)||!['format','version','devices'].every(k=>own(value,k))||value.format!=='smartease-native-banlanx-diy'||value.version!==1||!object(value.devices))throw Error('Unreadable or unsupported Native BanlanX DIY library');
  for(const id of Object.keys(value.devices)){const device=value.devices[id];if(!object(device))throw Error('Invalid device-scoped DIY record');if(own(device,'slots')){if(!object(device.slots))throw Error('Invalid DIY slots');for(let i=0;i<7;i++){const k=String(i);if(own(device.slots,k)){const slot=device.slots[k];if(!object(slot)||!own(slot,'rgb'))throw Error('Invalid known DIY slot');rgb(slot.rgb);}}}}
  return value;
 }
 function validate(raw){if(typeof raw!=='string')throw Error('Native DIY backup value must be JSON text');if(byteLength(raw)>LIMIT)throw Error('Native DIY library exceeds the browser1MiB UTF-8 limit');let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('Unreadable Native BanlanX DIY JSON; original bytes preserved');}shape(parsed);canonical(parsed);return parsed;}
 const empty=()=>({format:'smartease-native-banlanx-diy',version:1,devices:{}});
 function create(storage){if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error('Storage adapter required');
  const load=()=>{const raw=storage.getItem(key);return raw===null?empty():validate(raw);};
  function read(deviceId){const id=identity(deviceId),value=load(),device=own(value.devices,id)?value.devices[id]:null,slots=device&&own(device,'slots')?device.slots:null;return defaults.map((fallback,i)=>slots&&own(slots,String(i))?rgb(slots[String(i)].rgb):[...fallback]);}
  function set(deviceId,slotIndex,color){const id=identity(deviceId),k=index(slotIndex),colorCopy=rgb(color),value=load();if(!own(value.devices,id))Object.defineProperty(value.devices,id,{value:{},enumerable:true,writable:true,configurable:true});const device=value.devices[id];if(!own(device,'slots'))device.slots={};const slots=device.slots;if(!own(slots,k))slots[k]={};slots[k].rgb=colorCopy;shape(value);const raw=canonical(value);if(byteLength(raw)>LIMIT)throw Error('Native DIY library exceeds the browser1MiB UTF-8 limit; nothing saved');storage.setItem(key,raw);return true;}
  return Object.freeze({key,KEY:key,LIMIT,read,set,validate,canonical,defaults:()=>defaults.map(x=>[...x])});
 }
 const common={key,KEY:key,LIMIT,validate,canonical,create,defaults:()=>defaults.map(x=>[...x])};if(typeof module!=='undefined'&&module.exports)module.exports=Object.freeze(common);else {const storage={getItem:k=>root.localStorage.getItem(k),setItem:(k,v)=>root.localStorage.setItem(k,v)};root.SmartEaseBanlanXDIYStore=Object.freeze({...common,...create(storage)});}
})(globalThis);
