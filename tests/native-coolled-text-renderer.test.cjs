'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R=require('../native-coolled-text-renderer.js');
const fonts=path.resolve(__dirname,'../native-coolled-draw-assets/fonts');
const loadFont=async name=>new Uint8Array(fs.readFileSync(path.join(fonts,name)));
const token=(text,extra={})=>({isText:true,text,textSize:16,isBold:true,rotate:0,color:-65536,...extra});
const render=(tokens,opts={},loaders={})=>R.render({tokens,...opts},{loadFont,...loaders});
// Approved licensed replacement fixtures; original APK goldens remain in private baseline.
const table=[
 [
  "UNICODE12",
  12,
  false,
  "2da30aaa974c4e1fdb753cd016d9d76cd3101dc89b5d6f5c075396c88f1cda9e",
  "000007e0090011001100090007e000000000000000000000"
 ],
 [
  "UNICODE12_BOLD",
  12,
  true,
  "ab7c301a625f797d36d4751b4675f561bd381cd1010ec22b1ad3898eb5f25645",
  "000007e00fe01900110019000fe007e00000000000000000"
 ],
 [
  "32_14_small",
  14,
  false,
  "612ca7360328f5fde9f3def0957cb5f1f1d6027edf70bbb2ad90fd7b95a3a1de",
  "000003f00c80188018800c8003f00000000000000000000000000000"
 ],
 [
  "32_14_large",
  14,
  true,
  "6e704813a4fbeefc3b01595aa4b205d25d625ec9163edfe687fbf7a7ca62b4e5",
  "000003f00ff01c8018801c800ff003f0000000000000000000000000"
 ],
 [
  "32_16_small",
  16,
  false,
  "c0ccba37a574347e5ebba10bf08fd02d4af4c3c516b529c46b09c94270c15be8",
  "000001fc064008400840064001fc000000000000000000000000000000000000"
 ],
 [
  "32_16_large",
  16,
  true,
  "7fa8b81b469e29facb4c0db2894875223955fb5b57b71ca4484b8a213564720f",
  "000001fc07fc0e4008400e4007fc01fc00000000000000000000000000000000"
 ]
];
// Independent column-word oracle: pinned replacement A bytes, not renderer output.
for(const [name,size,bold,hash,hex] of table)test('licensed replacement A pixels '+name,async()=>{
 const bytes=await loadFont(name);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash);assert.equal(Buffer.from(bytes.slice(65*size*2,66*size*2)).toString('hex'),hex);
 const words=hex.match(/.{4}/g).map(x=>parseInt(x,16));while(words.at(-1)===0)words.pop();while(words[0]===0)words.shift();const expected=[];for(let y=0;y<16;y++)for(const word of words)expected.push((word>>((16-size)/2))&(32768>>y)?0xff0000:0);
 const a=await render([token('A',{textSize:size,isBold:bold})]);assert.equal(a.supported,true);assert.equal(a.width,words.length);assert.deepEqual(a.pixels,expected);
});
test('independent backend fixtures',()=>{const f=require('./fixtures/native-coolled-text/renderer-backend-fixtures.json');for(const x of f.fixtures)assert.equal(R.backend(x.text,x.language,x.fontType,x.textSize),x.expectedBackend);});
test('token literals retain emoji names and Unicode input',()=>{const t=R.tokenize('Aemoji_fc_001emoji_fc_02_003😀é');assert.equal(t.length,6);assert.equal(t.map(x=>x.text).join(''),'Aemoji_fc_001emoji_fc_02_003😀é');assert.equal(t[1].imageName16,'emoji_fc_16x16_1');assert.equal(t[2].imageName14,'emoji_fc_14x14_2_3_data');assert.equal(t[3].text+t[4].text,'😀');});
test('unsupported rasterization preserves all token data',async()=>{for(const text of ['é','ا','😀','AB']){const tokens=[token(text,{unknown:{saved:true}})],before=JSON.stringify(tokens),a=await render(tokens);assert.equal(a.supported,false);assert.equal(JSON.stringify(tokens),before);assert.equal(a.pixels.length,0);}});
test('space uses half original font width',async()=>{for(const size of [12,14,16]){const a=await render([token(' ',{textSize:size})]);assert.equal(a.width,size/2);assert.ok(a.pixels.every(x=>x===0));}});
test('spacing between tokens only and per-token color',async()=>{const a=await render([token('A'),token('B',{color:0xff00ff00})],{textSpacing:8});const one=await render([token('A')]),two=await render([token('B')]);assert.equal(a.width,one.width+8+two.width);for(let y=0;y<16;y++)assert.deepEqual(a.pixels.slice(y*a.width+one.width,y*a.width+one.width+8),Array(8).fill(0));assert.ok(a.pixels.includes(0x00ff00));assert.ok(a.pixels.includes(0xff0000));});
test('static wrapping keeps glyph intact and centers with odd spare pixel on left',async()=>{const a=await render(Array.from({length:Math.floor(96/(await render([token('A')])).width)+1},()=>token('A')),{mode:1});assert.equal(a.frames.length,2);assert.equal(a.frames[0].width,96);const occupied=[];for(let x=0;x<96;x++)if(a.frames[1].pixels.some((c,k)=>k%96===x&&c))occupied.push(x);assert.equal(occupied[0],Math.ceil((96-(occupied.at(-1)-occupied[0]+1))/2));assert.deepEqual(a.frameAt(2),a.frames[0]);});
test('rotations preserve original A ink and recenter perpendicular glyphs',async()=>{const base=await render([token('A')]);const count=b=>b.mask.filter(Boolean).length;for(const rotate of [90,180,270]){const a=await render([token('A',{rotate})]);assert.equal(count(a),count(base));assert.equal(a.height,16);}const half=await render([token('A',{rotate:180})]);assert.deepEqual(half.pixels,base.pixels.slice().reverse());});
test('frame-auto14 keeps16-row source intermediate without crop',async()=>{const tokens=[token('A',{textSize:14})];const a=await render(tokens,{showHeight:14}),b=await render(tokens);assert.equal(a.frameAutoIntermediate,true);assert.equal(a.height,16);assert.deepEqual(a.pixels,b.pixels);});
test('mode-specific packing and cadence do not use stored speed',async()=>{for(const mode of [1,2,3,4,5,6,13]){const a=await render([token('A')],{mode,speed:255});assert.equal(a.frameAt(0).pixels.length,96*16);assert.equal(a.cadenceMs,[2,3].includes(mode)?55:[4,5].includes(mode)?255:1455);if(mode>=6){assert.equal(a.previewMode,1);assert.match(a.notice,/static fallback/);}if(mode>=2&&mode<=5)assert.ok(a.frameAt(0).pixels.every(x=>x===0));}});
test('scroll exposes complete original glyph with blank entry and exit',async()=>{const a=await render([token('A')],{mode:2});assert.ok(a.frameAt(0).pixels.every(x=>!x));assert.ok(a.frameAt(96).pixels.some(Boolean));const right=await render([token('A')],{mode:3});assert.ok(right.frameAt(0).pixels.every(x=>!x));assert.ok(right.frameAt(96).pixels.some(Boolean));});
test('emoji requires exact asset loader and centers original colors',async()=>{const [t]=R.tokenize('emoji_fc_001',{},{textSize:12});t.textSize=12;assert.equal((await render([t])).supported,false);const pix=Array(144).fill(0);pix[0]=0xffff0000;pix[143]=0xff0000ff;const a=await render([t],{}, {loadEmoji:async(name,size)=>{assert.equal(name,'emoji_fc_12x12_1');assert.equal(size,12);return{width:12,height:12,pixels:pix};}});assert.equal(a.supported,true);assert.equal(a.width,12);assert.equal(a.pixels[2*12],0xff0000);assert.equal(a.pixels[13*12+11],255);});
test('invalid assets/mixed fonts/options are explicit unsupported, not black success',async()=>{assert.equal((await render([token('A')],{},{loadFont:async()=>new Uint8Array(1)})).supported,false);assert.equal((await render([token('A'),token('B',{isBold:false})])).supported,false);assert.equal((await render([token('A')],{textSpacing:0})).supported,false);assert.equal((await render(Array.from({length:151},()=>token('A')))).supported,false);});
test('source aliases map without mutating input',async()=>{const t={isText:true,text:'A',textSize:16,isTextBold:false,textRotate:180,color:-65536},before=JSON.stringify(t);const a=await render([t]),b=await render([token('A',{isBold:false,rotate:180})]);assert.deepEqual(a.pixels,b.pixels);assert.equal(JSON.stringify(t),before);});

// Original res/pml.gif first frame, resource emoji_fc_12x12_1, SHA256 2941733e9136cd3198f8827e0c1fc39405d718b3566000e7c3916200a2fe9e00. Decoded independently with Pillow, not renderer.
const originalEmoji12=[0, 0, 0, 5048576, 12155417, 15320914, 15320657, 11760918, 4457472, 0, 0, 0, 0, 0, 11161088, 16777128, 16777215, 16777215, 16777215, 16777215, 16777118, 10502656, 0, 0, 0, 11681792, 16777060, 16777153, 16777116, 16774552, 16775065, 16777117, 16777152, 16777053, 10827008, 0, 4390912, 16770560, 16774912, 16441600, 15521536, 16775168, 16774912, 15522048, 16572928, 16775168, 16768768, 3670016, 12665856, 16770048, 16773632, 11956992, 6684672, 16244992, 15914752, 6488064, 12418304, 16773632, 16769536, 11352320, 15887104, 16763904, 16768768, 13868544, 11826688, 15121664, 14989824, 11825664, 14066176, 16769280, 16764416, 13719040, 15886080, 16496640, 13928704, 15575296, 16765952, 16433408, 16433408, 16765440, 15311616, 14257920, 16760832, 13783296, 12663296, 16622592, 9268821, 12232096, 13940086, 14596709, 14597227, 13875325, 11246249, 9924412, 16756480, 11152384, 3407872, 16750848, 13340176, 10253948, 12884896, 13742522, 13676470, 12555161, 10121838, 14128385, 16749568, 2818048, 0, 10166272, 16752384, 12081152, 9054208, 9184512, 9053184, 9054464, 13133568, 16753408, 9180416, 0, 0, 0, 9379584, 16749824, 15830272, 13923840, 14055424, 16224768, 16749056, 8787456, 0, 0, 0, 0, 0, 3801088, 10431488, 13323776, 13323776, 10234112, 3211264, 0, 0, 0];
test('original emoji first-frame colors match centered source resource',async()=>{const [t]=R.tokenize('emoji_fc_001','en',{textSize:12});const a=await render([t],{},{loadEmoji:async()=>({width:12,height:12,pixels:originalEmoji12})});assert.equal(a.supported,true);assert.equal(a.width,12);assert.deepEqual(a.pixels.slice(24,168),originalEmoji12);assert.ok(a.pixels.slice(0,24).every(x=>x===0));assert.ok(a.pixels.slice(168).every(x=>x===0));});
test('source Pattern.CASE_INSENSITIVE treats uppercase/mixed-case codes as one emoji',()=>{for(const value of ['EMOJI_FC_01_001','eMoJi_Fc_01_001','EMOJI_FC_001']){const tokens=R.tokenize(value);assert.equal(tokens.length,1);assert.equal(tokens[0].isText,false);assert.equal(tokens[0].text,value);assert.match(tokens[0].imageName16,/^emoji_fc_16x16_/);}});
