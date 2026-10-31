/* Ordinary single-device SP608E scenes. Injected guarded callback only; no BLE. */
'use strict';
(function(root){
 const validIndex=i=>Number.isInteger(i)&&i>=0&&i<9;
 const frame=(op,value)=>Object.freeze([0x88,op,1,value]);
 function create(host,options={}){
  const doc=host.ownerDocument,win=doc.defaultView;
  let active=false,epoch=0,operation=0,state=null,names=[],pending=false,dialog=null,notice='',pointer=null,suppressClick=false,latched=false;
  const section=doc.createElement('section');section.className='bxs-scenes';host.append(section);
  const header=options.headerHost||section;
  const menu=doc.createElement('button');menu.type='button';menu.className='bxs-menu material';menu.textContent='\ue404';menu.setAttribute('aria-label','Device menu');header.append(menu);
  const cards=doc.createElement('div');cards.className='bxs-scene-list';section.append(cards);
  const loop=doc.createElement('button');loop.type='button';loop.className='bxs-loop material';loop.textContent='\ue0c1';loop.setAttribute('aria-label','Loop scenes');section.append(loop);
  const status=doc.createElement('p');status.className='bxs-scene-status';status.setAttribute('role','status');section.append(status);
  function cancelPointer(){if(pointer?.timer)win.clearTimeout(pointer.timer);pointer=null;}
  function closeDialog(){if(dialog){dialog.remove();dialog=null;}}
  function invalidate(){operation++;cancelPointer();closeDialog();pending=false;}
  function valid(stamp=epoch){if(!active||stamp!==epoch||latched||doc.visibilityState==='hidden')return false;let allowed=false;try{allowed=typeof options.valid==='function'&&options.valid(state)===true;}catch{}if(!allowed){latched=true;invalidate();return false;}return true;}
  const ready=()=>valid()&&state.enabled&&state.ordinary&&!pending;
  const menuReady=()=>valid()&&state.ordinary&&!pending&&(typeof options.menuReady==='function'?options.menuReady()===true:state.enabled);
  function render(){if(!active)return;const ok=ready();cards.replaceChildren();names.forEach((name,i)=>{
   const button=doc.createElement('button');button.type='button';button.className='bxs-scene';button.dataset.scene=String(i);button.disabled=!ok;
   const label=doc.createElement('span');label.textContent=name;label.className='bxs-scene-name';button.append(label);const number=doc.createElement('span');number.className='bxs-scene-number';number.textContent=String(i+1);button.append(number);
   button.onclick=()=>{if(suppressClick){suppressClick=false;return;}recall(i);};
   button.oncontextmenu=e=>{e.preventDefault();if(state.ordinary)renameMenu(i);};
   button.onkeydown=e=>{if(e.key==='F2'||(e.shiftKey&&e.key==='F10')){e.preventDefault();renameMenu(i);}};
   button.onpointerdown=e=>{if(!ready()||!state.ordinary||e.button!==0)return;cancelPointer();suppressClick=false;const p={id:e.pointerId,x:e.clientX,y:e.clientY,stamp:epoch,fired:false,element:button};pointer=p;
    p.timer=win.setTimeout(()=>{if(pointer!==p||!valid(p.stamp)||!state.enabled)return;p.fired=true;suppressClick=true;renameMenu(i);},500);};
   button.onpointermove=e=>{if(pointer&&e.pointerId===pointer.id&&!pointer.fired&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>18){cancelPointer();suppressClick=true;}};
   button.onpointerup=()=>cancelPointer();button.onpointercancel=()=>{cancelPointer();suppressClick=true;};button.onlostpointercapture=()=>cancelPointer();cards.append(button);
  });loop.disabled=!ok||typeof state.loop!=='boolean';loop.dataset.on=String(state.loop===true);loop.setAttribute('aria-pressed',String(state.loop===true));menu.disabled=!menuReady();status.textContent=notice;}
  async function command(kind,index){if(!ready()||typeof options.onCommand!=='function'||(kind!=='loop'&&!validIndex(index)))return false;
   const stamp=epoch,token=++operation,identity=state.identity,generation=state.generation;
   const packet=kind==='recall'?frame(0x8e,index):kind==='save'?frame(0x8c,index):frame(0x90,index?1:0);
   const context=Object.freeze({identity,generation,valid:()=>valid(stamp)&&operation===token&&state.enabled&&state.ordinary&&state.identity===identity&&state.generation===generation});
   if(!context.valid())return false;pending=true;closeDialog();render();
   try{const result=await options.onCommand(Object.freeze({kind,index,packet}),context);if(!context.valid())return false;
    if(result===true){if(kind==='recall')state.loop=false;else if(kind==='loop')state.loop=index;notice=kind==='save'?'Scene save command sent; device retention is not verified.':'Command sent; state is not controller readback.';}else notice='Command was not completed.';return result===true;
   }catch(e){if(context.valid())notice='Command failed; no retry was sent.';return false;}finally{if(active&&epoch===stamp&&operation===token){pending=false;render();}}
  }
  const recall=i=>command('recall',i);
  function openDialog(title,menuOnly=false){if(!(menuOnly?menuReady():ready()))return null;closeDialog();const box=doc.createElement('dialog');box.className='bxs-scene-dialog';const heading=doc.createElement('h3');heading.textContent=title;box.append(heading);const body=doc.createElement('div');box.append(body);const cancel=doc.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>{if(dialog!==box)return;invalidate();options.onDismiss?.();render();};box.append(cancel);box.addEventListener('cancel',e=>{e.preventDefault();if(dialog!==box)return;invalidate();options.onDismiss?.();render();});section.append(box);dialog=box;if(typeof box.showModal==='function')box.showModal();else box.setAttribute('open','');return{box,body,cancel,stamp:epoch,token:operation,menuOnly};}
  function current(d){return !!d&&dialog===d.box&&valid(d.stamp)&&operation===d.token&&(d.menuOnly?menuReady():state.enabled);}
  function action(d,label,fn){const b=doc.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(current(d))fn();};d.body.append(b);return b;}
  function renameMenu(index){if(!validIndex(index)||!state.ordinary)return false;const d=openDialog(names[index]);if(!d)return false;action(d,'Rename scene',()=>openRename(index));return true;}
  function openRename(index){if(!validIndex(index)||!state.ordinary)return false;const d=openDialog('Scene name');if(!d)return false;const input=doc.createElement('input');input.type='text';input.maxLength=20;input.value=names[index];input.setAttribute('aria-label','Scene name');d.body.append(input);
   const save=()=>{if(!current(d)||input.value.length===0||input.value.length>20)return false;try{if(!options.store)throw Error('Local scene-name storage unavailable');options.store.set(state.identity,index,input.value);names=options.store.read(state.identity);notice='Scene name saved locally, not to controller memory.';invalidate();render();return true;}catch(e){notice='Could not save name; draft retained.';status.textContent=notice;return false;}};
   action(d,'OK',save);input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();save();}};return true;
  }
  function chooseSlot(){const d=openDialog('Select A Scene');if(!d)return false;names.forEach((name,i)=>action(d,name,()=>confirmSave(i)));return true;}
  function saveChooser(){
   if(!menuReady())return false;
   if(typeof options.authorizeSave==='function'&&options.authorizeSave()!==true)return false;
   return chooseSlot();
  }
  function confirmSave(index){if(!validIndex(index))return false;const d=openDialog('Want to cover ['+names[index]+']?');if(!d)return false;action(d,'OK',()=>command('save',index));return true;}
  function deviceMenu(){const d=openDialog('',true);if(!d)return false;const rename=action(d,'Rename device',()=>{if(typeof options.onRenameDevice==='function'){invalidate();options.onRenameDevice();}});rename.disabled=typeof options.onRenameDevice!=='function';rename.title=rename.disabled?'Device rename is provided by the containing original-device header.':'';action(d,'Save effects to scene',saveChooser);return true;}
  menu.onclick=deviceMenu;loop.onclick=()=>{if(typeof state?.loop==='boolean')command('loop',!state.loop);};
  function schema(next){if(!next||typeof next.identity!=='string'||!next.identity.trim()||!Number.isSafeInteger(next.generation)||next.generation<0||typeof next.enabled!=='boolean'||typeof next.ordinary!=='boolean'||!(next.loop===null||typeof next.loop==='boolean'))throw Error('Valid current single-device scene state required');return{...next};}
  function enter(next){const candidate=schema(next);leave();state=candidate;epoch++;active=true;latched=false;notice='';try{names=options.store?options.store.read(state.identity):Array.from({length:9},(_,i)=>'Scene '+(i+1));}catch(e){names=Array.from({length:9},(_,i)=>'Scene '+(i+1));notice='Local scene names could not be read; original data preserved.';state.enabled=false;}section.hidden=false;menu.hidden=false;render();}
  function leave(){epoch++;invalidate();active=false;latched=false;section.hidden=true;menu.hidden=true;}
  function update(next){const candidate=schema(next);if(!active||candidate.identity!==state.identity||candidate.generation!==state.generation){enter(candidate);return;}if((state.enabled&&!candidate.enabled)||state.ordinary!==candidate.ordinary)invalidate();state=candidate;render();}
  function setEnabled(on){if(typeof on!=='boolean')throw Error('Boolean enabled required');if(!active)return;if(!on)invalidate();state.enabled=on;render();}
  const pointerMove=e=>{if(pointer&&e.pointerId===pointer.id&&!pointer.fired&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>18){cancelPointer();suppressClick=true;}};const pointerEnd=e=>{if(pointer&&e.pointerId===pointer.id){const outside=!pointer.element.contains(e.target);cancelPointer();if(e.type==='pointercancel'||outside)suppressClick=true;}};doc.addEventListener('pointermove',pointerMove,true);doc.addEventListener('pointerup',pointerEnd,true);doc.addEventListener('pointercancel',pointerEnd,true);
  const onHidden=()=>{if(doc.visibilityState==='hidden')leave();};doc.addEventListener('visibilitychange',onHidden);win.addEventListener('pagehide',leave);
  section.hidden=true;menu.hidden=true;
  return Object.freeze({enter,leave,update,setEnabled,recall,renameMenu,openRename,saveChooser,confirmSave,deviceMenu,snapshot:()=>({active,epoch,pending,dialog:dialog?.querySelector('h3')?.textContent||null,state:state?{...state}:null,names:[...names]}),dispose(){leave();doc.removeEventListener('pointermove',pointerMove,true);doc.removeEventListener('pointerup',pointerEnd,true);doc.removeEventListener('pointercancel',pointerEnd,true);doc.removeEventListener('visibilitychange',onHidden);win.removeEventListener('pagehide',leave);section.remove();menu.remove();}});
 }
 const api=Object.freeze({create,frame});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXScenes=api;
})(globalThis);
