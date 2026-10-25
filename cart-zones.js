'use strict';
/* SmartEase Golf Cart Zones
 * Additional opt-in interface to the existing SP608E controller.
 * Only documented commands are sent through the existing serial BLE queue.
 * Mapping and drafted/saved zone scenes live in browser localStorage.
 * No SP608E firmware writes or onboard scene-save commands.
 */
const CZ_DEFS=[
 {id:'front-left',name:'Front left',x:23,y:18,order:0,type:'front'},
 {id:'front-right',name:'Front right',x:77,y:18,order:0,type:'front'},
 {id:'canopy-left',name:'Canopy left',x:19,y:41,order:1,type:'canopy'},
 {id:'canopy-right',name:'Canopy right',x:81,y:41,order:1,type:'canopy'},
 {id:'under-left',name:'Underglow left',x:19,y:64,order:2,type:'underglow'},
 {id:'under-right',name:'Underglow right',x:81,y:64,order:2,type:'underglow'},
 {id:'rear-left',name:'Rear left',x:23,y:85,order:3,type:'rear'},
 {id:'rear-right',name:'Rear right',x:77,y:85,order:3,type:'rear'}
];
const CZ_SCENE_EFFECTS=[
 {id:25,name:'Solid color',color:true,speed:false},
 {id:1,name:'Rainbow',color:false,speed:true},
 {id:3,name:'Twinkling stars',color:true,speed:true},
 {id:6,name:'Comet',color:true,speed:true},
 {id:7,name:'Color wave',color:true,speed:true},
 {id:8,name:'Chase',color:true,speed:true},
 {id:16,name:'Wiping',color:true,speed:true},
 {id:17,name:'Breathing',color:true,speed:true}
];
const CZ_STORE='smartease-golf-cart-zones-v1';
const CZ_SUGGESTED_OUTPUTS=[1,2,3,4,5]; // Unverified starting assumption: confirm actual five connected ports.
const CZ_PRESETS={
 halloween:{name:'Halloween Cart',front:{color:'#46ef77',effect:25},canopy:{color:'#a24aec',effect:3},underglow:{color:'#a24aec',effect:7},rear:{color:'#ff751e',effect:25}},
 canopy:{name:'Canopy Starfield',canopy:{color:'#a24aec',effect:3}},
 underglow:{name:'Underglow Teal',front:{color:'#00bfae',effect:25},underglow:{color:'#00bfae',effect:7},rear:{color:'#00bfae',effect:25}},
 cruise:{name:'Evening Cruise',front:{color:'#40e9ca',effect:25},canopy:{color:'#278dff',effect:17},underglow:{color:'#32bba8',effect:25},rear:{color:'#d9aaff',effect:25}},
 rainbow:{name:'Full Cart Rainbow',front:{color:'#46ef77',effect:1},canopy:{color:'#a24aec',effect:1},underglow:{color:'#ff751e',effect:1},rear:{color:'#46ef77',effect:1}},
 off:{name:'All Mapped Off'}
};
const czId=id=>document.getElementById(id);
const czDefaultRow=()=>({on:false,effect:25,color:'#49e3d2',brightness:45,speed:5});
const czFresh=()=>({
 activeOutputs:[...CZ_SUGGESTED_OUTPUTS],
 zones:Object.fromEntries(CZ_DEFS.map(z=>[z.id,{name:z.name,channels:[]}])),
 draft:Object.fromEntries(CZ_DEFS.map(z=>[z.id,czDefaultRow()])),
 draftName:'My Golf Cart Scene',
 scenes:[],
 selected:CZ_DEFS[0].id
});
function czValidRow(raw){
 const r=czDefaultRow();
 if(!raw||typeof raw!=='object')return r;
 r.on=raw.on===true;
 const fx=Number(raw.effect);
 if(CZ_SCENE_EFFECTS.some(e=>e.id===fx))r.effect=fx;
 if(typeof raw.color==='string'&&/^#[a-f0-9]{6}$/i.test(raw.color))r.color=raw.color.toLowerCase();
 if(Number.isFinite(Number(raw.brightness)))r.brightness=Math.max(0,Math.min(100,Math.round(Number(raw.brightness))));
 if(Number.isFinite(Number(raw.speed)))r.speed=Math.max(1,Math.min(10,Math.round(Number(raw.speed))));
 return r;
}
function czValidScene(raw){
 if(!raw||typeof raw!=='object'||typeof raw.name!=='string')return null;
 const rows=Object.fromEntries(CZ_DEFS.map(z=>[z.id,czValidRow(raw.rows?.[z.id])]));
 return {id:String(raw.id||Date.now()).slice(0,50),name:raw.name.trim().slice(0,40)||'Cart scene',rows};
}
function czSanitize(raw){
 const d=czFresh();
 if(!raw||typeof raw!=='object')return d;
 if(Array.isArray(raw.activeOutputs))d.activeOutputs=[...new Set(raw.activeOutputs.filter(n=>Number.isInteger(n)&&n>=1&&n<=8))].sort((a,b)=>a-b);
 const occupied=new Set();
 for(const z of CZ_DEFS){
  const v=raw.zones?.[z.id];if(!v||typeof v!=='object')continue;
  if(typeof v.name==='string'&&v.name.trim())d.zones[z.id].name=v.name.trim().slice(0,32);
  if(Array.isArray(v.channels)){
   for(const n of v.channels){
    if(Number.isInteger(n)&&n>=1&&n<=8&&!occupied.has(n)){
     occupied.add(n);d.zones[z.id].channels.push(n);
    }
   }
  }
 }
 for(const z of CZ_DEFS)d.draft[z.id]=czValidRow(raw.draft?.[z.id]);
 if(typeof raw.draftName==='string')d.draftName=raw.draftName.slice(0,40);
 if(Array.isArray(raw.scenes))d.scenes=raw.scenes.slice(0,24).map(czValidScene).filter(Boolean);
 if(CZ_DEFS.some(z=>z.id===raw.selected))d.selected=raw.selected;
 return d;
}
let czState=czFresh(),czApplying=false;
try{czState=czSanitize(JSON.parse(localStorage.getItem(CZ_STORE)||'null'));}catch{}
function czSave(){
 try{localStorage.setItem(CZ_STORE,JSON.stringify(czState));return true;}
 catch(err){czStatus('Could not save this setup locally: '+err.message,true);return false;}
}
function czStatus(s,isError=false){
 const el=czId('czStatus');if(!el)return;
 el.textContent=s;el.style.borderColor=isError?'#af5960':'#29545a';
}
function czActiveOutputSet(){return new Set(czState.activeOutputs);}
function czValidAssigned(zoneId){
 const active=czActiveOutputSet();return czState.zones[zoneId].channels.filter(n=>active.has(n));
}
function czUniqueOutputs(){
 const selected=new Set();
 for(const z of CZ_DEFS)for(const n of czValidAssigned(z.id))selected.add(n);
 return [...selected].sort((a,b)=>a-b);
}
function czMappedOrder(){
 return CZ_DEFS.slice().sort((a,b)=>a.order-b.order).flatMap(z=>czValidAssigned(z.id).slice().sort((a,b)=>a-b));
}
function czZoneForChannel(num){
 return CZ_DEFS.find(z=>czState.zones[z.id].channels.includes(num))?.id||null;
}
function czRenderActiveOutputs(){
 const target=czId('czActiveOutputs');if(!target)return;
 target.replaceChildren();
 for(let n=1;n<=8;n++){
  const label=document.createElement('label');label.className='cz-active-option'+(czState.activeOutputs.includes(n)?' is-active':'');
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=czState.activeOutputs.includes(n);
  checkbox.setAttribute('aria-label','Output '+n+' is physically wired');
  const text=document.createElement('span');text.textContent='CH '+n;label.append(checkbox,text);
  checkbox.addEventListener('change',()=>{
   if(czApplying){czStatus('Finish applying the current scene first.',true);czRenderActiveOutputs();return;}
   const next=new Set(czState.activeOutputs);
   if(checkbox.checked)next.add(n);else next.delete(n);
   czState.activeOutputs=[...next].sort((a,b)=>a-b);
   czSave();czRenderAll();czCheckHalloweenOrder();
   czStatus('Active outputs: '+(czState.activeOutputs.map(x=>'CH'+x).join(', ')||'none')+'. Inactive channels are excluded from testing, cart scenes and Halloween. Previous mappings are retained.');
  });target.append(label);
 }
 const count=czState.activeOutputs.length;
 czId('czActiveCount').textContent=count+' of 8 selected';
 czId('czActiveHint').textContent=count?'Confirm these '+count+' ports match the actual wired SP608E sockets. Unchecked ports receive no Cart/Halloween commands.':'No outputs selected. Choose the five physically connected ports.';
 const select=czId('czIdentifyOutput'),previous=select.value;
 select.replaceChildren();for(const n of czState.activeOutputs)select.add(new Option('Controller output '+n,n));
 if(czState.activeOutputs.includes(Number(previous)))select.value=previous;
 czId('czIdentify').disabled=!count;
}
function czCheckHalloweenOrder(){
 const input=czId('hauntedOrder');if(!input)return;
 const nums=input.value.split(/[\s,]+/).filter(Boolean).map(Number);
 if(nums.some(n=>!czState.activeOutputs.includes(n))){
  czId('hauntedVerified').checked=false;hauntedButtons();
  log('Halloween references ports marked unwired in Golf Cart Zones. Update front-to-back order.','warn');
 }
}
window.smarteaseCartActiveOutputs=()=>[...czState.activeOutputs];
function czPrettyChannels(nums){return nums.length?'CH '+nums.join(', '):'Not mapped';}
function czDotColor(row){return row.on?row.color:'#49e3d2';}
function czRenderMap(){
 const container=czId('czHotspots');if(!container)return;
 container.replaceChildren();
 for(const zone of CZ_DEFS){
  const mapped=czState.zones[zone.id],row=czState.draft[zone.id],live=czValidAssigned(zone.id);
  const btn=document.createElement('button');btn.type='button';
  btn.className='cz-hotspot'+(live.length?' is-mapped':'')+(czState.selected===zone.id?' is-selected':'');
  btn.style.setProperty('--x',zone.x+'%');btn.style.setProperty('--y',zone.y+'%');
  btn.style.setProperty('--cz-color',czDotColor(row));
  const name=document.createElement('strong');name.textContent=mapped.name;
  const subtitle=document.createElement('small');subtitle.textContent=live.length?live.map(n=>'CH'+n).join('+'):mapped.channels.length?'Ports inactive':'Tap to map';
  btn.append(name,subtitle);
  btn.title=mapped.name+' — '+czPrettyChannels(live)+(live.length!==mapped.channels.length?' (inactive mapping retained)':'');
  btn.setAttribute('aria-label',mapped.name+', '+czPrettyChannels(mapped.channels));
  btn.setAttribute('aria-pressed',String(czState.selected===zone.id));
  btn.addEventListener('click',()=>{
   czState.selected=zone.id;czSave();czRenderMap();czRenderEditor();
  });
  container.append(btn);
 }
 const outputs=czUniqueOutputs(),assigned=CZ_DEFS.filter(z=>czValidAssigned(z.id).length).length;
 czId('czMapCount').textContent=assigned+' cart areas mapped · '+outputs.length+' of '+czState.activeOutputs.length+' active ports assigned';
 czId('czCurrentOrder').textContent=czMappedOrder().length?'Front-to-rear outputs: '+czMappedOrder().map(x=>'CH'+x).join(' → '):'No channels mapped yet';
 czId('czToHalloween').disabled=!outputs.length;
 czId('czSelectMapped').disabled=!czValidAssigned(czState.selected).length;
}
function czRenderEditor(){
 const zone=CZ_DEFS.find(z=>z.id===czState.selected)||CZ_DEFS[0];
 const curr=czState.zones[zone.id];
 czId('czZoneTitle').textContent=curr.name;
 czId('czZoneHint').textContent='Golf cart '+zone.type+' · physical area; mapping does not require changing wiring';
 czId('czZoneLabel').value=curr.name;
 const host=czId('czChannelCheckboxes');host.replaceChildren();
 const inactive=curr.channels.filter(n=>!czState.activeOutputs.includes(n));
 const note=czId('czInactiveMappings');note.hidden=!inactive.length;
 note.textContent=inactive.length?'Preserved inactive mapping: '+inactive.map(n=>'CH'+n).join(', ')+'. Re-enable the wired output to use it.':'';
 for(const n of czState.activeOutputs){
  const other=czZoneForChannel(n),checked=curr.channels.includes(n);
  const label=document.createElement('label');label.className='cz-output-option';
  const check=document.createElement('input');check.type='checkbox';check.checked=checked;
  const span=document.createElement('span');
  span.textContent='Output '+n+(other&&other!==zone.id?' · '+czState.zones[other].name:'')+(checked?' ✓':'');
  label.append(check,span);
  check.addEventListener('change',()=>{
   if(check.checked){
    if(other&&other!==zone.id){
     if(!confirm('Output '+n+' is currently mapped to "'+czState.zones[other].name+'". Move it to "'+curr.name+'"?')){
      czRenderEditor();return;
     }
     czState.zones[other].channels=czState.zones[other].channels.filter(v=>v!==n);
    }
    curr.channels.push(n);curr.channels=[...new Set(curr.channels)].sort((a,b)=>a-b);
   }else curr.channels=curr.channels.filter(v=>v!==n);
   czSave();czRenderMap();czRenderEditor();czRenderSceneRows();
   czStatus('Updated '+curr.name+': '+czPrettyChannels(curr.channels)+'. Scenes follow this mapping automatically.');
  });
  host.append(label);
 }
 czId('czSelectedChannels').textContent=czPrettyChannels(czValidAssigned(zone.id));
 czId('czSelectMapped').disabled=!czValidAssigned(zone.id).length;
}
function czIdentifyOutput(){
 if(czApplying){czStatus('Finish applying the current scene first.',true);return;}
 if(!canSend()){czStatus('Connect to the SP608E before identifying an output.',true);return;}
 if(document.visibilityState==='hidden'){czStatus('Keep Bluefy visible while identifying a channel.',true);return;}
 const n=Number(czId('czIdentifyOutput').value);
 if(!Number.isInteger(n)||!czState.activeOutputs.includes(n)){czStatus('Choose one of the physically connected outputs.',true);return;}
 const mask=maskFor(n-1);
 if(!confirm('Temporarily turn SP608E output '+n+' solid teal at 45% to identify its cart location? This changes its current lighting.'))return;
 czStatus('Identifying CH'+n+'… watch which part of the parked cart illuminates.');
 const jobs=[packet(0x83,[mask,25]),packet(0x85,[mask,115]),packet(0x82,[mask,1]),hauntedColorCommand(n,'#49e3d2')];
 enqueuePackets(jobs,'Golf cart identify output '+n).then(ok=>{
  czStatus(ok?'CH'+n+' identification sent. Select the matching cart zone and check Output '+n+'. Restore your saved scene afterward.':'Identification interrupted. Check Bluefy Bluetooth diagnostics.',!ok);
 });
}
function czRenameZone(){
 const zone=czState.zones[czState.selected],name=czId('czZoneLabel').value.trim().slice(0,32);
 if(!name){czStatus('Enter a zone name first.',true);return;}
 zone.name=name;czSave();czRenderMap();czRenderEditor();czRenderSceneRows();
 czStatus('Renamed this physical zone to '+name+'. Existing scene assignments were retained.');
}
function czGetFx(id){return CZ_SCENE_EFFECTS.find(e=>e.id===id)||CZ_SCENE_EFFECTS[0];}
function czRenderSceneRows(){
 const host=czId('czSceneRows');host.replaceChildren();
 const enabled=CZ_DEFS.filter(z=>czState.draft[z.id].on).length;
 czId('czDraftSummary').textContent=enabled+' cart areas on · '+CZ_DEFS.filter(z=>czValidAssigned(z.id).length).length+' mapped areas · '+czState.activeOutputs.length+' connected outputs. Inactive ports receive no commands.';
 for(const z of CZ_DEFS){
  const row=czState.draft[z.id],zmap=czState.zones[z.id],live=czValidAssigned(z.id);
  const item=document.createElement('div');
  item.className='cz-scene-row'+(row.on?'':' off')+(live.length?'':' missing');
  const head=document.createElement('div');head.className='cz-scene-row-head';
  const titleWrap=document.createElement('div');titleWrap.className='cz-scene-row-title';
  const swatch=document.createElement('span');swatch.className='cz-color-disc';swatch.style.background=row.color;
  const txt=document.createElement('div');
  const title=document.createElement('div');title.className='cz-scene-row-name';title.textContent=zmap.name;
  const sub=document.createElement('div');sub.className='cz-scene-row-sub';sub.textContent=czPrettyChannels(live)+(zmap.channels.length>live.length?' · inactive ports hidden':'');
  txt.append(title,sub);titleWrap.append(swatch,txt);
  const power=document.createElement('input');power.type='checkbox';power.checked=row.on;
  power.setAttribute('aria-label','Enable '+zmap.name+' in this scene');
  power.addEventListener('change',()=>{row.on=power.checked;czSave();czRenderSceneRows();czRenderMap();});
  head.append(titleWrap,power);
  const group=document.createElement('div');group.className='cz-scene-row-controls';
  const effLabel=document.createElement('label');effLabel.textContent='Animation';
  const fx=document.createElement('select');fx.setAttribute('aria-label',zmap.name+' animation');
  for(const f of CZ_SCENE_EFFECTS)fx.add(new Option(f.name,f.id));
  fx.value=String(row.effect);
  fx.addEventListener('change',()=>{row.effect=Number(fx.value);czSave();czRenderSceneRows();});
  effLabel.append(fx);
  const colorLabel=document.createElement('label');colorLabel.textContent='Color';
  const picker=document.createElement('input');picker.type='color';picker.value=row.color;
  picker.disabled=!czGetFx(row.effect).color;
  picker.setAttribute('aria-label',zmap.name+' color');
  picker.addEventListener('input',()=>{row.color=picker.value;swatch.style.background=row.color;czSave();czRenderMap();});
  colorLabel.append(picker);
  const speedLabel=document.createElement('label');speedLabel.textContent='Speed';
  const speed=document.createElement('select');speed.setAttribute('aria-label',zmap.name+' animation speed');
  for(const n of [1,3,5,7,10])speed.add(new Option(n===1?'Slowest':n===10?'Fastest':String(n)+'/10',n));
  if(![1,3,5,7,10].includes(row.speed))speed.add(new Option(String(row.speed)+'/10',row.speed));
  speed.value=String(row.speed);speed.disabled=!czGetFx(row.effect).speed;
  speed.addEventListener('change',()=>{row.speed=Number(speed.value);czSave();});
  speedLabel.append(speed);
  group.append(effLabel,colorLabel,speedLabel);
  const foot=document.createElement('div');foot.className='cz-scene-row-foot';
  const brightLabel=document.createElement('label');brightLabel.textContent='Brightness ';
  const value=document.createElement('span');value.textContent=row.brightness+'%';
  const bright=document.createElement('input');bright.type='range';bright.min='0';bright.max='100';bright.step='1';bright.value=row.brightness;
  bright.setAttribute('aria-label',zmap.name+' brightness');
  bright.addEventListener('input',()=>{row.brightness=Number(bright.value);value.textContent=bright.value+'%';czSave();});
  brightLabel.append(bright,value);foot.append(brightLabel);
  item.append(head,group,foot);host.append(item);
 }
}
function czChoosePreset(){
 const key=czId('czTemplate').value,preset=CZ_PRESETS[key];
 if(!preset)return;
 if(!confirm('Load '+preset.name+' into the scene editor? This replaces the current unsaved draft but does NOT send commands to the cart.'))return;
 for(const z of CZ_DEFS){
  const type=preset[z.type],row=czDefaultRow();
  if(type){row.on=true;row.effect=type.effect;row.color=type.color;row.brightness=z.type==='canopy'?48:65;row.speed=5;}
  czState.draft[z.id]=row;
 }
 czState.draftName=preset.name;czSave();
 czId('czDraftName').value=czState.draftName;
 czRenderSceneRows();czRenderMap();
 czStatus('Loaded '+preset.name+' as a local draft. Review each zone, then Apply or Save.');
}
function czApplySceneRows(rows,name){
 if(czApplying){czStatus('A scene is already being applied.',true);return;}
 if(!canSend()){czStatus('Connect to SP608E before applying '+name+'. You can save the draft offline.',true);return;}
 if(document.visibilityState==='hidden'){czStatus('Keep Bluefy in the foreground during scene playback.',true);return;}
 const packets=[];
 let outputs=0;
 for(const z of CZ_DEFS){
  const assigned=czValidAssigned(z.id);
  if(!assigned.length)continue;
  const r=czValidRow(rows[z.id]),mask=assigned.reduce((m,n)=>m|maskFor(n-1),0);
  outputs+=assigned.length;
  if(!r.on){
   packets.push(packet(0x82,[mask,0]));continue;
  }
  const fx=czGetFx(r.effect);
  for(const n of assigned)packets.push(packet(0x83,[maskFor(n-1),fx.id]));
  packets.push(packet(0x82,[mask,1]));
  if(fx.color)for(const n of assigned)packets.push(hauntedColorCommand(n,r.color));
  packets.push(packet(0x85,[mask,Math.round(r.brightness*255/100)]));
  if(fx.speed)packets.push(packet(0x86,[mask,r.speed]));
 }
 if(!outputs){czStatus('Map at least one SP608E output on the cart diagram first.',true);return;}
 if(!confirm('Apply "'+name+'" to '+outputs+' mapped controller outputs using '+packets.length+' Bluetooth writes? Other unmapped outputs and onboard saved scenes will not be changed.'))return;
 czApplying=true;czId('czApplyDraft').disabled=true;
 czStatus('Applying '+name+' to '+outputs+' mapped outputs · '+packets.length+' serialized commands. Keep Bluefy active…');
 enqueuePackets(packets,'Golf cart zone scene '+name).then(ok=>{
  czStatus(ok?name+' applied. Factory effects now run on the controller; the scene itself is saved only in this browser.':'Bluetooth interrupted while applying '+name+'. Reconnect and inspect the lights.',!ok);
 }).catch(e=>{
  czStatus('Could not apply scene: '+e.message,true);
 }).finally(()=>{czApplying=false;czId('czApplyDraft').disabled=false;});
}
function czSaveDraft(){
 const name=czId('czDraftName').value.trim().slice(0,40);
 if(!name){czStatus('Give this cart scene a name before saving.',true);return;}
 if(czState.scenes.length>=24){czStatus('The local scene list is full (24). Delete an old scene first.',true);return;}
 const scene={id:'cz-'+Date.now()+'-'+Math.floor(Math.random()*1e6),name,rows:Object.fromEntries(CZ_DEFS.map(z=>[z.id,{...czState.draft[z.id]}]))};
 czState.scenes.push(scene);czState.draftName=name;
 if(!czSave())return;
 czRenderSaved();
 czStatus('Saved '+name+' locally on this phone. It will follow your cart zone mapping; it was not uploaded into SP608E memory.');
}
function czRenderSaved(){
 const host=czId('czSavedScenes');host.replaceChildren();
 if(!czState.scenes.length){
  const empty=document.createElement('div');empty.className='cz-empty';
  empty.textContent='No saved cart scenes yet. Choose a preset or build a scene above, then Save local scene.';
  host.append(empty);return;
 }
 for(const scene of czState.scenes){
  const item=document.createElement('div');item.className='cz-saved-item';
  const left=document.createElement('div');const name=document.createElement('div');name.className='cz-saved-title';name.textContent=scene.name;
  const sub=document.createElement('div');sub.className='cz-saved-sub';sub.textContent=CZ_DEFS.filter(z=>scene.rows[z.id]?.on).length+' zones lit · saved locally';
  left.append(name,sub);
  const actions=document.createElement('div');actions.className='cz-saved-ops';
  const load=document.createElement('button');load.type='button';load.className='button';load.textContent='Edit';load.onclick=()=>{
   czState.draft=Object.fromEntries(CZ_DEFS.map(z=>[z.id,czValidRow(scene.rows[z.id])]));
   czState.draftName=scene.name;czId('czDraftName').value=scene.name;
   czSave();czRenderSceneRows();czRenderMap();czStatus('Loaded '+scene.name+' for editing. No Bluetooth commands sent.');
   czId('czSceneDesigner').scrollIntoView({behavior:'smooth',block:'start'});
  };
  const play=document.createElement('button');play.type='button';play.className='button primary';play.textContent='Apply';play.onclick=()=>czApplySceneRows(scene.rows,scene.name);
  const del=document.createElement('button');del.type='button';del.className='button danger';del.textContent='Delete';del.onclick=()=>{
   if(!confirm('Delete local scene "'+scene.name+'"? This will NOT touch the SP608E.'))return;
   czState.scenes=czState.scenes.filter(s=>s.id!==scene.id);
   czSave();czRenderSaved();czStatus('Deleted local scene '+scene.name+'.');
  };
  actions.append(load,play,del);item.append(left,actions);host.append(item);
 }
}
function czUseHalloween(){
 const order=czMappedOrder();
 if(!order.length){czStatus('Map some SP608E outputs first.',true);return;}
 if(hauntedRunning){czStatus('Stop the live Halloween show before changing its output order.',true);return;}
 czId('hauntedOrder').value=order.join(',');
 czId('hauntedOrder').dispatchEvent(new Event('input',{bubbles:true}));
 czId('hauntedVerified').checked=false;
 hauntedButtons();
 switchTab('scenes');
 czStatus('Copied front-to-back mapped outputs '+order.join(', ')+' to Haunted Surge. Verify positions and check the safety box before Play.');
 czId('hauntedCard').scrollIntoView({behavior:'smooth',block:'start'});
 notify('Cart zone order copied to Halloween. Verify outputs before playing.');
}
function czExport(){
 const data={format:'SmartEase-Cart-Zones-v1',created:new Date().toISOString(),data:czState};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='SmartEase_Golf_Cart_Zones.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
 czStatus('Exported zone map and locally saved scenes as JSON.');
}
async function czImport(ev){
 const file=ev.target.files?.[0];ev.target.value='';
 if(!file)return;
 try{
  if(file.size>250000)throw Error('File too large');
  const obj=JSON.parse(await file.text());
  if(!obj||obj.format!=='SmartEase-Cart-Zones-v1'||!obj.data||typeof obj.data!=='object')throw Error('Not a SmartEase zone backup');
  if(!confirm('Replace current cart mapping and local zone scenes with this backup? Existing SP608E onboard scenes are unaffected.'))return;
  czState=czSanitize(obj.data);
  czSave();czRenderAll();
  czStatus('Imported cart zone backup. Verify the physical output mapping before running a scene.');
 }catch(e){czStatus('Import failed: '+e.message,true);}
}
function czRenderAll(){
 czRenderActiveOutputs();czRenderMap();czRenderEditor();czRenderSceneRows();czRenderSaved();
 czId('czDraftName').value=czState.draftName;
}
function czInstall(){
 if(!czId('czZoneMap'))return;
 czId('czZoneLabelSave').addEventListener('click',czRenameZone);
 czId('czIdentify').addEventListener('click',czIdentifyOutput);
 czId('czSelectMapped').addEventListener('click',()=>{
  const nums=czValidAssigned(czState.selected);
  if(!nums.length)return;
  selectMask(nums.reduce((m,n)=>m|maskFor(n-1),0));switchTab('effects');
  notify('Selected '+czState.zones[czState.selected].name+' in Effects.');
 });
 czId('czToHalloween').addEventListener('click',czUseHalloween);
 czId('czTemplate').addEventListener('change',czChoosePreset);
 czId('czDraftName').addEventListener('input',()=>{
  czState.draftName=czId('czDraftName').value.slice(0,40);czSave();
 });
 czId('czSaveDraft').addEventListener('click',czSaveDraft);
 czId('czApplyDraft').addEventListener('click',()=>czApplySceneRows(czState.draft,czId('czDraftName').value.trim()||'Cart zone draft'));
 czId('czExport').addEventListener('click',czExport);
 czId('czImport').addEventListener('change',czImport);
 czId('czRestore').addEventListener('click',()=>{
  if(!canSend()){czStatus('Connect the SP608E before recalling your saved onboard scene.',true);return;}
  recallScene(Number(czId('czRestoreScene').value));
  czStatus('Requested onboard SP608E scene '+(Number(czId('czRestoreScene').value)+1)+'. Verify on the cart.');
 });
 czRenderAll();
 czCheckHalloweenOrder();
 czStatus('Ports 1–5 are a starting assumption, NOT verified. Confirm which five outputs are actually wired, then assign their physical cart locations.');
 const params=new URLSearchParams(location.search);
 if(params.get('tab')==='zones')switchTab('zones');
}
czInstall();
