'use strict';
const M=require('./template-model.cjs'),LIMIT=4*1024*1024;
function id(x){if(typeof x!=='string'||!x||x.length>128||['__proto__','constructor','prototype'].includes(x))throw Error('Invalid square identity');return x;}
function validate(input,kind){const lib=M.copy(input);if(lib.format!=='smartease-ux-square-library'||lib.version!==1||lib.family!=='coolledux'||lib.width!==16||lib.height!==16||lib.kind!==kind||lib.sourceIdentity!==M.sourceLibraryIdentity(kind)||!Array.isArray(lib.records)||lib.records.length>128)throw Error('Wrong square library domain');const seen=new Set();for(const r of lib.records){id(r.id);if(seen.has(r.id))throw Error('Duplicate square identity');seen.add(r.id);if(M.kind(r.combine)!==kind)throw Error('Other-family pattern rejected');M.pattern(r.combine);}if(JSON.stringify(lib).length>LIMIT)throw Error('Square library exceeds bound');return lib;}
function storageKey(kind){M.sourceLibraryIdentity(kind);return'smartease.native.coolledux.square.'+kind+'.v1';}
function create({storage,key,kind}){if(key!==storageKey(kind))throw Error('Dedicated square storage key required');if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof key!=='string'||!key)throw Error('Explicit separate storage required');
 const empty=()=>({format:'smartease-ux-square-library',version:1,family:'coolledux',width:16,height:16,kind,sourceIdentity:M.sourceLibraryIdentity(kind),records:[]});
 function snapshot(){const raw=storage.getItem(key);if(raw!==null&&(typeof raw!=='string'||raw.length>LIMIT))throw Error('Invalid square storage');return{revision:raw,library:raw===null?empty():validate(JSON.parse(raw),kind)};}
 function commit(input,revision){const next=validate(input,kind),raw=JSON.stringify(next);if(storage.getItem(key)!==revision)throw Error('Stale square revision');storage.setItem(key,raw);return snapshot();}
 function save(record,revision,{editing=false}={}){const s=snapshot();if(s.revision!==revision)throw Error('Stale square revision');const r=M.copy(record);id(r.id);const i=s.library.records.findIndex(x=>x.id===r.id);if(editing){if(i<0)throw Error('Square record removed');s.library.records[i]=r;}else{if(i>=0)throw Error('Duplicate square identity');s.library.records.unshift(r);}return commit(s.library,revision);}
 function remove(recordId,revision){const s=snapshot();if(s.revision!==revision)throw Error('Stale square revision');const i=s.library.records.findIndex(x=>x.id===recordId);if(i<0)throw Error('Square record removed');s.library.records.splice(i,1);return commit(s.library,revision);}
 function choose(recordId,type,revision){const s=snapshot();if(s.revision!==revision)throw Error('Stale square revision');const r=s.library.records.find(x=>x.id===recordId);if(!r)throw Error('Square record removed');return M.placeSquare(r.combine,type);}
 function importRaw(raw,revision){if(typeof raw!=='string'||raw.length>LIMIT)throw Error('Invalid square import size');return commit(JSON.parse(raw),revision);}
 return{snapshot,save,remove,choose,importRaw,exportRaw:()=>JSON.stringify(snapshot().library)};
}
module.exports={create,validate,LIMIT,storageKey};
