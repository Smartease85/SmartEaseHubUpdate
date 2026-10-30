/* Pure source-derived BanlanX 3.3.5 color math. No UI, storage or transport. */
'use strict';
(function(root){
 const stops=Object.freeze([0,.17,.34,.51,.68,.85,1]);
 const colors=Object.freeze([[255,0,0],[255,0,255],[0,0,255],[0,255,255],[0,255,0],[255,255,0],[255,0,0]].map(Object.freeze));
 const finite=v=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('Finite numeric value required');return v;};
 const clamp=v=>Math.min(1,Math.max(0,finite(v)));
 // Gesture callback quantizes normalized position; painter uses equal stops instead.
 function quantizePosition(value){return Math.round(clamp(value)*1000)/1000;}
 function arcColor(position){const t=finite(position);if(t<=0||t>=1)return colors[0].slice();let i=0;while(t>stops[i+1])i++;const f=(t-stops[i])/(stops[i+1]-stops[i]);return colors[i].map((v,k)=>Math.round(v+(colors[i+1][k]-v)*f));}
 function gestureColor(position){return arcColor(quantizePosition(position));}
 function brightnessByte(value){return Math.round(clamp(value)*255);}
 // Preserve source IEEE-754 operation order; algebraic RGB interpolation
 // differs at half-byte boundaries (red, saturation .9 is [255,25,25]).
 const modulo=(v,n)=>{const r=v%n;return r<0?r+n:r;};
 function saturationColor(chroma,value){
  if(!Array.isArray(chroma)||chroma.length!==3||![0,1,2].every(i=>Number.isInteger(chroma[i])&&chroma[i]>=0&&chroma[i]<=255)||Math.max(...chroma)!==255)throw Error('Uncalibrated V=1 chroma required');
  const [r,g,b]=chroma.map(v=>v/255),v=Math.max(r,Math.max(g,b)),delta=v-Math.min(r,Math.min(g,b));
  let h=v===0?0:v===r?60*modulo((g-b)/delta,6):v===g?60*((b-r)/delta+2):60*((r-g)/delta+4);
  if(Number.isNaN(h))h=0;
  const s=clamp(value),c=s*1,x=c*(1-Math.abs(modulo(h/60,2)-1)),m=1-c;
  const components=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return components.map(component=>Math.round((component+m)*255));
 }
 const api=Object.freeze({stops,colors,quantizePosition,arcColor,gestureColor,brightnessByte,saturationColor});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXColorMath=api;
})(globalThis);
