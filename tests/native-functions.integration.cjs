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
  if(!w.SmartEaseNativeFunctions)vm.runInContext(fs.readFileSync(path.join(root,"native-lotus-functions.js"),"utf8"),ctx);
  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}

function route(b){b.run('go("native/nokins/settings/functions")');b.w.SmartEaseNativeFunctions.enter();}
function connect(b){b.run(`cartDevices[2].identity={id:'device-a',name:'MELK-OF21'};cartDevices[2].profile='melk-of21';cartDevices[2].controlReady=true;cartDevices[2].connected=true;cartDevices[2].ownerLink.generation=7;window.functionWrites=0;cartDevices[2].ownerCommand=()=>{functionWrites++;throw Error('Forbidden function command');};cartDevices[2].ownerUploadDIY=()=>{functionWrites++;throw Error('Forbidden upload');};`);}
test('Custom Functions faithfully displays original warning, six pills and exact footer while disabled',()=>{const b=boot(),d=b.w.document;connect(b);route(b);assert.equal(d.getElementById('nfDialog').open,true);assert.deepEqual([...d.querySelectorAll('[data-custom-function]')].map(x=>x.textContent),['F1','F2','F3','F4','F5','F6']);assert.deepEqual([...d.querySelectorAll('#nfButtons .nf-row')].map(x=>x.children.length),[3,3]);assert.equal(d.getElementById('nfExit').textContent,'退出');assert.equal(d.querySelector('#nfDialog h1,#nfDialog h2,#nfDialog h3,#nfDialog h4'),null);assert.match(d.getElementById('nfDescription').textContent,/set at the factory/);assert.match(d.getElementById('nfGate').textContent,/disabled/);const css=d.querySelector('#nativeLotusFunctions style').textContent;assert.match(css,/padding:24px 24px 0/);assert.match(css,/max-width:calc\(100vw - 30px\)/);assert.match(css,/gap:18px/);assert.match(css,/height:28px/);assert.match(css,/margin-top:24px/);assert.match(css,/margin-top:32px/);assert.match(css,/height:46px/);assert.match(css,/width:24px;height:24px/);assert.equal(b.run('functionWrites'),0);assert.equal(b.errors.length,0);b.dom.window.close();});
test('F1–F6 remain blocked despite connection, consent and programmatic gesture/click manipulation',()=>{const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeFunctions;connect(b);route(b);for(const input of d.querySelectorAll('input[type=checkbox]'))input.checked=true;const saved=b.run('JSON.stringify(of21Local)');for(const button of d.querySelectorAll('[data-custom-function]')){assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-disabled'),'true');button.click();for(const name of ['pointerdown','pointerup','pointercancel','dblclick','contextmenu'])button.dispatchEvent(new b.w.Event(name,{bubbles:true,cancelable:true}));button.disabled=false;button.dispatchEvent(new b.w.Event('click'));assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-disabled'),'true');assert.equal(a.blocked(Number(button.dataset.customFunction),1),false);assert.equal(a.blocked(Number(button.dataset.customFunction),2),false);}assert.equal(b.run('functionWrites'),0);assert.equal(b.run('JSON.stringify(of21Local)'),saved);assert.equal(a.send,undefined);assert.equal(a.apply,undefined);assert.equal(b.errors.length,0);b.dom.window.close();});
test('Exit queued-close latch prevents reopening during identity change before pending Back',async()=>{const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeFunctions;connect(b);route(b);let backs=0;b.w.SmartEaseNative.settingsBack=()=>backs++;b.w.HTMLDialogElement.prototype.close=function(){this.open=false;b.w.setTimeout(()=>this.dispatchEvent(new b.w.Event('close')),0);};d.getElementById('nfExit').click();d.getElementById('nfExit').click();assert.equal(backs,1);b.run('cartDevices[2].identity.id="other"');a.paint();a.enter();d.querySelector('[data-setup-key="functions"]').click();assert.equal(d.getElementById('nfDialog').open,false);assert.equal(a.blocked(),false);await new Promise(r=>b.w.setTimeout(r,10));assert.equal(backs,1);b.run('go("native/nokins/settings")');route(b);assert.equal(d.getElementById('nfDialog').open,true);assert.equal(b.run('functionWrites'),0);b.dom.window.close();});
test('Escape, identity, reconnect, route, hidden and pagehide invalidate Custom Functions without auto reopen',()=>{for(const reason of ['escape','id','generation','route','hidden','pagehide']){const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeFunctions;connect(b);route(b);if(reason==='escape')d.getElementById('nfDialog').dispatchEvent(new b.w.Event('cancel',{cancelable:true}));if(reason==='id')b.run('cartDevices[2].identity.id="other"');if(reason==='generation')b.run('cartDevices[2].ownerLink.generation++');if(reason==='route')b.run('nativeAppState.screen="color"');if(reason==='hidden'){Object.defineProperty(d,'visibilityState',{value:'hidden',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));}if(reason==='pagehide')b.w.dispatchEvent(new b.w.Event('pagehide'));a.paint();assert.equal(d.getElementById('nfDialog').open,false,reason);Object.defineProperty(d,'visibilityState',{value:'visible',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));b.w.dispatchEvent(new b.w.Event('pageshow'));a.enter();assert.equal(d.getElementById('nfDialog').open,false,reason);assert.equal(b.run('functionWrites'),0);b.dom.window.close();}});
test('Custom Functions nested Settings Cancel and Forward preserve history with no writes',async()=>{const b=boot(),d=b.w.document;connect(b);b.run('go("native/nokins/settings")');d.querySelector('[data-setup-key="functions"]').click();assert.equal(b.w.location.hash,'#native/nokins/settings/functions');assert.equal(d.getElementById('nfDialog').open,true);const back=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));d.getElementById('nfExit').click();await back;assert.equal(b.w.location.hash,'#native/nokins/settings');const forward=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));b.w.history.forward();await forward;assert.equal(d.getElementById('nfDialog').open,true);assert.equal(b.run('functionWrites'),0);b.dom.window.close();});
test('Authored warning artifact matches provenance, and module exports no writer/gesture threshold path',()=>{const crypto=require('node:crypto'),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/native-lotus/functions/provenance.json'))),bytes=fs.readFileSync(path.join(root,manifest.assets[0].path));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.assets[0].sha256);const source=fs.readFileSync(path.join(root,'native-lotus-functions.js'),'utf8');assert.doesNotMatch(source,/ownerCommand|ownerUpload|writeValue|setTimeout|setInterval|500/);assert.match(source,/button\.disabled=true/);});

test('Explicit Settings row reopens lifecycle-dismissed Functions without automatic reopen or writes',()=>{for(const reason of ['hidden','pagehide','id','generation']){const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeFunctions;connect(b);route(b);if(reason==='hidden'){Object.defineProperty(d,'visibilityState',{value:'hidden',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));}if(reason==='pagehide')b.w.dispatchEvent(new b.w.Event('pagehide'));if(reason==='id')b.run('cartDevices[2].identity.id="new-device"');if(reason==='generation')b.run('cartDevices[2].ownerLink.generation++');a.paint();assert.equal(d.getElementById('nfDialog').open,false,reason);Object.defineProperty(d,'visibilityState',{value:'visible',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));b.w.dispatchEvent(new b.w.Event('pageshow'));a.enter();assert.equal(d.getElementById('nfDialog').open,false,reason);d.querySelector('[data-setup-key="functions"]').click();assert.equal(d.getElementById('nfDialog').open,true,reason);assert.equal(b.run('functionWrites'),0);for(const button of d.querySelectorAll('[data-custom-function]'))assert.equal(button.disabled,true);b.dom.window.close();}});
