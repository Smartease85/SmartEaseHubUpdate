/* Source-backed ordinary SP608E Timer model. No transport, DOM or automatic commands. */
'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SmartEaseBanlanXTimers=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const MAX=5,DAY_LABELS=Object.freeze(['S','M','T','W','T','F','S']),DISPLAY_DAYS=Object.freeze([6,0,1,2,3,4,5]);
 const ACTIONS=Object.freeze(Array.from({length:12},(_,id)=>Object.freeze({id,label:id<9?'Scene '+(id+1):['Scenes Loop','All On','All Off'][id-9]})));
 function integer(n,min,max,label){if(!Number.isInteger(n)||n<min||n>max)throw new TypeError('Invalid '+label);return n;}
 function date(d){if(!(d instanceof Date)||!Number.isFinite(d.getTime()))throw new TypeError('Invalid local clock');return d;}
 function localSeconds(d){date(d);return d.getHours()*3600+d.getMinutes()*60+d.getSeconds();}
 function localWeekday(d){date(d);return (d.getDay()+6)%7;}
 function days(a){if(!Array.isArray(a)||a.length>7)throw new TypeError('Invalid repeat days');const seen=new Set();for(let i=0;i<a.length;i++){if(!Object.hasOwn(a,i))throw new TypeError('Sparse repeat days');integer(a[i],0,6,'repeat day');if(seen.has(a[i]))throw new TypeError('Duplicate repeat day');seen.add(a[i]);}return a.slice();}
 function repeatMask(a){return days(a).reduce((m,d)=>m|(1<<d),0)||128;}
 function repeatDays(mask){integer(mask,0,128,'repeat mask');if(mask===128)return [];return Array.from({length:7},(_,i)=>i).filter(i=>mask&(1<<i));}
 function copy(r,{draft=false}={}){if(!r||typeof r!=='object'||Array.isArray(r))throw new TypeError('Invalid timer');integer(r.id,draft?-1:0,5,'timer ID');if(typeof r.enabled!=='boolean')throw new TypeError('Invalid enabled flag');return {id:r.id,enabled:r.enabled,seconds:integer(r.seconds,0,86399,'scheduled seconds'),action:integer(r.action,0,11,'action'),repeatDays:days(r.repeatDays)};}
 function inventory(a){if(!Array.isArray(a)||a.length>MAX)throw new TypeError('Invalid timer inventory');const seen=new Set();return Array.from({length:a.length},(_,i)=>{if(!Object.hasOwn(a,i))throw new TypeError('Sparse timer inventory');const r=copy(a[i]);if(seen.has(r.id))throw new TypeError('Duplicate timer ID');seen.add(r.id);return r;});}
 function allocate(a){const rows=inventory(a);if(rows.length>=MAX)throw new RangeError('You can only add up to 5 timers!');const taken=new Set(rows.map(r=>r.id));return [0,1,2,3,4,5].find(id=>!taken.has(id));}
 const be24=n=>[(n>>>16)&255,(n>>>8)&255,n&255];
 function encodeSet(r,now){r=copy(r);return Uint8Array.from([0x88,0x93,12,...be24(localSeconds(now)),localWeekday(now),r.id,0,r.enabled?1:0,...be24(r.seconds),r.action,repeatMask(r.repeatDays)]);}
 function encodeDelete(id){return Uint8Array.from([0x88,0x94,1,integer(id,0,5,'timer ID')]);}
 function parseRecord(bytes){if(!Array.isArray(bytes)&&!(bytes instanceof Uint8Array))throw new TypeError('Invalid timer bytes');if(bytes.length!==7)throw new TypeError('Invalid timer record size');const b=Array.from({length:7},(_,i)=>{if(!Object.hasOwn(bytes,i))throw new TypeError('Sparse timer bytes');return integer(bytes[i],0,255,'timer byte');});if(b[6]!==0&&b[6]!==1)throw new TypeError('Invalid enabled byte');return copy({id:b[0],action:b[1],repeatDays:repeatDays(b[2]),seconds:b[3]*65536+b[4]*256+b[5],enabled:b[6]===1});}
 function newDraft(now){return {id:-1,enabled:true,seconds:localSeconds(now),action:0,repeatDays:[]};}
 function create({clock=()=>new Date(),valid=()=>false,onCommand}={}){
  let active=false,identity='',generation=0,epoch=0,op=0,enabled=false,known=false,rows=[],draft=null,pending=false,provenance='unknown';
  const external=()=>{try{return valid()===true;}catch{return false;}};
  const ready=()=>active&&known&&enabled&&!pending&&external()&&typeof onCommand==='function';
  const snapshot=()=>({active,identity,generation,enabled,known,pending,provenance,timers:rows.map(r=>copy(r)),draft:draft?copy(draft,{draft:true}):null});
  function leave(){epoch++;op++;active=false;enabled=false;known=false;pending=false;draft=null;rows=[];provenance='unknown';}
  function enter(model){if(!model||typeof model.identity!=='string'||!model.identity||!Number.isSafeInteger(model.generation)||model.generation<0||typeof model.enabled!=='boolean')throw new TypeError('Invalid binding');const parsed=model.timers===null?null:inventory(model.timers);leave();identity=model.identity;generation=model.generation;active=true;enabled=model.enabled;known=parsed!==null;rows=parsed||[];provenance=known?'observed':'unknown';return snapshot();}
  function setEnabled(value){if(typeof value!=='boolean')throw new TypeError('Invalid permission');if(!value){epoch++;op++;pending=false;}enabled=value;return snapshot();}
  function beginNew(){if(!active||!known||pending)return false;allocate(rows);draft=newDraft(clock());return snapshot().draft;}
  function beginEdit(id){integer(id,0,5,'timer ID');if(!active||!known||pending)return false;const r=rows.find(r=>r.id===id);if(!r)return false;draft=copy(r);return snapshot().draft;}
  function patchDraft(patch){if(!draft||pending)return false;if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!['seconds','action','repeatDays','enabled'].includes(k)))throw new TypeError('Invalid draft patch');draft=copy({...draft,...patch},{draft:true});return snapshot().draft;}
  function pickerTime(hour,minute){if(!draft||pending)return false;integer(hour,0,23,'picker hour');integer(minute,0,59,'picker minute');return patchDraft({seconds:hour*3600+minute*60});}
  function cancelDraft(){epoch++;op++;pending=false;draft=null;}
  async function send(kind,record,id){if(!ready())return false;const stamp=epoch,token=++op,bound=identity,session=generation;let cancelled=false;const guard=()=>{if(cancelled)return false;const ok=active&&known&&enabled&&epoch===stamp&&op===token&&identity===bound&&generation===session&&external();if(!ok)cancelled=true;return ok;};let next=rows.map(r=>copy(r)),packet;
   if(kind==='remove'){if(!next.some(r=>r.id===id))return false;next=next.filter(r=>r.id!==id);packet=encodeDelete(id);}
   else {record=copy(record,{draft:true});if(record.id===-1)record.id=allocate(next);else if(!next.some(r=>r.id===record.id))return false;packet=encodeSet(record,clock());const i=next.findIndex(r=>r.id===record.id);if(i<0)next.push(copy(record));else next[i]=copy(record);}
   if(!guard())return false;pending=true;const payload=Object.freeze({kind,packet:Object.freeze(Array.from(packet)),record:record?Object.freeze({...copy(record),repeatDays:Object.freeze(record.repeatDays.slice())}):null,id:record?.id??id});
   try{const ok=await onCommand(payload,Object.freeze({valid:guard}));if(!guard())return false;if(ok!==true)return false;rows=next;provenance='local-request';if(kind==='save')draft=null;return true;}catch{return false;}finally{if(epoch===stamp&&op===token)pending=false;}
  }
  return Object.freeze({enter,leave,setEnabled,snapshot,beginNew,beginEdit,patchDraft,pickerTime,cancelDraft,save:()=>draft?send('save',draft):Promise.resolve(false),toggle(id,value){if(typeof value!=='boolean')throw new TypeError('Invalid enabled flag');integer(id,0,5,'timer ID');const row=rows.find(r=>r.id===id);return row?send('toggle',{...row,enabled:value}):Promise.resolve(false);},remove:id=>send('remove',null,integer(id,0,5,'timer ID'))});
 }
 return Object.freeze({MAX,ACTIONS,DAY_LABELS,DISPLAY_DAYS,localSeconds,localWeekday,repeatMask,repeatDays,copy,inventory,allocate,encodeSet,encodeDelete,parseRecord,newDraft,create});
});
