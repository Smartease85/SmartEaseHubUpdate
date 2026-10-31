/* Independently authored palette fallback. Formula mirrors our shipped
 * tools/generate-lotus-controls.py; it is not an inferred OEM LED effect.
 * Canvas sampling remains preferred because browser resampling can differ. */
'use strict';
(function(root){
 function roundEven(value){const floor=Math.floor(value),fraction=value-floor;return fraction<.5?floor:fraction>.5?floor+1:floor%2===0?floor:floor+1;}
 function rgba(x,y,size,alternate=false){
  if(!Number.isInteger(size)||size<1||size>4096||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=size||y>=size||typeof alternate!=='boolean')throw Error('Valid authored palette pixel required');
  const dx=(x+.5-size/2)/(size/2),dy=(y+.5-size/2)/(size/2),radius=Math.hypot(dx,dy);
  if(radius>1)return [0,0,0,0];
  const angle=Math.atan2(dy,dx)/(2*Math.PI),h=((alternate?angle:-angle)%1+1)%1,s=Math.min(1,radius),scaled=h*6,i=Math.floor(scaled),f=scaled-i,p=1-s,q=1-s*f,t=1-s*(1-f);
  const rgb=[[1,t,p],[q,1,p],[p,1,t],[p,q,1],[t,p,1],[1,p,q]][i%6];
  return [...rgb.map(v=>roundEven(v*255)),roundEven(255*Math.min(1,(1-radius)*size/2))];
 }
 const api=Object.freeze({rgba,hex(x,y,size,alternate=false){return '#'+rgba(x,y,size,alternate).slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');}});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.SmartEaseLotusPalette=api;
})(typeof window==='object'?window:globalThis);
