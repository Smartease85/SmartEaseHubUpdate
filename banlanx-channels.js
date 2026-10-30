/* BanlanX Android 3.3.5 model5 Channels reconstruction. Isolated UI only. */
'use strict';
(function(root){
 const TABS=Object.freeze(['Channels','Scenes','Triggers','Groups']);
 function model(input){
  if(!input||typeof input.identity!=='string'||!input.identity||!Number.isSafeInteger(input.generation)||input.generation<0)throw Error('Current device identity and generation required');
  if(!Array.isArray(input.channels)||input.channels.length!==8)throw Error('SP608E requires eight channel records');
  const channels=Array.from({length:8},(_,i)=>{
   const source=input.channels[i];if(!source||typeof source!=='object')throw Error('Dense channel records required');
   return Object.freeze({name:typeof source.name==='string'&&source.name?source.name:'Channel '+(i+1),lightingOn:source.lightingOn===true?true:source.lightingOn===false?false:null});
  });
  return Object.freeze({identity:input.identity,generation:input.generation,title:typeof input.title==='string'?input.title:'SP608E',connected:input.connected===true,channels:Object.freeze(channels)});
 }
 function create(host,options={}){
  if(!host?.ownerDocument)throw Error('DOM host required');
  const doc=host.ownerDocument;let current=null,epoch=0,operation=0,active=false,busy=false,consent=false,status='';
  const assetBase=options.assetBase||'assets/';
  let cardCleanups=[];const clearCards=()=>{for(const f of cardCleanups)f();cardCleanups=[];};
  const section=doc.createElement('section');section.className='bx-channels';section.hidden=true;host.append(section);
  // Responsive branch not resolved: caller chooses source candidate inset and scale.
  const scale=options.scale===undefined?1:options.scale,inset=options.horizontalInset===undefined?16:options.horizontalInset;
  if(typeof scale!=='number'||!Number.isFinite(scale)||scale<=0||scale>4||![16,50].includes(inset)){section.remove();throw Error('Valid source scale/inset parameters required');}
  section.style.setProperty('--bx-scale',String(scale));section.style.setProperty('--bx-inset',inset+'px');
  function valid(stamp=epoch){return active&&stamp===epoch&&doc.visibilityState!=='hidden'&&(typeof options.valid!=='function'||options.valid(current)===true);}
  function emit(name,payload){if(!valid())return false;if(typeof options[name]!=='function'){status='This original workflow is not integrated yet.';paint();return false;}options[name](payload);return true;}
  function request(mask,name){
   if(!valid())return false;
   const selected=current.channels.filter((_,i)=>(mask&(1<<i))!==0);
   if(!selected.every(c=>c.lightingOn===true)){if(mask===255){status='Please turn on all channels first!';paint();}return false;}
   return emit('onOpen',Object.freeze({route:'/sp601e/control',name,device:current.identity,light_channel_count:8,channel_id:mask,trigger_id:null,generation:current.generation}));
  }
  async function power(mask,on,stamp){
   if(!valid(stamp)||busy||!consent||!current.connected||typeof options.onPower!=='function')return false;
   const token=++operation,identity=current.identity,generation=current.generation;
   const guard=()=>valid(stamp)&&operation===token&&consent&&current.connected&&current.identity===identity&&current.generation===generation;
   busy=true;status='';paint();
   try{
    const result=await options.onPower(Object.freeze({mask,on,identity,generation}),Object.freeze({valid:guard}));
    if(!guard())return false;
    status=result===true?'Power command completed; waiting for controller status.':'Power command stopped or failed.';
    return result===true;
   }catch(error){if(guard())status=error instanceof Error?error.message:'Power command failed.';return false;}
   finally{if(operation===token&&epoch===stamp){busy=false;paint();}}
  }
  function button(label,className,action){const b=doc.createElement('button');b.type='button';b.className=className;b.textContent=label;const stamp=epoch;b.addEventListener('click',()=>{if(valid(stamp))action();});return b;}
  function wave(card,file){const img=doc.createElement('img');img.className='bx-wave';img.alt='';img.setAttribute('aria-hidden','true');img.src=assetBase+file;card.append(img);}
  function paint(){
   if(!active||!current)return;
   clearCards();section.replaceChildren();section.hidden=false;
   const header=doc.createElement('header');header.className='bx-header';header.hidden=options.hideChrome===true;wave(header,'wave_2.png');
   const title=doc.createElement('h2');title.textContent=current.title;header.append(title);
   const timer=button('Timers','bx-timer',()=>emit('onTimer',Object.freeze({route:'/timer/list',device:current.identity,scene_count:9,generation:current.generation})));timer.setAttribute('aria-label','Timers');header.append(timer);if(!options.hideChrome)section.append(header);
   const tabs=doc.createElement('nav');tabs.className='bx-tabs';tabs.hidden=options.hideChrome===true;tabs.setAttribute('aria-label','BanlanX sections');
   TABS.forEach((name,i)=>{const b=button(name,'bx-tab',()=>{if(i!==0)emit('onTab',Object.freeze({name,index:i,identity:current.identity,generation:current.generation}));});b.setAttribute('aria-current',i===0?'page':'false');tabs.append(b);});if(!options.hideChrome)section.append(tabs);
   const body=doc.createElement('div');body.className='bx-body';
   const all=doc.createElement('article');all.className='bx-all';wave(all,'wave_3.png');
   all.append(button('ALL','bx-open bx-all-open',()=>request(255,'ALL')));
   const actions=doc.createElement('div');actions.className='bx-all-actions';
   for(const [label,on]of [['ON',true],['OFF',false]]){const stamp=epoch,b=button(label,'bx-power',()=>power(255,on,stamp));b.dataset.power=label;b.disabled=busy||!consent||!current.connected||typeof options.onPower!=='function';actions.append(b);}all.append(actions);body.append(all);
   const grid=doc.createElement('div');grid.className='bx-grid';
   current.channels.forEach((channel,i)=>{
    const card=doc.createElement('article');card.className='bx-channel';card.dataset.power=channel.lightingOn===null?'unknown':channel.lightingOn?'on':'off';wave(card,'wave_1.png');
    const open=button(channel.name,'bx-open bx-channel-open',()=>request(1<<i,String(i+1)));open.dataset.channel=String(i+1);open.disabled=channel.lightingOn!==true;card.append(open);if(typeof options.bindChannelName==='function'){card.tabIndex=0;open.dataset.channelNameGesture='true';open.setAttribute('aria-label',channel.name);card.setAttribute('aria-label',channel.name+'; hold to rename');const cleanup=options.bindChannelName(card,i);if(typeof cleanup==='function')cardCleanups.push(cleanup);}
    const stamp=epoch,toggle=button(channel.lightingOn===null?'Unknown':channel.lightingOn?'ON':'OFF','bx-toggle',()=>power(1<<i,!channel.lightingOn,stamp));toggle.dataset.toggle=String(i+1);toggle.setAttribute('role','switch');toggle.setAttribute('aria-label',channel.name+' power');if(channel.lightingOn!==null)toggle.setAttribute('aria-checked',String(channel.lightingOn));
    toggle.disabled=channel.lightingOn===null||busy||!consent||!current.connected||typeof options.onPower!=='function';card.append(toggle);grid.append(card);
   });body.append(grid);section.append(body);
   const safety=doc.createElement('fieldset');safety.className='bx-safety';const legend=doc.createElement('legend');legend.textContent='Browser safety adaptation';safety.append(legend);
   const label=doc.createElement('label'),check=doc.createElement('input');check.type='checkbox';check.checked=consent;check.dataset.parked='true';const stamp=epoch;check.addEventListener('change',()=>{if(valid(stamp)){consent=check.checked;if(!consent){operation++;busy=false;}paint();}});label.append(check,doc.createTextNode(' Cart parked; these outputs are decorative lights.'));safety.append(label);
   const note=doc.createElement('p');note.textContent='Changing this confirmation sends nothing. Unknown controller state is not assumed ON.';safety.append(note);section.append(safety);
   const output=doc.createElement('p');output.className='bx-status';output.setAttribute('role','status');output.textContent=status;section.append(output);
  }
  function invalidate(){epoch++;operation++;busy=false;consent=false;}
  function leave(){clearCards();invalidate();active=false;section.hidden=true;}
  const hidden=()=>{if(doc.visibilityState==='hidden')leave();};doc.addEventListener('visibilitychange',hidden);
  return Object.freeze({
   enter(input){const next=model(input);invalidate();current=next;status='';active=true;paint();},
   update(input){const next=model(input);invalidate();current=next;status='';if(active)paint();},
   leave,
   dispose(){leave();doc.removeEventListener('visibilitychange',hidden);section.remove();},
   snapshot(){return {active,busy,consent,epoch,model:current?JSON.parse(JSON.stringify(current)):null,status};}
  });
 }
 const api=Object.freeze({create,tabs:TABS});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXChannels=api;
})(globalThis);
