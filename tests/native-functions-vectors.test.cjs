// Reconstructed recovery test from preserved packet evidence; NOT exact original test bytes.
const test=require('node:test');
const assert=require('node:assert/strict');
const vectors=require('../docs/native-custom-functions-vectors.json');
test('source F1–F6 tap/longpress packets are offline evidence only',()=>{
 assert.equal(vectors.length,12);
 let index=0;
 for(let fn=1;fn<=6;fn++)for(const action of [1,2]){
  const v=vectors[index++];
  assert.equal(v.function,fn);assert.equal(v.actionType,action);
  assert.deepEqual(v.hex.split(' ').map(x=>parseInt(x,16)),[0x7e,5,0xfd,fn,action,255,255,0,0xef]);
 }
});
