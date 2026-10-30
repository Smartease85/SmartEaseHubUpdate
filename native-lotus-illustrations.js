/* Independently authored diagrams, never OEM GIFs or a firmware simulator. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./native-lotus-illustration-data'));else r.SmartEaseLotusIllustrations=f(r.SmartEaseLotusIllustrationData);})(globalThis,function(Data){'use strict';
const specs=new Map(Data.map(s=>[s.command,s])),N=60,TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x)),wrap=x=>((x%1)+1)%1,parse=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
function mix(a,b,t){t=clamp(t);const x=parse(a),y=parse(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function palette(s,u,smooth=false){const p=wrap(u)*s.palette.length,i=Math.floor(p);return smooth?mix(s.palette[i],s.palette[(i+1)%s.palette.length],p-i):s.palette[i];}
function spec(command){if(!Number.isInteger(command)||!specs.has(command))throw Error('Unknown Lotus illustration command');return specs.get(command);}
function frame(command,phase=0){const s=spec(command);if(!Number.isFinite(phase))throw Error('Finite illustration phase required');const t=s.static?0:wrap(phase),bg=s.background||'#111c2c';const colors=Array.from({length:N},(_,i)=>{const u=i/(N-1),q=s.direction===1?u:1-u;let color=palette(s,u),gain=1;
 switch(s.family){
 case 'diagram_palette':case 'diagram_stack':return palette(s,u);
 case 'palette_steps':{const p=t*s.palette.length,j=Math.floor(p),f=clamp((p-j-.65)/.35);return mix(s.palette[j],s.palette[(j+1)%s.palette.length],f*f*(3-2*f));}
 case 'soft_pulse_not_flash':color=palette(s,t,true);gain=.4+.6*(.5-.5*Math.cos(TAU*t));break;
 case 'palette_blend':return palette(s,t,true);
 case 'traveling_blend':return palette(s,q-t,true);
 case 'moving_marks':gain=.2+.8*Math.pow(.5+.5*Math.cos(TAU*(q*5-t)),4);break;
 case 'moving_bands':color=palette(s,q-t);gain=.45+.55*(.5+.5*Math.cos(TAU*(q*3-t)));break;
 case 'traveling_envelope':color=palette(s,q-t,true);gain=.2+.8*(.5+.5*Math.sin(TAU*(q-t)));break;
 case 'fading_trail':{const d=wrap(t-q);gain=.14+.86*Math.pow(1-d,5);color=palette(s,t);break;}
 case 'moving_fill':{const edge=.5-.5*Math.cos(TAU*t),position=s.motion==='inward'?1-Math.abs(2*u-1):s.motion==='outward'?Math.abs(2*u-1):q;gain=.18+.82*clamp((edge-position)/.12+.5);break;}
 case 'inward_fill':case 'outward_fill':{const edge=.5-.5*Math.cos(TAU*t),position=s.family==='inward_fill'?1-Math.abs(2*u-1):Math.abs(2*u-1);gain=.16+.84*clamp((edge-position)/.1+.5);break;}
 case 'flowing_bands':color=palette(s,q-t,true);gain=.4+.6*Math.pow(.5+.5*Math.sin(TAU*(q*2-t)),2);break;
 case 'ordered_bands':return palette(s,q-t);
 case 'destination_band':return mix(bg,palette(s,q),Math.exp(-Math.pow((q-t)/.23,2)));
 case 'moving_dot':return mix(bg,s.palette[0],Math.exp(-Math.pow((q-t)/.075,2)));
 case 'moving_band':return mix(bg,palette(s,q-t),Math.exp(-Math.pow((q-t)/.25,4)));
 default:throw Error('Unimplemented illustration family '+s.family);
 }return mix('#101a28',color,gain);});return Object.freeze({command,static:s.static,layout:s.family.startsWith('diagram_')?s.family:'strip',colors:Object.freeze(colors)});}
function geometry(command){const s=spec(command);if(s.family==='diagram_stack'){const count=Math.max(6,s.palette.length);return Array.from({length:count},(_,i)=>({x:15+i%2*7,y:12+i*48/(count-1),width:65-i%2*7,height:6,rx:3,index:Math.floor(((i%s.palette.length)+.5)*59/s.palette.length)}));}if(s.static)return Array.from({length:s.palette.length},(_,i)=>{const w=Math.min(18,66/s.palette.length),x=48+(i-(s.palette.length-1)/2)*(w+3);return{x:x-w/2,y:22+Math.abs(i-(s.palette.length-1)/2)*2,width:w,height:42-Math.abs(i-(s.palette.length-1)/2)*4,rx:w/2,index:Math.floor((i+.5)*59/s.palette.length)};});return Array.from({length:N},(_,i)=>{const row=Math.floor(i/12),col=row%2?11-i%12:i%12;return{x:8+col*6.75,y:12+row*11.5,width:5.4,height:8,rx:2,index:i};});}
function ornament(command){if(command===0){const arc=Array.from({length:17},(_,i)=>{const a=-.6+i*5.4/16;return[48+5*Math.cos(a),13+5*Math.sin(a)];});return[arc,[[47.4,5.9],[48.4,8.2],[45.8,8.7]]];}if(command===1||command===2){const pts=[[[39,13],[57,13]],[[51,7],[57,13],[51,19]]];return command===1?pts:pts.map(line=>line.map(([x,y])=>[96-x,y]));}return[];}
function renderSvg(command,phase=0){const f=frame(command,phase),g=geometry(command);return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none"><rect x=".5" y=".5" width="95" height="95" rx="13" fill="#080f1b" stroke="#23324a"/>'+g.map(r=>'<rect x="'+r.x+'" y="'+r.y+'" width="'+r.width+'" height="'+r.height+'" rx="'+r.rx+'" fill="'+f.colors[r.index]+'"/>').join('')+ornament(command).map(points=>'<polyline points="'+points.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="#91a9cf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>').join('')+'</svg>';}
function describe(command){const s=spec(command);return Object.freeze({command,label:s.label,evidence:s.static?'category_or_label_only':'label_informed_illustration',caption:s.static?'Sequence unknown':'Illustration',animated:!s.static,family:s.family,exactFirmwareSequence:false});}
function createSession({document:doc=globalThis.document,window:win=doc?.defaultView||globalThis}={}){
 if(!doc||typeof doc.createElementNS!=='function')throw Error('Illustration document required');
 const records=new Set(),owners=new WeakMap(),ns='http://www.w3.org/2000/svg',media=typeof win.matchMedia==='function'?win.matchMedia('(prefers-reduced-motion: reduce)'):null;
 let disposed=false,paused=false,raf=null,rafGeneration=0,last=null,painted=-Infinity,elapsed=2280,reduced=media?.matches===true;
 const animated=r=>!r.dead&&!r.paused&&r.visible&&r.svg.isConnected&&!r.spec.static;
 const canRun=()=>!disposed&&!paused&&!reduced&&doc.visibilityState!=='hidden'&&typeof win.requestAnimationFrame==='function'&&[...records].some(animated);
 function paint(r,phase){const f=frame(r.spec.command,phase);for(let i=0;i<r.shapes.length;i++){const color=f.colors[r.geometry[i].index];if(r.colors[i]!==color){r.shapes[i].setAttribute('fill',color);r.colors[i]=color;}}}
 function sync(){if(canRun()){if(raf===null){const ticket=++rafGeneration;raf=win.requestAnimationFrame(time=>{if(ticket===rafGeneration&&!disposed)tick(time);});}}else{if(raf!==null){rafGeneration++;win.cancelAnimationFrame?.(raf);}raf=null;last=null;}}
 function tick(time){raf=null;if(!canRun()){last=null;return;}if(last!==null)elapsed+=Math.min(250,Math.max(0,time-last));last=time;if(time-painted>=1000/12){painted=time;for(const r of records)if(animated(r))paint(r,elapsed/6000);}sync();}
 const observer=typeof win.IntersectionObserver==='function'?new win.IntersectionObserver(entries=>{if(disposed)return;for(const entry of entries){const r=owners.get(entry.target);if(r&&!r.dead)r.visible=entry.isIntersecting===true;}sync();},{threshold:0.01}):null;
 const visibility=()=>sync(),motion=()=>{reduced=media?.matches===true;if(reduced)for(const r of records)paint(r,.38);sync();};
 doc.addEventListener('visibilitychange',visibility);if(media?.addEventListener)media.addEventListener('change',motion);else media?.addListener?.(motion);
 function mount(container,command){if(disposed)throw Error('Illustration session disposed');if(!container||typeof container.appendChild!=='function')throw Error('Illustration container required');const s=spec(command),previous=owners.get(container);if(previous)previous.dispose();const svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 96 96');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.style.width='100%';svg.style.height='100%';svg.style.display='block';const bg=doc.createElementNS(ns,'rect');for(const[k,v]of Object.entries({x:.5,y:.5,width:95,height:95,rx:13,fill:'#080f1b',stroke:'#23324a'}))bg.setAttribute(k,String(v));svg.appendChild(bg);
 const g=geometry(command),shapes=g.map(rect=>{const shape=doc.createElementNS(ns,'rect');for(const k of ['x','y','width','height','rx'])shape.setAttribute(k,String(rect[k]));svg.appendChild(shape);return shape;});
 for(const points of ornament(command)){const line=doc.createElementNS(ns,'polyline');for(const[k,v]of Object.entries({points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#91a9cf','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'}))line.setAttribute(k,String(v));svg.appendChild(line);}
 const r={spec:s,geometry:g,shapes,colors:[],svg,visible:false,paused:false,dead:false};
 function remove(){if(r.dead)return;r.dead=true;records.delete(r);if(owners.get(container)===r)owners.delete(container);observer?.unobserve(container);svg.remove();sync();}
 r.dispose=remove;records.add(r);owners.set(container,r);container.appendChild(svg);paint(r,.38);observer?.observe(container);sync();return Object.freeze({dispose:remove,pause(){r.paused=true;sync();},resume(){if(!r.dead){r.paused=false;sync();}},setVisible(value){if(typeof value!=='boolean')throw Error('Boolean visibility required');if(!r.dead){r.visible=value;sync();}}});
 }
 function dispose(){if(disposed)return;disposed=true;for(const r of [...records])r.dispose();observer?.disconnect();doc.removeEventListener('visibilitychange',visibility);if(media?.removeEventListener)media.removeEventListener('change',motion);else media?.removeListener?.(motion);sync();}
 return Object.freeze({mount,pause(){paused=true;sync();},resume(){if(!disposed){paused=false;sync();}},dispose});
}
return Object.freeze({data:Data,spec,describe,frame,geometry,ornament,renderSvg,createSession});
});
