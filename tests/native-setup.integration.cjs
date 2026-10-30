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
  if(!w.SmartEaseNativeSetup)vm.runInContext(fs.readFileSync(path.join(root,"native-lotus-setup.js"),"utf8"),ctx);
  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}
function setup(b,kind){b.run(`const a=cartDevices[2];a.identity={id:'A',name:'OF21'};a.profile='melk-of21';a.device={};a.ownerLink.generation=4;a.ownerEpoch=0;Object.defineProperty(a,'connected',{value:true,writable:true,configurable:true});Object.defineProperty(a,'controlReady',{value:true,writable:true,configurable:true});window.setupCalls=[];a.cancelOwner=()=>a.ownerEpoch++;a.ownerCommand=async(k,v,o,g)=>{setupCalls.push([k,v,g()]);return true;};`);b.run(`go('native/nokins/settings/${kind}')`);}
function consent(b){const d=b.w.document;d.getElementById('nsetupParked').checked=true;d.getElementById('nsetupConsent').checked=true;b.w.SmartEaseNativeSetup.paint();}
test('Pixel Setting source range10–1000 stays explicit and rejects invalid/blank numbers',async()=>{const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeSetup;setup(b,'pixels');assert.equal(d.getElementById('nsetupDialog').open,true);assert.equal(b.run('setupCalls.length'),0);for(const value of ['','9','1001','12.5','1e2']){d.getElementById('nsetupCount').value=value;consent(b);assert.equal(await a.apply(),false,value);}for(const value of ['10','1000']){d.getElementById('nsetupCount').value=value;consent(b);assert.equal(await a.apply(),true,value);}assert.equal(b.run('JSON.stringify(setupCalls)'),JSON.stringify([['point-count',10,true],['point-count',1000,true]]));assert.match(d.getElementById('nsetupResult').textContent,/No readback/);b.dom.window.close();});
test('Collapse source Open/Close map true/false with no default or automatic requests',async()=>{const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeSetup;setup(b,'collapse');consent(b);assert.equal(await a.apply(),false);for(const value of [true,false]){d.querySelector(`[data-setup-collapse="${value}"]`).click();consent(b);assert.equal(await a.apply(),true);}assert.equal(b.run('JSON.stringify(setupCalls)'),JSON.stringify([['collapse',true,true],['collapse',false,true]]));b.dom.window.close();});
test('Setup Cancel invalidates pending completion before deferred browser Back',async()=>{for(const fail of [false,true]){const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeSetup;setup(b,'pixels');d.getElementById('nsetupCount').value='1000';consent(b);b.run('cartDevices[2].ownerCommand=()=>new Promise((resolve,reject)=>{window.doneSetup=resolve;window.failSetup=reject;});');const pending=a.apply();let backs=0;b.w.SmartEaseNative.settingsBack=()=>backs++;d.getElementById('nsetupCancel').click();assert.equal(backs,1);assert.equal(d.getElementById('nsetupDialog').open,false);assert.equal(d.getElementById('nsetupConsent').checked,false);if(fail)b.w.failSetup(Error('late'));else b.w.doneSetup(true);assert.equal(await pending,false);assert.equal(b.run('of21Local.requested.A'),undefined);b.dom.window.close();}});
test('Setup identity/generation/route/visibility changes prevent stale requested history',async()=>{for(const reason of ['id','generation','route','hidden']){const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeSetup;setup(b,'collapse');d.querySelector('[data-setup-collapse="true"]').click();consent(b);b.run('cartDevices[2].ownerCommand=()=>new Promise(resolve=>window.doneSetup=resolve);');const p=a.apply();if(reason==='id')b.run('cartDevices[2].identity.id="B"');if(reason==='generation')b.run('cartDevices[2].ownerLink.generation++');if(reason==='route')b.run('go("native/nokins/color")');if(reason==='hidden'){Object.defineProperty(d,'visibilityState',{value:'hidden',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));}a.paint();b.w.doneSetup(true);assert.equal(await p,false,reason);assert.equal(b.run('Object.keys(of21Local.requested).length'),0);b.dom.window.close();}});
test('Setup submitted request with storage failure preserves history and never retries hardware',async()=>{const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeSetup;setup(b,'pixels');d.getElementById('nsetupCount').value='500';consent(b);b.w.Storage.prototype.setItem=()=>{throw Error('quota');};assert.equal(await a.apply(),true);assert.equal(b.run('setupCalls.length'),1);assert.equal(b.run('of21Local.requested.A'),undefined);assert.match(d.getElementById('nsetupResult').textContent,/NOT saved/);b.dom.window.close();});
