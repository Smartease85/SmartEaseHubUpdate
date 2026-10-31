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
  if(!w.SmartEaseNativeBottom)vm.runInContext(fs.readFileSync(path.join(root,"native-lotus-bottom.js"),"utf8"),ctx);
  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}
function connected(b){b.run(`cartDevices[2].identity={id:'device-a',name:'MELK-OF21'};cartDevices[2].profile='melk-of21';Object.defineProperty(cartDevices[2],'connected',{value:true,writable:true,configurable:true});Object.defineProperty(cartDevices[2],'controlReady',{value:true,writable:true,configurable:true});cartDevices[2].ownerLink.generation=7;window.powerCalls=[];cartDevices[2].ownerCommand=async(k,v,o,g)=>{powerCalls.push([k,v,typeof g==='function'&&g()]);return true;};`);b.run('go("native/nokins/color")');}
function choose(b,value=true){const d=b.w.document;b.w.SmartEaseNativeBottom.open();d.querySelector(`[name=nlbChoice][value=${value?'on':'off'}]`).checked=true;b.w.SmartEaseNativeBottom.paint();}
test('Original power/tab art and source68px bar appear without commands; focus visible',()=>{const b=boot(),d=b.w.document;connected(b);assert.equal(d.getElementById('nativeLotusBottom').hidden,false);assert.equal(d.querySelectorAll('#nativeLotusBottom #nativeAppNav img').length,5);assert.deepEqual([...d.querySelectorAll('#nativeAppNav button')].map(x=>x.getAttribute('aria-label')),['Color','Rhythm','Effects','Scenes','Timing']);assert.match(d.querySelector('#nativeLotusBottom style').textContent,/height:68px/);assert.match(d.querySelector('#nativeLotusBottom style').textContent,/#nativeLotusBottom #nativeAppNav button:focus-visible/);assert.equal(b.run('powerCalls.length'),0);assert.equal(b.w.SmartEaseNativeBottom.requested,null);b.dom.window.close();});
test('Explicit On/Off requires an explicit power choice, without checkboxes, submits only selected command and labels requested not readback',async()=>{const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeBottom;connected(b);a.open();assert.equal(await a.apply(),false);choose(b,true);assert.equal(await a.apply(),true);assert.equal(b.run('JSON.stringify(powerCalls)'),JSON.stringify([['power',true,true]]));assert.equal(a.requested,true);assert.match(d.getElementById('nlbState').textContent,/not returned state/);assert.equal(d.getElementById('nlbParked'),null);choose(b,false);assert.equal(await a.apply(),true);assert.equal(a.requested,false);assert.equal(b.run('powerCalls.length'),2);b.dom.window.close();});
test('Opening or navigation never guesses/toggles power and stale hidden programmatic Apply is blocked',async()=>{const b=boot(),a=b.w.SmartEaseNativeBottom;connected(b);choose(b);b.run('go("native/nokins/settings")');assert.equal(await a.apply(),false);assert.equal(a.open(),false);assert.equal(b.run('powerCalls.length'),0);b.dom.window.close();});
test('Back/navigation cancels late power completion and does not set requested state',async()=>{for(const fail of [false,true]){const b=boot(),a=b.w.SmartEaseNativeBottom;connected(b);b.run('cartDevices[2].ownerCommand=()=>new Promise((resolve,reject)=>{window.finishPower=resolve;window.failPower=reject;});');choose(b);const pending=a.apply();b.run('go("native/nokins/settings")');if(fail)b.w.failPower(Error('late'));else b.w.finishPower(true);assert.equal(await pending,false);assert.equal(a.requested,null);assert.equal(b.w.document.getElementById('nlbDialog').open,false);b.dom.window.close();}});
test('Identity/reconnect invalidates power session and local request; no auto replay',async()=>{for(const change of ['id','generation']){const b=boot(),a=b.w.SmartEaseNativeBottom;connected(b);choose(b);await a.apply();choose(b);b.run(change==='id'?'cartDevices[2].identity.id="device-b"':'cartDevices[2].ownerLink.generation++');b.w.dispatchEvent(new b.w.Event('smartease-of21-state'));assert.equal(a.requested,null);assert.equal(b.w.document.getElementById('nlbDialog').open,false);assert.equal(await a.apply(),false);assert.equal(b.run('powerCalls.length'),1);b.dom.window.close();}});
test('Visibility/page lifecycle closes power and ends the operation without reopening',()=>{const b=boot(),d=b.w.document,a=b.w.SmartEaseNativeBottom;connected(b);choose(b);Object.defineProperty(d,'visibilityState',{value:'hidden',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));Object.defineProperty(d,'visibilityState',{value:'visible',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));assert.equal(d.getElementById('nlbDialog').open,false);assert.equal(d.getElementById('nlbParked'),null);choose(b);b.w.dispatchEvent(new b.w.Event('pagehide'));b.w.dispatchEvent(new b.w.Event('pageshow'));assert.equal(d.getElementById('nlbDialog').open,false);assert.equal(b.run('powerCalls.length'),0);b.dom.window.close();});
test('Routine unchanged state event preserves explicit pending power dialog',()=>{const b=boot(),d=b.w.document;connected(b);choose(b);b.w.dispatchEvent(new b.w.Event('smartease-of21-state'));assert.equal(d.getElementById('nlbDialog').open,true);assert.equal(d.getElementById('nlbParked'),null);assert.equal(b.run('powerCalls.length'),0);b.dom.window.close();});
test('Bee power dialog is outside hidden bar; non-Lotus navigation restores visible nav labels',()=>{const b=boot(),d=b.w.document;connected(b);b.run('of21Local.menuStyles={version:1,devices:{"device-a":2}};go("native/nokins/menu")');d.getElementById('nmPower').click();assert.equal(d.getElementById('nlbDialog').open,true);assert.equal(d.getElementById('nativeLotusBottom').contains(d.getElementById('nlbDialog')),false);b.run('go("native/sp608e")');assert.equal(d.getElementById('nativeAppNav').parentElement.id,'nativeAppDevice');assert.equal(d.getElementById('nativeAppNav').children[0].textContent,'Channels');assert.equal(b.run('powerCalls.length'),0);b.dom.window.close();});

test('Lotus routine command screens contain no parked or send acknowledgement controls, while timer data controls remain',()=>{const b=boot(),d=b.w.document;for(const id of ['nlbParked','nlcParked','nlcConsent','ndParked','ndConsent','nrParked','nrConsent','nlsParked','nlsConsent','nsetupParked','nsetupConsent','nltParked','nltConsent','of21Parked','of21BulkConsent','of21Topology'])assert.equal(d.getElementById(id),null,id);assert.equal(d.getElementById('of21TimerEnabled').type,'checkbox');assert.equal(d.getElementById('of21Collapse').type,'checkbox');assert.equal(d.querySelectorAll('.of21-day').length,7);assert.equal(d.querySelectorAll('#nltDays input').length,7);assert.equal(b.errors.length,0);b.dom.window.close();});
