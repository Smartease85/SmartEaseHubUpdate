/* Source-backed xUb disk component. Isolated and dependency-injected; no transport. */
'use strict';
(function(root){
 const D=typeof module!=='undefined'&&module.exports?require('./banlanx-disk-math.js'):root.SmartEaseBanlanXDiskMath;
 function model(v){
  if(!v||typeof v.identity!=='string'||!v.identity||!Number.isSafeInteger(v.generation)||v.generation<0||!Number.isInteger(v.mask)||v.mask<1||v.mask>255||!Number.isInteger(v.brightness)||v.brightness<0||v.brightness>255)throw Error('Explicit current identity, generation, mask and brightness required');
  if(!Array.isArray(v.color)||v.color.length!==3||![0,1,2].every(i=>Number.isInteger(v.color[i])&&v.color[i]>=0&&v.color[i]<=255)||Math.max(...v.color)!==255)throw Error('Uncalibrated V=1 target chroma required');
  return {identity:v.identity,generation:v.generation,mask:v.mask,brightness:v.brightness,color:v.color.slice(),enabled:v.enabled===true};
 }
 function create(host,options={}){
  if(!host?.ownerDocument)throw Error('DOM host required');const doc=host.ownerDocument;
  const size=options.size===undefined?140:options.size;D.geometry(size);
  const section=doc.createElement('section');section.className='bx-disk';section.hidden=true;host.append(section);
  let current=null,active=false,epoch=0,operation=0,pointer=null,area=null,outer=null,inner=null,status=null,notice='',point=null;
  const valid=(stamp=epoch)=>active&&epoch===stamp&&doc.visibilityState!=='hidden'&&current?.enabled===true&&typeof options.valid==='function'&&options.valid({...current,color:current.color.slice()})===true;
  function cancel(){epoch++;operation++;pointer=null;}
  function paint(){
   if(!current||!area)return;
   point=D.position(current.color,size);
   outer.setAttribute('cx',point.x);outer.setAttribute('cy',point.y);inner.setAttribute('cx',point.x);inner.setAttribute('cy',point.y);
   outer.setAttribute('fill',point.saturation<.3?'#9e9e9e':'#ffffff');inner.setAttribute('fill','rgb('+current.color.join(',')+')');
   area.setAttribute('aria-disabled',String(!valid()||typeof options.onColor!=='function'));area.setAttribute('aria-label','Hue and saturation, RGB '+current.color.join(', '));status.textContent=notice;
  }
  async function choose(x,y,stamp){
   if(!valid(stamp)||typeof options.onColor!=='function')return false;
   const result=D.at(x,y,size),token=++operation,identity=current.identity,generation=current.generation,mask=current.mask,brightness=current.brightness;
   current.color=result.color.slice();notice='';paint();
   const guard=()=>valid(stamp)&&operation===token&&current.identity===identity&&current.generation===generation&&current.mask===mask;
   try{const ok=await options.onColor(Object.freeze({identity,generation,mask,brightness,color:Object.freeze(result.color.slice()),domain:'native-chroma-v1'}),Object.freeze({valid:guard}));if(!guard())return false;if(ok!==true){notice='Color request stopped or failed.';paint();}return ok===true;}catch(error){if(guard()){notice=error instanceof Error?error.message:'Color request failed.';paint();}return false;}
  }
  function build(){
   section.replaceChildren();section.hidden=false;
   area=doc.createElement('div');area.className='bx-disk-area';area.tabIndex=0;area.setAttribute('role','group');area.style.width=size+'px';
   const img=doc.createElement('img');img.src=(options.assetBase||'assets/')+'circular_gradient-2x.png';img.alt='';img.draggable=false;area.append(img);
   const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+size+' '+size);svg.setAttribute('aria-hidden','true');
   outer=doc.createElementNS(svg.namespaceURI,'circle');outer.setAttribute('r','12');outer.setAttribute('fill-opacity',String(220/255));inner=doc.createElementNS(svg.namespaceURI,'circle');inner.setAttribute('r','8');svg.append(outer,inner);area.append(svg);section.append(area);
   const help=doc.createElement('p');help.className='bx-disk-help';help.textContent='Keyboard adaptation: arrow keys move the selector; Shift moves farther; Home selects the center.';section.append(help);
   status=doc.createElement('p');status.className='bx-disk-status';status.setAttribute('role','status');section.append(status);
   const stamp=epoch,coordinates=e=>{const b=area.getBoundingClientRect();return b.width>0&&b.height>0?[(e.clientX-b.left)*size/b.width,(e.clientY-b.top)*size/b.height]:null;};
   area.addEventListener('pointerdown',e=>{if(!valid(stamp)||pointer!==null||e.button!==0)return;const p=coordinates(e);if(!p||!D.at(...p,size).inside)return;pointer=e.pointerId;area.setPointerCapture?.(pointer);e.preventDefault();choose(...p,stamp);});
   area.addEventListener('pointermove',e=>{if(!valid(stamp)||pointer===null||e.pointerId!==pointer)return;const p=coordinates(e);if(p){e.preventDefault();choose(...p,stamp);}});
   area.addEventListener('pointerup',e=>{if(epoch===stamp&&pointer===e.pointerId)pointer=null;});
   area.addEventListener('pointercancel',e=>{if(epoch===stamp&&pointer===e.pointerId){pointer=null;operation++;}});
   area.addEventListener('lostpointercapture',e=>{if(epoch===stamp&&pointer!==null&&pointer===e.pointerId){pointer=null;operation++;}});
   area.addEventListener('keydown',e=>{if(!valid(stamp)||pointer!==null)return;const step=e.shiftKey?10:1;let x=point.x,y=point.y;if(e.key==='ArrowLeft')x-=step;else if(e.key==='ArrowRight')x+=step;else if(e.key==='ArrowUp')y-=step;else if(e.key==='ArrowDown')y+=step;else if(e.key==='Home'){x=size/2;y=size/2;}else return;e.preventDefault();choose(x,y,stamp);});
   paint();
  }
  function leave(){cancel();active=false;section.hidden=true;}
  const hidden=()=>{if(doc.visibilityState==='hidden')leave();};doc.addEventListener('visibilitychange',hidden);
  return Object.freeze({enter(value){const next=model(value);cancel();current=next;active=true;notice='';build();},update(value){const next=model(value);cancel();current=next;notice='';if(active)build();},setEnabled(enabled){cancel();if(current)current.enabled=enabled===true;if(active)build();},leave,dispose(){leave();doc.removeEventListener('visibilitychange',hidden);section.remove();},snapshot(){return {active,epoch,operation,pointer,current:current?{...current,color:current.color.slice()}:null,notice,point:point?{...point}:null};}});
 }
 const api=Object.freeze({create});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXDisk=api;
})(globalThis);
