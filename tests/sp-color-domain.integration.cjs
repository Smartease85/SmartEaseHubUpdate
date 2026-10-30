/* Development-only dependency: npm install jsdom; run with NODE_PATH configured. */
const { JSDOM, VirtualConsole } = require("jsdom");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
function boot(storage = {}, beforeScripts) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "https://smartease.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;
  w.structuredClone = structuredClone;
  w.scrollTo = () => {};
  // Pixel rendering is browser-owned; these tests exercise authoring state and transport guards.
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  w.confirm = () => true;
  for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  const ctx = dom.getInternalVMContext();
  if(beforeScripts)beforeScripts({w,ctx,run:code=>vm.runInContext(code,ctx)});
  for (const script of w.document.querySelectorAll("script")) {
    const source = script.src
      ? fs.readFileSync(path.join(root, path.basename(script.src)), "utf8")
      : script.textContent;
    vm.runInContext(source, ctx, { filename: script.src || "index.inline.js" });
  }
  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}

const array=(b,code)=>JSON.parse(b.run('JSON.stringify('+code+')'));
const balance={"smartease-sp608e-rgb-balance-v1":'{"1":[100,50,100]}'};
test("native target rounds HSV chroma before gain and has explicit brightness contracts",()=>{
 const b=boot(balance);
 assert.deepEqual(array(b,'spNativeChroma([128,64,32])'),[255,127,64]);
 assert.deepEqual(array(b,'spNativeTargetCommand(1,"#804020",64,{brightnessMode:"preserve"})'),[136,137,5,1,255,64,64,64]);
 assert.deepEqual(array(b,'spNativeTargetCommand(1,"#804020")'),[136,137,5,1,255,64,64,128]);
 assert.deepEqual(array(b,'spNativeTargetCommand(1,"#000000")'),[136,137,5,1,255,128,255,0]);
 assert.deepEqual(array(b,'spNativeTargetCommand(1,"#000000",77,{brightnessMode:"preserve"})'),[136,137,5,1,255,128,255,77]);
 assert.deepEqual(array(b,'spNativeTargetCommand(1,"#010000")'),[136,137,5,1,255,0,0,1]);
 assert.throws(()=>b.run('spNativeTargetCommand(1,"#804020",64,{brightnessMode:"guess"})'),/Unknown/);
 b.dom.window.close();
});
test("legacy authored magnitude and saved matches are not silently normalized",()=>{
 const stored={...balance,"smartease-haunted-manual-rgb-v1":'{"1":{"#804020":[100,80,20]},"unknown":{"note":"keep"}}'};
 const b=boot(stored);
 assert.deepEqual(array(b,'spCorrectedColorCommand(1,"#402010",115)'),[136,137,5,1,64,16,16,115]);
 assert.deepEqual(array(b,'spCorrectedColorCommand(1,"#804020",115)'),[136,137,5,1,100,40,20,115]);
 assert.deepEqual(array(b,'spNativeTargetCommand(1,"#804020",115,{brightnessMode:"preserve"})'),[136,137,5,1,255,64,64,115]);
 assert.equal(b.w.localStorage.getItem("smartease-haunted-manual-rgb-v1"),stored["smartease-haunted-manual-rgb-v1"]);
 b.dom.window.close();
});
test("gain-only calibration matches scene and explicit test paths, without an order record",async()=>{
 const b=boot(balance);b.run('window.jobs=[];enqueuePackets=async p=>{jobs.push(...p);return true}');
 await b.run('sendRgb(1,"#ff751e",115)');
 assert.deepEqual(array(b,'jobs.at(-1)'),[136,137,5,1,255,59,30,115]);
 assert.deepEqual(array(b,'hauntedColorCommand(1,"#ff751e",115)'),array(b,'spCorrectedColorCommand(1,"#ff751e",115)'));
 assert.equal(b.run('jobs.some(p=>p[1]===0x83||p[1]===0x85)'),false);
 b.dom.window.close();
});
test("color refuses unknown brightness rather than assuming full power",async()=>{
 const b=boot();b.run('window.jobs=[];enqueuePackets=async p=>{jobs.push(...p);return true}');
 assert.equal(await b.run('sendRgb(1,"#804020")'),false);assert.equal(b.run('jobs.length'),0);
 b.run('channels[0].known=true;channels[0].brightness=77');
 await b.run('sendRgb(1,"#804020")');assert.equal(b.run('jobs.at(-1).at(-1)'),77);
 assert.throws(()=>b.run('spWireColorCommand(1,[255,0,0],256)'),/brightness/);
 b.dom.window.close();
});
test("authored45% scene sends115 in both brightness and RGB without normalizing saved RGB",()=>{
 const b=boot();const jobs=array(b,'SmartEaseEngine.commands(SmartEaseEngine.rows(["#804020"],25,45),Object.fromEntries(SmartEaseEngine.zones.map((id,i)=>[id,{channels:i===0?[1]:[]}])),[1],hauntedColorCommand)');
 assert.deepEqual(jobs.find(p=>p[1]===0x85),[136,133,2,1,115]);
 assert.deepEqual(jobs.find(p=>p[1]===0x89),[136,137,5,1,128,64,32,115]);b.dom.window.close();
});
test("integer inverse calibration rejects clipped and skipped levels and round-trips reachable values",()=>{
 const b=boot(balance);
 assert.equal(b.run('spRawManualMatchFromBalanced(1,[100,200,30])'),null);
 b.run('spRgbBalance[1]=[150,0,65]');
 assert.equal(b.run('spRawManualMatchFromBalanced(1,[1,0,30])'),null);
 for(const target of [[255,0,30],[150,0,60],[0,0,0]]){
  b.run('hauntedManualMatches[1]={"#ff751e":spRawManualMatchFromBalanced(1,'+JSON.stringify(target)+')}');
  assert.deepEqual(array(b,'spCorrectedColorBytes(1,"#ff751e")'),target);
 }b.dom.window.close();
});
test("reported picker replay bypasses gains and normalization, then editing returns to authored domain",async()=>{
 const b=boot(balance);b.run('window.jobs=[];enqueuePackets=async p=>{jobs.push(...p);return true};selectedMask=1;Object.assign(channels[0],{known:true,color:"#ff3b1e",order:0,brightness:77});syncControlsToSelection()');
 await b.w.document.getElementById('applyColor').onclick();
 assert.deepEqual(array(b,'jobs.at(-1)'),[136,137,5,1,255,59,30,77]);
 const color=b.w.document.getElementById('mainColor');color.value='#804020';color.dispatchEvent(new b.w.Event('input'));
 await b.w.document.getElementById('applyColor').onclick();assert.deepEqual(array(b,'jobs.at(-1)'),[136,137,5,1,128,32,32,77]);
 b.dom.window.close();
});
test("captured and historic snapshot looks restore wire bytes and order with original brightness",()=>{
 const b=boot(balance);b.run('for(const c of channels)Object.assign(c,{known:true,color:"#ff3b1e",brightness:77,order:2});captureLook()');
 assert.equal(b.run('settings.looks.at(-1).colorDomain'),'wire-v1');
 assert.deepEqual(array(b,'packetsForLook(settings.looks.at(-1)).find(p=>p[1]===0x89)'),[136,137,5,1,255,59,30,77]);
 b.run('delete settings.looks.at(-1).colorDomain');
 assert.deepEqual(array(b,'packetsForLook(settings.looks.at(-1)).find(p=>p[1]===0x89)'),[136,137,5,1,255,59,30,77]);
 assert.deepEqual(array(b,'packetsForLook(settings.looks.at(-1))[0]'),[136,132,2,1,2]);
 b.run('settings.looks.at(-1).colorDomain="unknown-v2"');assert.throws(()=>b.run('packetsForLook(settings.looks.at(-1))'),/Unknown/);b.dom.window.close();
});
test("reported picker provenance cannot replay after a connection generation changes",async()=>{
 const b=boot();b.run('window.jobs=[];enqueuePackets=async p=>{jobs.push(...p);return true};selectedMask=1;Object.assign(channels[0],{known:true,color:"#804020",order:0,brightness:77});syncControlsToSelection();bleSession++');
 assert.equal(await b.w.document.getElementById('applyColor').onclick(),false);assert.equal(b.run('jobs.length'),0);b.dom.window.close();
});
test("manual save rejects unreachable shade without discarding the edited sliders or saved match",()=>{
 const b=boot(balance),d=b.w.document;
 d.getElementById('hauntedManualChannel').value='1';d.getElementById('hauntedManualR').value='100';d.getElementById('hauntedManualG').value='200';d.getElementById('hauntedManualB').value='30';
 const before=b.run('JSON.stringify(hauntedManualMatches)');b.run('hauntedManualSave(false)');
 assert.equal(b.run('JSON.stringify(hauntedManualMatches)'),before);assert.equal(d.getElementById('hauntedManualG').value,'200');assert.match(d.getElementById('hauntedManualStatus').textContent,/cannot be reproduced exactly/);
 d.getElementById('hauntedManualG').value='70';b.run('hauntedManualSave(false)');assert.deepEqual(array(b,'spCorrectedColorBytes(1,hauntedTargetHex())'),[100,70,30]);b.dom.window.close();
});
test("all independently reconstructed native source fixtures match helper chroma and brightness",()=>{
 const b=boot(),fixtures=require('./sp-native-color-fixtures.json').fixtures;
 for(const f of fixtures){
  assert.deepEqual(array(b,'spNativeChroma('+JSON.stringify(f.inputColor)+')'),f.normalizedRgb,f.name);
  const hex='#'+f.inputColor.map(v=>v.toString(16).padStart(2,'0')).join('');
  assert.deepEqual(array(b,'spNativeTargetCommand(1,'+JSON.stringify(hex)+','+f.brightnessByte+', {brightnessMode:"preserve"})'),f.nativeFrame,f.name);
 }b.dom.window.close();
});
test("manual matching respects BRG plus gains, and multi-output impossible copy is atomic",()=>{
 const b=boot({...balance,'smartease-haunted-rgb-fix-v1':'{"1":["b","r","g"]}'}),d=b.w.document;
 d.getElementById('hauntedManualChannel').value='1';
 for(const [id,v] of [['R',100],['G',70],['B',30]])d.getElementById('hauntedManual'+id).value=v;
 b.run('hauntedManualSave(false)');assert.deepEqual(array(b,'spCorrectedColorBytes(1,hauntedTargetHex())'),[100,70,30]);
 b.run('spRgbBalance[2]=[100,0,100];hauntedOrders=()=>[1,2]');
 const before=b.run('JSON.stringify(hauntedManualMatches)'),saved=b.w.localStorage.getItem('smartease-haunted-manual-rgb-v1');
 b.run('hauntedManualSave(true)');assert.equal(b.run('JSON.stringify(hauntedManualMatches)'),before);assert.equal(b.w.localStorage.getItem('smartease-haunted-manual-rgb-v1'),saved);b.dom.window.close();
});
test("unknown color domains reject without transport and demo models the final brightness byte",async()=>{
 const b=boot();b.run('window.jobs=[];enqueuePackets=async p=>{jobs.push(...p);return true}');
 assert.equal(await b.run('sendRgb(1,"#804020",77,{domain:"unknown-v2"})'),false);assert.equal(b.run('jobs.length'),0);
 b.run('applyDemo([136,137,5,1,128,64,32,77])');assert.equal(b.run('channels[0].brightness'),77);assert.equal(b.run('channels[0].color'),'#804020');b.dom.window.close();
});
test("standalone Halloween fade, stars and identification preserve their requested brightness",async()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(root,'halloween.html'),'utf8'),{url:'https://smartease.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx);
 w.HTMLCanvasElement.prototype.getContext=()=>null;w.requestAnimationFrame=()=>0;w.confirm=()=>true;
 for(const script of w.document.querySelectorAll('script'))run(script.textContent);
 run('connected=true;window.sent=[];send=async p=>{sent.push(p);return true}');await run('testOne()');
 assert.equal(JSON.parse(run('JSON.stringify(sent.find(p=>p[1]===0x89))')).at(-1),100);
 w.document.getElementById('verified').checked=true;w.document.getElementById('brightness').value='45';
 run('sent=[];safeSend=async(p,label)=>{sent.push(p);if(label==="Stars color")live=false;return true}');await run('runHalloween()');
 const colors=JSON.parse(run('JSON.stringify(sent.filter(p=>p[1]===0x89))'));
 assert.ok(colors.length>2);assert.ok(colors.every(p=>p.at(-1)===115));
 assert.throws(()=>run('pColor(1,"#804020")'),/brightness/);dom.window.close();
});
test("reported color cannot silently become authored when selection changes to multiple or unknown outputs",async()=>{
 const b=boot(balance),d=b.w.document;
 b.run('window.jobs=[];enqueuePackets=async p=>{jobs.push(...p);return true};selectedMask=1;Object.assign(channels[0],{known:true,color:"#ff3b1e",brightness:77,order:0});syncControlsToSelection();selectMask(3)');
 assert.equal(await d.getElementById('applyColor').onclick(),false);assert.equal(b.run('jobs.length'),0);
 b.run('selectMask(2)');assert.equal(await d.getElementById('applyColor').onclick(),false);assert.equal(b.run('jobs.length'),0);
 d.getElementById('mainColor').value='#804020';d.getElementById('mainColor').dispatchEvent(new b.w.Event('input'));
 assert.equal(await d.getElementById('applyColor').onclick(),true);assert.equal(b.run('jobs.at(-1)[3]'),2);b.dom.window.close();
});
test("colorable music exposes explicit brightness rather than sending a disabled default",async()=>{
 const b=boot(),d=b.w.document;
 b.run('enterDemo();window.jobs=[];enqueuePackets=async p=>{jobs.push(...p);return true}');
 d.getElementById('nativeSpEffect').value=String(b.run('effects.find(f=>f.type==="Music"&&f.color).id'));b.run('nativeSpRender()');
 assert.equal(d.getElementById('nativeSpBrightness').disabled,false);
 d.getElementById('nativeSpBrightness').value='30';d.getElementById('nativeSpParked').checked=true;
 assert.equal(await b.run('nativeSpSend("apply")'),true);assert.equal(b.run('jobs.filter(p=>p[1]===0x89).every(p=>p.at(-1)===77)'),true);
 assert.equal(b.run('jobs.some(p=>p[1]===0x85)'),false);
 d.getElementById('nativeSpEffect').value=String(b.run('effects.find(f=>f.type==="Music"&&!f.color).id'));b.run('nativeSpRender()');assert.equal(d.getElementById('nativeSpBrightness').disabled,true);b.dom.window.close();
});
test("quick presets and rejected hex edits cannot strip reported provenance",async()=>{
 const b=boot(balance),d=b.w.document;b.run('window.jobs=[];enqueuePackets=async p=>{jobs.push(...p);return true};selectedMask=1;Object.assign(channels[0],{known:true,color:"#ff3b1e",brightness:77,order:0});syncControlsToSelection()');
 const quick=d.querySelector('#quickPresets [data-quickfx]');assert.equal(quick.onclick(),false);assert.equal(b.run('jobs.length'),0);
 d.getElementById('colorHex').value='bad';d.getElementById('colorHex').dispatchEvent(new b.w.Event('change'));
 await d.getElementById('applyColor').onclick();assert.deepEqual(array(b,'jobs.at(-1)'),[136,137,5,1,255,59,30,77]);
 b.run('jobs=[]');d.getElementById('mainColor').value='#804020';assert.equal(await d.getElementById('applyColor').onclick(),false);assert.equal(quick.onclick(),false);assert.equal(b.run('jobs.length'),0);
 d.getElementById('mainColor').dispatchEvent(new b.w.Event('input'));b.run('applyBuiltInLook=async look=>{window.authoredPreset=look;return true}');assert.equal(await quick.onclick(),true);assert.equal(b.run('authoredPreset.color'),'#804020');b.dom.window.close();
});
test("wizard quota failure preserves previous match, persisted bytes and edited slider draft",()=>{
 const saved='{"2":{"#ff751e":[10,20,30]}}',b=boot({'smartease-haunted-manual-rgb-v1':saved}),d=b.w.document;
 d.getElementById('calOutput').value='2';d.getElementById('calTarget').value='#ff751e';
 d.getElementById('calRawR').value='100';d.getElementById('calRawG').value='70';d.getElementById('calRawB').value='30';
 const before=b.run('JSON.stringify(hauntedManualMatches)');b.run('calTestedSignature=calSignature()');
 const proto=Object.getPrototypeOf(b.w.localStorage),original=proto.setItem;
 proto.setItem=function(key,value){if(key==='smartease-haunted-manual-rgb-v1')throw Error('quota');return original.call(this,key,value)};
 b.run('calSaveMix()');assert.equal(b.run('JSON.stringify(hauntedManualMatches)'),before);assert.equal(b.w.localStorage.getItem('smartease-haunted-manual-rgb-v1'),saved);assert.equal(d.getElementById('calRawG').value,'70');assert.match(d.getElementById('calMixStatus').textContent,/Couldn't save/);
 proto.setItem=original;b.dom.window.close();
});
test("color-domain release is retrievable from both entry points with a new atomic SW cache",()=>{
 const release='2026-10-30-native-test-candidate-03';
 for(const name of ['index.html','halloween.html']){
  const html=fs.readFileSync(path.join(root,name),'utf8'),dom=new JSDOM(html);
  assert.equal(dom.window.document.querySelector('meta[name="smartease-release"]').content,release);
  assert.ok(html.includes('Build: '+release));dom.window.close();
 }
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(sw,/const CACHE_NAME = "smartease-cart-lights-native-test-candidate-03"/);
 assert.ok(sw.includes('"./index.html"'));
});
