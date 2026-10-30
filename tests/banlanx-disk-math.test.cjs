'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),D=require('../banlanx-disk-math.js'),M=require('../banlanx-source-color-math.js');
test('nominal140 supplied size has70 radius, not140',()=>assert.deepEqual(D.geometry(140),{size:140,cx:70,cy:70,radius:70}));
test('center is white and right edge red',()=>{assert.deepEqual(D.at(70,70,140).color,[255,255,255]);assert.deepEqual(D.at(140,70,140).color,[255,0,0]);});
test('clockwise screen angle maps through source uneven stops without arc quantization',()=>{const t=.1234567,angle=t*2*Math.PI,r=70,x=70+Math.cos(angle)*r,y=70+Math.sin(angle)*r,a=D.at(x,y,140);assert(Math.abs(a.t-t)<1e-15);assert.deepEqual(a.color,M.saturationColor(M.arcColor(a.t),a.saturation));assert.notEqual(a.t,Math.round(a.t*1000)/1000);});
test('negative atan angle wraps once and lower-left upper-right quadrants stay distinct',()=>{assert.equal(D.at(70,0,140).t,.75);assert.equal(D.at(70,140,140).t,.25);assert.equal(D.at(0,70,140).t,.5);});
test('outside start is marked invalid but ongoing movement clamps saturation',()=>{const a=D.at(210,70,140);assert.equal(a.inside,false);assert.equal(a.saturation,1);assert.deepEqual(a.color,[255,0,0]);assert.equal(D.at(140,70,140).inside,true);});
test('radial distance substitutes saturation while keeping value1',()=>{assert.deepEqual(D.at(105,70,140).color,[255,128,128]);assert.deepEqual(D.at(133,70,140).color,[255,25,25]);});
test('responsive scale preserves source color and invalid inputs reject',()=>{assert.deepEqual(D.at(105,70,140).color,D.at(210,140,280).color);for(const v of [NaN,Infinity,'140',null,0,-1,4097])assert.throws(()=>D.geometry(v));for(const v of [NaN,Infinity,null,'1'])assert.throws(()=>D.at(v,70,140));});

test('inverse selector follows source packed endpoint matching not hue/360',()=>{
 M.colors.forEach((c,i)=>{const p=D.position(c,140);assert(Math.abs(p.t-(i===6?0:M.stops[i]))<1e-14);});
 const p=D.position([128,0,255],140);assert(Math.abs(p.t-.25466666666666665)<1e-14);assert.notEqual(p.t,1/4);
});
test('inverse selector retains original saturation and white center',()=>{assert.deepEqual(D.position([255,255,255],140),{x:70,y:70,t:0,saturation:0});const p=D.position([255,128,128],140);assert.equal(p.saturation,1-128/255);assert.equal(p.x,70+(1-128/255)*70);assert.equal(p.y,70);});
test('pure inverse API requires explicit V1 target and rejects wire/low-value colors',()=>{for(const c of [[128,128,128],[128,64,32],[0,0,0],[255,,0]])assert.throws(()=>D.position(c,140),/V=1/);});
