/* Source-derived cyclic PickerScrollView browser implementation. No device operations. */
'use strict';
(()=>{
 function create(host,{onSelect=()=>{},onMotion=()=>{},onCategory=()=>{},valid=()=>true}={}){
  let items=[],center=0,committed=0,offset=0,pointer=null,timer=null,disposed=false;
  host.tabIndex=0;host.setAttribute('role','listbox');host.setAttribute('aria-label','Effect text wheel');
  const height=()=>host.clientHeight||360,step=()=>height()/11.2/2.2*2.8,mod=n=>(n%items.length+items.length)%items.length;
  function moving(){return !!pointer||timer!==null;}
  function draw(){host.replaceChildren();if(!items.length)return;const h=height(),max=h/11.2,min=max/2.2;for(let k=-Math.min(8,Math.floor(items.length/2));k<=Math.min(8,Math.floor(items.length/2));k++){const idx=mod(center+k),y=k*step()+offset,p=Math.max(0,1-(y/(h/4))**2),row=document.createElement('div');row.className='nlw-row';const label=document.createElement('span');label.textContent=(idx+1)+' '+items[idx].name;row.append(label);row.classList.toggle('nlw-center',k===0);row.style.top=(h/2+y)+'px';row.style.fontSize=(min+(max-min)*p)+'px';row.style.opacity=String((100+155*p)/255);row.setAttribute('aria-hidden','true');host.append(row);}host.setAttribute('aria-label','Effect text wheel: '+items[center].name);host.dataset.center=String(items[center].command);host.dataset.moving=String(moving());}
  function motion(){onMotion(moving());draw();}
  function clear(){if(timer!==null)clearInterval(timer);timer=null;}
  function cancel(){clear();pointer=null;center=committed;offset=0;motion();}
  function choose(){if(!valid()||disposed){cancel();return;}committed=center;offset=0;onSelect(items[center].command);motion();}
  function settle(){if(Math.abs(offset)<.0001){offset=0;choose();return;}timer=setInterval(()=>{if(!valid()||disposed){cancel();return;}if(Math.abs(offset)<60){clear();offset=0;choose();}else{offset-=Math.sign(offset)*60;draw();}},30);motion();}
  function setData(next,command=null){cancel();items=next.map(x=>({...x}));center=Math.max(0,items.findIndex(x=>x.command===command));committed=center;draw();}
  function down(e){if(disposed||!valid()||!items.length||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;clear();center=committed;offset=0;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.clientY,axis:null,moved:false};motion();}
  function move(e){const p=pointer;if(!p||p.id!==e.pointerId)return;if(!valid()){cancel();return;}const dx=e.clientX-p.x,dy=e.clientY-p.y;if(!p.axis&&Math.max(Math.abs(dx),Math.abs(dy))>10)p.axis=Math.abs(dy)>Math.abs(dx)?'vertical':'horizontal';if(p.axis!=='vertical')return;p.moved=true;e.preventDefault();try{host.setPointerCapture?.(e.pointerId);}catch{}offset+=e.clientY-p.last;p.last=e.clientY;while(offset>step()/2){center=mod(center-1);offset-=step();}while(offset< -step()/2){center=mod(center+1);offset+=step();}draw();}
  function up(e){const p=pointer;if(!p||p.id!==e.pointerId)return;pointer=null;if(!valid()){cancel();return;}if(p.axis==='horizontal'){const dx=e.clientX-p.x;if(Math.abs(dx)>=48)onCategory(dx<0?1:-1);cancel();return;}if(!p.moved){offset=0;center=committed;motion();return;}settle();}
  function abort(e){if(pointer?.id===e.pointerId)cancel();}
  function key(e){if(disposed||!valid()||!items.length||moving())return;if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();center=e.key==='Home'?0:e.key==='End'?items.length-1:mod(center+(e.key==='ArrowDown'?1:-1));choose();}
  host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',abort);host.addEventListener('lostpointercapture',abort);host.addEventListener('keydown',key);
  return {setData,cancel,draw,get moving(){return moving();},get state(){return {command:items[center]?.command,committed:items[committed]?.command,offset,moving:moving()};},destroy(){disposed=true;cancel();for(const [n,f]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',abort],['lostpointercapture',abort],['keydown',key]])host.removeEventListener(n,f);}};
 }
 window.SmartEaseNativeWheel={create};
})();
