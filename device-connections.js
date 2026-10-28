/* Exact-family pairing, metadata transport and remembered assignments.
 * Connections do not grant permission to send unvalidated lighting commands. */
(function(root){
 "use strict";
 const key="smartease-device-assignments-v1",service="0000fff0-0000-1000-8000-00805f9b34fb";
 const labels={sp608e:"SP608E underglow",nokins:"MELK-OF21 NOKINS",trinka:"CoolLEDUX display"};
 const accepts=(id,name)=>id==="sp608e"?/^SP608E(?:$|[\s_-])/i.test(name||""):id==="nokins"?!!SmartEaseOF21.profile(name):id==="trinka"?SmartEaseCoolLEDUX.family(name)==="coolledux":false;
 const options=id=>({filters:(id==="sp608e"?["SP608E","sp608e"]:id==="nokins"?["MELK-OF21","melk-of21"]:["CoolLEDUX","coolledux"]).map(namePrefix=>({namePrefix})),optionalServices:[id==="sp608e"?"0000ffe0-0000-1000-8000-00805f9b34fb":service]});
 const assignments={};let chooser=null,warning="";
 try{const raw=JSON.parse(localStorage.getItem(key)||"{}");for(const id of Object.keys(labels)){const a=raw?.[id];if(a&&typeof a.id==="string"&&a.id&&accepts(id,a.name))assignments[id]={id:a.id,name:a.name};}}catch{}
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
  if(!navigator.bluetooth?.requestDevice)throw Error("Open this HTTPS app in Bluefy and allow Bluetooth access.");
  if(chooser)throw Error("Finish the "+labels[chooser]+" Bluetooth chooser first.");
  chooser=id;
  try{const picked=await navigator.bluetooth.requestDevice(options(id));if(!accepts(id,picked?.name))throw Error("Choose only "+labels[id]+". The selected device belongs to another family.");return picked;}
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
    const server=await picked.gatt.connect();check();
    const found=await server.getPrimaryService(service);check();
    const expected=this.id==="trinka"?"0000fff1-0000-1000-8000-00805f9b34fb":"0000fff3-0000-1000-8000-00805f9b34fb";
    const chars=typeof found.getCharacteristics==="function"?await found.getCharacteristics():[await found.getCharacteristic(expected)];check();
    if(chars.length>32)throw Error("Unexpectedly large characteristic list; transport was not accepted.");
    const target=chars.find(ch=>String(ch.uuid||expected).toLowerCase()===expected)||null;
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
     try{await ch.startNotifications();check();subscriptions.push(String(ch.uuid||"unknown"));}catch(error){check();subscriptions.push("Unavailable: "+String(ch.uuid||"unknown"));}
    }
    check();this.service=found;this.characteristic=target;
    this.report={name:picked.name,service,expectedCharacteristic:expected,writeMethod:method(target),controlsEnabled:false,
     characteristics:chars.map(ch=>({uuid:String(ch.uuid||expected),write:!!ch.properties?.write,writeWithoutResponse:!!ch.properties?.writeWithoutResponse,notify:!!ch.properties?.notify,indicate:!!ch.properties?.indicate})),subscriptions};
    if(!this.listeners.has(picked)){
     picked.addEventListener?.("gattserverdisconnected",()=>{if(this.device!==picked)return;this.generation++;this.service=null;this.characteristic=null;this.error="Bluetooth disconnected. Tap Connect to reconnect this device.";this.emit();});this.listeners.add(picked);
    }
    remember(this.id,picked);this.error=warning;this.emit();return true;
   }catch(error){
    if(this.active===attempt){this.error=error.name==="NotFoundError"||error.name==="AbortError"?"Connection cancelled. Your other devices are unchanged.":error.message;this.service=null;this.characteristic=null;}
    // Never close a newer attempt's connection to the same device object.
    if(picked?.gatt?.connected&&this.owners.get(picked)===attempt)try{picked.gatt.disconnect();}catch{}
    this.emit();throw error;
   }
  }
  disconnect(){this.generation++;this.active=null;this.task=null;this.connecting=false;this.service=null;this.characteristic=null;this.error="Disconnected. Saved assignment retained.";try{this.device?.gatt?.disconnect();}catch{}this.emit();}
 }
 root.SmartEasePairing={accepts,options,choose,assignment,remember,granted,MetadataTransport,get warning(){return warning;}};
})(globalThis);
