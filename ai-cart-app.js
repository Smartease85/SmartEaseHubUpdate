/* SmartEase authored AI recipe integration. Start is the only write intent. */
'use strict';
(function(){
const root=document.createElement('section');root.className='page';root.dataset.page='ai';root.id='aiCartPage';root.hidden=true;ui('app').querySelector('.bottom-nav').before(root);
const nav=document.createElement('button');nav.type='button';nav.dataset.go='ai';nav.setAttribute('aria-label','AI scene studio');nav.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></svg>AI';nav.onclick=()=>go('ai');ui('app').querySelector('.bottom-nav').append(nav);
const R=SmartEaseAICartRecipe,hex=n=>'#'+n.toString(16).padStart(6,'0'),KEY='smartease-ai-scene-library-v1';
let displayController=null,spOwner=null,context=null,lastNColor=null,view=null;
const map=()=>({zones:Object.fromEntries(CZ_DEFS.map(z=>[z.id,{channels:[...czState.zones[z.id].channels]}])),activeOutputs:[...czState.activeOutputs]});
const calibration=()=>({orders:spSavedChipOrders,gains:spRgbBalance,software:hauntedColorFix,manual:hauntedManualMatches});
const sp=SmartEaseAICartDeviceBridge.create({spReady:()=>canSend()&&transport!=='demo',session:()=>bleSession,ensureChipColors:spEnsureChipColors,enqueuePackets,colorCommand:hauntedColorCommand,packet,maskFor,currentMapping:map,currentCalibration:calibration});
const ux=SmartEaseUXOwnerSend.binding(cartDevices[1]);
function capture(){
 if(page!=='ai'||document.visibilityState==='hidden')throw Error('Open AI scene studio in the foreground.');
 if(!canSend()||transport==='demo')throw Error('Connect SP608E in Devices first.');
 const n=cartDevices[2];if(n.profile!=='melk-of21'||!n.controlReady)throw Error('Connect NOKINS / MELK-OF21 in Devices first.');
 const u=ux.current();SmartEaseUXExperimentalUploader.capability(u);
 const m=SmartEaseAICartDeviceBridge.mapping(map());
 // Existing calibration helper may finalize its legacy metadata before capture.
 // No BLE command here; later changes remain strictly guarded.
 for(const port of m.ports)spChipRecord(port);
 return context={generation:applyGeneration,sp:bleSession,n:n.ownerLink.generation,nDevice:n.ownerLink.device,nId:n.ownerLink.identity?.id,nChar:n.ownerLink.characteristic,uId:u.deviceId,uGeneration:u.generation,uChar:u.characteristic,mapping:JSON.stringify(m),calibration:JSON.stringify(calibration()),reverse:preferences.gradientChase.reverseCanopy,speed:preferences.gradientChase.speed};
}
function current(c){try{const n=cartDevices[2],u=ux.current();return !!c&&page==='ai'&&document.visibilityState!=='hidden'&&c.generation===applyGeneration&&canSend()&&transport!=='demo'&&bleSession===c.sp&&n.profile==='melk-of21'&&n.controlReady&&n.ownerLink.generation===c.n&&n.ownerLink.device===c.nDevice&&n.ownerLink.identity?.id===c.nId&&n.ownerLink.characteristic===c.nChar&&u.connected&&u.deviceId===c.uId&&u.generation===c.uGeneration&&u.characteristic===c.uChar&&JSON.stringify(SmartEaseAICartDeviceBridge.mapping(map()))===c.mapping&&JSON.stringify(calibration())===c.calibration&&preferences.gradientChase.reverseCanopy===c.reverse&&preferences.gradientChase.speed===c.speed;}catch{return false;}}
function rows(t){const by={'front-bumper':'front',canopy:'canopy','left-under':'under','right-under':'under','rear-bumper':'rear'};return Object.fromEntries(Object.entries(by).map(([id,k])=>[id,{on:true,color:hex(t.groups[k].color),brightness:t.brightness,effect:8}]));}
const runtime=SmartEaseAICartRuntime.create({captureContext:capture,isCurrent:current,frameMs:150,
 async prepareDisplay(recipe,guard){
  const generated=R.generate(recipe),library={kind:'studioDisplay',project:generated.project};
  displayController?.dispose();
  displayController=SmartEaseUXSelectedProgramController.create({adapter:cartDevices[1],readLibrary:()=>library,compile:SmartEaseStudioDisplayPlan.compile,valid:guard,onState:s=>{view?.setTransfer?.(s);}});
  if(!await displayController.prepare()||!guard())throw Error(displayController.snapshot().reason||'Display preparation stopped.');
  const s=displayController.snapshot(),result=await displayController.send({admission:s.admission,deviceId:s.owner.deviceId,generation:s.owner.generation});
  if(!guard()||result?.state!=='complete')throw Error(result?.reason||'Display transfer stopped; lights were not started.');
  return{complete:true,cached:result.diagnostic?.programs?.[0]?.cached===true};
 },
 async startLights(recipe,guard){
  spOwner=sp.capture({guard,directionPreference:{reverseCanopy:context.reverse},speed:context.speed});
  if(!await spOwner.initialize(rows(R.timeline(recipe,0)))||!guard())throw Error(spOwner.snapshot().reason||'SP setup stopped.');
  const n=cartDevices[2],color=hex(R.timeline(recipe,0).color);
  if(!await n.ownerCommands([{kind:'power',value:true},{kind:'brightness',value:recipe.brightness},{kind:'color',value:color}],guard)||!guard())throw Error('NOKINS setup stopped; earlier display or lights may remain.');
  lastNColor=color;return true;
 },buildFrame:(recipe,t)=>R.timeline(recipe,t.elapsedMs),
 async writeZoneFrame(frame,guard){
  if(!await spOwner.write(rows(frame))||!guard())throw Error(spOwner.snapshot().reason||'Mapped lighting stopped.');
  const color=hex(frame.color);if(color!==lastNColor){if(!await cartDevices[2].ownerCommand('color',color,undefined,guard)||!guard())throw Error('NOKINS color update stopped.');lastNColor=color;}
  return true;
 }});
function stop(reason='AI scene stopped; last colors and display animation remain.'){
 const before=runtime.snapshot(),owned=before.busy||['preparing','starting','running','stopping'].includes(before.state);runtime.stop(reason);if(owned){spOwner?.cancel(reason);displayController?.cancel(reason);cartDevices[2].cancelOwner();}
}
const proxy={start(recipe){if(runtime.snapshot().busy)return runtime.start(recipe);cancelPlayback();SmartEaseBackupRestore.invalidate();return runtime.start(recipe);},stop,snapshot:runtime.snapshot,subscribe:runtime.subscribe};
view=SmartEaseAICartStudio.create(root,{recipeModel:R,runtime:proxy,readDefaults:()=>R.defaults(),readMapping:()=>({zones:CZ_DEFS.map(z=>({label:z.name,channelLabel:czState.zones[z.id].channels.map(n=>'CH'+n).join(', ')||'Unmapped'})),cabinLabel:'SP608E canopy · '+(preferences.gradientChase.reverseCanopy?'reverse':'forward')+' · saved native Chase speed '+preferences.gradientChase.speed}),loadStore:()=>localStorage.getItem(KEY),saveStore:text=>localStorage.setItem(KEY,text),readReport:()=>displayController?.report()||null,onMap:()=>go('map')});
window.SmartEaseAICart={enter(){if(page!=='ai')return false;root.hidden=false;view.enter();return true;},leave(){stop('Left AI scene studio; last colors and display remain.');view.leave();root.hidden=true;},stop,refresh:()=>runtime.refresh(),state:runtime.snapshot,report:()=>displayController?.report()||null};
window.addEventListener('smartease-of21-state',()=>runtime.refresh());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stop('Page hidden; last colors and display remain.');});window.addEventListener('pagehide',()=>stop('Page left; last colors and display remain.'));
if(page==='ai')go('ai','pop');
})();
