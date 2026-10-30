/* Independent OF21 workflows. Source-derived; physical acceptance outstanding.
 * Local library and requested settings are never applied during load/restore. */
"use strict";
const of21Native=document.createElement("div"),of21LocalKey="smartease-of21-native-v1";
let of21Local={version:1,scenes:[],requested:{}},of21NativeSelection=null,of21LocalLoadError="";
/* Reconstructed bounded Native metadata validators after workspace loss.
 * Optional fields are validated without migration, trimming or metadata rewriting. */
function of21ValidateDeviceMetadata(value,label,accept){
 if(value===undefined)return;
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 if(!object(value)||value.version!==1||!object(value.devices))throw Error('Invalid '+label+' metadata.');
 const entries=Object.entries(value.devices);
 if(entries.length>32)throw Error(label+' supports at most 32 granted devices.');
 for(const [id,entry]of entries){
  if(!id.length||id.length>256||['__proto__','constructor','prototype'].includes(id)||!accept(entry))throw Error('Invalid '+label+' device entry.');
 }
}
function of21ValidateDeviceAliases(value){of21ValidateDeviceMetadata(value,'device aliases',entry=>typeof entry==='string'&&entry.length<=256);}
function of21ValidateMenuStyles(value){of21ValidateDeviceMetadata(value,'menu styles',entry=>Number.isInteger(entry)&&entry>=0&&entry<=2);}
function of21ValidateModeStyles(value){of21ValidateDeviceMetadata(value,'mode styles',entry=>Number.isInteger(entry)&&entry>=0&&entry<=2);}
function of21ValidateDeviceIcons(value){
 const keys=new Set((window.SmartEaseNativeIconData||[]).map(record=>record.key));
 of21ValidateDeviceMetadata(value,'device icons',entry=>typeof entry==='string'&&keys.has(entry));
}
function of21ValidateColorPalettes(value){of21ValidateDeviceMetadata(value,'color palettes',entry=>Array.isArray(entry)&&entry.length===4&&Array.from(entry).every(color=>color===null||(typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color))));}
function of21ValidateNativeMetadata(value){of21ValidateSceneScopes(value);of21ValidateDeviceAliases(value.deviceAliases);of21ValidateMenuStyles(value.menuStyles);of21ValidateModeStyles(value.modeStyles);of21ValidateDeviceIcons(value.deviceIcons);of21ValidateColorPalettes(value.colorPalettes);}
try{
 const raw=localStorage.getItem(of21LocalKey);if(raw){
  if(raw.length>131072)throw Error("Local pattern storage is too large.");const saved=JSON.parse(raw);
  if(saved?.version!==1||!Array.isArray(saved.scenes)||saved.scenes.length>32||!saved.requested||typeof saved.requested!=="object"||Array.isArray(saved.requested))throw Error("Invalid local pattern library.");
  for(const s of saved.scenes){if(!s||typeof s.name!=="string"||!s.name.trim()||s.name.length>70)throw Error("Invalid saved pattern name.");SmartEaseOF21.diy(s.project);}
  of21ValidateNativeMetadata(saved);of21Local=saved;
 }
}catch{of21LocalLoadError="Saved pattern data could not be loaded. The original storage was preserved; export a full backup before saving new patterns.";}
of21Native.innerHTML=`<hr><h4>Timers & controller setup</h4>
 <p class="small-note">These controls use the OF21 source protocol. Apply changes while parked, then check the controller. Saved requests are local history; returned values are partial device readback. Neither proves power-cycle retention.</p>
 <div class="row-actions"><button class="secondary" data-native-of="read-timers">Read both timers</button><button class="secondary" data-native-of="clock">Sync local clock now</button></div>
 <p id="of21TimerReturned" class="small-note">Both timer slots are unknown.</p>
 <div class="display-settings"><label>Timer slot<select class="input" id="of21TimerKind"><option value="0">Turn on</option><option value="1">Turn off</option></select></label><label>Time<input class="input" id="of21TimerTime" type="time" value="07:30"></label></div>
 <label class="switchline"><input id="of21TimerEnabled" type="checkbox" checked>Timer enabled</label>
 <fieldset><legend>Repeat days (none = once)</legend>${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d,i)=>`<label><input class="of21-day" type="checkbox" value="${i}">${d} </label>`).join("")}</fieldset>
 <div class="row-actions"><button class="secondary" data-native-of="load-timer">Copy returned slot to editor</button><button class="primary" data-native-of="timer">Apply timer pair, preserve other slot</button></div>
 <div class="display-settings"><label>RGB wire order<select class="input" id="of21Order"><option value="">Choose an order</option>${["RGB","RBG","GRB","GBR","BRG","BGR"].map(o=>`<option>${o}</option>`).join("")}</select></label><button class="secondary" data-native-of="order">Apply wire order</button></div>
 <div class="display-settings"><label>Total LED count (10–1000)<input class="input" id="of21Count" type="number" min="10" max="1000" step="1" placeholder="Enter intended total"></label><button class="secondary" data-native-of="count">Apply LED count & read back</button></div>
 <p class="small-note">Changing LED count changes strip topology. The range is accepted by the native app; controller capacity is not independently measured.</p>
 <label class="switchline"><input id="of21Topology" type="checkbox">I intend to change this controller's wiring, LED count or collapse setting.</label>
 <label class="switchline"><input id="of21Collapse" type="checkbox">Collapse enabled</label><button class="secondary" data-native-of="collapse">Apply collapse setting</button>
 <label>Mic sensitivity (%)<input class="input" id="of21Sensitivity" type="number" min="0" max="100" value="50"></label><button class="secondary" data-native-of="sensitivity">Apply mic sensitivity</button>
 <p class="small-note" id="of21Requested"></p>
 <hr><h4>My OF21 patterns</h4><p class="small-note">Save patterns in this browser, preview them here, then explicitly send to this controller. Replay uploads the pattern again. Delete only removes the local copy. There is no proven firmware save slot or upload acknowledgement.</p>
 <div class="display-settings"><label>Pattern name<input class="input" id="of21DiyName" maxlength="70" value="My cart pattern"></label><label>Pattern length (10–30)<input class="input" id="of21DiyNodes" type="number" min="10" max="30" value="10"></label>
 <label>Mode<select class="input" id="of21DiyMode">${["Static","Breathing","Strobe","Forward flow","Reverse flow","Inward flow","Outward flow"].map((s,i)=>`<option value="${i}">${s}</option>`).join("")}</select></label>
 <label>Gradient<select class="input" id="of21DiyGradient"><option value="0">0</option><option value="1">1</option><option value="2">2 (direction unverified)</option></select></label>
 <label>Speed (%)<input class="input" id="of21DiySpeed" type="number" min="0" max="100" value="50"></label><label>Brightness (%; blank preserves node RGB)<input class="input" id="of21DiyBrightness" type="number" min="1" max="100" value="100" placeholder="Preserve per-node RGB"></label>
 <label>Total nodes for offline preview<input class="input" id="of21DiyTotal" type="number" min="10" max="1000" value="10"></label></div>
 <button class="secondary" data-native-of="use-geometry">Use returned LED count</button>
 <label class="field-label" for="of21DiyColors">Colors (#RRGGBB, spaces or new lines). Static: one per pattern node. Dynamic: 2–8 palette colors.</label>
 <textarea class="input" id="of21DiyColors" rows="4">${Array.from({length:10},(_,i)=>i%2?"#0000ff":"#ff0000").join(" ")}</textarea>
 <button class="secondary" data-native-of="repeat-colors">Repeat colors to static pattern length</button>
 <label>Preview phase<input id="of21DiyPhase" type="range" min="0" max="100" value="0"></label>
 <div id="of21DiyPreview" role="img" aria-label="Offline pattern color preview" style="display:flex;min-height:28px;margin:12px 0"></div><p id="of21DiyPlan" class="small-note"></p>
 <p class="small-note">Dynamic preview illustrates motion and color; native visual equivalence and gradient direction need a physical check. A blank brightness preserves raw per-node RGB. Numeric brightness replaces HSV value while preserving hue and saturation; black becomes gray when value is raised.</p>
 <div class="row-actions"><button class="secondary" data-native-of="save">Save local pattern</button><button class="secondary" data-native-of="export">Export local patterns</button><button class="secondary" data-native-of="compile">Export offline packets</button></div>
 <label>Saved pattern<select class="input" id="of21DiySaved"></select></label><div class="row-actions"><button class="secondary" data-native-of="load">Load local pattern</button><button class="secondary" data-native-of="delete">Delete local pattern</button></div>
 <label class="switchline"><input id="of21BulkConsent" type="checkbox">Send this pattern now. No device ACK or automatic retry; cancellation can leave a partial pattern.</label>
 <button class="primary" data-native-of="upload">Send pattern to selected OF21</button>
 <button class="secondary" id="of21CancelNative">Cancel OF21 operation</button><p id="of21NativeResult" class="inline-status" role="status">Local edits never send commands.</p>`;
of21Workspace.append(of21Native);
function of21NativeSave(){if(of21LocalLoadError){ui("of21NativeResult").textContent="Unreadable local pattern storage was preserved. Export a full Settings backup and repair that library before saving.";return false;}try{localStorage.setItem(of21LocalKey,JSON.stringify(of21Local));return true;}catch{ui("of21NativeResult").textContent="This browser could not save local changes. Export a backup before closing.";return false;}}
function of21Draft(){
 const number=id=>{const text=ui(id).value;if(!text.trim())throw Error("Fill every numeric pattern field.");return Number(text);};
 return {nodeCount:number("of21DiyNodes"),totalNodes:number("of21DiyTotal"),mode:number("of21DiyMode"),gradient:number("of21DiyGradient"),speed:number("of21DiySpeed"),...(ui("of21DiyBrightness").value.trim()?{brightness:number("of21DiyBrightness")}:{}),colors:ui("of21DiyColors").value.trim().split(/[\s,]+/)};
}
function of21NativePreview(){
 const preview=ui("of21DiyPreview");preview.replaceChildren();
 try{
  const draft=of21Draft(),plan=SmartEaseOF21.diy(draft),phase=Number(ui("of21DiyPhase").value)/100;
  const colors=draft.colors.map(c=>draft.brightness===undefined?c:SmartEaseOF21.hsvValue(c,draft.brightness)),step=Math.floor(phase*draft.nodeCount);
  for(let i=0;i<Math.min(draft.totalNodes,90);i++){
   let offset=i;if(draft.mode===3)offset=i+step;if(draft.mode===4)offset=i-step;if(draft.mode===5||draft.mode===6)offset=Math.abs(i%draft.nodeCount-draft.nodeCount/2)+(draft.mode===5?step:-step);
   const cell=document.createElement("span");cell.style.flex="1";cell.style.background=colors[((Math.floor(offset)%colors.length)+colors.length)%colors.length];
   cell.style.opacity=String(draft.mode===1?0.2+0.8*(1+Math.cos(phase*Math.PI*2))/2:draft.mode===2?(phase<0.5?1:0):1);preview.append(cell);
  }
  ui("of21DiyPlan").textContent=`Offline preview: ${draft.totalNodes} total nodes; ${plan.sectionCount} repeated sections; ${plan.encodedColorCount} colors. No command sent.`;
 }catch(error){ui("of21DiyPlan").textContent=error.message;}
}
function of21NativeRender(){
 const a=cartDevices[2],current=!!a.connected&&a.profile==="melk-of21",generation=a.ownerLink.generation;
 const selection=JSON.stringify([a.identity?.id||null,generation,current]);
 if(selection!==of21NativeSelection){of21NativeSelection=selection;ui("of21Topology").checked=false;ui("of21BulkConsent").checked=false;}
 const timers=a.of21.timers||{};ui("of21TimerReturned").textContent=[0,1].map(kind=>{const t=timers[kind];return (kind?"OFF: ":"ON: ")+(current&&t?.generation===generation?`${String(t.hour).padStart(2,"0")}:${String(t.minute).padStart(2,"0")}, ${t.enabled?"enabled":"disabled"}, ${t.days===0?"once":t.days===127?"daily":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].filter((_,i)=>t.days&(1<<i)).join(" ")} (returned)`:"unknown on this connection");}).join(" · ");
 const requested=of21Local.requested[a.identity?.id];ui("of21Requested").textContent=requested?"Local last requests (not readback): "+Object.entries(requested).map(([k,v])=>k+" "+(typeof v==="object"?JSON.stringify(v):v)).join("; "):"No local configuration request saved for this device.";
 for(const button of of21Native.querySelectorAll("[data-native-of]")){
  const local=["save","load","delete","export","compile","use-geometry","repeat-colors"].includes(button.dataset.nativeOf);
  button.disabled=of21Busy||(!local&&(!current||!a.controlReady||!ui("of21Parked").checked||document.visibilityState!=="visible"));
 }
 ui("of21CancelNative").disabled=!of21Busy;
}
function of21LibraryRender(){const select=ui("of21DiySaved"),previous=select.value;select.replaceChildren();of21Local.scenes.forEach((s,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=typeof s.name==="string"?s.name:"Saved pattern";select.append(o);});select.value=previous||"0";}
function of21Download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function of21NativeRun(kind){
 const a=cartDevices[2],result=ui("of21NativeResult"),generation=a.ownerLink.generation,picked=a.device,epoch=a.ownerEpoch||0,selectedId=a.identity?.id;
 const guard=()=>a.profile==="melk-of21"&&a.controlReady&&a.ownerLink.generation===generation&&a.device===picked&&(a.ownerEpoch||0)===epoch&&ui("of21Parked").checked&&document.visibilityState==="visible";
 if(of21Busy)return false;
 const local=["save","load","delete","export","compile","use-geometry","repeat-colors"].includes(kind);
 if(!local&&!guard())return false;
 of21Busy=true;of21Render();of21NativeRender();
 let requested=null,ok=true;
 try{
  if(kind==="save"){
   const project=of21Draft();SmartEaseOF21.diy(project);const name=ui("of21DiyName").value.trim();if(!name||name.length>70)throw Error("Name the pattern (1–70 characters).");
   if(of21Local.scenes.length>=32)throw Error("Local library is full (32 patterns). Export or delete a pattern first.");
   of21Local.scenes.push({name,project});if(!of21NativeSave()){of21Local.scenes.pop();return false;}of21LibraryRender();result.textContent="Pattern saved locally. No device command sent.";
  }else if(kind==="load"){
   const saved=of21Local.scenes[Number(ui("of21DiySaved").value)];if(!saved)throw Error("Select a saved pattern.");SmartEaseOF21.diy(saved.project);
   for(const [key,id] of Object.entries({nodeCount:"Nodes",totalNodes:"Total",mode:"Mode",gradient:"Gradient",speed:"Speed",brightness:"Brightness"}))ui("of21Diy"+id).value=key==="brightness"?(saved.project.brightness===undefined?"":saved.project.brightness):(saved.project[key]??100);
   ui("of21DiyColors").value=saved.project.colors.join(" ");ui("of21DiyName").value=saved.name;result.textContent="Local pattern loaded; nothing sent.";
  }else if(kind==="delete"){
   const index=Number(ui("of21DiySaved").value);if(!of21Local.scenes[index])throw Error("Select a saved pattern.");const old=of21Local.scenes.slice();of21Local.scenes.splice(index,1);if(!of21NativeSave()){of21Local.scenes=old;return false;}of21LibraryRender();result.textContent="Local pattern deleted. Controller unchanged.";
  }else if(kind==="export")of21Download(of21Local,"smartease-of21-local-backup.json");
  else if(kind==="compile")of21Download(SmartEaseOF21.diy(of21Draft()),"smartease-of21-offline-pattern.json");
  else if(kind==="repeat-colors"){
   const draft=of21Draft();if(!Number.isInteger(draft.nodeCount)||draft.nodeCount<10||draft.nodeCount>30||!draft.colors.length||draft.colors.length>30||!draft.colors.every(c=>/^#[\da-f]{6}$/i.test(c)))throw Error("Use valid colors and a pattern length of 10–30.");
   ui("of21DiyColors").value=Array.from({length:draft.nodeCount},(_,i)=>draft.colors[i%draft.colors.length]).join(" ");result.textContent="Colors repeated locally; nothing sent.";
  }else if(kind==="use-geometry"){
   if(!a.connected||a.of21.geometryGeneration!==a.ownerLink.generation||!a.of21.totalNodes)throw Error("Read the LED count on this connection first.");ui("of21DiyTotal").value=a.of21.totalNodes;result.textContent="Returned count copied to the offline editor. Nothing sent.";
  }else if(kind==="read-timers"){
   ok=await a.ownerReadTimers(guard);result.textContent=ok?"Both timer slots returned. This confirms current configuration only.":"Could not read both timer slots. Apply stays blocked; no guessed slot will be written.";
  }else if(kind==="load-timer"){
   const t=a.of21.timers?.[Number(ui("of21TimerKind").value)];if(t?.generation!==a.ownerLink.generation)throw Error("Read this timer slot first.");
   ui("of21TimerTime").value=`${String(t.hour).padStart(2,"0")}:${String(t.minute).padStart(2,"0")}`;ui("of21TimerEnabled").checked=t.enabled;of21Native.querySelectorAll(".of21-day").forEach(c=>{c.checked=!!(t.days&(1<<Number(c.value)));});result.textContent="Returned slot copied. Apply is a separate action.";
  }else if(kind==="timer"){
   const time=ui("of21TimerTime").value;if(!/^\d{2}:\d{2}$/.test(time))throw Error("Choose a valid timer time.");const [hour,minute]=time.split(":").map(Number);
   const timer={kind:Number(ui("of21TimerKind").value),hour,minute,days:[...of21Native.querySelectorAll(".of21-day:checked")].reduce((v,c)=>v|(1<<Number(c.value)),0),enabled:ui("of21TimerEnabled").checked};
   const pair=[0,1].map(kind=>kind===timer.kind?timer:a.of21.timers?.[kind]);
   ok=await a.ownerWriteTimers(timer,guard);requested={timers:pair.map(t=>({kind:t.kind,hour:t.hour,minute:t.minute,days:t.days,enabled:t.enabled}))};
   if(ok){const returned=await a.ownerReadTimers(guard),matches=returned&&pair.every(t=>["kind","hour","minute","days","enabled"].every(k=>a.of21.timers[t.kind][k]===t[k]));result.textContent=matches?"Both returned timer slots match the submitted pair. Firing and retention still need a physical test.":returned?"Returned timer slots differ from the submitted pair. Check both values before applying again.":"Timer pair submitted; readback incomplete. Device acceptance is unconfirmed.";}
  }else if(kind==="upload"){
   if(!ui("of21BulkConsent").checked)throw Error("Acknowledge this upload before sending.");ok=await a.ownerUploadDIY(of21Draft(),guard);ui("of21BulkConsent").checked=false;
   result.textContent=ok?"Pattern packets submitted once. No device ACK; check the actual lights. Power-cycle retention is unverified.":"Transfer stopped; controller may hold a partial pattern. No retry was sent.";
  }else{
   let command,value;
   if(["order","count","collapse"].includes(kind)&&!ui("of21Topology").checked)throw Error("Explicitly acknowledge this controller configuration change first.");
   if(kind==="order"){command="wire-order";value=ui("of21Order").value;}
   else if(kind==="count"){command="point-count";value=Number(ui("of21Count").value);if(!ui("of21Count").value.trim())throw Error("Enter the total LED count.");}
   else if(kind==="collapse"){command="collapse";value=ui("of21Collapse").checked;}
   else if(kind==="sensitivity"){command="sensitivity";if(!ui("of21Sensitivity").value.trim())throw Error("Enter sensitivity.");value=Number(ui("of21Sensitivity").value);}
   else if(kind==="clock"){command="clock";const d=new Date();value={hour:d.getHours(),minute:d.getMinutes(),second:d.getSeconds(),weekday:d.getDay()};}
   else throw Error("Unknown OF21 action.");
   ok=await a.ownerCommand(command,value,undefined,guard);requested={[command]:value};result.textContent="Request submitted; no state acknowledgement or retention guarantee.";
   if(kind==="count"&&ok){a.of21.totalNodes=null;a.of21.geometryGeneration=null;for(let retry=0;retry<3&&guard()&&!a.of21.totalNodes;retry++){if(!await a.ownerCommand("geometry-query",undefined,undefined,guard))break;await sleep(200);}result.textContent=a.of21.totalNodes===value?"Requested LED count matches returned count. Retention is unverified.":a.of21.totalNodes?"Returned count differs from request: "+a.of21.totalNodes:"LED-count request submitted; readback missing. Upload stays blocked.";}
  }
  if(requested&&ok&&selectedId){of21Local.requested[selectedId]={...(of21Local.requested[selectedId]||{}),...requested};of21NativeSave();}
  if(!ok&&kind!=="read-timers"&&kind!=="upload")result.textContent="Operation stopped or failed; check the connection. No automatic retry.";
  return !!ok;
 }catch(error){result.textContent=error.message;return false;}finally{of21Busy=false;of21NativePreview();of21NativeRender();of21Render();}
}
of21Native.addEventListener("click",event=>{if(event.target.dataset.nativeOf)of21NativeRun(event.target.dataset.nativeOf);});
of21Native.addEventListener("input",of21NativePreview);
ui("of21CancelNative").onclick=()=>{cartDevices[2].cancelOwner();ui("of21NativeResult").textContent="Cancellation requested. An in-flight command cannot be recalled; partial changes may remain. Reconnect if its outcome is uncertain.";};
ui("of21Parked").addEventListener("change",()=>{if(!ui("of21Parked").checked){cartDevices[2].cancelOwner();ui("of21Topology").checked=false;ui("of21BulkConsent").checked=false;}of21NativeRender();});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){cartDevices[2].cancelOwner();ui("of21Topology").checked=false;ui("of21BulkConsent").checked=false;}of21NativeRender();});
new MutationObserver(of21NativeRender).observe(ui("nativeLotusInfo"),{childList:true});of21LibraryRender();of21NativePreview();of21NativeRender();
window.addEventListener("smartease-of21-state",of21NativeRender);
if(of21LocalLoadError)ui("of21NativeResult").textContent=of21LocalLoadError;
