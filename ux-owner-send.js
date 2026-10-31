(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./ux-experimental-uploader.js'),require('./owner-test-plan.js'));else root.SmartEaseUXOwnerSend=factory(root.SmartEaseUXExperimentalUploader,root.SmartEaseUXOwnerTestPlan);})(globalThis,function(Uploader,Plan){
'use strict';
// All future UX writers must use this same link-scoped lease. No connection/discovery here.
const leases=new WeakMap(),packetReports=new WeakMap();
// OEM logical-packet policy is distinct from 20-byte ATT fragmentation.
// Reports are memory-only and may originate only from an accepted explicit 1f read.
const samePacketOwner=(a,b)=>!!a&&!!b&&a.deviceId===b.deviceId&&a.generation===b.generation&&a.characteristic===b.characteristic;
const packetFallback=()=>Object.freeze({packageSize:1004,measured:false,provenance:'source-fallback-unmeasured'});
function binding(adapter){
 const link=adapter?.link;if(!link)throw Error('UX transport unavailable');
 function current(){const device=link.device;const result={deviceId:device?.id||link.identity?.id,deviceName:device?.name||link.identity?.name||'Unnamed display',geometrySource:'explicit-owner-target-profile',generation:link.generation,connected:adapter.link===link&&link.connected===true,characteristic:link.characteristic,discovery:typeof link.discoveryProof==='function'?link.discoveryProof():null,model:adapter.profile==='coolledux'?'CoolLEDUX':'unknown',width:96,height:16};const cached=packetReports.get(link);if(cached&&(!result.connected||result.model!=='CoolLEDUX'||!samePacketOwner(cached.owner,result)))packetReports.delete(link);return result;}
 function acquireExclusive(){const prior=leases.get(link);if(prior)throw Error('Previous display write has not settled. Wait before another test.');const s=current(),token={};leases.set(link,token);let released=false;return {valid(){const now=current();return !released&&leases.get(link)===token&&now.connected&&s.deviceId===now.deviceId&&s.generation===now.generation&&s.characteristic===now.characteristic;},release(){if(released)return;released=true;if(leases.get(link)===token)leases.delete(link);}};}
 function clearDeviceInfo(){packetReports.delete(link);}
 function recordDeviceInfo(owner,info){const now=current();if(!now.connected||now.model!=='CoolLEDUX'||!samePacketOwner(owner,now))throw Error('Stale device-info packet report');if(info?.format!=='coolledux-device-info1f'||info.version!==1||info.identity?.deviceId!==now.deviceId||info.identity?.generation!==now.generation||!Number.isSafeInteger(info.ticket)||info.ticket<1||info.association!=='explicit-pending-same-source-not-wire-authenticated')throw Error('Accepted explicit device-info read required');const f=info.logicalPacketMax;if(!f||!(f.raw===null||Number.isInteger(f.raw)))throw Error('Malformed logical packet-size report');packetReports.set(link,{owner:{deviceId:now.deviceId,generation:now.generation,characteristic:now.characteristic},raw:f.raw,known:f.known===true,measured:f.measured===true,value:f.value,provenance:f.provenance});}
 function logicalPacketPolicy(){current();const r=packetReports.get(link);if(!r||r.raw===null)return packetFallback();if(!r.known||!r.measured||r.provenance!=='reply'||r.value!==r.raw||r.raw<1||r.raw>1024)throw Error('Reported logical packet size '+r.raw+' is unsupported (supported 1–1024); nothing sent.');return Object.freeze({packageSize:r.raw,measured:true,provenance:'explicit-same-session-device-info'});}
 return Object.freeze({current,acquireExclusive,busy:()=>leases.has(link),clearDeviceInfo,recordDeviceInfo,logicalPacketPolicy});
}
const confirmations=Object.freeze([]);
function create(host,{adapter,valid=()=>false,scheduler,onState=()=>{}}){
 const doc=host.ownerDocument,win=doc.defaultView,bridge=binding(adapter);let active=false,epoch=0,owner=null,uploader=null,disposed=false,started=false,last=null,unavailable='';
 const dialog=doc.createElement('dialog');dialog.className='nux-owner-send';dialog.setAttribute('aria-label','Experimental display test');
 const heading=doc.createElement('h3');heading.textContent='Experimental display test';
 const note=doc.createElement('p');note.textContent='This sends one static dim corner pattern to the known UX 16×96 display, not your selected programs. Red: four pixels top-left; green: three top-right; blue: two bottom-left; yellow: one bottom-right. A SmartEase JSON export is not a controller backup. Cancel cannot undo writes already sent. Restore manually using the original app if needed.';
 const selected=doc.createElement('p');selected.className='nux-owner-selected';const status=doc.createElement('p');status.setAttribute('role','status');const send=doc.createElement('button');send.type='button';send.textContent='Send static test once';const cancel=doc.createElement('button');cancel.type='button';cancel.textContent='Cancel / Close';dialog.append(heading,note,selected,status,send,cancel);host.append(dialog);
 function same(){const s=bridge.current();try{Uploader.capability(s);}catch{return false;}return owner&&s.deviceId===owner.deviceId&&s.generation===owner.generation&&s.characteristic===owner.characteristic;}
 function live(e=epoch){return !disposed&&active&&e===epoch&&doc.visibilityState!=='hidden'&&valid()===true&&same();}
 function paint(){send.disabled=!live()||started||bridge.busy();}
 function leave(reason='Owner closed test'){active=false;epoch++;uploader?.invalidate(reason);if(dialog.open)dialog.close();paint();}
 function refresh(){if(active&&!live())leave('Route, visibility or connection changed');else paint();}
 function open(){if(disposed||!valid()||doc.visibilityState==='hidden')return false;leave('New test admission');if(bridge.busy()){unavailable='Previous display write has not settled. Wait before another test.';return false;}const s=bridge.current();try{Uploader.capability(s);}catch(e){unavailable=e.message;status.textContent=e.message;return false;}unavailable='';owner=s;selected.textContent='Selected: '+s.deviceName+' ['+s.deviceId+']. Target profile: 16×96. Dimensions are not read from Bluetooth; this test must not be used for a different-size UX display.';active=true;started=false;last=null;uploader=null;epoch++;status.textContent='Nothing sent. Choose Send to run the test.';paint();dialog.showModal();return true;}
 function run(){if(!live()||started||bridge.busy())return false;const e=epoch;started=true;paint();
  uploader=Uploader.create({plan:Plan.createOwnerOrientationTest().plan,current:bridge.current,valid:()=>live(e),acquireExclusive:bridge.acquireExclusive,scheduler,onState:s=>{last=s;if(live(e)){status.textContent=s.state==='complete'?'Controller ACK sequence completed. Check the actual corner pattern; orientation and retained state are NOT verified.':s.reason||('Test '+s.state+'.');paint();}onState(s);}});
  try{const promise=uploader.start({deviceId:owner.deviceId,generation:owner.generation,transferId:'owner-test-'+e});promise.catch(error=>{if(live(e))status.textContent=error.message;});return true;}catch(error){if(live(e)){status.textContent=error.message;paint();}return false;}
 }
 send.onclick=run;cancel.onclick=()=>leave();dialog.addEventListener('cancel',event=>{event.preventDefault();leave();});
 const hidden=()=>{if(doc.visibilityState==='hidden')leave('Page hidden');},pagehide=()=>leave('Page hidden');doc.addEventListener('visibilitychange',hidden);win.addEventListener('pagehide',pagehide);
 return Object.freeze({open,leave,refresh,send:run,state:()=>({active,started,epoch,busy:bridge.busy(),transfer:last,unavailable}),dispose(){leave('Host disposed');disposed=true;doc.removeEventListener('visibilitychange',hidden);win.removeEventListener('pagehide',pagehide);dialog.remove();}});
}
return {create,binding,confirmations};
});
