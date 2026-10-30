/* tDp.TYb Solid-mode math. Source arithmetic order, no transport or storage. */
'use strict';
(function(root){
 const M=typeof module!=='undefined'&&module.exports?require('./banlanx-source-color-math.js'):root.SmartEaseBanlanXColorMath;
 const finite=v=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('Finite number required');return v;};
 const unit=v=>Math.max(0,Math.min(1,finite(v)));
 function chroma(c){M.saturationColor(c,1);return c;}
 function saturation(c){chroma(c);return 1-Math.min(...c)/255;}
 function geometry(width,height){finite(width);finite(height);if(width<=0||height<=0||width>4096||height>4096)throw Error('Positive bounded dimensions required');const radius=((height*.125)*height)/width+width/2,inner=radius-40,track=inner+(radius-inner)/2,d=radius-width,ratio=d/((d*track)/(d+12)),upper=Math.acos(ratio)-.15,lower=-upper,span=Math.abs(upper)+Math.abs(lower);if(!(inner>0&&Number.isFinite(upper)&&upper>0&&upper<Math.PI))throw Error('Unsupported source geometry');return {width,height,radius,inner,track,cx:radius,cy:height/2,upper,lower,span};}
 function inverse(c){chroma(c);const pure=M.saturationColor(c,1),p=0xff000000+pure[0]*65536+pure[1]*256+pure[2],a=M.colors.map(c=>0xff000000+c[0]*65536+c[1]*256+c[2]);for(let i=0;i<6;i++){const A=a[i],B=a[i+1];if(((A^B)>>>0)===((p^A)>>>0)+((p^B)>>>0)){const range=M.stops[i+1]-M.stops[i],offset=(p-Math.min(A,B))/(Math.max(A,B)-Math.min(A,B))*range;return M.stops[i]+(A>B?range-offset:offset);}}return 0;}
 function position(q,g){if(!Number.isInteger(q)||q<0||q>100)throw Error('Source hue position must be integer0–100');const angle=g.upper-(q*g.span)/100;return {q,angle,x:g.radius-Math.cos(angle)*g.track,y:g.height/2-Math.sin(angle)*g.track};}
 function fromColor(c,g){return position(100-Math.round(inverse(c)*100),g);}
 function at(x,y,g){finite(x);finite(y);const dx=x-g.cx,dy=y-g.cy,distance=Math.sqrt(dx*dx+dy*dy),raw=Math.atan2(x-g.cx,g.cy-y)+Math.PI/2,angle=Math.min(g.upper,Math.max(g.lower,raw)),q=Math.round(50-(angle*100)/g.span);return {...position(q,g),inside:distance>=g.inner&&distance<=g.radius};}
 function hue(q,color,brightness){chroma(color);if(!Number.isInteger(brightness)||brightness<0||brightness>255)throw Error('Explicit byte brightness required');if(!Number.isInteger(q)||q<0||q>100)throw Error('Source hue position must be integer0–100');const hueColor=M.arcColor((100-q)/100);return {hueColor,color:M.saturationColor(hueColor,saturation(color)),brightness};}
 function setSaturation(value,hueColor,brightness){chroma(hueColor);if(!Number.isInteger(brightness)||brightness<0||brightness>255)throw Error('Explicit byte brightness required');return {color:M.saturationColor(hueColor,unit(value)),brightness};}
 function setBrightness(value,color){chroma(color);return {color:color.slice(),brightness:Math.round(unit(value)*255)};}
 function withValue(color,value){chroma(color);const [r,g,b]=color.map(x=>x/255),v=Math.max(r,Math.max(g,b)),delta=v-Math.min(r,Math.min(g,b)),mod=(x,n)=>{const q=x%n;return q<0?q+n:q;};let h=v===0?0:v===r?60*mod((g-b)/delta,6):v===g?60*((b-r)/delta+2):60*((r-g)/delta+4);if(Number.isNaN(h))h=0;const s=delta/v,V=unit(value),c=s*V,x=c*(1-Math.abs(mod(h/60,2)-1)),m=V-c,parts=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return parts.map(x=>Math.round((x+m)*255));}
 function responsive(width,height){finite(width);finite(height);if(width<=0||height<=0||width>16384||height>16384)throw Error('Positive bounded ambient dimensions required');return {width:100*(width/375),height:290*(height/667),sliderWidth:215*(width/375),sliderHeight:25*(width/375)};}
 function slider(width,height){finite(width);finite(height);if(width<=12||height<=12||width>4096||height>4096||width===height)throw Error('Non-square bounded slider dimensions greater than12 required');const horizontal=width>height,r=Math.min(width,height)/2;return {width,height,horizontal,r,travel:(horizontal?width:height)-2*r};}
 function sliderAt(x,y,g){return unit(1-((g.horizontal?finite(x):finite(y))-g.r)/g.travel);}
 function sliderPosition(value,g){const along=g.r+g.travel*(1-unit(value));return g.horizontal?{x:along,y:g.r}:{x:g.r,y:along};}
 const api=Object.freeze({responsive,withValue,slider,sliderAt,sliderPosition,geometry,inverse,position,fromColor,at,hue,setSaturation,setBrightness,saturation});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartEaseBanlanXSolidMath=api;
})(globalThis);
