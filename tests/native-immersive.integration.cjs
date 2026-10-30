/* Development-only dependency: npm install jsdom; run with NODE_PATH configured. */
const { JSDOM, VirtualConsole } = require('jsdom');
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname,'..');

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
  for(const link of w.document.querySelectorAll('link[rel="stylesheet"]')){const style=w.document.createElement('style');style.textContent=fs.readFileSync(path.join(root,link.getAttribute('href')),'utf8');w.document.head.append(style);}
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

const shown=(b,s)=>b.w.getComputedStyle(b.w.document.querySelector(s)).display!=='none';
test('Chooser retains cart chrome; each selected app suppresses only redundant outer shell',()=>{const b=boot();try{b.run("go('native')");assert.ok(shown(b,'#app>.topline'));assert.ok(shown(b,'#app>.bottom-nav'));assert.ok(shown(b,'.native-heading'));for(const route of ['sp608e/channels','nokins/color','coolled/program']){b.run(`go('native/${route}')`);assert.ok(b.w.document.getElementById('app').classList.contains('native-immersive'));assert.equal(shown(b,'#app>.topline'),false);assert.equal(shown(b,'#app>.bottom-nav'),false);assert.equal(shown(b,'.native-heading'),false);assert.equal(shown(b,'#nativeRecoveryNotice'),false);assert.equal(b.w.getComputedStyle(b.w.document.getElementById('app')).maxWidth,'none');assert.notEqual(b.w.getComputedStyle(b.w.document.getElementById('app')).paddingTop,'104px');assert.ok(shown(b,'#nativeAppInfo'));assert.match(b.w.document.getElementById('nativeAppInfo').textContent,/not a completed 1:1/);}}finally{b.dom.window.close();}});
test('Source nav ownership: Lotus icon bar and Settings survive; CoolLED Device exit replaces wrapper escape',()=>{const b=boot();try{b.run("go('native/nokins/color')");assert.equal(b.w.document.getElementById('nativeAppNav').parentElement.id,'nativeLotusBottom');assert.equal(b.w.document.querySelectorAll('#nativeAppNav button').length,5);assert.ok(shown(b,'#nativeLotusSettingsButton'));assert.equal(shown(b,'#nativeAppBack'),false);assert.ok(shown(b,'#nativeReturnDevices'));b.run("go('native/nokins/settings')");assert.ok(shown(b,'#nativeLotusReturn'));b.run("go('native/coolled/program')");assert.equal(shown(b,'#nativeReturnDevices'),false);assert.ok(shown(b,'#nuxDevice'));assert.ok(shown(b,'#nuxTabs'));b.run("go('native/coolled/graffiti')");assert.ok(shown(b,'#nativeReturnDevices'));assert.equal(b.w.document.getElementById('nuxTabs').hidden,true);assert.ok(shown(b,'#nuxBack'));}finally{b.dom.window.close();}});
test('Escape uses normal route cleanup and no extra history step; pop/invalid/home restore shell',()=>{const b=boot();try{b.run("go('native/sp608e/channels')");const before=b.w.history.length;b.w.document.getElementById('nativeReturnDevices').click();assert.equal(b.w.location.hash,'#native');assert.equal(b.w.history.length,before+1);assert.equal(b.w.document.getElementById('app').classList.contains('native-immersive'),false);b.run("go('native/nokins/color','pop')");assert.ok(b.w.document.getElementById('app').classList.contains('native-immersive'));b.run("go('home')");assert.equal(b.w.document.getElementById('app').classList.contains('native-immersive'),false);b.run("go('native/not-a-device')");assert.equal(b.w.document.getElementById('app').classList.contains('native-immersive'),false);assert.ok(shown(b,'#app>.topline'));}finally{b.dom.window.close();}});
test('Presentation refresh never replaces source module nodes or adds history, and disclosure remains open on same-route refresh',()=>{const b=boot();try{b.run("go('native/coolled/program')");const node=b.w.document.getElementById('nuxTabs'),before=b.w.history.length;b.w.document.getElementById('nativeAppInfo').open=true;b.run('nativeShellPresentation(true)');assert.equal(b.w.document.getElementById('nuxTabs'),node);assert.equal(b.w.history.length,before);assert.equal(b.w.document.getElementById('nativeAppInfo').open,true);b.run("go('native/coolled/settings')");assert.equal(b.w.document.getElementById('nativeAppInfo').open,false);assert.equal(b.w.getComputedStyle(b.w.document.getElementById('app')).position,'static');}finally{b.dom.window.close();}});
test('Immersive CSS keeps document scrolling/viewport dialogs and explicit safe-area fallback',()=>{const css=fs.readFileSync(path.join(root,'native-apps.css'),'utf8').split('/* Selected device apps')[1];assert.match(css,/safe-area-inset-top/);assert.match(css,/safe-area-inset-bottom/);assert.match(css,/safe-area-inset-left/);assert.match(css,/safe-area-inset-right/);assert.doesNotMatch(css,/overflow\s*:\s*hidden|position\s*:\s*fixed|transform\s*:/);assert.match(css,/summary:focus-visible/);});
test('Devices escape synchronously revokes selected Send consent, with no writes or Forward revival',async()=>{const value={format:'smartease-native-coolledux-library',version:1,libraries:{'coolledux:16x96':{family:'coolledux',rows:16,columns:96,records:[{id:'a',kind:'graffiti',repeat:1,graffiti:{width:96,height:16,pixels:Array(1536).fill(0),mask:Array(1536).fill(true),mode:1,speed:15,stay:3}}],selection:['a']}},preferences:{}};const b=boot({'smartease-native-coolledux-v1':JSON.stringify(value)});try{b.run("go('native/coolled/program'); cartDevices[1].device={id:'ux',name:'CoolLEDUX-31B8',gatt:{connected:true}};cartDevices[1].identity={id:'ux',name:'CoolLEDUX-31B8'};cartDevices[1].link.device=cartDevices[1].device;cartDevices[1].link.service={};window.radioWrites=0;cartDevices[1].link.characteristic={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',service:{uuid:'0000fff0-0000-1000-8000-00805f9b34fb'},properties:{notify:true,write:true},startNotifications:async()=>{},addEventListener(){},removeEventListener(){},writeValueWithResponse:async()=>{radioWrites++}};updateCartDeviceUI();");assert.equal(await b.w.SmartEaseNativeUX.sendSelected(),true);for(const i of b.w.document.querySelectorAll('.nux-selected-send input')){i.checked=true;i.dispatchEvent(new b.w.Event('change'));}b.w.document.getElementById('nuxDevice').click();assert.equal(b.w.location.hash,'#native');assert.equal(b.w.document.querySelector('.nux-selected-send').open,false);assert.equal(b.w.radioWrites,0);b.run("go('native/coolled/program','pop')");assert.equal(b.w.document.querySelector('.nux-selected-send').open,false);assert.ok([...b.w.document.querySelectorAll('.nux-selected-send input')].every(i=>!i.checked));}finally{b.w.SmartEaseNativeUX.leave();b.dom.window.close();}});

test('Group-specific Back label matches Groups destination rather than Devices or Beehive',()=>{const b=boot();try{b.run("go('native/nokins/group/of21-group:12345678-1234-1234-1234-123456789abc/color')");assert.equal(b.w.document.getElementById('nativeAppBack').textContent,'← Groups');assert.ok(shown(b,'#nativeAppBack'));b.w.document.getElementById('nativeAppBack').click();assert.equal(b.w.location.hash,'#native/nokins/groups');}finally{b.dom.window.close();}});

test('candidate chooser and collapsed About disclose finite gaps and experimental hardware status',()=>{const source=fs.readFileSync(path.join(root,'native-apps.js'),'utf8');assert.match(source,/Native test candidate/);assert.match(source,/not a completed 1:1 replica/);assert.match(source,/Material\/Discover utilities, Countdown, QR and enhanced group DIY\/Timing are not included/);assert.match(source,/Display Send is experimental/);assert.match(source,/Existing saved data and calibration are preserved/);});
