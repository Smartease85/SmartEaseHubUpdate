/* One-off draft admission only. Transport, ACK handling and exclusive lease remain owned by reviewed shared modules. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./ux-program-send-host'),require('./ux-program-send-controller'),require('./ux-owner-send'));else r.SmartEaseUXEditorSendBridge=f(r.SmartEaseUXSelectedProgramHost,r.SmartEaseUXSelectedProgramController,r.SmartEaseUXOwnerSend);})(globalThis,(Host,Controller,Owner)=>{'use strict';
const kinds=new Set(['text','graffiti','animation','clock','dynamicText','template','material']);
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function transient(record,serial){const r=JSON.parse(Controller.canonical(record));if(!r||!kinds.has(r.kind))throw Error('Unsupported editor draft kind');r.id='editor-draft-'+serial;r.repeat=1;if(typeof r.name!=='string'||!r.name.trim())r.name='Unsaved '+r.kind+' draft';return freeze({family:'coolledux',rows:16,columns:96,records:[r],selection:[r.id]});}
function create(parent,options){
 for(const key of ['valid','revision','capture','onAdmission'])if(typeof options?.[key]!=='function')throw Error('Explicit '+key+' hook required');
 const doc=parent.ownerDocument,win=doc.defaultView,container=doc.createElement('div');container.className='nux-editor-send-bridge';parent.append(container);
 const binding=Owner.binding(options.adapter);let active=false,disposed=false,serial=0,stamp=null,library=null,reason=null,pending=false,preparing=false;
 const revision=()=>{const n=options.revision();if(!Number.isSafeInteger(n)||n<0)throw Error('Monotonic nonnegative editor revision required');return n;};
 function current(s=stamp){try{const n=binding.current();return active&&!disposed&&s&&s.serial===serial&&doc.visibilityState!=='hidden'&&options.valid()===true&&revision()===s.revision&&n.connected===true&&n.deviceId===s.owner.deviceId&&n.generation===s.owner.generation&&n.characteristic===s.owner.characteristic;}catch{return false;}}
 function state(){return{active,pending,reason,revision:stamp?.revision??null,...{transfer:inner.state()}};}
 function notify(){try{options.onState?.(state());}catch{}}
 const inner=Host.create(container,{adapter:options.adapter,readLibrary:()=>{if(!library||!current())throw Error('Editor draft admission expired');return library;},valid:()=>current(),loaders:options.loaders,compile:options.compile,scheduler:options.scheduler,programLimit:1,packageSize:options.packageSize,onState:()=>notify()});
 const dialog=container.querySelector('dialog');dialog.setAttribute('aria-label','Experimental current editor draft Send');dialog.querySelector('h3').textContent='Send current draft once — experimental';const paragraphs=dialog.querySelectorAll('p');paragraphs[0].textContent=paragraphs[0].textContent.replace('This sends the actual selection below in selection order.','This sends only the freshly captured current editor draft once. It does not Save or change the Program library, selection or repeat setting.');const extra=doc.createElement('p');extra.textContent='The editor remains open. Clock program content does not synchronize controller time; automatic or global clock Sync is not performed.';dialog.insertBefore(extra,paragraphs[1]);dialog.querySelector('button').textContent='Send current draft once';
 function leave(why='Editor Send cancelled; partial remote state may remain'){active=false;pending=false;serial++;stamp=null;library=null;reason=why;inner.leave(why);notify();}
 async function open(){
  if(preparing||disposed||doc.visibilityState==='hidden'||options.valid()!==true)return false;
  if(binding.busy()){reason='Previous display write has not settled. Wait before another send.';notify();return false;}
  const operation=serial+1;leave('Fresh editor draft admission');if(serial!==operation||disposed)return false;
  try{
   // This owner action invalidates pending global restore/import capture. It must not destroy the editor.
   let admitted;preparing=true;try{admitted=options.onAdmission();}finally{preparing=false;}if(operation!==serial)return false;if(admitted===false)throw Error('Current editor draft is not ready for Send');if(admitted&&typeof admitted.then==='function')throw Error('Admission hook must be synchronous; use capture for guarded async resources');
   if(disposed||doc.visibilityState==='hidden'||options.valid()!==true)return false;
   stamp={serial,revision:revision(),owner:binding.current()};active=true;pending=true;reason='Capturing current draft; nothing sent.';const s=stamp;notify();
   const captured=await options.capture({revision:s.revision,valid:()=>current(s)});
   if(!current(s)){if(operation===serial)leave('Editor capture expired; nothing sent.');return false;}
   library=transient(captured,s.serial);pending=false;reason=null;
   const ok=await inner.open();if(!current(s)){if(operation===serial)leave('Editor compilation expired; nothing sent.');return false;}reason=ok?null:inner.state().reason;notify();return ok;
  }catch(e){if(operation===serial){reason=String(e.message||e);pending=false;inner.leave(reason);active=false;stamp=null;library=null;notify();}return false;}
 }
 function refresh(){if(active&&!current())leave('Editor revision, route, visibility or connection changed; partial remote state may remain');else inner.refresh();}
 function send(){if(!current()){leave('Editor draft changed before Send; partial remote state may remain');return false;}return inner.send();}
 const hidden=()=>{if(doc.visibilityState==='hidden')leave('Page hidden; partial remote state may remain');},pagehide=()=>leave('Page hidden; partial remote state may remain');doc.addEventListener('visibilitychange',hidden);win.addEventListener('pagehide',pagehide);
 function invalidate(why='Editor draft changed'){if(preparing){reason=why;return;}leave(why);}
 return Object.freeze({open,send,leave,refresh,state,invalidate,dispose(){leave('Editor Send disposed; partial remote state may remain');disposed=true;inner.dispose();container.remove();doc.removeEventListener('visibilitychange',hidden);win.removeEventListener('pagehide',pagehide);}});
}
return{create,transient};});
