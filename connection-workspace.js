/* One chooser per user gesture. Guided pairing never promises seamless auto-pairing. */
"use strict";
const connectionTasks=new Map(),connectionNotes={};
const connectionGuide={open:false,pending:[],index:0,generation:0};
const connectionBox=document.createElement("article");connectionBox.className="card";
connectionBox.innerHTML=`<h3>Connect your three devices</h3><p class="small-note">Each button selects only its own lighting system. Connect All guides one Bluetooth choice at a time; your browser may need a separate tap for each device.</p><div class="row-actions"><button class="primary" id="pairAll" type="button">Connect All</button><button class="secondary" id="pairNext" type="button" hidden>Connect next device</button><button class="text-btn" id="pairSkip" type="button" hidden>Skip this device</button><button class="text-btn" id="pairCancel" type="button" hidden>Cancel setup</button></div><p id="pairProgress" class="inline-status" role="status"></p><p id="pairMemory" class="small-note"></p>`;
ui("deviceList").parentElement.before(connectionBox);
const physicalConnection=a=>a.id==="sp608e"?isLive():a.connected;
function connectionLabel(id){return {sp608e:"SP608E underglow",nokins:"MELK-OF21 NOKINS",trinka:"CoolLEDUX display"}[id];}
function connectionPaint(){
 const current=connectionGuide.pending[connectionGuide.index],busy=current&&connectionTasks.has(current);
 ui("pairNext").hidden=ui("pairSkip").hidden=ui("pairCancel").hidden=!connectionGuide.open||!current;
 ui("pairNext").textContent=busy?"Connecting…":"Connect "+connectionLabel(current);
 ui("pairNext").disabled=!!busy;ui("pairSkip").disabled=!!busy;
 if(!current&&connectionGuide.open){connectionGuide.open=false;ui("pairProgress").textContent=cartDevices.filter(physicalConnection).length+"/3 connected. Each row shows its own result; you can retry any disconnected device.";}
 renderDevices();updateHeader();
}
function connectOne(id,{toggle=true,newDevice=false,knownOnly=false}={}){
 if(connectionTasks.has(id))return connectionTasks.get(id);
 const adapter=cartDevices.find(a=>a.id===id);if(!adapter)return Promise.resolve(false);
 if(physicalConnection(adapter)&&toggle&&!newDevice){adapter.disconnect();connectionNotes[id]="Disconnected. Assignment retained.";connectionPaint();return Promise.resolve(false);}
 if(physicalConnection(adapter)&&!newDevice)return Promise.resolve(true);
 const known=id==="sp608e"?rememberedDevice:id==="trinka"?adapter.device:adapter.ownerLink.device||(adapter.profile&&adapter.profile!=="melk-of21"?adapter.device:null);
 if(knownOnly&&!known)return Promise.resolve(false);
 if(newDevice&&physicalConnection(adapter))adapter.disconnect();
 const task=(async()=>{
  try{
   if(transport==="demo")exitDemo();
   let ok;
   if(id==="sp608e")ok=await connect(newDevice?"name":rememberedDevice?"remembered":"name");
   else if(id==="trinka")ok=await adapter.connect(newDevice);
   else if(knownOnly&&adapter.profile&&adapter.profile!=="melk-of21")ok=await adapter.reconnect();
   else ok=await adapter.connectOwner(newDevice);
   if(!ok||!physicalConnection(adapter))throw Error(id==="sp608e"?lastConnectError||"Connection did not finish.":adapter.lastError||adapter.ownerLink?.error||"Connection did not finish.");
   connectionNotes[id]="Connected"+(id==="trinka"?"; pixel upload remains gated.":id==="nokins"?"; source-derived ordinary controls are available when FFF3 permits writes.":".");
   ui("deviceMessage").textContent=connectionLabel(id)+": "+connectionNotes[id];
   return true;
  }catch(error){connectionNotes[id]=error.name==="NotFoundError"||error.name==="AbortError"?"Pairing cancelled; other devices unchanged.":error.message;ui("deviceMessage").textContent=connectionLabel(id)+": "+connectionNotes[id];return false;}
 })();
 connectionTasks.set(id,task);
 task.finally(()=>{if(connectionTasks.get(id)===task)connectionTasks.delete(id);connectionPaint();}).catch(()=>{});
 connectionPaint();return task;
}
function cancelConnection(id){
 const adapter=cartDevices.find(a=>a.id===id);if(!adapter)return;
 adapter.disconnect();connectionNotes[id]="Cancelled. If the browser chooser is still open, dismiss it; it cannot assign a device after cancellation.";ui("deviceMessage").textContent=connectionLabel(id)+": "+connectionNotes[id];connectionPaint();
}
function guideSetup(startNow){
 go("devices");connectionGuide.generation++;connectionGuide.open=true;connectionGuide.pending=["sp608e","nokins","trinka"].filter(id=>!physicalConnection(cartDevices.find(a=>a.id===id)));connectionGuide.index=0;connectionPaint();
 if(startNow&&connectionGuide.pending.length)return guideNext();
 return Promise.resolve(true);
}
async function guideNext(){
 const id=connectionGuide.pending[connectionGuide.index];if(!connectionGuide.open||!id)return;
 const generation=connectionGuide.generation;ui("pairProgress").textContent="Connecting "+connectionLabel(id)+". Finish or cancel its browser prompt.";
 const ok=await connectOne(id,{toggle:false});
 if(generation!==connectionGuide.generation)return;
 connectionGuide.index++;connectionPaint();
 if(connectionGuide.open)ui("pairProgress").textContent=connectionLabel(id)+": "+(ok?"connected":"not connected")+". Tap the next button for the next device.";
}
async function reconnectRemembered(force=false){
 const known=cartDevices.filter(a=>a.id==="sp608e"?!!rememberedDevice:!!a.device);
 if(!known.length)return guideSetup(true); // chooser still starts in this click's activation
 if(force){cancelPlayback();for(const a of known)a.disconnect();}
 for(const a of known)if(!physicalConnection(a))await connectOne(a.id,{toggle:false,knownOnly:true});
 if(cartDevices.some(a=>!physicalConnection(a))){await guideSetup(false);ui("pairProgress").textContent=cartDevices.filter(physicalConnection).length+"/3 connected. Tap the next button to pair a missing device.";}
 return cartDevices.every(physicalConnection);
}
async function restoreConnections(){
 const snapshots={sp608e:spConnectionAttempt,trinka:cartDevices[1].link.generation,nokins:cartDevices[2].ownerLink.generation};
 cartDevices[2].sceneEnabled=!!preferences.nokinsSceneEnabled;
 const count=cartDevices.filter(a=>SmartEasePairing.assignment(a.id)).length;
 if(typeof navigator.bluetooth?.getDevices!=="function"){ui("pairMemory").textContent=count?"Device assignments are saved. This Bluefy version cannot recover granted devices; tap each Connect button to select them again. Your scenes and settings remain saved.":"Pair each device once. Assignments are remembered; some Bluefy versions still require a Connect tap after reopening.";return;}
 try{
  const devices=await navigator.bluetooth.getDevices();let recovered=0;
  const sp=SmartEasePairing.granted("sp608e",devices);
  if(sp&&snapshots.sp608e===spConnectionAttempt&&!connectionInProgress&&!isLive()&&!rememberedDevice){rememberedDevice=sp;recovered++;}
  const ux=cartDevices[1];if(snapshots.trinka===ux.link.generation&&!ux.connecting&&!ux.connected&&!ux.device&&ux.restoreGranted(devices))recovered++;
  const nokins=cartDevices[2];
  if(snapshots.nokins===nokins.ownerLink.generation&&!nokins.connecting&&!nokins.connected&&!nokins.device&&nokins.ownerLink.restore(devices)){nokins.device=nokins.ownerLink.device;nokins.identity=nokins.ownerLink.identity;nokins.profile="melk-of21";nokins.of21.select(nokins.identity);recovered++;}
  ui("pairMemory").textContent=recovered+" saved device assignment(s) recovered from browser grants. Missing or revoked assignments need an explicit Connect tap; no device is selected by proximity.";
  if(autoReconnectOn&&transport!=="demo")for(const a of cartDevices){
   const generation=a.id==="sp608e"?spConnectionAttempt:a.id==="trinka"?a.link.generation:a.ownerLink.generation;
   const manual=a.id==="nokins"?a.manual:false;
   if(snapshots[a.id]===generation&&!manual&&!physicalConnection(a)&&!a.connecting&&!(a.id==="sp608e"&&connectionInProgress))await connectOne(a.id,{toggle:false,knownOnly:true});
  }
 }catch(error){ui("pairMemory").textContent="Saved assignments remain intact. Bluetooth grants could not be recovered: "+error.message+". Tap Connect for each device.";}
 connectionPaint();
}
window.SmartEaseConnections={connectOne,cancel:cancelConnection,reconnectRemembered,restore:restoreConnections,start:()=>guideSetup(true),notes:connectionNotes};
ui("pairAll").onclick=()=>guideSetup(true);ui("pairNext").onclick=guideNext;
ui("pairSkip").onclick=()=>{connectionGuide.index++;connectionPaint();};
ui("pairCancel").onclick=()=>{const id=connectionGuide.pending[connectionGuide.index];connectionGuide.generation++;connectionGuide.open=false;if(id&&connectionTasks.has(id))cancelConnection(id);connectionPaint();};
ui("connectCart").textContent="Connect All (guided)";ui("connectCart").onclick=()=>guideSetup(true);
ui("disconnectCart").onclick=()=>{cancelPlayback();for(const a of cartDevices)a.disconnect();powered=false;connectionPaint();};
connectionPaint();restoreConnections();
