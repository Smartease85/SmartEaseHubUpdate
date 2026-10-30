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
const key='smartease-native-coolledux-v1',libKey='coolledux:16x96',M=require('../native-coolled-dynamic-model'),P=require('../native-coolled-dynamic-preparation');
function record(id='dynamic1'){return{...M.encode(M.commit(M.defaults(),'AB',P.tokenize)),id,opaque:{keep:9}};}
function fixture(){return{format:'smartease-native-coolledux-library',version:1,opaque:{keep:true},libraries:{[libKey]:{family:'coolledux',rows:16,columns:96,records:[record(),{id:'unknown',kind:'future',opaque:9},{id:'g',kind:'graffiti',repeat:1,graffiti:{width:96,height:16,mode:1,speed:15,stay:3,pixels:Array(1536).fill(0)}}],selection:[]}}};}
function resources(b){b.w.fetch=async name=>{const p=path.resolve(root,name);assert.ok(p.startsWith(root+path.sep));const bytes=fs.readFileSync(p);return{ok:true,text:async()=>bytes.toString(),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};}
function setup(value){const b=boot(value?{[key]:JSON.stringify(value)}:{});resources(b);b.run("go('native/coolled/program')");return b;}
function click(b,label){const e=[...b.w.document.querySelectorAll('button')].find(x=>!x.closest('[hidden]')&&x.getAttribute('aria-label')===label);assert.ok(e,'visible '+label);e.focus();e.click();return e;}
const turn=()=>new Promise(r=>setImmediate(r));
function input(b,value){const t=b.w.document.querySelector('#nuxDynamicHost textarea');t.value=value;t.dispatchEvent(new b.w.Event('input'));return t;}
function close(b){b.w.SmartEaseNativeUX.leave();b.dom.window.close();}
test('Actual Add Dynamic Text → shared GIF preview → Save/reopen source14; per-editor Send remains separate',async()=>{const b=setup();try{b.w.SmartEaseNativeUX.add();click(b,'Dynamic Text');assert.equal(b.w.location.hash,'#native/coolled/dynamic-text');input(b,'HELLO');click(b,'Confirm text');await turn();assert.match(b.w.document.querySelector('#nuxDynamicHost .uxt-status').textContent,/Source GIF quantization/);click(b,'Save');await turn();const r=b.w.SmartEaseNativeUXStore.library().records[0];assert.equal(r.kind,'dynamicText');assert.equal(r.dynamicText.programType,14);assert.equal(M.decode(r).speed,203);assert.equal(r.dynamicPrepared,undefined);assert.equal(b.w.location.hash,'#native/coolled/program');b.w.SmartEaseNativeUX.openRecord(r.id);assert.equal(b.w.document.querySelector('#nuxDynamicHost textarea').value,'HELLO');assert.equal(b.w.document.querySelector('#nuxDynamicHost [aria-label=Send]').disabled,false);assert.equal(b.errors.length,0);}finally{close(b);}});
test('Source nine effects, Colorful hidden, unknown-firmware Background gate, auto frame14px persisted16px',async()=>{const b=setup();try{b.w.SmartEaseNativeUX.add();click(b,'Dynamic Text');input(b,'AB');click(b,'Confirm text');click(b,'Mode');for(const name of M.MODES)assert.ok([...b.w.document.querySelectorAll('#nuxDynamicHost button')].some(e=>e.getAttribute('aria-label')===name));click(b,'Fan-shaped');click(b,'Confirm');click(b,'Color');assert.equal(b.w.document.querySelector('#nuxDynamicHost button[aria-label=Colorful]'),null);click(b,'Cancel');click(b,'Background');assert.match(b.w.document.querySelector('#nuxDynamicHost [role=dialog]').textContent,/confirmed firmware/);click(b,'Confirm');click(b,'Frame');click(b,M.FRAMES[1]);click(b,'Confirm');click(b,'Save');await turn();const r=b.w.SmartEaseNativeUXStore.library().records[0],d=M.decode(r);assert.equal(d.mode,8);assert.equal(d.textSize,14);assert.equal(r.dynamicText.combinePrograms[0].dynamicTextItem.dynamicTextProgramContent.showHeight,16);}finally{close(b);}});
test('Mixed library selection/repeat/copy/reorder/delete preserves raw opaque metadata and native import/export',()=>{const b=setup(fixture());try{const s=b.w.SmartEaseNativeUXStore;b.w.SmartEaseNativeUX.change('dynamic1','select');b.w.SmartEaseNativeUX.change('dynamic1','repeat',4);b.w.SmartEaseNativeUX.change('dynamic1','copy');b.w.SmartEaseNativeUX.change('dynamic1','top');const raw=s.exportRaw();s.importRaw(raw);assert.equal(s.exportRaw(),raw);assert.equal(s.library().records[0].repeat,4);assert.equal(s.library().records.filter(r=>r.kind==='dynamicText').length,2);assert.equal(s.library().records.find(r=>r.id==='unknown').opaque,9);assert.equal(s.snapshot().opaque.keep,true);b.w.SmartEaseNativeUX.openRecord('dynamic1');input(b,'CHANGED');click(b,'Save');assert.equal(s.library().records.find(r=>r.id==='dynamic1').opaque.keep,9);assert.equal(M.decode(s.library().records.find(r=>r.id==='dynamic1')).content,'CHANGED');}finally{close(b);}});
test('Explicit malformed type14 startup/import/full backup rejects unchanged, unknown kinds remain opaque',async()=>{const f=fixture();f.libraries[libKey].records[0].dynamicText.combinePrograms[0].dynamicTextItem.dynamicTextProgramContent.speed=null;const raw=JSON.stringify(f),bad=setup(f);assert.ok(bad.w.SmartEaseNativeUXStore.error);assert.equal(bad.w.localStorage.getItem(key),raw);close(bad);const b=setup(fixture());try{const before=b.w.localStorage.getItem(key);assert.throws(()=>b.w.SmartEaseNativeUXStore.importRaw(raw));let confirms=0;b.w.confirm=()=>{confirms++;return true;};const backup=JSON.stringify({format:'smartease-cart-backup',version:1,values:{[key]:raw}});b.w.probe={size:Buffer.byteLength(backup),text:async()=>backup};await b.run('restoreBackup(probe)');assert.equal(confirms,0);assert.equal(b.w.localStorage.getItem(key),before);}finally{close(b);}});
for(const action of ['route','hidden','identity','backup','import'])test('Dynamic stale Save and preview blocked after '+action,async()=>{const b=setup();let release;try{b.w.fetch=()=>new Promise(ok=>release=ok);b.w.SmartEaseNativeUX.add();click(b,'Dynamic Text');input(b,'AB');click(b,'Confirm text');const save=b.w.document.querySelector('#nuxDynamicHost button[aria-label=Save]'),before=b.w.localStorage.getItem(key);if(action==='route')b.run("go('native/coolled/program');go('native/coolled/dynamic-text')");if(action==='hidden'){Object.defineProperty(b.w.document,'visibilityState',{configurable:true,value:'hidden'});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));}if(action==='identity')b.run("cartDevices[1].identity={id:'other'};updateCartDeviceUI()");if(action==='backup')b.w.SmartEaseNativeUX.cancelForBackupRestore();if(action==='import'){Object.defineProperty(b.w.document.getElementById('nuxImport'),'files',{value:[{size:1,text:async()=>'{'}]});await b.w.document.getElementById('nuxImport').onchange();}save.click();release({ok:true,text:async()=>fs.readFileSync(path.join(root,'native-coolled-dynamic/assets/masks.json'),'utf8')});await turn();assert.equal(b.w.localStorage.getItem(key),before);assert.doesNotMatch(b.w.document.querySelector('#nuxDynamicHost .uxt-status')?.textContent||'',/Source GIF quantization/);}finally{close(b);}});
test('Original background metadata and unsupported shaping are saved but preview explicitly unavailable',async()=>{const f=fixture();f.libraries[libKey].records[0].dynamicText.combinePrograms[0].dynamicTextItem.bgAnimationProgramContent={imageId:123,opaque:true};f.libraries[libKey].records[0].dynamicText.combinePrograms[0].contentCount=2;const b=setup(f);try{b.w.SmartEaseNativeUX.openRecord('dynamic1');await turn();assert.match(b.w.document.querySelector('#nuxDynamicHost .uxt-status').textContent,/background/);click(b,'Save');const r=b.w.SmartEaseNativeUXStore.library().records.find(r=>r.id==='dynamic1');assert.equal(r.dynamicText.combinePrograms[0].dynamicTextItem.bgAnimationProgramContent.opaque,true);}finally{close(b);}});
for(const [width,height]of [[390,844],[844,390]])test('Actual #app Dynamic CSS '+width+'×'+height+' bounded source dialogs and focus restoration',()=>{const b=setup();try{Object.defineProperty(b.w,'innerWidth',{value:width});Object.defineProperty(b.w,'innerHeight',{value:height});for(const link of b.w.document.querySelectorAll('link[rel=stylesheet]')){const name=new URL(link.href).pathname.slice(1);if(fs.existsSync(path.join(root,name))){const style=b.w.document.createElement('style');style.textContent=fs.readFileSync(path.join(root,name),'utf8');b.w.document.head.append(style);}}b.w.SmartEaseNativeUX.add();click(b,'Dynamic Text');const h=b.w.document.querySelector('#nuxDynamicHost h2');assert.equal(b.w.getComputedStyle(h).fontSize,'18px');assert.equal(b.w.getComputedStyle(h).fontWeight,'400');assert.equal(b.w.getComputedStyle(h).letterSpacing,'normal');const mode=click(b,'Mode'),dialog=b.w.document.querySelector('#nuxDynamicHost [role=dialog]');assert.equal(b.w.getComputedStyle(dialog).position,'fixed');assert.equal(b.w.getComputedStyle(dialog).maxHeight,'100dvh');assert.equal(b.w.getComputedStyle(dialog.querySelector('.uxt-dialog-body')).overflowY,'auto');click(b,'Cancel');assert.equal(b.w.document.activeElement,mode);assert.equal(b.w.document.querySelector('#nuxDynamicHost button[aria-label=Save]').textContent,'');}finally{close(b);}});
test('Dynamic exact assets cached, schema before store, new GIF pipeline before compiler; no old renderer',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),assets=vm.runInNewContext(sw.match(/const ASSETS\s*=\s*(\[[\s\S]*?\]);/)[1]);assert.ok(html.indexOf('src="native-coolled-dynamic-model.js"')<html.indexOf('src="native-coolled-store.js"'));assert.ok(html.indexOf('src="native-coolled-dynamic-generation.js"')<html.indexOf('src="ux-program-send-plan.js"'));assert.doesNotMatch(html,/dynamic-renderer.js/);for(const f of fs.readdirSync(root).filter(n=>n.startsWith('native-coolled-dynamic-')&&n.endsWith('.js')))assert.ok(assets.includes('./'+f));for(const n of fs.readdirSync(path.join(root,'native-coolled-dynamic/assets')))assert.ok(assets.includes('./native-coolled-dynamic/assets/'+n));});
function connect(b){b.run(`cartDevices[1].device={id:'ux',name:'CoolLEDUX-31B8',gatt:{connected:true}};cartDevices[1].identity={id:'ux',name:'CoolLEDUX-31B8'};cartDevices[1].link.device=cartDevices[1].device;cartDevices[1].link.service={};window.radioWrites=0;cartDevices[1].link.characteristic={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',service:{uuid:'0000fff0-0000-1000-8000-00805f9b34fb'},properties:{notify:true,write:true},startNotifications:async()=>{},addEventListener(){},removeEventListener(){},writeValueWithResponse:async()=>{window.radioWrites++}};updateCartDeviceUI();`);}
test('Actual Add/save/select → Program Send compiles shared postGIF data, opens consent only, never writes',async()=>{const b=setup();try{connect(b);b.w.SmartEaseNativeUX.add();click(b,'Dynamic Text');input(b,'AB');click(b,'Save');await turn();const r=b.w.SmartEaseNativeUXStore.library().records[0];b.w.SmartEaseNativeUX.change(r.id,'select');assert.equal(await b.w.SmartEaseNativeUX.sendSelected(),true);assert.match(b.w.document.querySelector('.nux-selected-send li').textContent,/dynamicText; repeat 1/);assert.equal(b.w.SmartEaseNativeUX.selectedSendState().state,'ready');assert.equal(b.w.radioWrites,0);}finally{close(b);}});
test('Global backup start cancels selected Dynamic compilation while masks pending, no late consent/write',async()=>{const b=setup(fixture());let release;try{connect(b);b.w.fetch=()=>new Promise(ok=>release=ok);b.w.SmartEaseNativeUX.change('dynamic1','select');const pending=b.w.SmartEaseNativeUX.sendSelected();assert.ok(release);b.w.SmartEaseNativeUX.cancelForBackupRestore();release({ok:true,text:async()=>fs.readFileSync(path.join(root,'native-coolled-dynamic/assets/masks.json'),'utf8')});assert.equal(await pending,false);assert.notEqual(b.w.SmartEaseNativeUX.selectedSendState().state,'ready');assert.equal(b.w.radioWrites,0);}finally{close(b);}});
