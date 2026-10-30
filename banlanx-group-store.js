/* Local SP608E channel groups; no transport. JSON is a browser adaptation. */
'use strict';
(function(root){
 const key='smartease-native-banlanx-groups-v1',LIMIT=1024*1024,FORMAT='smartease-native-banlanx-groups';
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k),object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function identity(id){if(typeof id!=='string'||!id.trim()||id.length>256)throw Error('Exact device ID required');return id;}
 function groupId(id){if(!Number.isInteger(id)||id<0||id>9)throw Error('Group ID must be0–9');return String(id);}
 function mask(v){if(!Number.isInteger(v)||v<1||v>255)throw Error('Select at least one of eight channels');return v;}
 function name(v){if(typeof v!=='string'||v.length<1||v.length>15)throw Error('Group name requires1–15 UTF-16 units');return v;}
 function canonical(value,seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value)))throw Error('JSON extension number is not safely representable');return JSON.stringify(value);}
  if(typeof value!=='object'||seen.has(value))throw Error('Invalid or cyclic JSON extension');seen.add(value);let result;
  if(Array.isArray(value)){const items=[];for(let i=0;i<value.length;i++){if(!own(value,i))throw Error('Sparse JSON extension');items.push(canonical(value[i],seen));}result='['+items.join(',')+']';}
  else result='{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],seen)).join(',')+'}';seen.delete(value);return result;
 }
 function byteLength(raw){if(typeof TextEncoder==='function')return new TextEncoder().encode(raw).length;return new Blob([raw]).size;}

 function shape(value){if(!object(value)||value.format!==FORMAT||value.version!==1||!object(value.devices))throw Error('Unsupported or malformed Native group library');
  for(const device of Object.values(value.devices)){if(!object(device))throw Error('Invalid group device');if(!own(device,'groups'))continue;if(!object(device.groups))throw Error('Invalid group records');for(let i=0;i<10;i++)if(own(device.groups,String(i))){const g=device.groups[i];if(!object(g)||!own(g,'name')||!own(g,'channels')||typeof g.name!=='string'||g.name.length>15)throw Error('Invalid group record');mask(g.channels);}}
  return value;
 }
 function validate(raw){if(typeof raw!=='string'||byteLength(raw)>LIMIT)throw Error('Group backup exceeds1MiB UTF-8 or is not text');let v;try{v=JSON.parse(raw);}catch{throw Error('Unreadable group JSON; original bytes preserved');}shape(v);canonical(v);return v;}
 function create(storage){if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error('Storage adapter required');
  const revisions=new Map();const revKey=(deviceId,id)=>JSON.stringify([identity(deviceId),Number(groupId(id))]);const revision=(deviceId,id)=>{const k=revKey(deviceId,id);if(!revisions.has(k))revisions.set(k,0);return revisions.get(k);};const changed=(deviceId,id)=>{const k=revKey(deviceId,id);revisions.set(k,(revisions.get(k)||0)+1);};
  const load=()=>{const raw=storage.getItem(key);return raw===null?{format:FORMAT,version:1,devices:{}}:validate(raw);};
  const records=(v,id)=>own(v.devices,id)&&own(v.devices[id],'groups')?v.devices[id].groups:null;
  function read(deviceId){const id=identity(deviceId),all=records(load(),id);return Array.from({length:10},(_,i)=>all&&own(all,String(i))?{...JSON.parse(canonical(all[i])),group_id:i}:null).filter(Boolean);}
  function change(deviceId,callback){const id=identity(deviceId),v=load();if(!own(v.devices,id))Object.defineProperty(v.devices,id,{value:{},enumerable:true,writable:true,configurable:true});const d=v.devices[id];if(!own(d,'groups'))d.groups={};const result=callback(d.groups);shape(v);const raw=canonical(v);if(byteLength(raw)>LIMIT)throw Error('Group library exceeds1MiB UTF-8; nothing saved');storage.setItem(key,raw);return result;}
  function add(deviceId,label,channels){const n=name(label),m=mask(channels);const result=change(deviceId,groups=>{let id=0;while(id<10&&own(groups,String(id)))id++;if(id===10)throw Error('You can only add up to 10 groups!');groups[id]={name:n,channels:m};return id;});changed(deviceId,result);return result;}
  function update(deviceId,id,patch){const k=groupId(id);if(!object(patch)||Object.keys(patch).some(x=>!['name','channels'].includes(x)))throw Error('Unsupported group edit');const p={};if(own(patch,'name'))p.name=name(patch.name).trim();if(own(patch,'channels'))p.channels=mask(patch.channels);const result=change(deviceId,groups=>{if(!own(groups,k))throw Error('Group no longer exists');Object.assign(groups[k],p);return true;});changed(deviceId,id);return result;}
  function remove(deviceId,id){const k=groupId(id);const result=change(deviceId,groups=>{if(!own(groups,k))throw Error('Group no longer exists');delete groups[k];return true;});changed(deviceId,id);return result;}
  function observeStorage(raw){let snapshot,current;try{snapshot=raw===null?{devices:{}}:validate(raw);current=load();}catch{for(const [k,v]of revisions)revisions.set(k,v+1);return;}for(const [k,v]of revisions){const [deviceId,id]=JSON.parse(k),a=records(snapshot,deviceId)?.[id],b=records(current,deviceId)?.[id];if((!!a)!==(!!b)||a&&b&&(a.name!==b.name||a.channels!==b.channels))revisions.set(k,v+1);}}
  return Object.freeze({key,LIMIT,read,add,update,remove,validate,revision,observeStorage});
 }
 const api={key,LIMIT,validate,canonical,create,mask,name};if(typeof module!=='undefined'&&module.exports)module.exports=Object.freeze(api);else root.SmartEaseBanlanXGroupsStore=Object.freeze({...api,...create({getItem:k=>root.localStorage.getItem(k),setItem:(k,v)=>root.localStorage.setItem(k,v)})});
})(globalThis);
