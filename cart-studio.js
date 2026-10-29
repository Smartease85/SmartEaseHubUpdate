/* Original SmartEase authoring workflow. Drafts and scene snapshots are local;
 * only explicit Apply uses the existing guarded, per-device transport queues. */
"use strict";
const studio=document.createElement("article");studio.className="card";studio.id="cartStudio";
studio.innerHTML=`<div class="card-top"><div><div class="overline">Whole-cart scene builder</div><h2>Three devices. One saved build.</h2></div></div>
<p>Edit each device while disconnected, preview your work, then save the complete build below. Saving never sends commands. Each scene keeps its own display project and lighting settings.</p>
<div class="row-actions" id="studioTabs"><button class="secondary" data-studio="sp608e">Edit SP608E</button><button class="secondary" data-studio="nokins">Edit NOKINS</button><button class="secondary" data-studio="trinka">Edit Devil Eyes</button></div>
<section id="studioSP"><h3>SP608E underglow</h3><label class="switchline"><input id="studioSPInclude" type="checkbox" checked>Include SP608E in this scene</label>
<label>Lighting source<select class="input" id="studioSPMode"><option value="zones">Mapped cart zones below</option><option value="outputs">My individual output settings</option></select></label>
<p class="small-note">Mapped zones use your existing cart map. Individual output settings preserve each output's own draft. Both use your current per-strip color correction.</p>
<div class="display-settings"><label>Output<select class="input" id="studioPort">${Array.from({length:8},(_,i)=>`<option value="${i+1}">Output ${i+1}</option>`).join("")}</select></label><label class="switchline"><input type="checkbox" id="studioPortInclude">Include this decorative output</label><label class="switchline"><input type="checkbox" id="studioPortOn">Power on</label>
<label>Factory effect<select class="input" id="studioPortEffect">${effects.map(f=>`<option value="${f.id}">${f.name}</option>`).join("")}</select></label><label>Color<input id="studioPortColor" type="color"></label><label>Brightness (%)<input id="studioPortBrightness" class="input" type="number" min="0" max="100"></label><label>Speed<input id="studioPortSpeed" class="input" type="number" min="1" max="10"></label><label>LED length<input id="studioPortLength" class="input" type="number" min="1" max="240"></label><label>Direction<select id="studioPortDirection" class="input"><option value="1">Forward</option><option value="0">Reverse</option></select></label><label>Music sensitivity<input id="studioPortGain" class="input" type="number" min="1" max="16"></label></div>
<p id="studioPortPreview" class="small-note"></p><button class="primary" id="studioApplySP">Apply SP608E only</button><details><summary>More SP608E native controls</summary><div id="studioSPAdvanced"></div></details></section>
<section id="studioNokins" hidden><h3>NOKINS RGB lights</h3><label class="switchline"><input id="studioNInclude" type="checkbox" checked>Include NOKINS in this scene</label><label>Scene action<select id="studioNKind" class="input"><option value="solid">Solid color</option><option value="effect">Factory effect</option><option value="scene">Factory scene</option><option value="mic">Controller microphone</option><option value="diy">My custom pattern</option><option value="off">Power off</option></select></label>
<label class="switchline"><input id="studioNFollow" type="checkbox" checked>For solid color, follow the front cart zone</label><p class="small-note">Edit the color, effect or custom pattern below. These fields are stored with the whole-cart scene. Timers and wiring configuration stay separate and are never applied by a scene.</p><button class="primary" id="studioApplyN">Apply NOKINS scene action only</button><div id="studioNEditor"></div></section>
<section id="studioEyes" hidden><h3>Devil Eyes display</h3><label class="switchline"><input id="studioEyesInclude" type="checkbox" checked>Include this display project in the scene</label><p id="studioEyesBlocker" class="inline-status">Local editing and playlist preview work. Sending to CoolLEDUX is unavailable: complete escaped program packets can exceed Bluetooth's ATT payload, and Bluefy exposes no negotiated MTU here. A verified packet-fragmentation path is still required. Export is a backup, not a hardware upload.</p><div id="studioEyesEditor"></div></section>
<hr><label class="switchline"><input type="checkbox" id="studioParked">Cart parked; the included outputs are decorative lights.</label><div class="row-actions"><button class="primary" id="studioApplyAll">Apply this whole-cart draft</button><button class="secondary" id="studioStop">Stop applying</button><button class="secondary" id="studioExport">Export this complete build</button></div>
<p class="small-note">Apply reports every device separately. A submitted lighting command is not a physical acknowledgement. An included display with no upload support means the whole-cart scene is incomplete.</p><div id="studioResults" role="status" aria-live="polite"></div><p id="studioContext" class="small-note"></p>`;
document.querySelector('[data-page="create"] .welcome').after(studio);
ui("studioTabs").before(ui("sceneName").parentElement,ui("saveDesign").parentElement,sceneSavePanel);
const studioImportButton=document.createElement("button");studioImportButton.type="button";studioImportButton.className="secondary";studioImportButton.textContent="Import build / exported draft";studioImportButton.id="studioImportButton";
const studioImport=document.createElement("input");studioImport.type="file";studioImport.accept="application/json,.json";studioImport.hidden=true;studioImport.id="studioImport";sceneSavePanel.append(studioImportButton,studioImport);
let studioImportEpoch=0;studioImportButton.onclick=()=>studioImport.click();
ui("applyDesign").textContent="Apply complete scene";ui("saveDesign").textContent="Save changes";
ui("studioSPAdvanced").append(spPanel);ui("studioNEditor").append(of21Workspace);ui("studioEyesEditor").append(displayHost);
ui("designNokinsOn").closest(".accessory-editor").hidden=true;ui("designEyesOn").closest(".accessory-editor").hidden=true;
const studioNMore=document.createElement("details");studioNMore.innerHTML="<summary>Custom patterns, timers and controller setup</summary>";of21Native.before(studioNMore);studioNMore.append(of21Native);
const studioMapped=document.createElement("button");studioMapped.type="button";studioMapped.className="secondary";studioMapped.textContent="Edit mapped cart-zone colors";studioMapped.onclick=()=>ui("zoneEditors").scrollIntoView({behavior:"smooth",block:"center"});ui("studioSPMode").parentElement.after(studioMapped);
function studioSourceRender(){const individual=ui("studioSPMode").value==="outputs";ui("studioSP").querySelector(".display-settings").hidden=!individual;ui("studioPortPreview").hidden=!individual;studioMapped.hidden=individual;if(ui("studioNKind").value==="diy")studioNMore.open=true;}
ui("studioSPMode").addEventListener("change",studioSourceRender);ui("studioNKind").addEventListener("change",studioSourceRender);
const homeStudioStatus=document.createElement("div");homeStudioStatus.innerHTML=`<label class="switchline"><input id="homeSceneParked" type="checkbox">Cart parked; apply decorative lighting scenes.</label><div id="homeStudioResults" role="status"></div>`;ui("cartPower").parentElement.after(homeStudioStatus);
const studioDisplayPreview=document.createElement("div");studioDisplayPreview.hidden=true;studioDisplayPreview.innerHTML=`<p class="small-note">Devil Eyes first-frame preview · hardware upload unavailable</p><canvas id="sceneDisplayPreview" style="width:100%;max-width:480px;image-rendering:pixelated" aria-label="Saved display project first frame"></canvas><button class="text-btn" id="sceneDisplayEdit">Edit / preview display playlist</button>`;homeStudioStatus.append(studioDisplayPreview);ui("sceneDisplayEdit").onclick=()=>{if(activeScene&&activeScene.id!=="draft")editScene(activeScene);studioOpen("trinka");};
function studioPreview(scene){const project=scene?.composition?.trinka?.project;studioDisplayPreview.hidden=!project;if(!project)return;try{const p=displayModel.validate(project),canvas=ui("sceneDisplayPreview");canvas.width=p.width;canvas.height=p.height;const context=canvas.getContext("2d");if(!context)return;for(let i=0;i<p.width*p.height;i++){context.fillStyle="#"+p.programs[0].frames[0].pixels[i].toString(16).padStart(6,"0");context.fillRect(i%p.width,Math.floor(i/p.width),1,1);}}catch{studioDisplayPreview.hidden=true;}}
ui("homeSceneParked").onchange=()=>{ui("studioParked").checked=ui("homeSceneParked").checked;};ui("studioParked").onchange=()=>{ui("homeSceneParked").checked=ui("studioParked").checked;};
ui("displayUpload").textContent="Upload unavailable: verified UX packet fragmentation required";
const studioBaseDisplay=displayModel.clone(displayProject);
let studioChannels={},studioUnsupported=null,studioOwnsDisplay=false,studioSelectedPort=1,studioEpoch=0,studioApplying=false,studioLastResults=[];
const studioCopy=value=>JSON.parse(JSON.stringify(value));
const studioInt=(value,min,max,label)=>{if(!Number.isInteger(value)||value<min||value>max)throw Error(label+" must be "+min+"–"+max+".");return value;};
function studioDefaultChannels(){return Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,{include:czUniqueOutputs().includes(i+1),on:true,effect:25,color:"#49e3d2",brightness:45,speed:5,length:32,direction:1,gain:8}]));}
function studioValidate(raw){
 if(!raw||raw.version!==1||!raw.sp608e||!raw.nokins||!raw.trinka)throw Error("This complete scene format is not supported; the original snapshot is preserved.");
 const result=studioCopy(raw),s=result.sp608e,n=result.nokins;
 if(typeof s.include!=="boolean"||!["zones","outputs"].includes(s.mode))throw Error("Choose the SP608E scene source.");
 for(let port=1;port<=8;port++){
  const r=s.channels?.[port];if(!r||typeof r.include!=="boolean"||typeof r.on!=="boolean"||!fxById.has(r.effect)||!E.color(r.color))throw Error("Invalid SP608E output draft.");
  for(const [key,min,max] of [["brightness",0,100],["speed",1,10],["length",1,240],["direction",0,1],["gain",1,16]])studioInt(r[key],min,max,key);
 }
 if(typeof n.include!=="boolean"||typeof n.follow!=="boolean"||!["solid","effect","scene","mic","diy","off"].includes(n.kind)||!E.color(n.color))throw Error("Invalid NOKINS scene action.");
 studioInt(n.brightness,0,100,"NOKINS brightness");studioInt(n.speed,0,100,"NOKINS speed");studioInt(n.effect,0,233,"NOKINS effect");studioInt(n.rhythm,0x80,0x87,"NOKINS microphone pattern");studioInt(n.sensitivity,0,100,"NOKINS sensitivity");
 if(!SmartEaseOF21.scenes.includes(n.scene))throw Error("Choose a supported NOKINS native scene.");if(n.kind==="diy"){if(!n.diy)throw Error("Complete the NOKINS custom-pattern fields before saving or applying.");SmartEaseOF21.diy(n.diy);}
 if(typeof result.trinka.include!=="boolean")throw Error("Choose whether to include Devil Eyes.");result.trinka.project=displayModel.validate(result.trinka.project);
 return result;
}
function studioContext(){const calibration={};let storageUnavailable=false;try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith("smartease-sp608e-")||key.startsWith("smartease-haunted-"))calibration[key]=localStorage.getItem(key);}}catch{storageUnavailable=true;}return {zones:studioCopy(czState.zones),activeOutputs:[...czState.activeOutputs],calibration,storageUnavailable};}
function studioReadPort(){
 const r=studioChannels[studioSelectedPort];if(!r)return;
 r.include=ui("studioPortInclude").checked;r.on=ui("studioPortOn").checked;
 for(const [key,id] of [["effect","Effect"],["brightness","Brightness"],["speed","Speed"],["length","Length"],["direction","Direction"],["gain","Gain"]])r[key]=ui("studioPort"+id).value.trim()===""?NaN:Number(ui("studioPort"+id).value);
 r.color=ui("studioPortColor").value;
 ui("studioPortPreview").textContent="Output "+studioSelectedPort+": "+(r.include?(r.on?"on":"off"):"excluded")+", "+r.color+", "+r.brightness+"%. Draft only until Apply.";
}
function studioRenderPort(){const r=studioChannels[studioSelectedPort];ui("studioPortInclude").checked=r.include;ui("studioPortOn").checked=r.on;for(const [key,id] of [["effect","Effect"],["color","Color"],["brightness","Brightness"],["speed","Speed"],["length","Length"],["direction","Direction"],["gain","Gain"]])ui("studioPort"+id).value=r[key];studioReadPort();}
function studioCaptureDraft(){
 studioReadPort();const follow=ui("studioNFollow").checked;let diy=null;try{diy=of21Draft();}catch{}
 return {version:1,sp608e:{include:ui("studioSPInclude").checked,mode:ui("studioSPMode").value,channels:studioCopy(studioChannels)},nokins:{include:ui("studioNInclude").checked,kind:ui("studioNKind").value,follow,color:follow?draft["front-bumper"].color:ui("of21LiveColor").value,brightness:Number(ui("of21Level").value),speed:Number(ui("of21Speed").value),effect:Number(ui("of21Effects").value),scene:Number(ui("of21Scenes").value),rhythm:Number(ui("of21MicMode").value),sensitivity:Number(ui("of21Sensitivity").value),diy},trinka:{include:ui("studioEyesInclude").checked,project:displayModel.clone(displayProject)},context:studioContext()};
}
function studioCapture(){if(studioUnsupported)return studioCopy(studioUnsupported);return studioValidate(studioCaptureDraft());}
function studioLoad(raw,sceneOwned=true){
 studioUnsupported=null;let state;
 try{state=raw?studioValidate(raw):null;}catch(error){studioUnsupported=studioCopy(raw);sceneSaveMessage(error.message,true);}
 studioChannels=state?.sp608e.channels||studioDefaultChannels();ui("studioSPInclude").checked=state?.sp608e.include??true;ui("studioSPMode").value=state?.sp608e.mode||"zones";
 const n=state?.nokins;ui("studioNInclude").checked=n?.include??true;ui("studioNKind").value=n?.kind||"solid";ui("studioNFollow").checked=n?.follow??(draftAccessories.nokins.follow==="front");
 for(const [key,id,fallback] of [["color","of21LiveColor",draftAccessories.nokins.color],["brightness","of21Level",draftAccessories.nokins.brightness],["speed","of21Speed",50],["effect","of21Effects",0],["scene","of21Scenes",1],["rhythm","of21MicMode",128],["sensitivity","of21Sensitivity",50]])ui(id).value=n?.[key]??fallback;
 if(n?.diy){for(const [key,id] of [["nodeCount","Nodes"],["totalNodes","Total"],["mode","Mode"],["gradient","Gradient"],["speed","Speed"],["brightness","Brightness"]])ui("of21Diy"+id).value=n.diy[key]??100;ui("of21DiyColors").value=n.diy.colors.join(" ");}
 ui("studioEyesInclude").checked=state?.trinka.include??true;studioOwnsDisplay=sceneOwned;
 displayImportGeneration++;displayStop();displayDrawing=false;displayUndo=[];displayRedo=[];displayProject=displayModel.clone(state?.trinka.project||studioBaseDisplay);displayProgram=0;displayFrame=0;displayRender();studioSelectedPort=1;ui("studioPort").value="1";studioRenderPort();of21NativePreview();studioSourceRender();
 ui("studioParked").checked=false;ui("homeSceneParked").checked=false;ui("studioContext").textContent=state?.context?"This scene keeps a wiring and calibration snapshot for reference. Apply uses your current global mapping and color correction; it never overwrites them.":"Saving includes your current wiring and calibration snapshot. Loading never changes global wiring or calibration.";
}
function studioOpen(id){go("create");studioOwnsDisplay=true;displayHost.hidden=false;for(const [key,node] of [["sp608e","studioSP"],["nokins","studioNokins"],["trinka","studioEyes"]])ui(node).hidden=key!==id;ui("studioTabs").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.studio===id)));ui("cartStudio").scrollIntoView({block:"start",behavior:"smooth"});}
function studioReport(results,pending=false){studioLastResults=results;const host=ui("studioResults");host.replaceChildren();for(const result of results){const p=document.createElement("p");p.className="inline-status";p.textContent=connectionLabel(result.id)+": "+result.status+" — "+result.detail;host.append(p);}const p=document.createElement("strong");const included=results.filter(r=>r.status!=="excluded");p.textContent=pending?"Applying remaining devices… earlier submissions are shown below.":included.length&&included.every(r=>r.status==="submitted")?"All included commands submitted; check the physical devices.":"Whole-cart scene incomplete. Review each device above.";host.prepend(p);ui("homeStudioResults").replaceChildren(...[...host.children].map(node=>node.cloneNode(true)));}
async function studioApplySP(state,rows,guard){
 if(state.mode==="zones")return cartDevices[0].apply(rows,guard);
 const ports=Object.keys(state.channels).map(Number).filter(n=>state.channels[n].include);if(!ports.length)throw Error("Select at least one decorative SP608E output.");
 if(!await spEnsureChipColors(ports,guard))return false;const jobs=[];
 for(const port of ports){const r=state.channels[port],mask=maskFor(port-1),fx=fxById.get(r.effect);if(!r.on){jobs.push(packet(0x82,[mask,0]));continue;}jobs.push(packet(0x83,[mask,fx.id]));if(fx.speed)jobs.push(packet(0x86,[mask,r.speed]));if(fx.length)jobs.push(packet(0x87,[mask,r.length>>8,r.length&255]));if(fx.direction)jobs.push(packet(0x8a,[mask,r.direction]));jobs.push(fx.type==="Music"?packet(0x8b,[mask,r.gain]):packet(0x85,[mask,Math.round(r.brightness*255/100)]));jobs.push(packet(0x82,[mask,1]));if(fx.color)jobs.push(hauntedColorCommand(port,r.color));}
 return enqueuePackets(jobs,"Saved SP608E output draft",{guard});
}
async function studioApplyN(state,rows,guard){
 const a=cartDevices[2];if(a.profile!=="melk-of21")throw Error("This scene action requires the exact MELK-OF21 controller.");
 if(state.kind==="diy")return a.ownerUploadDIY(state.diy,guard);
 let commands=[{kind:"power",value:true}];
 if(state.kind==="off")commands=[{kind:"power",value:false}];
 if(state.kind==="solid")commands.push({kind:"brightness",value:state.brightness},{kind:"color",value:state.follow?rows["front-bumper"].color:state.color});
 if(state.kind==="effect")commands.push({kind:"effect",value:state.effect},{kind:"speed",value:state.speed},{kind:"brightness",value:state.brightness,options:{target:"all"}});
 if(state.kind==="scene")commands.push({kind:"scene",value:state.scene});
 if(state.kind==="mic")commands.push({kind:"microphone",value:true},{kind:"mic-rhythm",value:state.rhythm},{kind:"sensitivity",value:state.sensitivity});
 return a.ownerCommands(commands,guard);
}
async function studioApplyScene(scene,only=null){
 if(studioApplying)return {complete:false,results:studioLastResults};
 if(!ui("studioParked").checked||document.visibilityState!=="visible"){const message="Confirm the cart is parked before Apply. Editing and saving work disconnected.";sceneSaveMessage(message,true);toast(message);return {complete:false,results:[]};}
 let state,rows;try{state=studioValidate(scene.composition);rows=E.validateRows(scene.rows);}catch(error){sceneSaveMessage(error.message,true);return {complete:false,results:[]};}
 const playbackGeneration=beginScenePlayback(),epoch=++studioEpoch,spSession=bleSession,nGeneration=cartDevices[2].ownerLink.generation;
 const guard=()=>epoch===studioEpoch&&playbackGeneration===applyGeneration&&ui("studioParked").checked&&document.visibilityState==="visible";
 studioApplying=true;const results=[];
 try{
  for(const id of ["sp608e","nokins","trinka"]){
   if(only&&id!==only)continue;const item=id==="sp608e"?state.sp608e:id==="nokins"?state.nokins:state.trinka;
   if(!item.include){results.push({id,status:"excluded",detail:"Excluded from this build; no command sent."});continue;}
   if(!guard()){results.push({id,status:"cancelled",detail:"Apply stopped; earlier submitted changes can remain."});continue;}
   if(id==="trinka"){results.push({id,status:"unsupported",detail:"Project saved and previewable locally. UX upload requires a verified fragmentation/ATT-capacity path; no display command sent."});continue;}
   const adapter=cartDevices.find(a=>a.id===id);if(!adapter.connected){results.push({id,status:"disconnected",detail:"Draft retained. Connect this device and Apply again."});continue;}
   const deviceGuard=()=>guard()&&(id==="sp608e"?bleSession===spSession:cartDevices[2].ownerLink.generation===nGeneration);
   try{
    const ok=id==="sp608e"?await studioApplySP(item,rows,deviceGuard):await studioApplyN(item,rows,deviceGuard);
    if(!deviceGuard())results.push({id,status:"cancelled",detail:"Apply was cancelled or its connection changed during submission. An in-flight write may have completed."});
    else results.push({id,status:ok?"submitted":"failed",detail:ok?"Commands submitted, not physical acknowledgement.":"Command sequence stopped or failed; partial changes may remain."});
   }catch(error){results.push({id,status:guard()?"failed":"cancelled",detail:guard()?error.message:"Apply cancelled during an in-flight operation; earlier changes may remain."});}
   if(guard())studioReport(results,true);
  }
  if(!guard())return {complete:false,cancelled:true,results};
  studioReport(results);if(results.some(r=>r.status==="submitted"))powered=results.some(r=>r.status==="submitted"&&(r.id==="sp608e"?(state.sp608e.mode==="zones"?Object.values(rows).some(x=>x.on):Object.values(state.sp608e.channels).some(x=>x.include&&x.on)):state.nokins.kind!=="off"));const complete=results.length>0&&results.every(r=>["excluded","submitted"].includes(r.status))&&results.some(r=>r.status==="submitted");ui("playState").textContent=complete?"INCLUDED COMMANDS SUBMITTED":"WHOLE-CART SCENE INCOMPLETE";updateHeader();return {complete,results};
 }finally{studioApplying=false;if(playbackGeneration===applyGeneration){applying=false;updateHeader();}}
}
function studioCurrentScene(){return {id:"draft",sourceSceneId:editingSceneId,name:ui("sceneName").value||"Current build",custom:true,rows:E.validateRows(draft),accessories:E.accessories(draftAccessories,draft["front-bumper"]),composition:studioCapture()};}
window.SmartEaseStudio={open:studioOpen,load:studioLoad,enter:()=>{studioOwnsDisplay=true;},capture:studioCapture,captureDraft:studioCaptureDraft,validate:studioValidate,applyScene:studioApplyScene,preview:studioPreview,get ownsDisplay(){return studioOwnsDisplay;},get applying(){return studioApplying;},stop:()=>{studioEpoch++;cartDevices[2].cancelOwner();}};
ui("studioTabs").onclick=event=>{if(event.target.dataset.studio)studioOpen(event.target.dataset.studio);};
ui("studioPort").onchange=()=>{studioReadPort();studioSelectedPort=Number(ui("studioPort").value);studioRenderPort();};
for(const input of ui("studioSP").querySelectorAll('[id^="studioPort"]'))if(input.id!=="studioPort")input.addEventListener("input",studioReadPort);
const applyDraft=only=>{try{const scene=studioCurrentScene();showPreview(scene);return studioApplyScene(scene,only);}catch(error){sceneSaveMessage(error.message,true);return Promise.resolve({complete:false,results:[]});}};
ui("studioApplySP").onclick=()=>applyDraft("sp608e");ui("studioApplyN").onclick=()=>applyDraft("nokins");ui("studioApplyAll").onclick=()=>applyDraft(null);
ui("applyDesign").onclick=()=>{try{const scene=studioCurrentScene();showPreview(scene);return studioApplyScene(scene);}catch(error){sceneSaveMessage(error.message,true);return Promise.resolve({complete:false,results:[]});}};
ui("studioStop").onclick=()=>{SmartEaseStudio.stop();applying=false;ui("playState").textContent="APPLY CANCELLED — EARLIER CHANGES MAY REMAIN";studioReport([{id:"sp608e",status:"cancelled",detail:"No further queued scene commands; an in-flight write cannot be recalled."},{id:"nokins",status:"cancelled",detail:"Partial changes may remain. Reconnect if command outcome is uncertain."},{id:"trinka",status:"unsupported",detail:"No upload was sent."}]);updateHeader();};
ui("studioExport").onclick=()=>{try{const data=studioCurrentScene(),url=URL.createObjectURL(new Blob([JSON.stringify({format:"smartease-complete-scene",version:1,scene:data},null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="smartease-complete-scene.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){sceneSaveMessage(error.message,true);}};
studioImport.onchange=async()=>{
 const file=studioImport.files?.[0];if(!file)return;const token=++studioImportEpoch,epoch=sceneDraftEpoch;
 try{
  if(file.size>2097152)throw Error("Choose a build or draft JSON file up to 2 MB.");const text=await file.text();
  if(token!==studioImportEpoch||epoch!==sceneDraftEpoch){sceneSaveMessage("Import ignored because a newer import or edit changed the draft.");return false;}
  if(text.length>2097152)throw Error("Build file is too large.");const raw=JSON.parse(text);let value;
  if(raw.version!==1)throw Error("Unsupported build version.");
  if(raw.format==="smartease-complete-scene")value=raw.scene;else if(raw.format==="smartease-scene-draft")value=raw;else throw Error("Choose a SmartEase complete build or exported draft.");
  const rows=E.validateRows(value?.rows),composition=value.composition?studioValidate(value.composition):null;
  clearTimeout(sceneDraftTimer);sceneDraftEpoch++;editingSceneId=null;draft=rows;draftAccessories=E.accessories(value.accessories,rows["front-bumper"]);draftComposition=composition;ui("sceneName").value=typeof value.name==="string"?value.name.slice(0,40):"Imported build";
  studioLoad(composition);studioOwnsDisplay=true;go("create");rememberSceneDraft();sceneSaveMessage("Build imported as a new draft. Review it, then Save changes. No device command or configuration change was sent.");return true;
 }catch(error){sceneSaveMessage("Import failed: "+error.message+". Current draft retained.",true);return false;}finally{studioImport.value="";}
};
const originalRenderDevices=renderDevices;renderDevices=function(){originalRenderDevices();for(const id of ["sp608e","nokins","trinka"]){const connect=ui("deviceConnect-"+id);if(!connect)continue;const button=document.createElement("button");button.type="button";button.className="secondary";button.id="deviceEdit-"+id;button.textContent=id==="sp608e"?"Edit SP608E":id==="nokins"?"Edit NOKINS":"Edit Devil Eyes";button.onclick=()=>studioOpen(id);connect.parentElement.append(button);}};
studioLoad(activeScene?.composition||draftComposition,!!activeScene||page==="create");studioPreview(activeScene);renderDevices();
document.addEventListener("visibilitychange",()=>{if(document.visibilityState!=="visible"){SmartEaseStudio.stop();ui("studioParked").checked=false;ui("homeSceneParked").checked=false;}});
