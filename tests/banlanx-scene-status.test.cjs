'use strict';const{test}=require('node:test'),assert=require('node:assert/strict'),Status=require('../banlanx-scene-status');
test('Variable timer count shifts loop after four13byte triggers',()=>{for(const count of[0,1,5]){const offset=142+7*count,b=new Uint8Array(offset+1);b[89]=count;b[offset]=1;assert.equal(Status.loop(b),true);b[offset]=0;assert.equal(Status.loop(b),false);}});
test('Absent/truncated tail cannot be misrepresented as observed false',()=>{for(const n of[0,88,89,90,142])assert.equal(Status.loop(new Uint8Array(n)),null);const b=new Uint8Array(177);b[89]=5;b[142]=1;assert.equal(Status.loop(b),null);});
test('Nonboolean and malformed inputs remain unknown rather than native fallbackfalse',()=>{const b=new Uint8Array(143);b[142]=2;assert.equal(Status.loop(b),null);for(const invalid of[null,{},'bytes'])assert.equal(Status.loop(invalid),null);const a=Array(143).fill(0);a[89]=1.5;assert.equal(Status.loop(a),null);});

test('Counts beyond known five timer slots are intentionally unknown, never clamped',()=>{const b=new Uint8Array(1928);b[89]=255;b[1927]=1;assert.equal(Status.loop(b),null);});
