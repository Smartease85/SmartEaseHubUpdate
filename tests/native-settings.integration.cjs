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
      ? fs.readFileSync(path.join(root, path.basename(script.src)), "utf8")
      : script.textContent;
    vm.runInContext(source, ctx, { filename: script.src || "index.inline.js" });
  }
  if(!w.document.getElementById('nativeAppScreen')){const host=w.document.createElement('section');host.id='nativeAppScreen';w.document.body.append(host);}
  if(vm.runInContext("typeof nativeAppState",ctx)==='undefined')vm.runInContext("var nativeAppState={device:'nokins',screen:'settings',detail:'line-sequence'};",ctx);
  vm.runInContext("page='native';",ctx);
  if(!w.SmartEaseNativeSettings)vm.runInContext(fs.readFileSync(path.join(root,'native-lotus-settings.js'),'utf8'),ctx);
  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}
const key='smartease-of21-native-v1';
function setup(storage){const b=boot(storage);if(b.run("typeof nativeAppEnter")==='function')b.run("go('native/nokins/settings/line-sequence')");b.run(`nativeAppState.device='nokins';nativeAppState.screen='settings';nativeAppState.detail='line-sequence';page='native';const a=cartDevices[2];a.identity={id:'A',name:'OF21'};a.device={name:'OF21'};a.profile='melk-of21';a.ownerLink.generation=3;Object.defineProperty(a,'connected',{value:true,writable:true,configurable:true});Object.defineProperty(a,'controlReady',{value:true,writable:true,configurable:true});a.cancelOwner=()=>{a.ownerEpoch=(a.ownerEpoch||0)+1;};`);b.w.SmartEaseNative={settingsBack:()=>{}};b.w.SmartEaseNativeSettings.enter();return b;}
function ready(b,order='GRB'){const d=b.w.document;d.querySelector(`[data-line-order="${order}"]`).click();b.w.SmartEaseNativeSettings.paint();}
test('Exact six source rows, blank initial selection, keyboard local changes and no automatic writes',()=>{const b=setup(),d=b.w.document;let calls=0;b.run('cartDevices[2].ownerCommand=()=>{throw Error("unexpected command")};');assert.deepEqual(Array.from(d.querySelectorAll('#nlsOrders button'),x=>x.dataset.lineOrder),['RGB','RBG','GRB','GBR','BRG','BGR']);assert.equal(d.querySelectorAll('#nlsOrders [aria-checked=true]').length,0);const first=d.querySelector('#nlsOrders button');first.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(d.activeElement.dataset.lineOrder,'RBG');assert.equal(d.querySelector('#nlsOrders [aria-checked=true]').dataset.lineOrder,'RBG');b.w.SmartEaseNativeSettings.enter();assert.equal(d.querySelector('#nlsOrders [aria-checked=true]').dataset.lineOrder,'RBG');assert.equal(b.w.localStorage.getItem(key),null);assert.equal(calls,0);b.dom.window.close();});
test('Wrong profile, missing selection and shared busy block programmatic Apply; valid Apply submits exact wire-order once',async()=>{const b=setup(),a=b.w.SmartEaseNativeSettings;let jobs=[];b.w.commandMock=async(...args)=>{jobs.push(args);assert.equal(args[3](),true);return true;};b.run('cartDevices[2].ownerCommand=commandMock');assert.equal(await a.apply(),false);ready(b);b.run('cartDevices[2].profile="other"');assert.equal(await a.apply(),false);b.run('cartDevices[2].profile="melk-of21";of21Busy=true');assert.equal(await a.apply(),false);b.run('of21Busy=false');assert.equal(await a.apply(),true);assert.equal(jobs.length,1);assert.equal(jobs[0][0],'wire-order');assert.equal(jobs[0][1],'GRB');assert.equal(b.run('of21Local.requested.A["wire-order"]'),'GRB');assert.equal(await a.apply(),true);assert.equal(jobs.length,2);assert.match(b.w.document.getElementById('nlsResult').textContent,/submitted once/);b.dom.window.close();});
test('Back synchronously cancels before delayed history for late resolve and reject; no stale history or result',async()=>{for(const reject of [false,true]){const b=setup(),a=b.w.SmartEaseNativeSettings,d=b.w.document;let finish,guard,backs=0;b.w.SmartEaseNative.settingsBack=()=>backs++;b.w.commandMock=(...args)=>{guard=args[3];return new Promise((resolve,rejectFn)=>{finish=reject?()=>rejectFn(Error('late')):()=>resolve(true);});};b.run('cartDevices[2].ownerCommand=commandMock');ready(b);const p=a.apply();assert.equal(guard(),true);a.back();a.back();assert.equal(backs,1);assert.equal(guard(),false);const message=d.getElementById('nlsResult').textContent;b.w.dispatchEvent(new b.w.Event('pageshow'));assert.equal(d.getElementById('nativeLotusSettings').hidden,true);finish();assert.equal(await p,false);assert.equal(d.getElementById('nlsResult').textContent,message);assert.equal(b.w.localStorage.getItem(key),null);assert.equal(b.run('of21Busy'),false);b.dom.window.close();}});
test('Identity/generation/device/ownerEpoch/route/visibility changes invalidate pending command without transfer',async()=>{for(const change of ['cartDevices[2].identity={id:"B"}','cartDevices[2].ownerLink.generation++','cartDevices[2].device={}','cartDevices[2].ownerEpoch++','nativeAppState.detail=null','document.visibilityState']){const b=setup(),a=b.w.SmartEaseNativeSettings;let finish,guard;b.w.commandMock=(...args)=>{guard=args[3];return new Promise(r=>finish=r);};b.run('cartDevices[2].ownerEpoch=0;cartDevices[2].ownerCommand=commandMock');ready(b);const p=a.apply();if(change==='document.visibilityState')Object.defineProperty(b.w.document,'visibilityState',{value:'hidden',configurable:true});else b.run(change);assert.equal(guard(),false,change);finish(true);assert.equal(await p,false);assert.equal(b.w.localStorage.getItem(key),null);b.dom.window.close();}});
test('Requested history helper validates commands and preserves unknown metadata, rejects external edits, rolls back quota',()=>{const value={version:1,scenes:[],requested:{A:{unknown:{keep:true}},B:{collapse:false}},unknown:7},b=setup({[key]:JSON.stringify(value)}),a=b.w.SmartEaseNativeSettings;assert.throws(()=>a.recordRequested('__proto__','wire-order','RGB'));assert.throws(()=>a.recordRequested('A','color','#ffffff'));assert.throws(()=>a.recordRequested('A','point-count',9));a.recordRequested('A','point-count',100);a.recordRequested('A','collapse',true);assert.equal(b.run('of21Local.requested.A.unknown.keep'),true);assert.equal(b.run('of21Local.requested.B.collapse'),false);assert.equal(b.run('of21Local.unknown'),7);const before=b.run('JSON.stringify(of21Local)'),raw=b.w.localStorage.getItem(key),original=b.w.Storage.prototype.setItem;b.w.Storage.prototype.setItem=()=>{throw Error('quota');};assert.throws(()=>a.recordRequested('A','wire-order','RGB'),/quota/);assert.equal(b.run('JSON.stringify(of21Local)'),before);assert.equal(b.w.localStorage.getItem(key),raw);b.w.Storage.prototype.setItem=original;b.w.localStorage.setItem(key,JSON.stringify({...value,external:1}));const external=b.w.localStorage.getItem(key);assert.throws(()=>a.recordRequested('A','wire-order','RGB'),/externally/);assert.equal(b.w.localStorage.getItem(key),external);assert.equal(b.run('JSON.stringify(of21Local)'),before);b.dom.window.close();});
test('Submitted command with persistence failure is honestly reported and never resent automatically',async()=>{const b=setup(),a=b.w.SmartEaseNativeSettings;let calls=0;b.w.commandMock=async()=>{calls++;return true;};b.run('cartDevices[2].ownerCommand=commandMock');b.w.Storage.prototype.setItem=()=>{throw Error('quota');};ready(b);assert.equal(await a.apply(),true);assert.equal(calls,1);assert.equal(b.run('of21Local.requested.A'),undefined);assert.match(b.w.document.getElementById('nlsResult').textContent,/submitted, but local history was NOT saved/);a.paint();await Promise.resolve();assert.equal(calls,1);assert.equal(b.w.document.getElementById('nlsApply').disabled,false);b.dom.window.close();});
