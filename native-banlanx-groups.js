/* Source-backed local output groups. Controller proof and transport stay in Native SP. */
'use strict';
(()=>{
 const store=SmartEaseBanlanXGroupsStore;
 let active=false,epoch=0,operation=0,bridge=null,bound=null,component=null,section=null,sending=false,signature='',pendingGuard=null;
 function record(id,deviceId){return store.read(deviceId).find(g=>g.group_id===id)||null;}
 function equal(a,b){return !!a&&!!b&&a.group_id===b.group_id&&a.name===b.name&&a.channels===b.channels;}
 function resolveControl(){
  const identity=window.SmartEaseNativeSP?.snapshot()?.identity;
  if(nativeAppState.screen!=='group-control'||nativeAppState.groupDevice!==identity)return null;
  let item;try{item=record(Number(nativeAppState.detail),identity);}catch{return null;}if(!item)return null;
  const revision=store.revision(identity,item.group_id);let invalid=false;const path=nativeAppState.path;
  return Object.freeze({mask:item.channels,title:item.name,valid(){if(invalid)return false;try{if(nativeAppState.path!==path||nativeAppState.groupDevice!==identity||window.SmartEaseNativeSP?.snapshot()?.identity!==identity||store.revision(identity,item.group_id)!==revision||!equal(item,record(item.group_id,identity)))invalid=true;}catch{invalid=true;}return !invalid;}});
 }
 function same(){const now=bridge?.identity();return now&&bound&&now.id===bound.id&&now.session===bound.session&&now.device===bound.device&&now.characteristic===bound.characteristic;}
 function valid(stamp=epoch){return active&&stamp===epoch&&same()&&bridge.valid()&&nativeAppState.screen==='groups'&&!SmartEaseNative.pendingBack&&document.visibilityState!=='hidden';}
 function model(){const p=bridge.proof();return {identity:bound.id||'unconnected-sp608e',generation:bound.session,enabled:bound.live&&!!bound.id,ordinary:true,channels:Array.from({length:8},(_,i)=>({name:window.SmartEaseNativeSPChannelNames?.name(bound.id,i)||'Channel '+(i+1),lightingOn:p?p.values[i].power:null}))};}
 function refresh(){if(!active||!valid()||sending)return;const m=model();let raw;try{raw=localStorage.getItem(store.key);}catch{raw='unreadable';}const next=JSON.stringify([m,raw]);if(next!==signature){signature=next;component.update(m);}}
 function leave(){epoch++;operation++;active=false;sending=false;pendingGuard=null;component?.dispose();component=null;section?.remove();section=null;signature='';}
 function enter(parent,adapter){leave();bridge=adapter;bound=bridge.identity();active=true;section=document.createElement('section');section.className='bx-groups-page';parent.append(section);
  component=SmartEaseBanlanXGroups.create(section,{store,valid:()=>valid(),onOpen(request,context){if(!valid()||!context.valid())return;let current;try{current=record(request.group_id,bound.id);}catch{return;}const p=bridge.proof();if(!current||current.name!==request.name||current.channels!==request.channel_id||!p||!indexes(current.channels).every(i=>p.values[i].power===true))return;SmartEaseNative.enter('sp608e/group-control/'+request.group_id+'/'+encodeURIComponent(bound.id));},async onPower(request,context){const stamp=epoch,token=++operation;let item;try{item=record(request.group_id,bound.id);}catch{return false;}if(!item||item.channels!==request.mask)return false;const revision=store.revision(bound.id,item.group_id);let revoked=false;const guard=()=>{if(revoked)return false;let ok=false;try{ok=valid(stamp)&&operation===token&&bound.live&&!!bound.id&&bridge.exclusive()&&context.valid()&&store.revision(bound.id,item.group_id)===revision&&equal(item,record(item.group_id,bound.id));}catch{}if(!ok)revoked=true;return ok;};if(!guard())return false;pendingGuard=guard;sending=true;try{return await sendPower(item.channels,request.on,{guard,skipRefresh:true});}finally{const owned=pendingGuard===guard;if(owned)pendingGuard=null;if(owned&&active&&stamp===epoch){sending=false;signature='';// Component finishes its own pending callback before refresh cancels it.
    setTimeout(()=>{if(active&&stamp===epoch)refresh();},0);}}}});component.enter(model());signature='';refresh();
 }
 window.addEventListener('storage',event=>{if(event.key===store.key||event.key===null){store.observeStorage(event.key===null?null:event.newValue);pendingGuard?.();signature='';refresh();window.SmartEaseNativeSPSolid?.refresh();}});
 window.SmartEaseNativeSPGroups={enter,leave,refresh,resolveControl,state:()=>({active,sending,component:component?.snapshot()||null}),power:(id,on)=>component?.power(id,on)??Promise.resolve(false),open:id=>component?.openGroup(id)??false};
})();
