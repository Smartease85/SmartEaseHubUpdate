/* Source-backed local channel naming. JSON/BLE identity namespace is a browser adaptation. No transport. */
'use strict';
(function(root){
 const key='smartease-native-banlanx-channel-names-v1',FORMAT='smartease-native-banlanx-channel-names',LIMIT=1024*1024;
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k),obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function identity(v){if(typeof v!=='string'||!v.trim()||v.length>256)throw Error('Exact device identity required');return v;}
 function index(v){if(!Number.isInteger(v)||v<0||v>7)throw Error('Channel index must be0–7');return String(v);}
 function name(v){if(typeof v!=='string'||v.length<1||v.length>15)throw Error('Channel name requires1–15 UTF-16 code units');return v;}
 function canonical(v,seen=new Set()) {if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){if(!Number.isFinite(v)||(Number.isInteger(v)&&!Number.isSafeInteger(v)))throw Error('Unsafe JSON number');return JSON.stringify(v);}if(typeof v!=='object'||seen.has(v))throw Error('Invalid JSON extension');seen.add(v);let s;if(Array.isArray(v)){s='['+Array.from({length:v.length},(_,i)=>{if(!own(v,i))throw Error('Sparse JSON');return canonical(v[i],seen);}).join(',')+']';}else{s='{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k],seen)).join(',')+'}';}seen.delete(v);return s;}
 const bytes=s=>typeof TextEncoder==='function'?new TextEncoder().encode(s).length:new Blob([s]).size;
 function validate(raw){if(typeof raw!=='string'||bytes(raw)>LIMIT)throw Error('Channel name library exceeds1MiB or is not text');let v;try{v=JSON.parse(raw);}catch{throw Error('Unreadable channel names; original bytes preserved');}if(!obj(v)||v.format!==FORMAT||v.version!==1||!obj(v.devices))throw Error('Unsupported channel name library');for(const d of Object.values(v.devices)){if(!obj(d))throw Error('Invalid device record');if(!own(d,'channels'))continue;if(!obj(d.channels))throw Error('Invalid channel records');for(let i=0;i<8;i++){if(own(d.channels,i)){const r=d.channels[i];if(!obj(r)||!own(r,'name'))throw Error('Invalid channel record');name(r.name);}}}canonical(v);return v;}
 function create(storage){if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error('Storage adapter required');const load=()=>{const raw=storage.getItem(key);return raw===null?{format:FORMAT,version:1,devices:{}}:validate(raw);};
 function record(v,id,k){return own(v.devices,id)&&own(v.devices[id],'channels')&&own(v.devices[id].channels,k)?v.devices[id].channels[k]:null;}
 function read(id,i){id=identity(id);const k=index(i),r=record(load(),id,k);return r?JSON.parse(canonical(r)):null;}
 function get(id,i){return read(id,i)?.name||'Channel '+(i+1);}
 function save(id,i,value){id=identity(id);const k=index(i),n=name(value),v=load();if(!own(v.devices,id))Object.defineProperty(v.devices,id,{value:{},enumerable:true,writable:true,configurable:true});const d=v.devices[id];if(!own(d,'channels'))d.channels={};if(!own(d.channels,k))d.channels[k]={};d.channels[k].name=n;const raw=canonical(v);validate(raw);storage.setItem(key,raw);return n;}
 return Object.freeze({key,LIMIT,read,get,save,validate});}
 const api=Object.freeze({key,FORMAT,LIMIT,identity,index,name,canonical,validate,create});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXChannelNameStore=api;
})(globalThis);
