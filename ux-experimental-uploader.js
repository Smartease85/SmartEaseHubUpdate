(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./ux-source-transaction.js'));else root.SmartEaseUXExperimentalUploader=factory(root.SmartEaseUXSourceTransaction);})(globalThis,function(Transaction){
/* Explicit owner-test transport; no discovery, connection, storage or automatic start. */
'use strict';
const {createTransaction}=Transaction;
const SERVICE='0000fff0-0000-1000-8000-00805f9b34fb',CHARACTERISTIC='0000fff1-0000-1000-8000-00805f9b34fb';
function capability(s){
 if(!s||s.connected!==true||typeof s.deviceId!=='string'||!s.deviceId||!Number.isSafeInteger(s.generation)||s.generation<0||s.model!=='CoolLEDUX'||s.width!==96||s.height!==16)throw Error('Connected, exact UX16×96 identity/session required');
 const c=s.characteristic,p=c?.properties;
 if(c?.uuid?.toLowerCase()!==CHARACTERISTIC||c.service?.uuid?.toLowerCase()!==SERVICE||!(p?.notify||p?.indicate)||typeof c.startNotifications!=='function'||typeof c.addEventListener!=='function'||typeof c.removeEventListener!=='function')throw Error('Verified FFF0/FFF1 notification capability required');
 if(p.write===true&&typeof c.writeValueWithResponse==='function')return 'with-response';
 if(p.writeWithoutResponse===true&&typeof c.writeValueWithoutResponse==='function')return 'without-response';
 throw Error('Explicit supported write method/property required; no guessed legacy write mode');
}
function create({plan,current,valid,acquireExclusive,scheduler={setTimeout,clearTimeout},onState=()=>{}}){
 if(typeof current!=='function'||typeof valid!=='function'||typeof acquireExclusive!=='function')throw Error('Identity, validity and exclusive lease adapters required');
 let state='idle',epoch=0,owner=null,mode=null,lease=null,tx=null,timeout=null,pace=null,releasePace=null,listener=null,tail=Promise.resolve(),writePhase=false,acceptEarly=false,early=[],doneResolve=null,done=null,reason=null,writes=0,inflight=0,releaseWhenQuiet=false;
 const notify=()=>{try{onState(snapshot());}catch{}};
 function snapshot(){return {state,reason,writes,experimental:true,hardwareVerified:false,retentionVerified:false,fragmentBytes:20,quiescent:inflight===0,writeMode:mode,transaction:tx?.snapshot||null};}
 function releaseLease(){if(inflight){releaseWhenQuiet=true;return;}try{lease?.release();}catch{}lease=null;releaseWhenQuiet=false;}
 function settled(){inflight--;if(inflight===0&&releaseWhenQuiet)releaseLease();notify();}
 function cleanup(){if(timeout!==null)scheduler.clearTimeout(timeout);timeout=null;if(pace!==null)scheduler.clearTimeout(pace);pace=null;releasePace?.();releasePace=null;if(listener&&owner?.characteristic)owner.characteristic.removeEventListener('characteristicvaluechanged',listener);listener=null;releaseLease();early=[];acceptEarly=false;}
 function finish(next,why){if(!['starting','sending','waiting'].includes(state))return;state=next;reason=why||null;epoch++;if(next!=='complete')tx?.cancel();cleanup();notify();doneResolve?.(snapshot());}
 function live(e=epoch){if(!['starting','sending','waiting'].includes(state)||e!==epoch)return false;let now,ok=false;try{now=current();ok=valid()===true&&lease?.valid()===true&&now?.deviceId===owner.deviceId&&now.generation===owner.generation&&now.characteristic===owner.characteristic&&capability(now)===mode;}catch{}if(!ok)finish('cancelled','Identity, capability, lease or explicit owner context changed');return ok;}
 function wait15(){return new Promise(resolve=>{releasePace=resolve;pace=scheduler.setTimeout(()=>{pace=null;releasePace=null;resolve();},15);});}
 function schedule(action){tail=tail.then(()=>send(action)).catch(e=>finish('failed',String(e.message||e)));}
 function actions(results){for(const a of results){if(a.type==='frame'){if(timeout!==null)scheduler.clearTimeout(timeout);timeout=null;schedule(a);}else if(a.type==='complete')finish('complete',a.cached?'Controller reported matching cached CRC; retention not verified':'Controller ACK sequence completed; display/retention not verified');else if(a.type==='failed')finish('failed',a.reason);}}
 function receive(bytes){if(!live())return;if(writePhase){if(acceptEarly){if(early.reduce((n,b)=>n+b.length,0)+bytes.length>256)return finish('failed','Early notification buffer exceeded');early.push(bytes);}return;}actions(tx.receive(bytes,tx.snapshot.context));}
 async function send(a){const e=epoch;if(!live(e))return;state='sending';writePhase=true;acceptEarly=false;early=[];notify();const chunks=[];for(let i=0;i<a.bytes.length;i+=20)chunks.push(Uint8Array.from(a.bytes.slice(i,i+20)));
  for(let i=0;i<chunks.length;i++){if(!live(e))return;acceptEarly=i===chunks.length-1;try{writes++;inflight++;const c=owner.characteristic;await (mode==='with-response'?c.writeValueWithResponse(chunks[i]):c.writeValueWithoutResponse(chunks[i]));}catch{if(live(e))actions([tx.writeFailed(a.token,tx.snapshot.context)]);return;}finally{settled();}if(!live(e))return;if(i<chunks.length-1)await wait15();}
  if(!live(e))return;writePhase=false;acceptEarly=false;if(!tx.markDispatched(a.token,tx.snapshot.context))return finish('failed','Stale action dispatch');state='waiting';notify();if(!live(e))return;timeout=scheduler.setTimeout(()=>{timeout=null;if(live(e))finish('failed','5000ms ACK timeout; no automatic retry in owner-test mode');},5000);
  const buffered=early;early=[];for(const b of buffered){if(!live(e)||tx.snapshot.actions!==a.token)break;actions(tx.receive(b,tx.snapshot.context));}
 }
 function start(consent){if(state!=='idle')throw Error('Uploader is single use; create a new explicitly admitted session');
  if(!consent||['experimental','parked','backupReady','overwriteAccepted','ackAmbiguityAccepted'].some(k=>consent[k]!==true))throw Error('Explicit owner experimental/parked/backup/overwrite/ACK-risk confirmations required');
  const s=current();mode=capability(s);if(consent.deviceId!==s.deviceId||consent.generation!==s.generation)throw Error('Consent belongs to another identity/session');if(valid()!==true)throw Error('Owner context unavailable');
  owner=Object.freeze({...s});tx=createTransaction(plan,{deviceId:s.deviceId,generation:s.generation,transferId:consent.transferId},{attemptsPerPacket:1,restarts:1});
  const begin=tx.start(tx.snapshot.context);lease=acquireExclusive();if(!lease||typeof lease.valid!=='function'||typeof lease.release!=='function'||lease.valid()!==true){try{lease?.release?.();}catch{}lease=null;throw Error('Exclusive connection writer lease required');}
  state='starting';done=new Promise(resolve=>doneResolve=resolve);const e=++epoch;notify();if(!live(e))return done;listener=event=>{if(event.target!==owner.characteristic||!live(e))return;const v=event.target.value;if(!(v instanceof DataView))return finish('failed','Notification value is not a DataView');receive(Array.from(new Uint8Array(v.buffer,v.byteOffset,v.byteLength)));};owner.characteristic.addEventListener('characteristicvaluechanged',listener);
  inflight++;Promise.resolve().then(()=>{if(!live(e))return;return owner.characteristic.startNotifications();}).then(()=>{if(live(e))schedule(begin);},()=>{if(live(e))finish('failed','Notification subscription failed');}).finally(settled);return done;
 }
 return Object.freeze({start,cancel:why=>finish('cancelled',why||'Owner cancelled; partial remote state may remain'),invalidate:why=>finish('cancelled',why||'Route/visibility/session invalidated'),snapshot});
}
return {create,capability,SERVICE,CHARACTERISTIC};

});
