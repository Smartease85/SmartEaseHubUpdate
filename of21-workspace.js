/* OF21 source-derived ordinary controls; bulk/configuration remain gated. */
"use strict";
const of21Workspace=document.createElement("section");of21Workspace.className="ux-workspace";
of21Workspace.innerHTML=`<details><summary>MELK-OF21 native preparation (offline)</summary>
 <p class="small-note">OF21 is traced separately from OA10. The following export is an offline protocol example, not a device write or physical acceptance result.</p>
 <p class="inline-status" id="of21Status" role="status"></p>
 <label class="field-label" for="of21Color">Example RGB color</label><input type="color" id="of21Color" value="#ff0000">
 <div class="row-actions"><button type="button" class="secondary" id="of21Prepare">Prepare OF21 examples (offline)</button></div>
 <p class="small-note">Includes ordinary command examples and a synthetic ten-node DIY vector. It does not establish your actual LED count or enable bulk upload.</p>
 <pre class="ux-report" id="of21Report" aria-label="OF21 offline example report"></pre></details>`;
ui("nativeWorkspace1").append(of21Workspace);
function of21Render(){
 const adapter=cartDevices[2],ready=!!adapter.of21.profile;ui("of21Prepare").disabled=!ready;
 ui("of21Status").textContent=ready?"MELK-OF21 selected. Offline examples are available; physical acceptance remains outstanding.":"Select the exact MELK-OF21 device first. OA10 and unknown models cannot use this encoder.";
 if(!adapter.connected&&ui("of21Parked"))ui("of21Parked").checked=false;
 if(ui("of21LiveStatus")){
  ui("of21LiveStatus").textContent=adapter.profile==="melk-of21"&&adapter.connected?(adapter.controlReady?"Connected. Source-derived ordinary controls ready; check the real lights while parked.":"Connected, but writable FFF3 is unavailable. Inspect browser Bluetooth permissions."):"Connect your exact MELK-OF21 above to use ordinary controls.";
  ui("of21Nodes").textContent=adapter.of21.totalNodes?"Reported total LED nodes: "+adapter.of21.totalNodes+". This is partial readback; bulk upload remains gated.":"Total LED count has not been read. Bulk upload remains gated.";
  for(const button of of21Live.querySelectorAll("button"))button.disabled=of21Busy||adapter.profile!=="melk-of21"||!adapter.controlReady||!ui("of21Parked").checked||document.visibilityState!=="visible";
 }
}
ui("of21Prepare").onclick=()=>{
 try{
  const plan=cartDevices[2].of21.prepareExamples(ui("of21Color").value);
  ui("of21Report").textContent=JSON.stringify(plan,null,2);
  const url=URL.createObjectURL(new Blob([JSON.stringify(plan)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="smartease-of21-offline-examples.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){ui("of21Report").textContent=error.message;}
};
const of21IdentityObserver=new MutationObserver(of21Render);of21IdentityObserver.observe(ui("nativeLotusInfo"),{childList:true});of21Render();
let of21Busy=false;
const of21Live=document.createElement("div");of21Live.innerHTML=`<h4>MELK-OF21 original functions</h4><p id="of21LiveStatus" class="inline-status" role="status"></p>
 <label class="switchline"><input type="checkbox" id="of21Parked"> Cart parked; this is the decorative RGB controller.</label>
 <div class="row-actions"><button class="secondary" type="button" data-of21="on">Power on</button><button class="secondary" type="button" data-of21="off">Power off</button></div>
 <div class="display-settings"><label>Solid color <input id="of21LiveColor" type="color" value="#49e3d2"></label><label>Brightness (%) <input class="input" id="of21Level" type="number" min="0" max="100" value="45"></label></div>
 <button class="primary" type="button" data-of21="color">Apply solid color</button>
 <label class="field-label" for="of21Effects">Factory effect (source-derived IDs)</label><select class="input" id="of21Effects">${SmartEaseOF21.effects.map(id=>`<option value="${id}">Effect ${id}</option>`).join("")}</select>
 <label class="field-label" for="of21Speed">Effect speed (%)</label><input class="input" id="of21Speed" type="number" min="0" max="100" value="50"><button class="secondary" type="button" data-of21="effect">Play effect</button>
 <label class="field-label" for="of21Scenes">Native scene</label><select class="input" id="of21Scenes">${SmartEaseOF21.scenes.map(id=>`<option value="${id}">Scene ${id}</option>`).join("")}</select><button class="secondary" type="button" data-of21="scene">Recall scene</button>
 <label class="field-label" for="of21MicMode">Device-microphone rhythm</label><select class="input" id="of21MicMode">${Array.from({length:8},(_,i)=>`<option value="${80+i}">Mic pattern ${80+i}</option>`).join("")}</select>
 <div class="row-actions"><button class="secondary" type="button" data-of21="mic">Play mic rhythm</button><button class="secondary" type="button" data-of21="mic-off">Mic off</button><button class="secondary" type="button" data-of21="nodes">Read LED count</button></div>
 <p id="of21Nodes" class="small-note"></p><p id="of21LiveResult" class="inline-status" role="status">Connecting alone sends no lighting commands.</p>`;
of21Workspace.prepend(of21Live);
async function of21Run(kind){
 const a=cartDevices[2],guard=()=>a.profile==="melk-of21"&&a.controlReady&&ui("of21Parked").checked&&document.visibilityState==="visible";
 if(of21Busy||!guard())return false;
 const percent=id=>{const n=Number(ui(id).value);if(!Number.isInteger(n)||n<0||n>100)throw Error("Brightness and speed must be whole percentages from 0 to 100.");return n;};
 of21Busy=true;of21Render();
 try{
  let commands;
  if(kind==="on"||kind==="off")commands=[{kind:"power",value:kind==="on"}];
  else if(kind==="color")commands=[{kind:"power",value:true},{kind:"brightness",value:percent("of21Level")},{kind:"color",value:ui("of21LiveColor").value}];
  else if(kind==="effect")commands=[{kind:"power",value:true},{kind:"effect",value:Number(ui("of21Effects").value)},{kind:"speed",value:percent("of21Speed")},{kind:"brightness",value:percent("of21Level"),options:{target:"all"}}];
  else if(kind==="scene")commands=[{kind:"scene",value:Number(ui("of21Scenes").value)}];
  else if(kind==="mic")commands=[{kind:"power",value:true},{kind:"microphone",value:true},{kind:"mic-rhythm",value:Number(ui("of21MicMode").value)}];
  else if(kind==="mic-off")commands=[{kind:"microphone",value:false}];
  else if(kind==="nodes"){
   a.of21.totalNodes=null;
   for(let retry=0;retry<3&&guard()&&!a.of21.totalNodes;retry++){if(!await a.ownerCommand("geometry-query",undefined,undefined,guard))break;await sleep(200);}
   ui("of21LiveResult").textContent=a.of21.totalNodes?"LED count received; this is partial state, not complete device readback.":"No valid LED-count reply after at most three requests. Keep bulk upload disabled.";return !!a.of21.totalNodes;
  }else throw Error("Unknown OF21 action.");
  const ok=await a.ownerCommands(commands,guard);ui("of21LiveResult").textContent=ok?"Commands submitted. Check the physical lights; submission is not state acknowledgement.":"Operation stopped or failed. Check the device connection.";return !!ok;
 }catch(error){ui("of21LiveResult").textContent=error.message;return false;}finally{of21Busy=false;of21Render();}
}
of21Live.addEventListener("click",event=>{const kind=event.target.dataset.of21;if(kind)of21Run(kind);});
ui("of21Parked").onchange=of21Render;
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")ui("of21Parked").checked=false;of21Render();});of21Render();
