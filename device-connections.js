/* Exact-family pairing, metadata transport and remembered assignments.
 * Connections do not grant permission to send unvalidated lighting commands. */
(function(root){
 "use strict";
 const key="smartease-device-assignments-v1",service="0000fff0-0000-1000-8000-00805f9b34fb";
 const discoveryProofs=new WeakMap();
 function canonicalUUID(value){
  if(typeof value!=="string")return null;
  const v=value.toLowerCase();
  if(/^[0-9a-f]{4}$/.test(v))return "0000"+v+"-0000-1000-8000-00805f9b34fb";
  if(/^[0-9a-f]{8}$/.test(v))return v+"-0000-1000-8000-00805f9b34fb";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)?v:null;
 }
 function verifyDiscovery(token,ch,deviceId,generation){
  const p=token&&discoveryProofs.get(token);if(!p)return false;
  const l=p.link;return l.connected&&l.device===p.device&&l.device?.id===deviceId&&p.deviceId===deviceId&&l.identity?.id===deviceId&&l.generation===generation&&p.generation===generation&&l.service===p.service&&l.characteristic===ch&&p.characteristic===ch&&canonicalUUID(p.service.uuid)===service&&canonicalUUID(ch?.uuid)===p.expected;
 }
 const labels={sp608e:"SP608E underglow",nokins:"MELK-OF21 NOKINS",trinka:"CoolLEDUX display"};
 const accepts=(id,name)=>id==="sp608e"?/^SP608E(?:$|[\s_-])/i.test(name||""):id==="nokins"?!!SmartEaseOF21.profile(name):id==="trinka"?SmartEaseCoolLEDUX.family(name)==="coolledux":false;
 const options=id=>({filters:(id==="sp608e"?["SP608E","sp608e"]:id==="nokins"?["MELK-OF21","melk-of21"]:["CoolLEDUX","coolledux"]).map(namePrefix=>({namePrefix})),optionalServices:[id==="sp608e"?"0000ffe0-0000-1000-8000-00805f9b34fb":service]});
 const assignments={},diagnostics={};let chooser=null,warning="";
 const build="cart-scenes-20261029-02";
 function describeError(error){
  const name=typeof error?.name==="string"?error.name:"BrowserError",message=typeof error?.message==="string"?error.message:String(error??"Unknown error");
  return name+": "+message.slice(0,600)+(error?.code!==undefined?" [code="+String(error.code).slice(0,80)+"]":"");
 }
 function trace(id,phase,detail="",error){
  const records=diagnostics[id]||(diagnostics[id]=[]);
  records.push({phase,detail:String(detail).slice(0,800),error:error===undefined?null:describeError(error),activation:navigator.userActivation?.isActive??"unavailable"});
  if(records.length>12)records.shift();
  root.dispatchEvent?.(new Event("smartease-pairing-diagnostic"));
 }
 try{const raw=JSON.parse(localStorage.getItem(key)||"{}");for(const id of Object.keys(labels)){const a=raw?.[id];if(a&&typeof a.id==="string"&&a.id&&accepts(id,a.name))assignments[id]={id:a.id,name:a.name};}}catch{}
 async function stage(promise,id,phase,lateCleanup){
  let expired=false,timer;const pending=Promise.resolve(promise);
  pending.then(value=>{if(expired)lateCleanup?.(value);},()=>{});
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;const error=Object.assign(Error(phase+" timed out. Tap Connect to choose again; no chooser was retried."),{name:"TimeoutError"});trace(id,"transport timeout",phase,error);reject(error);},root.SmartEasePairing?.stageTimeoutMs??12000);});
  try{return await Promise.race([pending,timeout]);}finally{clearTimeout(timer);}
 }
 function assignment(id){
  if(assignments[id])return {...assignments[id]};
  try{
   const legacy=id==="sp608e"?localStorage.getItem("smartease-cart-ble-id-v1"):id==="nokins"?localStorage.getItem("smartease-nokins-device-v1"):null;
   if(legacy)return {id:legacy,name:id==="sp608e"?"SP608E":"MELK-OF21",legacy:true};
   if(id==="trinka"){const old=JSON.parse(localStorage.getItem("smartease-experience-v1")||"{}").deviceIdentities?.trinka;if(old?.id&&accepts(id,old.name))return {id:old.id,name:old.name,legacy:true};}
  }catch{}return null;
 }
 function remember(id,picked){
  if(!picked?.id||!accepts(id,picked.name))throw Error("Cannot remember a device from the wrong family.");
  const next={...assignments,[id]:{id:picked.id,name:picked.name}};
  try{localStorage.setItem(key,JSON.stringify(next));Object.assign(assignments,next);warning="";return true;}
  catch{warning="Connected, but this browser could not save the device assignment. Back up your setup and check storage.";return false;}
 }
 async function choose(id){
  if(!navigator.bluetooth?.requestDevice){const error=Error("Open this HTTPS app in Bluefy and allow Bluetooth access.");trace(id,"chooser unavailable","requestDevice is missing",error);throw error;}
  if(chooser){const error=Error("Finish the "+labels[chooser]+" Bluetooth chooser first.");trace(id,"chooser busy","Another device's chooser is pending",error);throw error;}
  chooser=id;
  try{
   trace(id,"chooser requested","Family name-prefix filters; required GATT service granted. No prior async wait.");
   // Call in the original tap's synchronous stack. Never await grant recovery here.
   const pending=navigator.bluetooth.requestDevice(options(id));
   const picked=await pending;
   if(!accepts(id,picked?.name))throw Error("Choose only "+labels[id]+". The selected device belongs to another family.");
   trace(id,"chooser selected","Selected device passed exact-family validation");return picked;
  }catch(error){trace(id,"chooser rejected","No device assignment changed",error);throw error;}
  finally{chooser=null;}
 }
 function granted(id,devices){
  const saved=assignment(id);if(!saved)return null;
  const picked=devices.find(d=>d.id===saved.id);
  if(!picked||!accepts(id,picked.name))return null;
  return picked;
 }
 const method=ch=>ch?.properties?.writeWithoutResponse&&typeof ch.writeValueWithoutResponse==="function"?"writeValueWithoutResponse":ch?.properties?.write&&typeof ch.writeValueWithResponse==="function"?"writeValueWithResponse":ch?.properties?.write&&typeof ch.writeValue==="function"?"writeValue":null;
 class MetadataTransport{
  constructor(id){this.id=id;this.device=null;this.identity=null;this.service=null;this.characteristic=null;this.connecting=false;this.error="";this.report=null;this.generation=0;this.active=null;this.task=null;this.listeners=new WeakSet();this.owners=new WeakMap();this.notificationListeners=new WeakSet();this.onNotification=null;}
  get connected(){return !!this.device?.gatt?.connected&&!!this.service;}
  emit(){if(typeof window.updateCartDeviceUI==="function")window.updateCartDeviceUI();}
  discoveryProof(){const token=this.discoveryToken;return verifyDiscovery(token,this.characteristic,this.device?.id,this.generation)?token:null;}
  restore(devices){const picked=granted(this.id,devices);if(picked){this.device=picked;this.identity={id:picked.id,name:picked.name,remembered:true};return true;}return false;}
  connect(pickNew=false){
   if(this.task)return this.task;if(this.connected&&!pickNew)return Promise.resolve(true);
   const attempt=++this.generation;this.active=attempt;this.connecting=true;this.error="";this.emit();
   const task=this.runConnect(attempt,pickNew);this.task=task;
   task.finally(()=>{if(this.task===task){this.task=null;this.connecting=false;this.active=null;this.emit();}}).catch(()=>{});return task;
  }
  async runConnect(attempt,pickNew){
   let picked;
   const check=()=>{if(this.active!==attempt||this.generation!==attempt)throw Object.assign(Error("Connection cancelled."),{name:"AbortError"});};
   try{
    picked=!pickNew&&this.device?this.device:await choose(this.id);check();
    if(!accepts(this.id,picked.name))throw Error("Saved device is not "+labels[this.id]+". Choose the correct device again.");
    if(!picked.gatt?.connect)throw Error("This browser did not expose a Bluetooth GATT connection.");
    const old=this.device;
    if(old&&old!==picked&&old.gatt?.connected)old.gatt.disconnect();
    this.device=picked;this.identity={id:picked.id,name:picked.name};this.owners.set(picked,attempt);
    trace(this.id,"GATT connecting","Selected family validated; connecting transport");
    const lateCleanup=()=>{if(this.owners.get(picked)===attempt&&this.active!==attempt)try{picked.gatt.disconnect();}catch{}};
    const server=await stage(picked.gatt.connect(),this.id,"GATT connection",lateCleanup);check();
    trace(this.id,"service discovery","Discovering FFF0 and characteristic permissions");
    const found=await stage(server.getPrimaryService(service),this.id,"FFF0 discovery");check();
    if(canonicalUUID(found?.uuid)!==service)throw Error("FFF0 discovery returned a missing, malformed or different service UUID.");
    const expected=this.id==="trinka"?"0000fff1-0000-1000-8000-00805f9b34fb":"0000fff3-0000-1000-8000-00805f9b34fb";
    const chars=typeof found.getCharacteristics==="function"?await stage(found.getCharacteristics(),this.id,"characteristic discovery"):[await stage(found.getCharacteristic(expected),this.id,"characteristic discovery")];check();
    if(chars.length>32)throw Error("Unexpectedly large characteristic list; transport was not accepted.");
    const target=chars.find(ch=>canonicalUUID(ch.uuid)===expected)||null;
    if(target&&target.service!=null&&canonicalUUID(target.service.uuid)!==service)throw Error("Selected characteristic belongs to a different or invalid service; FFF0 required.");
    const notifications=chars.filter(ch=>ch.properties?.notify||ch.properties?.indicate);
    const subscriptions=[];
    // OF21's app discovers notify/indicate properties under FFF0, not FFF4.
    if(this.id==="nokins")for(const ch of notifications){
     if(typeof ch.startNotifications!=="function")continue;
     if(!this.notificationListeners.has(ch)&&typeof ch.addEventListener==="function"){
      ch.addEventListener("characteristicvaluechanged",event=>{
       if(this.device!==picked||!this.connected)return;
       const value=event.target.value;if(!value||value.byteLength>1024)return;
       if(typeof this.onNotification==="function")this.onNotification(Array.from(new Uint8Array(value.buffer,value.byteOffset,value.byteLength)));
      });this.notificationListeners.add(ch);
     }
     try{await stage(ch.startNotifications(),this.id,"notification subscription");check();subscriptions.push(String(ch.uuid||"unknown"));}catch(error){check();subscriptions.push("Unavailable: "+String(ch.uuid||"unknown"));}
    }
    check();this.service=found;this.characteristic=target;
    this.discoveryToken=Object.freeze({});discoveryProofs.set(this.discoveryToken,{link:this,device:picked,deviceId:picked.id,generation:attempt,service:found,characteristic:target,expected});
    this.report={name:picked.name,service,expectedCharacteristic:expected,writeMethod:method(target),controlsEnabled:false,
     characteristics:chars.map(ch=>({uuid:typeof ch.uuid==="string"?ch.uuid:"[missing or non-string UUID]",write:!!ch.properties?.write,writeWithoutResponse:!!ch.properties?.writeWithoutResponse,notify:!!ch.properties?.notify,indicate:!!ch.properties?.indicate})),subscriptions};
    if(!this.listeners.has(picked)){
     picked.addEventListener?.("gattserverdisconnected",()=>{if(this.device!==picked)return;this.generation++;this.service=null;this.characteristic=null;this.error="Bluetooth disconnected. Tap Connect to reconnect this device.";this.emit();});this.listeners.add(picked);
    }
    remember(this.id,picked);this.error=warning||(!target?"Connected, but "+expected+" was not discovered. Inspect Bluetooth metadata; controls remain disabled.":!method(target)?"Connected, but the selected characteristic has no supported write property/method. Controls remain disabled.":"");trace(this.id,"connected",this.error||"Transport connected; control/upload readiness is separate");this.emit();return true;
   }catch(error){
    if(this.active===attempt)trace(this.id,"connection failed","No automatic chooser retry",error);
    if(this.active===attempt){this.error=describeError(error);this.service=null;this.characteristic=null;}
    // Never close a newer attempt's connection to the same device object.
    if(picked?.gatt?.connected&&this.owners.get(picked)===attempt)try{picked.gatt.disconnect();}catch{}
    this.emit();throw error;
   }
  }
  disconnect(){this.generation++;this.active=null;this.task=null;this.connecting=false;this.service=null;this.characteristic=null;this.error="Disconnected. Saved assignment retained.";try{this.device?.gatt?.disconnect();}catch{}this.emit();}
 }
 root.SmartEasePairing={canonicalUUID,verifyDiscovery,accepts,options,choose,assignment,remember,granted,MetadataTransport,trace,diagnostics,describeError,build,stage,stageTimeoutMs:12000,get warning(){return warning;}};
 if(typeof module==="object"&&module.exports)module.exports=root.SmartEasePairing;
})(globalThis);
