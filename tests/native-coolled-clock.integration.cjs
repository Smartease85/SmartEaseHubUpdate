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
const M=require('../native-coolled-clock-model.js'),B=require('../native-coolled-clock/assets/clock-backgrounds-v1.json');
function record(id='clock1'){const m=M.create();m.selectStyle(18);return{...m.encode(B.styles[18]),id};}
function mixed(){const f=fixture();f.libraries[libKey].records.push(record(),{id:'unknown',kind:'future',opaque:9});return f;}
function click(b,label){const e=[...b.w.document.querySelectorAll('button')].find(x=>!x.closest('[hidden]')&&x.getAttribute('aria-label')===label);assert.ok(e,'visible '+label);e.click();return e;}
const turn=()=>new Promise(r=>setImmediate(r));
function loader(b){b.w.fetch=async()=>({ok:true,text:async()=>JSON.stringify(B)});}
test('Actual Add Clock creates source type7, Save/reopen retains style18 and explicit Send is available without automatic writes',async()=>{const b=setup();loader(b);b.w.SmartEaseNativeUX.add();click(b,'Clock');assert.equal(b.w.location.hash,'#native/coolled/clock');click(b,'Clock style 18');click(b,'Save');await turn();assert.equal(b.w.location.hash,'#native/coolled/program');const r=b.w.SmartEaseNativeUXStore.library().records.at(-1);assert.equal(r.kind,'clock');assert.equal(r.clock.programType,7);b.w.SmartEaseNativeUX.openRecord(r.id);assert.equal(click(b,'Clock style 18').getAttribute('aria-pressed'),'true');assert.equal(b.w.document.querySelector('#nuxClockHost button[aria-label=Send]').disabled,false);assert.equal(b.errors.length,0);b.dom.window.close();});
test('Clock mixed-list repeat copy reorder delete and backup preserve unknown data',()=>{const b=setup(mixed());assert.ok(b.w.document.querySelector('[data-program-id=clock1] img[src*="clock_style18"]'));b.w.SmartEaseNativeUX.change('clock1','repeat',3);b.w.SmartEaseNativeUX.change('clock1','copy');b.w.SmartEaseNativeUX.change('clock1','top');const s=b.w.SmartEaseNativeUXStore;const raw=s.exportRaw();s.importRaw(raw);assert.equal(s.library().records[0].id,'clock1');assert.equal(s.library().records[0].repeat,3);assert.equal(s.library().records.filter(x=>x.kind==='clock').length,2);b.w.SmartEaseNativeUX.change('clock1','delete');assert.equal(s.library().records.find(x=>x.id==='unknown').opaque,9);assert.equal(s.snapshot().opaque.keep,true);b.dom.window.close();});
test('Malformed Clock startup/import and full backup reject without mutation',async()=>{const f=mixed();f.libraries[libKey].records[2].clock.combinePrograms[1].clockItem.clockProgramContent.hourWidth=999;const raw=JSON.stringify(f),bad=setup(f);assert.match(bad.w.SmartEaseNativeUXStore.error,/conflict/);assert.equal(bad.w.localStorage.getItem(key),raw);bad.dom.window.close();const b=setup(mixed()),before=b.w.localStorage.getItem(key);assert.throws(()=>b.w.SmartEaseNativeUXStore.importRaw(raw),/conflict/);let confirms=0;b.w.confirm=()=>{confirms++;return true;};const backup=JSON.stringify({format:'smartease-cart-backup',version:1,values:{[key]:raw}});b.w.probe={size:Buffer.byteLength(backup),text:async()=>backup};await b.run('restoreBackup(probe)');assert.equal(confirms,0);assert.equal(b.w.localStorage.getItem(key),before);b.dom.window.close();});
test('Clock Back/Forward and hidden/reconnect never revive draft or stale Save',()=>{for(const action of ['route','hidden','identity']){const b=setup(mixed());b.w.SmartEaseNativeUX.openRecord('clock1');const save=b.w.document.querySelector('#nuxClockHost button[aria-label=Save]'),before=b.w.localStorage.getItem(key);if(action==='route'){b.run("go('native/coolled/program');go('native/coolled/clock')");}else if(action==='hidden'){Object.defineProperty(b.w.document,'visibilityState',{configurable:true,value:'hidden'});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));Object.defineProperty(b.w.document,'visibilityState',{configurable:true,value:'visible'});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));}else b.run("cartDevices[1].identity={id:'other'};updateCartDeviceUI()");save.click();assert.match(b.w.document.getElementById('nuxClockHost').textContent,/No active clock draft/);assert.equal(b.w.localStorage.getItem(key),before);b.dom.window.close();}});
test('Late Clock background response after route exit cannot persist or revive',async()=>{const b=setup();let resolve;b.w.fetch=()=>new Promise(r=>resolve=r);b.w.SmartEaseNativeUX.add();click(b,'Clock');click(b,'Clock style 1');click(b,'Save');b.run("go('native/coolled/program')");const before=b.w.localStorage.getItem(key);resolve({ok:true,text:async()=>JSON.stringify(B)});await turn();assert.equal(b.w.localStorage.getItem(key),before);assert.equal(b.w.location.hash,'#native/coolled/program');b.dom.window.close();});
test('Clock runtime assets cached and schema loaded before persistent store',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),assets=vm.runInNewContext(sw.match(/const ASSETS\s*=\s*(\[[\s\S]*?\]);/)[1]);assert.ok(html.indexOf('src="native-coolled-clock-model.js"')<html.indexOf('src="native-coolled-store.js"'));for(const f of ['source-data.js','model.js','resources.js','store-adapter.js','editor.js'])assert.ok(assets.includes('./native-coolled-clock-'+f));for(const name of fs.readdirSync(path.join(root,'native-coolled-clock/assets')))assert.ok(assets.includes('./native-coolled-clock/assets/'+name));for(const f of assets)assert.ok(fs.existsSync(path.join(root,f)),f);});
test('Actual Clock notice remains viewport-owned under linked app CSS and restores focus',()=>{const b=setup();for(const link of b.w.document.querySelectorAll('link[rel=stylesheet]')){const name=new URL(link.href).pathname.slice(1);if(fs.existsSync(path.join(root,name))){const style=b.w.document.createElement('style');style.textContent=fs.readFileSync(path.join(root,name),'utf8');b.w.document.head.append(style);}}b.w.SmartEaseNativeUX.add();click(b,'Clock');const save=b.w.document.querySelector('#nuxClockHost button[aria-label=Save]');save.focus();save.click();const panel=b.w.document.querySelector('#nuxClockHost [role=dialog]'),overlay=panel.parentElement,confirm=panel.querySelector('button');assert.equal(b.w.getComputedStyle(overlay).position,'fixed');assert.equal(b.w.getComputedStyle(panel).overflow,'auto');assert.equal(b.w.getComputedStyle(panel.querySelector('h3')).color,'rgb(51, 51, 51)');assert.equal(b.w.document.activeElement,confirm);b.w.document.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(b.w.document.activeElement,confirm);b.w.document.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(b.w.document.querySelector('#nuxClockHost [role=dialog]'),null);assert.equal(b.w.document.activeElement,save);assert.equal(b.w.location.hash,'#native/coolled/clock');b.dom.window.close();});

test('Legacy Clock backup/import and ordinary color Save retain prior pixels/version; explicit copy preserves source and selection',async()=>{const f=mixed(),old=f.libraries[libKey].records.find(x=>x.id==='clock1');delete old.clock.artworkVersion;old.future={imported:[1,2]};old.clock.combinePrograms[0].animationItem.animationProgramContent.mListDrawItems[0][0].color=-1234;const b=setup(f);loader(b);const store=b.w.SmartEaseNativeUXStore;const before=JSON.stringify(store.library().records.find(x=>x.id==='clock1'));const exported=store.exportRaw();store.importRaw(exported);assert.equal(JSON.stringify(store.library().records.find(x=>x.id==='clock1')),before);b.w.SmartEaseNativeUX.openRecord('clock1');click(b,'Make a copy with updated artwork');click(b,'Exit');assert.equal(JSON.stringify(store.library().records.find(x=>x.id==='clock1')),before);b.w.SmartEaseNativeUX.openRecord('clock1');click(b,'Blue');click(b,'Save');await turn();const oldAfter=store.library().records.find(x=>x.id==='clock1');assert.equal(oldAfter.clock.artworkVersion,undefined);assert.equal(oldAfter.clock.combinePrograms[0].animationItem.animationProgramContent.mListDrawItems[0][0].color,-1234);const preserved=JSON.stringify(oldAfter),selection=JSON.stringify(store.library().selection);b.w.SmartEaseNativeUX.openRecord('clock1');click(b,'Make a copy with updated artwork');click(b,'Save');await turn();const records=store.library().records,copy=records.filter(x=>x.kind==='clock').find(x=>x.id!=='clock1');assert.ok(copy);assert.equal(copy.clock.artworkVersion,M.ARTWORK_VERSION);assert.equal(JSON.stringify(records.find(x=>x.id==='clock1')),preserved);assert.equal(JSON.stringify(store.library().selection),selection);assert.deepEqual(JSON.parse(JSON.stringify(copy.future)),{imported:[1,2]});b.dom.window.close();});
test('Legacy conversion cancelled by Back before resource resolve cannot create a copy',async()=>{const f=mixed(),old=f.libraries[libKey].records.find(x=>x.id==='clock1');delete old.clock.artworkVersion;const b=setup(f);let resolve;b.w.fetch=()=>new Promise(r=>resolve=r);const before=b.w.localStorage.getItem(key);b.w.SmartEaseNativeUX.openRecord('clock1');click(b,'Make a copy with updated artwork');click(b,'Save');click(b,'Exit');resolve({ok:true,text:async()=>JSON.stringify(B)});await turn();assert.equal(b.w.localStorage.getItem(key),before);assert.equal(b.w.location.hash,'#native/coolled/program');b.dom.window.close();});
