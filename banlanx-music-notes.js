/* Authored music-note masks at dVb-compatible bounds and transition-only opacity. No media or transport. */
'use strict';
(function(root){
 const notes=Object.freeze([
  {image:'music_note_3.png',width:22,left:70,top:0,tint:[245,197,48]},
  {image:'music_note_5.png',width:40,left:200,top:105,tint:[80,104,255]},
  {image:'music_note_4.png',width:48,left:10,top:150,tint:[202,104,101]},
  {image:'music_note_2.png',width:42,right:78,top:170,tint:[90,223,234]},
  {image:'music_note_1.png',width:32,left:90,bottom:210,tint:[200,121,240]}
 ].map(v=>Object.freeze({...v,tint:Object.freeze(v.tint)})));
 function model(v){if(!v||typeof v.identity!=='string'||!v.identity||!Number.isSafeInteger(v.generation)||v.generation<0||typeof v.activeEffects!=='boolean'||typeof v.music!=='boolean')throw Error('Explicit current identity, generation and source mode required');return {...v};}
 function create(host,options={}){
  const doc=host?.ownerDocument;if(!doc)throw Error('DOM host required');const W=options.viewport?.width??375,H=options.viewport?.height??667;if(!Number.isFinite(W)||!Number.isFinite(H)||W<=0||H<=0)throw Error('Positive viewport required');
  const layer=doc.createElement('div');layer.className='bx-music-notes';layer.setAttribute('aria-hidden','true');layer.hidden=true;host.prepend(layer);let active=false,current=null,shown=false,epoch=0;
  let supported=false;try{const css=doc.defaultView.CSS;supported=css?.supports?.('mask-image','url("note.png")')===true||css?.supports?.('-webkit-mask-image','url("note.png")')===true;}catch{}
  const media=doc.defaultView.matchMedia?.('(prefers-reduced-motion: reduce)');
  for(const n of notes){const span=doc.createElement('span');span.dataset.note=n.image;span.style.width=n.width*W/375+'px';span.style.height=n.width*W/375+'px';span.style.backgroundColor='rgb('+n.tint.join(',')+')';for(const key of ['left','right'])if(n[key]!==undefined)span.style[key]=n[key]*W/375+'px';for(const key of ['top','bottom'])if(n[key]!==undefined)span.style[key]=n[key]*H/667+'px';const url='url("'+(options.assetBase||'assets/')+n.image+'")';span.style.maskImage=url;span.style.setProperty('-webkit-mask-image',url);layer.append(span);}
  function render(next,animate){shown=next;layer.style.transition=animate&&!media?.matches?'opacity 300ms linear':'none';layer.style.opacity=next?'1':'0';}
  function leave(){epoch++;active=false;render(false,false);layer.hidden=true;}
  function reduced(){if(media?.matches)layer.style.transition='none';}
  const hide=()=>{if(doc.visibilityState==='hidden')leave();};doc.addEventListener('visibilitychange',hide);media?.addEventListener?.('change',reduced);
  return Object.freeze({element:layer,enter(v){const next=model(v);epoch++;current=next;active=supported&&doc.visibilityState!=='hidden';layer.hidden=!active;render(active&&next.activeEffects&&next.music,false);},update(v){const next=model(v);if(!active)return false;if(next.identity!==current.identity||next.generation!==current.generation){leave();return false;}current=next;const nextShown=next.activeEffects&&next.music;if(nextShown!==shown)render(nextShown,true);return true;},leave,dispose(){leave();doc.removeEventListener('visibilitychange',hide);media?.removeEventListener?.('change',reduced);layer.remove();},snapshot:()=>({active,epoch,shown,supported,current:current?{...current}:null})});
 }
 const api=Object.freeze({notes,create});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXMusicNotes=api;
})(globalThis);
