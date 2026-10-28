/* Main-device controls reuse the retained SP608E queue and calibration path. */
"use strict";
const spPanel=document.createElement("div");spPanel.id="nativeSpPanel";
spPanel.innerHTML=`
 <fieldset class="native-output-picker"><legend>Decorative outputs</legend>${Array.from({length:8},(_,i)=>`<label><input type="checkbox" data-native-output="${i+1}"> ${i+1}</label>`).join("")}</fieldset>
 <p class="small-note">Select individual outputs. Only your mapped, active decorative outputs start selected.</p>
 <label class="field-label" for="nativeSpEffect">Factory effect</label><select class="input" id="nativeSpEffect"></select>
 <div class="display-settings"><label>Color <input type="color" id="nativeSpColor" value="#49e3d2"></label><label>Brightness (%) <input class="input" id="nativeSpBrightness" type="number" min="0" max="100" value="45"></label></div>
 <div class="display-settings"><label>Speed (1–10) <input class="input" id="nativeSpSpeed" type="number" min="1" max="10" value="5"></label><label>Effect length (pixels) <input class="input" id="nativeSpLength" type="number" min="1" max="240" value="32"></label></div>
 <label class="field-label" for="nativeSpDirection">Direction</label><select class="input" id="nativeSpDirection"><option value="1">Forward</option><option value="0">Reverse</option></select>
 <label class="field-label" for="nativeSpGain">Music sensitivity (1–16)</label><input class="input" id="nativeSpGain" type="number" min="1" max="16" value="8">
 <label class="switchline"><input id="nativeSpParked" type="checkbox"> Cart parked; selected outputs are decorative lights.</label>
 <div class="row-actions"><button class="primary" id="nativeSpApply" type="button">Apply effect + settings</button><button class="secondary" id="nativeSpOn" type="button">Selected on</button><button class="secondary" id="nativeSpOff" type="button">Selected off</button><button class="secondary" id="nativeSpRead" type="button">Read controller status</button></div>
 <label class="field-label" for="nativeSpSlot">Onboard scene</label><select class="input" id="nativeSpSlot">${Array.from({length:9},(_,i)=>`<option value="${i}">Scene ${i+1}</option>`).join("")}</select>
 <div class="row-actions"><button class="secondary" id="nativeSpRecall" type="button">Recall onboard scene</button><button class="secondary" id="nativeSpLoopOn" type="button">Scene auto on</button><button class="secondary" id="nativeSpLoopOff" type="button">Scene auto off</button></div>
 <p class="inline-status" id="nativeSpStatus" role="status">Editing sends nothing. Stored slot writing, timers and triggers still need packet evidence.</p>`;
ui("nativeSpChannels").closest("section").append(spPanel);
for(const fx of effects){const option=document.createElement("option");option.value=fx.id;option.textContent=fx.name+" · "+fx.type;ui("nativeSpEffect").append(option);}
ui("nativeSpEffect").value="25";
for(const input of spPanel.querySelectorAll("[data-native-output]"))input.checked=czUniqueOutputs().includes(Number(input.dataset.nativeOutput));
let nativeSpBusy=false;
function nativeSpMask(){return [...spPanel.querySelectorAll("[data-native-output]:checked")].reduce((mask,input)=>mask|maskFor(Number(input.dataset.nativeOutput)-1),0);}
function nativeSpReady(){return canSend()&&!!nativeSpMask()&&ui("nativeSpParked").checked&&document.visibilityState==="visible"&&!nativeSpBusy&&!applying&&!nativeLotusBusy&&!nokinsTestBusy&&!liveName;}
function nativeSpRender(){
 const fx=fxById.get(Number(ui("nativeSpEffect").value));
 for(const [id,key] of [["Color","color"],["Speed","speed"],["Length","length"],["Direction","direction"]])ui("nativeSp"+id).disabled=!fx?.[key]||nativeSpBusy;
 ui("nativeSpBrightness").disabled=fx?.type==="Music"||nativeSpBusy;ui("nativeSpGain").disabled=fx?.type!=="Music"||nativeSpBusy;
 for(const id of ["Apply","On","Off","Recall","LoopOn","LoopOff"])ui("nativeSp"+id).disabled=!nativeSpReady();
 ui("nativeSpRead").disabled=!canSend()||nativeSpBusy;
}
async function nativeSpSend(action){
 const status=ui("nativeSpStatus");
 if(!nativeSpReady()){status.textContent="Connect SP608E, select decorative outputs and confirm parked before sending.";return false;}
 const mask=nativeSpMask(),session=bleSession;nativeSpBusy=true;nativeSpRender();
 cancelPlayback();
 const generation=applyGeneration;
 const guard=()=>generation===applyGeneration&&session===bleSession&&canSend()&&ui("nativeSpParked").checked&&document.visibilityState==="visible"&&!applying&&!liveName;
 try{
  let ok;
  if(action==="apply"){
   const fx=fxById.get(Number(ui("nativeSpEffect").value));if(!fx)throw Error("Choose an effect.");
   const number=(id,min,max)=>{const v=Number(ui("nativeSp"+id).value);if(!Number.isInteger(v)||v<min||v>max)throw Error(id+" must be "+min+"–"+max+".");return v;};
   const speed=number("Speed",1,10),length=number("Length",1,240),level=number("Brightness",0,100),gain=number("Gain",1,16),direction=number("Direction",0,1),color=ui("nativeSpColor").value;
   if(!/^#[0-9a-f]{6}$/i.test(color))throw Error("Choose a color.");
   const ports=indexes(mask).map(i=>i+1);
   // Preserve physical chip order and manual/RGB balance corrections for each output.
   if(!await spEnsureChipColors(ports,guard))throw Error("Color calibration setup was interrupted.");
   const jobs=[];
   for(const n of ports){const m=maskFor(n-1);jobs.push(packet(0x83,[m,fx.id]));}
   if(fx.speed)jobs.push(packet(0x86,[mask,speed]));
   if(fx.length)jobs.push(packet(0x87,[mask,length>>8,length&255]));
   if(fx.direction)jobs.push(packet(0x8a,[mask,direction]));
   if(fx.type==="Music")jobs.push(packet(0x8b,[mask,gain]));else jobs.push(packet(0x85,[mask,Math.round(level*255/100)]));
   jobs.push(packet(0x82,[mask,1]));
   // Match the proven scene path: power-on can restore an old/default color.
   // Reapply each output's calibrated RGB only AFTER every selected output is on.
   if(fx.color)for(const n of ports)jobs.push(hauntedColorCommand(n,color));
   ok=await enqueuePackets(jobs,"Native SP608E settings",{guard});
  }else if(action==="on"||action==="off")ok=await sendPower(mask,action==="on",{guard});
  else if(action==="recall"){
   // Onboard recall is controller-wide, including outputs outside this selection.
   if(!confirm("Recall onboard scene "+(Number(ui("nativeSpSlot").value)+1)+"? It can change all eight SP608E outputs, including unselected outputs."))return false;
   if(!guard())return false;
   ok=await enqueuePackets(packet(0x8e,[Number(ui("nativeSpSlot").value)]),"Native onboard scene",{guard});
   if(ok)ok=await spEnsureChipColors(czUniqueOutputs(),guard,{force:true});
  }else if(action==="loop-on"||action==="loop-off"){
   if(!confirm("Change scene auto for the whole SP608E? Onboard scenes can affect all eight outputs."))return false;
   ok=await enqueuePackets(packet(0x90,[action==="loop-on"?1:0]),"Native scene auto",{guard});
  }
  status.textContent=ok?(transport==="demo"?"Demo updated. No Bluetooth commands sent.":"Commands sent. Check the real lights; controller status may follow."):"Operation stopped or failed. Reconnect and check controller status.";
  return !!ok;
 }catch(error){status.textContent=error.message;return false;}finally{nativeSpBusy=false;nativeSpRender();}
}
for(const [id,action] of [["Apply","apply"],["On","on"],["Off","off"],["Recall","recall"],["LoopOn","loop-on"],["LoopOff","loop-off"]])ui("nativeSp"+id).onclick=()=>nativeSpSend(action);
ui("nativeSpRead").onclick=async()=>{const ok=await queryState();ui("nativeSpStatus").textContent=ok?"Status requested. See channel readback in 8-channel controls.":"Connect SP608E before reading status.";};
spPanel.addEventListener("change",nativeSpRender);
// Connection/readback changes originate in the retained transport, not this panel.
const nativeSpObserver=new MutationObserver(nativeSpRender);nativeSpObserver.observe(ui("connectionText"),{childList:true,characterData:true,subtree:true});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")ui("nativeSpParked").checked=false;nativeSpRender();});
nativeSpRender();

// Independent solid-color control uses the existing, exact-model Lotus adapter.
const lotusSolid=document.createElement("div");
lotusSolid.innerHTML=`<label class="field-label" for="nativeLotusColor">Solid color</label><input type="color" id="nativeLotusColor" value="#49e3d2"><div class="row-actions"><button class="secondary" id="nativeLotusSolid" type="button">Apply solid color + brightness</button><button class="secondary" id="nativeLotusDim" type="button">Decorative lights off / dim to zero</button></div><p class="small-note">Uses the same parked confirmation above. MELK off is zero brightness; hardware power framing remains unverified.</p>`;
ui("nativeLotusStatus").before(lotusSolid);
async function nativeLotusSolid(on){
 const adapter=cartDevices[2],status=ui("nativeLotusStatus");
 const ready=()=>adapter.connected&&["bledob","melk-oa10"].includes(adapter.profile)&&ui("nativeLotusParked").checked&&document.visibilityState==="visible"&&transport!=="demo"&&!applying&&!liveName&&!nokinsTestBusy&&!nativeSpBusy;
 if(!ready()||nativeLotusBusy){status.textContent="Connect a supported exact Lotus profile and confirm parked first. MELK-OF21 remains unsupported.";return false;}
 nativeLotusBusy=true;renderNativeLibrary();
 try{
  const ok=await adapter.write(SmartEaseLotus.commands(adapter.profile,{on,color:ui("nativeLotusColor").value,brightness:Number(ui("nativeLotusBrightness").value)}),ready);
  status.textContent=ok?"Decorative RGB command sent. Check the real lights; this does not verify physical output.":"Command interrupted. Check the Bluetooth connection.";return !!ok;
 }catch(error){status.textContent=error.message;return false;}finally{nativeLotusBusy=false;renderNativeLibrary();}
}
ui("nativeLotusSolid").onclick=()=>nativeLotusSolid(true);ui("nativeLotusDim").onclick=()=>nativeLotusSolid(false);
function nativeLotusSolidRender(){
 const adapter=cartDevices[2],ready=adapter.connected&&["bledob","melk-oa10"].includes(adapter.profile)&&ui("nativeLotusParked").checked&&document.visibilityState==="visible"&&transport!=="demo"&&!applying&&!liveName&&!nokinsTestBusy&&!nativeSpBusy&&!nativeLotusBusy;
 ui("nativeLotusSolid").disabled=ui("nativeLotusDim").disabled=!ready;
}
ui("nativeLotusParked").addEventListener("change",nativeLotusSolidRender);
const nativeLotusObserver=new MutationObserver(nativeLotusSolidRender);nativeLotusObserver.observe(ui("nativeLotusInfo"),{childList:true});
document.addEventListener("visibilitychange",nativeLotusSolidRender);nativeLotusSolidRender();

const evidenceButton=document.createElement("button");evidenceButton.className="secondary";evidenceButton.type="button";evidenceButton.id="nativeEvidenceExport";evidenceButton.textContent="Export device identification report";
evidenceButton.onclick=()=>{
 const report={format:"smartease-native-evidence",version:1,createdAt:new Date().toISOString(),
  devices:cartDevices.map(a=>({id:a.id,name:a.identity?.name||null,profile:a.profile||null,connected:a.connected,protocolReport:a.protocolReport||null})),
  displayDraft:{width:displayProject.width,height:displayProject.height,hardwareDimensionsConfirmed:false},
  pending:["MELK-OF21 1D: exact native command captures needed","TRINKA: native device name, panel dimensions, FFF0/FFF1 report and known-good picture upload capture","SP608E: slot-write/timer/trigger captures; saved scenes alone do not identify commands"],writesSentByExport:0};
 const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="smartease-device-identification.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
ui("nativeControllerLibrary").append(evidenceButton);

// One device workspace at a time; grouped SmartEase scenes keep their existing navigation.
const nativeGrid=ui("nativeControllerLibrary").querySelector(".native-controller-grid");
nativeGrid.classList.add("native-workspace");
const nativePanels=[...nativeGrid.children],nativeTabs=document.createElement("div");
nativeTabs.className="native-device-tabs";nativeTabs.setAttribute("role","tablist");nativeTabs.setAttribute("aria-label","Controller workspace");
const nativeKeys=["sp608e","nokins","trinka"];
nativePanels.forEach((panel,i)=>{
 panel.id="nativeWorkspace"+i;panel.setAttribute("role","tabpanel");panel.setAttribute("aria-labelledby","nativeDeviceTab"+i);
 const tab=document.createElement("button");tab.type="button";tab.id="nativeDeviceTab"+i;tab.textContent=["SP608E","NOKINS","Devil Eyes"][i];tab.setAttribute("role","tab");tab.setAttribute("aria-controls",panel.id);
 tab.onclick=()=>nativeSelectDevice(i,true);
 tab.onkeydown=event=>{const next=event.key==="ArrowRight"?(i+1)%3:event.key==="ArrowLeft"?(i+2)%3:event.key==="Home"?0:event.key==="End"?2:null;if(next!==null){event.preventDefault();nativeSelectDevice(next,true);nativeTabs.children[next].focus();}};
 nativeTabs.append(tab);
});
nativeGrid.before(nativeTabs);
function nativeSelectDevice(index,remember=false){
 nativePanels.forEach((panel,i)=>{panel.hidden=i!==index;nativeTabs.children[i].setAttribute("aria-selected",String(i===index));nativeTabs.children[i].tabIndex=i===index?0:-1;});
 displayHost.hidden=index!==2;if(index!==2)displayStop();else displayRender();
 if(remember){preferences.nativeController=nativeKeys[index];persist();}
}
nativeSelectDevice(Math.max(0,nativeKeys.indexOf(preferences.nativeController)));
