/* Offline UX workflow. No connection, query transmission or upload happens here. */
"use strict";
const uxAdapter=cartDevices[1],uxWorkspace=document.createElement("section");
uxWorkspace.className="ux-workspace";
uxWorkspace.innerHTML=`<details id="uxPreparation"><summary>CoolLEDUX preparation and captured reports</summary>
 <p class="small-note">Your screenshot identifies CoolLEDUX. Select that display with Identify above to prepare a transfer file locally. Confirm the panel orientation and Bluetooth details before enabling upload. The studio's canvas size remains a draft until you set it.</p>
 <p id="uxProfileStatus" class="inline-status" role="status"></p>
 <label class="switchline"><input id="uxIncludeSettings" type="checkbox"> Include proposed display settings in the offline file</label>
 <div class="display-settings"><label>Display power <select class="input" id="uxPower"><option value="on">On</option><option value="off">Off</option></select></label><label>Brightness (%) <input class="input" id="uxBrightness" type="number" min="0" max="100" value="45"></label><label><input id="uxMirror" type="checkbox"> Mirror display</label></div>
 <div class="row-actions"><button class="secondary" id="uxPrepare" type="button">Prepare UX transfer file (offline)</button></div>
 <p class="small-note">Pictures use the documented Graffiti path; its dark background becomes dim blue. Animations use RGB444 frames with true black. Palette, timing, dimensions and firmware behavior still need physical acceptance. This file is not sent to the display.</p>
 <label class="field-label" for="uxCapturedReply">Optional: device-info reply from an existing capture (hex)</label><textarea class="input" id="uxCapturedReply" maxlength="3072" rows="3" placeholder="Paste an already captured reply; no query will be sent."></textarea>
 <button class="secondary" id="uxDecode" type="button">Decode captured reply locally</button>
 <pre class="ux-report" id="uxReport" aria-label="Offline UX preparation report"></pre>
 <p class="small-note">The documented device-info reply has no dimensions field. Captured brightness/power are historical data; decoding cannot verify a live connection.</p>
 </details>`;
ui("nativeWorkspace2").append(uxWorkspace);
function uxRender(){
 const family=uxAdapter.profile,ready=family==="coolledux";
 ui("uxPrepare").disabled=ui("uxDecode").disabled=!ready;
 ui("uxProfileStatus").textContent=ready?"CoolLEDUX selected. Offline preparation is available; hardware upload is unavailable.":family?
  "Selected "+family+". This workspace accepts CoolLEDUX only; it will not substitute an X encoder.":"Known owner device: CoolLEDUX. Use Identify to select it locally. No hardware dimensions have been assumed.";
 ui("displayUpload").textContent="Upload unavailable: dimensions and transport acceptance pending";
}
ui("uxPrepare").onclick=()=>{
 try{
  const plan=uxAdapter.prepareProject(displayProject);
  if(ui("uxIncludeSettings").checked){
   const level=Number(ui("uxBrightness").value);
   if(!Number.isInteger(level)||level<0||level>100)throw Error("Choose a brightness from 0 to 100%.");
   plan.proposedSettings={power:ui("uxPower").value==="on",brightnessPercent:level,mirror:ui("uxMirror").checked};
   plan.settingsPackets=[uxAdapter.prepareCommand("brightness",Math.round(level*255/100)),uxAdapter.prepareCommand("mirror",ui("uxMirror").checked),uxAdapter.prepareCommand("power",ui("uxPower").value==="on")];
  }
  const report={family:plan.family,draftDimensions:plan.dimensions,programs:plan.programs.map(p=>({name:p.name,kind:p.kind,frames:p.frames,segments:p.segments,packets:p.packets.length,rawBytes:p.rawLength})),uploadEnabled:false,caveats:plan.caveats};
  ui("uxReport").textContent=JSON.stringify(report,null,2);
  const blob=new Blob([JSON.stringify(plan)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="smartease-coolledux-offline-plan.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){ui("uxReport").textContent=error.message;}
};
ui("uxDecode").onclick=()=>{
 try{ui("uxReport").textContent=JSON.stringify(uxAdapter.decodeCapturedInfo(ui("uxCapturedReply").value),null,2);}
 catch(error){ui("uxReport").textContent=error.message;}
};
const uxIdentityObserver=new MutationObserver(uxRender);uxIdentityObserver.observe(ui("nativeEyesInfo"),{childList:true});
uxRender();
