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
  vm.runInContext(fs.readFileSync(path.join(root,"native-lotus-icon-data.js"),"utf8"),ctx);

  if(beforeScripts)beforeScripts({w,ctx,run:code=>vm.runInContext(code,ctx)});
  for (const script of w.document.querySelectorAll("script")) {
    const source = script.src
      ? fs.readFileSync(path.join(root,path.basename(script.src)), "utf8")
      : script.textContent;
    vm.runInContext(source, ctx, { filename: script.src || "index.inline.js" });
  }
  if(!w.document.getElementById('nativeAppScreen')){const host=w.document.createElement('section');host.id='nativeAppScreen';w.document.body.append(host);}
  if(vm.runInContext("typeof nativeAppState",ctx)==='undefined')vm.runInContext("var nativeAppState={device:'nokins',screen:'settings',detail:'line-sequence'};",ctx);
  vm.runInContext("page='native';",ctx);
  if(!w.SmartEaseNativeSettings)vm.runInContext(fs.readFileSync(path.join(root,'native-lotus-settings.js'),'utf8'),ctx);

  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}
const key='smartease-native-coolledux-v1',libKey='coolledux:16x96';
const graffiti=()=>({width:96,height:16,pixels:Array(1536).fill(0),mask:Array(1536).fill(true),mode:1,speed:15,stay:3});
const fixture=()=>({format:'smartease-native-coolledux-library',version:1,opaque:{keep:true},libraries:{[libKey]:{family:'coolledux',rows:16,columns:96,records:[{id:'a',kind:'graffiti',repeat:1,graffiti:graffiti(),opaque:9},{id:'b',kind:'graffiti',repeat:10,graffiti:graffiti()}],selection:[],unknown:3},future:{opaque:true}},preferences:{opaque:4}});
function setup(value=fixture()){const b=boot(value?{[key]:JSON.stringify(value)}:{});b.run("go('native/coolled/program')");return b;}
const data=b=>JSON.parse(b.w.localStorage.getItem(key));
const TM=require('../native-coolled-text-model.js'),TR=require('../native-coolled-text-renderer.js');
function textRecord(id='text1'){const r=TM.encode(TM.commit(TM.defaults(),'Hello',TR.tokenize));r.id=id;return r;}
function mixed(){const f=fixture();f.libraries['coolledux:16x96'].records.push(textRecord(),{id:'unknown',kind:'future',secret:{keep:true}});return f;}
function click(b,label){const e=[...b.w.document.querySelectorAll('button')].find(x=>!x.closest('[hidden]')&&x.getAttribute('aria-label')===label);assert.ok(e,'visible '+label);e.click();return e;}
function input(b,value){const t=b.w.document.querySelector('#nuxTextHost textarea');assert.ok(t);t.value=value;t.dispatchEvent(new b.w.Event('input'));return t;}
function openNew(b){b.w.SmartEaseNativeUX.add();click(b,'Text');assert.equal(b.w.location.hash,'#native/coolled/text');}
const turn=()=>new Promise(r=>setImmediate(r));
test('actual Add item1 Text creates type3 and returns Program once without transport',async()=>{const b=setup();openNew(b);input(b,'A<>&');click(b,'Confirm text');assert.equal(b.w.document.querySelector('#nuxTextHost textarea').rows,1);assert.equal(b.w.document.querySelector('#nuxTextHost button[aria-label=Send]').disabled,false);click(b,'Save');await turn();assert.equal(b.w.location.hash,'#native/coolled/program');const records=b.w.SmartEaseNativeUXStore.library().records;assert.equal(records.length,3);assert.equal(records[2].kind,'text');assert.equal(records[2].text.programType,3);assert.equal(records[2].title,'A<>&');assert.equal(b.w.SmartEaseNativeUX.send(),false);b.dom.window.close();});
test('mixed library supports Text edit copy repeat selection order deletion and preserves future records',async()=>{const b=boot({[key]:JSON.stringify(mixed())});b.run("go('native/coolled/program')");const a=b.w.SmartEaseNativeUX,store=b.w.SmartEaseNativeUXStore;a.openRecord('text1');input(b,'Changed');click(b,'Save');await turn();assert.equal(store.library().records.find(r=>r.id==='text1').title,'Hello');assert.equal(TM.decode(store.library().records.find(r=>r.id==='text1')).content,'Changed');a.change('text1','copy');assert.equal(store.library().records.filter(r=>r.kind==='text').length,2);a.change('text1','repeat',8);a.change('text1','select');assert.equal(store.library().selection.includes('text1'),true);a.change('text1','top');assert.equal(store.library().records[0].id,'text1');a.change('text1','delete');assert.equal(store.library().selection.includes('text1'),false);assert.deepEqual(JSON.parse(JSON.stringify(store.library().records.find(r=>r.id==='unknown'))),{id:'unknown',kind:'future',secret:{keep:true}});b.dom.window.close();});
test('text quota failure retains full draft and currentroute without partial new record',async()=>{const b=setup();openNew(b);input(b,'Unsaved');const before=b.w.localStorage.getItem(key),set=b.w.Storage.prototype.setItem;b.w.Storage.prototype.setItem=()=>{throw Error('quota');};click(b,'Save');await turn();assert.equal(b.w.location.hash,'#native/coolled/text');assert.equal(b.w.document.querySelector('#nuxTextHost textarea').value,'Unsaved');assert.equal(b.w.localStorage.getItem(key),before);assert.match(b.w.document.querySelector('.uxt-status').textContent,/quota/);b.w.Storage.prototype.setItem=set;click(b,'Save');await turn();assert.equal(b.w.location.hash,'#native/coolled/program');b.dom.window.close();});
test('strict text startup/import validation preserves malformed source bytes',()=>{for(const bad of ['color','speed','frame']){const f=mixed(),r=f.libraries['coolledux:16x96'].records.find(r=>r.id==='text1'),item=r.text.combinePrograms[0].textItem;if(bad==='color')item.textCustomColorProgramContent.textEmoji32Items.textEmojiItems[0].color='url(javascript:x)';if(bad==='speed')item.textContentProgramContent.speed=255.1;if(bad==='frame')item.frameItem={frameType:900};const raw=JSON.stringify(f),b=boot({[key]:raw});assert.ok(b.w.SmartEaseNativeUXStore.error,bad);assert.equal(b.w.localStorage.getItem(key),raw);assert.throws(()=>b.w.SmartEaseNativeUXStore.importRaw(raw));b.dom.window.close();}});
test('backup export/import preserves all originaltext metadata and unknownrecords',()=>{const b=boot({[key]:JSON.stringify(mixed())}),store=b.w.SmartEaseNativeUXStore;const original=store.exportRaw();store.importRaw(original);assert.equal(store.exportRaw(),original);assert.equal(store.library().records.find(r=>r.id==='unknown').secret.keep,true);b.dom.window.close();});
test('route departure before pending font completion keeps detached controls inert',async()=>{let resolve;const b=boot({},({w})=>{w.fetch=()=>new Promise(r=>resolve=r);});b.run("go('native/coolled/program')");openNew(b);input(b,'A');click(b,'Confirm text');const oldSave=b.w.document.querySelector('#nuxTextHost button[aria-label=Save]');b.run("go('native/coolled/program')");const before=b.w.localStorage.getItem(key);resolve({ok:true,arrayBuffer:async()=>fs.readFileSync(path.join(root,'native-coolled-draw-assets/fonts/32_16_large')).buffer});await turn();oldSave.click();await turn();assert.equal(b.w.localStorage.getItem(key),before);assert.equal(b.w.location.hash,'#native/coolled/program');b.dom.window.close();});
test('same route generation change closes Text without reopening previousdraft',()=>{const b=setup();openNew(b);input(b,'Keep no stale save');const old=b.w.document.querySelector('#nuxTextHost button[aria-label=Save]');b.run('cartDevices[1].link.generation++;SmartEaseNativeUX.refresh()');const before=b.w.localStorage.getItem(key);old.click();assert.equal(b.w.localStorage.getItem(key),before);assert.match(b.w.document.getElementById('nuxTextHost').textContent,/No active text draft/);assert.equal(b.w.document.querySelector('#nuxTextHost textarea'),null);b.dom.window.close();});
test('browser Back then Forward cannot revive old Text controls or savedata',async()=>{const b=setup();openNew(b);input(b,'A');const old=b.w.document.querySelector('#nuxTextHost button[aria-label=Save]'),before=b.w.localStorage.getItem(key);let pop=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));b.w.history.back();await pop;pop=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));b.w.history.forward();await pop;old.click();await turn();assert.equal(b.w.localStorage.getItem(key),before);assert.match(b.w.document.getElementById('nuxTextHost').textContent,/No active text draft/);b.dom.window.close();});
test('all runtimeText assets cached including actual font reuse and no sourceXML/runtime dumps',()=>{const source=fs.readFileSync(path.join(root,'sw.js'),'utf8'),ctx={};vm.runInNewContext(source.slice(0,source.indexOf('self.addEventListener'))+';globalThis.assets=ASSETS;',ctx);const assets=Array.from(ctx.assets);for(const name of fs.readdirSync(root).filter(n=>/^native-coolled-(text-.*|emoji-catalog)\.js$/.test(n)))assert.ok(assets.includes('./'+name),name);function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]);}for(const p of walk(path.join(root,'native-coolled-text'))){const rel='./'+path.relative(root,p).replaceAll('\\','/');assert.ok(assets.includes(rel),rel);assert.doesNotMatch(rel,/\.xml$|CONTRACT|README/);}assert.equal(new Set(assets).size,assets.length);for(const a of assets)assert.ok(fs.existsSync(path.join(root,a)),a);});
test('dual or missing color payload rejected consistently at startup/import/fullbackup without rawdata rewrite',async()=>{for(const dual of [true,false]){const f=mixed(),item=f.libraries[libKey].records.find(r=>r.id==='text1').text.combinePrograms[0].textItem;if(dual)item.textAutoColorProgramContent={autoColorType:1,speed:230};else item.textCustomColorProgramContent=null;const raw=JSON.stringify(f),bad=boot({[key]:raw});assert.ok(bad.w.SmartEaseNativeUXStore.error);assert.equal(bad.w.localStorage.getItem(key),raw);bad.dom.window.close();const b=setup(),before=b.w.localStorage.getItem(key);assert.throws(()=>b.w.SmartEaseNativeUXStore.importRaw(raw),/exactly one/);let confirms=0;b.w.confirm=()=>{confirms++;return true;};const backup=JSON.stringify({format:'smartease-cart-backup',version:1,values:{[key]:raw}});b.w.probe={size:Buffer.byteLength(backup),text:async()=>backup};await b.run('restoreBackup(probe)');assert.equal(confirms,0);assert.equal(b.w.localStorage.getItem(key),before);b.dom.window.close();}});
