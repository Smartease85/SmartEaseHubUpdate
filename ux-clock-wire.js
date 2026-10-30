(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./native-coolled-clock-model.js'),require('./ux-clock-wire-tables.js'),require('./ux-source-program.js'),require('./ux-source-codec.js'));else r.SmartEaseUXClockWire=f(r.SmartEaseUXClockModel,r.SmartEaseUXClockWireTables,r.SmartEaseUXSourceProgram,r.SmartEaseUXSourceCodec);})(globalThis,function(M,T,P,C){
'use strict';
// Pure bounded original16x96 Clock only. Never sends, syncs, stores, or mutates a record.
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}freeze(T);freeze(M.STYLES);
function keys(o,allowed){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))throw Error('Unrecognized wire schema');}
function rgb444(v){if(!Number.isInteger(v)||v< -2147483648||v>0xffffff)throw Error('Invalid Clock color');return[(v>>>20)&15,((v>>>8)&240)|((v>>>4)&15)];}
function table(id,kind){const a=T.glyphs['style'+id+kind+'Data1696'];if(!Array.isArray(a)||a.length>65535||!a.every(b=>Number.isInteger(b)&&b>=0&&b<=255))throw Error('Invalid pinned glyph table');return a;}
if(Object.keys(T.glyphs).length!==54)throw Error('Expected exact54 glyph tables');for(let i=1;i<=18;i++)for(const k of ['Number','Space','Ampm'])table(i,k);
function validate(record){
 if(M.ARTWORK_VERSION!=='smartease-authored-clock-1'||T.artworkVersion!=='smartease-authored-clock-1')throw Error('Clock artwork cache versions differ; reload this app before Send.');
 if(!record||typeof record.name!=='string'||!Number.isInteger(record.repeat)||record.repeat<1||record.repeat>10)throw Error('Explicit record name/repeat required');
 if(record?.clock?.artworkVersion!=='smartease-authored-clock-1')throw Error('Clock artwork version is not supported for Send. Open Clock and choose Make a copy with updated artwork; the original stays unchanged.');
 const d=M.decode(record),[a,k]=record.clock.combinePrograms,c=k.clockItem.clockProgramContent,b=a.animationItem.animationProgramContent;
 // Opaque imported metadata is ignored, never rewritten. All source-known wire fields are validated.
 if(b.gifFile!==null||b.imageId!==0||b.isGIfFileEncrypted!==false)throw Error('Ambiguous background source');
 const ref=T.backgrounds[d.styleId];if(b.speed!==ref.speed||b.mListDrawItems.length!==ref.frames.length)throw Error('Clock artwork timing/count mismatch');
 if(b.delays!==undefined&&b.delays!==null&&(!Array.isArray(b.delays)||b.delays.length!==0))throw Error('Explicit delay override outside original Clock schema');
 for(let f=0;f<ref.frames.length;f++)for(let i=0;i<1536;i++){const p=b.mListDrawItems[f][i];if(p.color!==(ref.frames[f][i]|0xff000000)||p.data!=='true'||p.colors!==null||p.index!==0)throw Error('Clock artwork pixel mismatch');}
 for(const part of ['hour','spaceHour','minute','spaceMinute','seconds','ampm']){const x=c[part+'StartColumn'],y=c[part+'StartRow'],w=c[part+'Width'],h=c[part+'Height'];for(const v of [x,y,w,h])C.uint(v,2);if(x+w>96||y+h>16)throw Error('Clock geometry outside target');}
 return {d,c,b};
}
function clockContent(c){const n=table(c.styleIndex,'Number'),s=table(c.styleIndex,'Space'),a=table(c.styleIndex,'Ampm');const out=[7,0,0,0,0,0,0,0,c.layerType,(c.is24HourShowMode?1:0)|(c.isSpaceShing?2:0),...C.uint(c.showTime,2),...C.uint(c.numHeight,2),...C.uint(c.numWidth,2)];const add=t=>out.push(...C.uint(t.length,2),...t);add(n);for(const part of ['hour','spaceHour','minute','spaceMinute','seconds','ampm']){out.push(...rgb444(c[part+'Color']));for(const field of ['StartColumn','StartRow','Width','Height'])out.push(...C.uint(c[part+field],2));if(part==='spaceHour')add(s);if(part==='spaceMinute')add(c.showSpaceMinuteColor?s:[]);if(part==='ampm')add(a);}return [...C.uint(out.length+4,4),...out];}
function serialize(record){const {c,b}=validate(record);return P.program([P.animation({layer:b.layerType,x:b.startColumn,y:b.startRow,width:b.showWidth,height:b.showHeight,frames:b.mListDrawItems.map(f=>f.map(p=>p.color&0xffffff)),delays:b.mListDrawItems.map(()=>b.speed)}),clockContent(c)]);}
function plan(record,metadata){keys(metadata,['index','count','showCount','packageSize']);if(!metadata||!Number.isInteger(metadata.index)||!Number.isInteger(metadata.count)||metadata.showCount!==record.repeat||!Number.isInteger(metadata.packageSize))throw Error('Explicit matching upload metadata required');return C.planRawProgram(serialize(record),metadata);}
return Object.freeze({validate,serialize,plan,rgb444});
});
