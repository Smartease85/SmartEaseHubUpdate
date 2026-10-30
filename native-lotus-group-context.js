/* Explicit Native context, never a synthetic physical adapter or cart assignment. */
'use strict';
(()=>{
 const store=LotusGroups.createStore(localStorage),active=new Set(),requested=new Map();let epoch=0;
 const groupId=()=>typeof nativeAppState!=='undefined'&&nativeAppState.device==='nokins'?nativeAppState.lotusGroup||null:null;
 function group(){const id=groupId();return id?store.read().value.groups.find(g=>g.localId===id)||null:null;}
 function devices(){const a=cartDevices[2],alias=window.SmartEaseNativeName?.get();return a.identity?.id&&a.profile==='melk-of21'&&SmartEaseOF21.profile(a.identity.name)?[{kind:'physical-device',identityId:a.identity.id,type:30,family:'OF21',name:typeof alias==='string'?alias:a.identity.name,originalName:a.identity.name}]:[];}
 function key(){return groupId()||cartDevices[2].identity?.id||'';}
 function stamp(){if(!groupId())return '';try{return JSON.stringify([groupId(),store.read().raw,epoch]);}catch{return 'invalid:'+epoch;}}
 function ready(){if(!groupId())return true;try{const g=group(),a=cartDevices[2];return !!g&&g.memberIdentityIds.length===1&&g.memberIdentityIds[0]===a.identity?.id&&a.device?.id===a.identity.id&&a.ownerLink.device===a.device&&a.ownerLink.identity?.id===a.identity.id&&!a.ownerLink.connecting&&!!SmartEaseOF21.profile(a.identity.name)&&a.profile==='melk-of21'&&a.connected&&a.controlReady;}catch{return false;}}
 function cancel(){epoch++;for(const op of active)op.a.cancelOwner();}
 async function submit(a,kind,value,options,guard){if(!groupId())return a.ownerCommand(kind,value,options,guard);if(!['color','brightness','power','effect','speed','scene','microphone','mic-rhythm','sensitivity'].includes(kind))throw Error('This group workflow is not integrated yet. No command sent.');if(!ready()||a!==cartDevices[2]||!guard())return false;SmartEaseOF21.command(kind,value,options);const id=groupId(),state=stamp(),device=a.device,identity=a.identity.id,generation=a.ownerLink.generation,ownerEpoch=a.ownerEpoch,token=epoch,op={a};active.add(op);const valid=()=>token===epoch&&stamp()===state&&groupId()===id&&ready()&&a.device===device&&a.identity.id===identity&&a.ownerLink.generation===generation&&a.ownerEpoch===ownerEpoch&&page==='native'&&!window.SmartEaseNative?.pendingBack&&document.visibilityState==='visible'&&guard();try{const ok=await a.ownerCommand(kind,value,options,valid);if(!valid())return false;if(ok)requested.set(id,{...(requested.get(id)||{}),[kind]:structuredClone(value)});return ok===true;}finally{active.delete(op);}}
 function name(){try{return group()?.name||'Unavailable group';}catch{return 'Unavailable group';}}
 function label(){if(!groupId())return '';try{const g=group();return g?g.name+' · '+g.memberIdentityIds.length+' local member(s). Color/brightness are local requested state, not member readback. '+(ready()?'Known member is connected.':'Group control unavailable: only the current assigned OF21 can be resolved; missing members are not substituted.'):'Group no longer exists. No device selected in its place.';}catch{return 'Group registry unreadable; preserved without commands.';}}
 window.SmartEaseNativeLotusContext={store,groupId,group,devices,key,stamp,ready,submit,cancel,label,name,get requested(){return new Map(requested);}};
 window.addEventListener('smartease-of21-state',()=>{const note=document.getElementById('nativeLotusGroupNotice');if(note)note.textContent=label();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')cancel();});window.addEventListener('pagehide',cancel);window.addEventListener('storage',e=>{if(e.key===LotusGroups.KEY){cancel();nativeRender();}});
})();
function nativeLotusOwnerCommand(a,kind,value,options,guard){return window.SmartEaseNativeLotusContext.submit(a,kind,value,options,guard);}
function nativeLotusPath(screen){const id=window.SmartEaseNativeLotusContext?.groupId();return id?'nokins/group/'+encodeURIComponent(id)+'/'+screen:'nokins/'+screen;}
