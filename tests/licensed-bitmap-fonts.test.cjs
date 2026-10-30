const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),D=require('../native-coolled-draw'),R=require('../native-coolled-text-resources');
const manifest=require('../third-party/smartease-matrix-sans/manifest.json');
const get=n=>fs.readFileSync(path.join(root,'native-coolled-draw-assets/fonts',n));
// Independent row-first decoder, not the producer's encoder or app glyph function.
function decode(b,n,c){let rows=[];for(let y=0;y<n;y++){let row=[];for(let x=0;x<n;x++)row.push((b[(c*n+x)*Math.ceil(n/8)+Math.floor(y/8)]>> (7-y%8))&1);rows.push(row);}return rows.flat();}
for(const a of manifest.assets)test(`${a.name}: exact ABI/hash, padding, ASCII, high BMP coverage`,()=>{
 const b=get(a.name),stride=Math.ceil(a.size/8);assert.equal(b.length,a.entries*a.size*stride);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);
 for(let i=stride-1;i<b.length;i+=stride)if(a.size%8)assert.equal(b[i]&((1<<(8-a.size%8))-1),0);
 assert.ok(!decode(b,a.size,32).some(Boolean));for(let c=33;c<=126;c++)assert.ok(decode(b,a.size,c).some(Boolean),`ASCII ${c}`);
 if(a.entries===65536){for(const cp of [0xe9,0x3a9,0x416,0x20ac,0x2192,0x2605,0x4e2d,0x6587,0x65e5,0x9f8d,0xff21,0xfffd]){const p=decode(b,a.size,cp);assert.ok(p.some(Boolean),cp.toString(16));assert.deepEqual(D.glyph(b,a.size,cp,1).pixels,p);}
 for(const cp of [0xd800,0xdfff,0xfffe,0xffff])assert.equal(decode(b,a.size,cp).length,a.size*a.size);}
});
test('normal/bold distinct, bold contains normal strokes without shifting offsets',()=>{for(let i=0;i<manifest.assets.length;i+=2){const a=manifest.assets[i],b=manifest.assets[i+1],n=get(a.name),v=get(b.name);assert.notDeepEqual(n,v);for(let k=0;k<n.length;k++)assert.equal(n[k]&v[k],n[k]);for(let cp of [65,73,87,49,56])assert.notDeepEqual(decode(n,a.size,cp),decode(v,a.size,cp));}});
test('actual replacement fonts survive repeated load, simultaneous requests, copies, clear and stale failure',async()=>{
 for(const a of manifest.assets){let calls=0;const r=R.create({fetch:async u=>{calls++;let b=get(path.basename(u));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};}});for(let cycle=0;cycle<3;cycle++){let [x,y]=await Promise.all([r.loadFont(a.name),r.loadFont(a.name)]);assert.notEqual(x,y);assert.deepEqual(x,y);x[0]^=255;assert.notEqual(x[0],(await r.loadFont(a.name))[0]);r.clear();}assert.equal(calls,3);}
 let rejectOld,old=true;const r=R.create({fetch:()=>old?new Promise((_,rej)=>rejectOld=rej):Promise.resolve({ok:true,arrayBuffer:async()=>get('32_16_small').buffer})});const pending=r.loadFont('32_16_small');r.clear();old=false;const fresh=r.loadFont('32_16_small');rejectOld(Error('stale'));await assert.rejects(pending);assert.ok((await fresh).length>0);assert.ok((await r.loadFont('32_16_small')).length>0);
});
