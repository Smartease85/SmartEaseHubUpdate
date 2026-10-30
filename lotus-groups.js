/* Local ordinary-OF21 groups. No Bluetooth, physical assignment, or profile storage. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LotusGroups=api;})(typeof globalThis==='object'?globalThis:this,()=>{
'use strict';
const KEY='smartease.native.lotus.groups.v1', UUID=/^of21-group:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clone=x=>JSON.parse(JSON.stringify(x));
function assert(v,m){if(!v)throw new Error(m);}
function json(value){const s=JSON.stringify(value);assert(typeof s==='string'&&s.length<=1000000,'Invalid or oversized group backup');return JSON.parse(s,(k,v)=>{assert(!['__proto__','prototype','constructor'].includes(k),'Unsafe metadata key');return v;});}
function name(value){assert(typeof value==='string','Invalid group name');let out='';for(const c of value){if(new TextEncoder().encode(out+c).length>45)break;out+=c;}assert(out.trim().length>0,'Enter a group name');return out;}
function physical(d){return d&&d.kind==='physical-device'&&typeof d.identityId==='string'&&d.identityId.length>0&&!d.identityId.startsWith('of21-group:')&&d.type===30&&d.family==='OF21';}
function registry(devices){assert(Array.isArray(devices),'Invalid device registry');const m=new Map();for(const d of devices){assert(d&&typeof d.identityId==='string'&&!m.has(d.identityId),'Duplicate or invalid device identity');m.set(d.identityId,clone(d));}return m;}
function validate(input){const v=json(input);assert(v&&v.version===1&&Number.isSafeInteger(v.revision)&&v.revision>=0&&Array.isArray(v.groups)&&v.groups.length<=500,'Invalid group registry');const ids=new Set();for(const g of v.groups){assert(g&&g.kind==='local-of21-group'&&UUID.test(g.localId)&&!ids.has(g.localId),'Invalid or duplicate group identity');ids.add(g.localId);assert(name(g.name)===g.name,'Invalid group name');assert(g.type===30&&Array.isArray(g.memberIdentityIds)&&g.memberIdentityIds.length>0&&g.memberIdentityIds.length<=500,'Invalid group members');const unique=new Set(g.memberIdentityIds);assert(unique.size===g.memberIdentityIds.length&&g.memberIdentityIds.every(id=>typeof id==='string'&&id.length>0&&id.length<=512&&!id.startsWith('of21-group:')),'Invalid member identity');}return v;}
function createStore(storage,{key=KEY,uuid=()=>globalThis.crypto.randomUUID()}={}){
 function read(){const raw=storage.getItem(key);return {raw,value:raw===null?{version:1,revision:0,groups:[]}:validate(JSON.parse(raw))};}
 function commit(snapshot,value){assert(storage.getItem(key)===snapshot.raw,'Groups changed; reopen before saving');const next=validate({...value,revision:snapshot.value.revision+1});const raw=JSON.stringify(next);storage.setItem(key,raw);return {raw,value:clone(next)};}
 function save(snapshot,draft,devices){const map=registry(devices),ids=[...new Set(draft.memberIdentityIds)];assert(ids.length>0&&ids.every(id=>physical(map.get(id))),'Select existing OF21 physical devices');const old=draft.localId?snapshot.value.groups.find(g=>g.localId===draft.localId):null;assert(!draft.localId||old,'Group no longer exists');const localId=old?.localId||'of21-group:'+uuid();assert(!snapshot.value.groups.some(g=>g.localId===localId&&g!==old),'Group ID collision');const g={...(old||{}),kind:'local-of21-group',localId,type:30,name:name(draft.name),memberIdentityIds:ids};const groups=old?snapshot.value.groups.map(x=>x.localId===localId?g:x):[...snapshot.value.groups,g];return commit(snapshot,{...snapshot.value,groups});}
 return {read,save,remove(snapshot,id){assert(snapshot.value.groups.some(g=>g.localId===id),'Group no longer exists');return commit(snapshot,{...snapshot.value,groups:snapshot.value.groups.filter(g=>g.localId!==id)});},export(){return JSON.stringify(read().value);},import(snapshot,input){const incoming=validate(typeof input==='string'?JSON.parse(input):input);/* Explicit whole-registry replacement; never touches physical registry. */return commit(snapshot,incoming);}};
}
function selection(devices,currentIds=[]){const map=registry(devices),chosen=new Set(currentIds);return {ids:()=>[...chosen],toggle(id){const d=map.get(id);assert(physical(d),'Only registered OF21 devices are available');if(chosen.has(id))chosen.delete(id);else {for(const old of chosen){if(!physical(map.get(old))||map.get(old).type!==d.type)chosen.clear();}chosen.add(id);}return [...chosen];},available:()=>[...map.values()].filter(physical)};}
/* Registry adapter contract: {identityId,generation,connected,send(command),...}; lease
 * equality uses object + generation. send handles each device's own calibration once.
 * No timer edits/read consensus; no radio group IDs. Only explicit authored actions. */
function createDispatcher({resolve,getGroup,getGroupStamp,isRouteCurrent}){
 let epoch=0,busy=false;
 const cancel=()=>{epoch++;};
 return {cancel,get busy(){return busy;},async send(group,command,{confirmed=false}={}){
  assert(confirmed===true,'Explicit group action confirmation required');assert(!busy,'Group action still pending');assert(['color','brightness','effect','power'].includes(command?.kind),'Unsupported group action');
  const g=validate({version:1,revision:0,groups:[group]}).groups[0];const request=json(command);
  if(request.kind==='color')assert(Array.isArray(request.rgb)&&request.rgb.length===3&&request.rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255),'Invalid authored RGB');
  if(request.kind==='brightness')assert(Number.isInteger(request.value)&&request.value>=0&&request.value<=100,'Invalid brightness');
  if(request.kind==='effect')assert(Number.isInteger(request.id)&&request.id>=0&&request.id<234,'Invalid effect');
  if(request.kind==='power')assert(typeof request.on==='boolean','Invalid power');
  const membersMatch=()=>{const current=getGroup(g.localId);return current?.localId===g.localId&&JSON.stringify(current.memberIdentityIds)===JSON.stringify(g.memberIdentityIds);};
  assert(membersMatch(),'Group membership changed');
  const stamp=getGroupStamp(g.localId),token=epoch;
  assert(stamp!==null&&stamp!==undefined&&isRouteCurrent(),'Group context is unavailable');
  const leases=g.memberIdentityIds.map(id=>{const a=resolve(id);return {id,a,generation:a?.generation};});const result=[];busy=true;
  const context=()=>token===epoch&&isRouteCurrent()&&getGroupStamp(g.localId)===stamp&&membersMatch();
  try{for(const l of leases){if(!context()){result.push({identityId:l.id,status:'cancelled'});continue;}
   const a=resolve(l.id);if(!a||!l.a){result.push({identityId:l.id,status:'unavailable'});continue;}
   if(a!==l.a||a.identityId!==l.id||a.generation!==l.generation){result.push({identityId:l.id,status:'stale'});cancel();continue;}
   if(a.kind!=='physical-adapter'||a.bound!==true||a.connected!==true||typeof a.send!=='function'){result.push({identityId:l.id,status:'disconnected'});continue;}
   if(leases.some(other=>other.id!==l.id&&other.a===a)){result.push({identityId:l.id,status:'invalid-shared-adapter'});continue;}
   const guard=()=>context()&&resolve(l.id)===a&&a.identityId===l.id&&a.generation===l.generation&&a.bound===true&&a.connected===true;
   try{const reply=await a.send(clone(request),guard);const current=guard();result.push({identityId:l.id,status:reply===true?'submitted':reply===false?'failed':'unconfirmed',contextCurrent:current});if(!current)cancel();}
   catch(error){result.push({identityId:l.id,status:'failed',error:String(error?.message||error)});if(!guard())cancel();}
  }return {members:result,allSubmitted:result.every(r=>r.status==='submitted'),hardwareAccepted:false,cancelled:!context()};}
  finally{busy=false;}
 }};
}
return {KEY,name,physical,registry,validate,createStore,selection,createDispatcher};
});
