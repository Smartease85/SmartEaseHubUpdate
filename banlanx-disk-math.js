/* Actual xUb disk forward transform. Pure; no transport, DOM or storage. */
'use strict';
(function(root){
 const M=typeof module!=='undefined'&&module.exports?require('./banlanx-source-color-math.js'):root.SmartEaseBanlanXColorMath;
 const finite=v=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('Finite coordinate required');return v;};
 function geometry(size){if(finite(size)<=0||size>4096)throw Error('Positive bounded disk size required');return {size,cx:size/2,cy:size/2,radius:size/2};}
 function at(x,y,size){const g=geometry(size),dx=finite(x)-g.cx,dy=finite(y)-g.cy,distance=Math.sqrt(dx*dx+dy*dy);let theta=Math.atan2(dy,dx);if(theta<0)theta+=2*Math.PI;const t=theta/(2*Math.PI),saturation=Math.min(distance,g.radius)/g.radius;return {color:M.saturationColor(M.arcColor(t),saturation),t,saturation,inside:distance<=g.radius};}
 function position(color,size){
  const g=geometry(size),pure=M.saturationColor(color,1),p=0xff000000+pure[0]*65536+pure[1]*256+pure[2];
  const packed=M.colors.map(c=>0xff000000+c[0]*65536+c[1]*256+c[2]);let t=0;
  for(let i=0;i<6;i++){const a=packed[i],b=packed[i+1];if(((a^b)>>>0)===((p^a)>>>0)+((p^b)>>>0)){const low=Math.min(a,b),high=Math.max(a,b),range=M.stops[i+1]-M.stops[i],f=(p-low)/(high-low)*range;t=M.stops[i]+(a>b?range-f:f);break;}}
  const saturation=1-Math.min(...color)/255,r=saturation*g.radius,theta=t*Math.PI*2;
  return {x:g.cx+Math.cos(theta)*r,y:g.cy+Math.sin(theta)*r,t,saturation};
 }
 const api=Object.freeze({geometry,at,position});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXDiskMath=api;
})(globalThis);
