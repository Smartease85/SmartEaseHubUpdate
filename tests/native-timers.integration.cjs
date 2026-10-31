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

function setup(){const b=boot();b.run(`const a=cartDevices[2];a.identity={id:'A'};a.device={};a.profile='melk-of21';a.ownerEpoch=0;a.ownerLink.generation=3;Object.defineProperty(a,'connected',{value:true,writable:true,configurable:true});Object.defineProperty(a,'controlReady',{value:true,writable:true,configurable:true});a.cancelOwner=()=>{a.ownerEpoch++;};go('native/nokins/timers');`);return b;}
const returned=[{kind:0,hour:7,minute:15,days:17,enabled:true},{kind:1,hour:23,minute:30,days:127,enabled:true}];
function installRead(b,values=returned){b.w.mockPair=values;b.run(`cartDevices[2].ownerReadTimers=async guard=>{if(!guard())return false;const a=cartDevices[2];a.ownerTimerRevision=(a.ownerTimerRevision||0)+1;a.of21.timers=Object.fromEntries(mockPair.map(t=>[t.kind,{...t,generation:a.ownerLink.generation,readRevision:a.ownerTimerRevision}]));return true;}`);}
function parked(b,consent=false){b.w.SmartEaseNativeTimers.paint();}
async function read(b){installRead(b);parked(b);assert.equal(await b.w.SmartEaseNativeTimers.read(),true);}
function edit(b,k,field,value){const a=b.w.SmartEaseNativeTimers,d=b.w.document;a.edit(k,field);assert.equal(d.getElementById('nltDialog').open,true);if(field==='time')d.getElementById('nltTime').value=value;else for(const c of d.querySelectorAll('#nltDays input'))c.checked=!!(value&(1<<Number(c.value)));assert.equal(a.confirm(),true);}
test('Source two ON/OFF Time/Repeat rows, initially unknown, no automatic calls or cache-based Apply',async()=>{const b=setup(),a=b.w.SmartEaseNativeTimers,d=b.w.document;assert.equal(d.querySelectorAll('.nlt-card').length,2);installRead(b);parked(b,true);assert.equal(await a.apply(),false);await b.run('cartDevices[2].ownerReadTimers(()=>true)');a.paint();assert.equal(a.state().fresh,false);assert.equal(d.getElementById('nltApply').disabled,true);assert.equal(a.state().drafts[0].hour,0);assert.equal(await a.read(),true);assert.equal(a.state().drafts[0].hour,7);assert.equal(a.state().drafts[0].minute,15);assert.equal(a.state().drafts[0].days,17);assert.equal(a.state().drafts[0].enabled,true);assert.equal(d.getElementById('nltRepeat0').textContent.includes('Mon Fri'),true);b.dom.window.close();});
test('Apply ON preserves OFF unsent draft, rebinds returned provenance, and keeps selected slot',async()=>{const b=setup(),a=b.w.SmartEaseNativeTimers,d=b.w.document;await read(b);edit(b,1,'time','22:10');edit(b,0,'time','08:25');let sent; b.w.writeMock=async(t,g)=>{assert.equal(g(),true);sent={...t};b.w.mockPair=[sent,returned[1]];return true;};b.run('cartDevices[2].ownerWriteTimers=writeMock');parked(b,true);assert.equal(await a.apply(),true);assert.equal(sent.hour,8);assert.equal(a.state().drafts[1].hour,22);assert.equal(a.state().drafts[1].minute,10);assert.equal(a.state().dirty[1],true);assert.equal(a.state().dirty[0],false);assert.equal(a.state().selected,0);assert.equal(a.state().fresh,true);assert.equal(d.getElementById('nltConsent'),null);d.getElementById('nltSelect1').click();a.enter();assert.equal(a.state().selected,1);b.dom.window.close();});
test('Shared cache new revision or mutated pair blocks Apply without erasing drafts',async()=>{const b=setup(),a=b.w.SmartEaseNativeTimers;await read(b);edit(b,0,'time','09:20');b.run('cartDevices[2].ownerTimerRevision++');parked(b,true);assert.equal(await a.apply(),false);assert.equal(a.state().drafts[0].hour,9);await a.read();assert.equal(a.state().drafts[0].hour,9);b.run('cartDevices[2].of21.timers[1].hour=2');assert.equal(await a.apply(),false);b.dom.window.close();});
test('Reconnect and identity changes require fresh view read, do not apply or reuse prior drafts',async()=>{for(const change of ['a.ownerLink.generation++','a.identity={id:"B"}']){const b=setup(),a=b.w.SmartEaseNativeTimers;await read(b);edit(b,0,'time','09:20');b.run(change);b.w.dispatchEvent(new b.w.Event('smartease-of21-state'));parked(b,true);assert.equal(a.state().fresh,false);assert.equal(a.state().drafts[0].hour,0);assert.equal(await a.apply(),false);b.dom.window.close();}});
test('Cancel invalid time dialog is non-submit and leaves draft unchanged; repeat supports once/daily/week',async()=>{const b=setup(),a=b.w.SmartEaseNativeTimers,d=b.w.document;await read(b);a.edit(0,'time');d.getElementById('nltTime').value='';assert.equal(a.confirm(),false);d.getElementById('nltDialogCancel').click();assert.equal(d.getElementById('nltDialog').open,false);assert.equal(a.state().drafts[0].hour,7);edit(b,0,'days',0);assert.match(d.getElementById('nltRepeat0').textContent,/Single Time/);edit(b,0,'days',127);assert.match(d.getElementById('nltRepeat0').textContent,/Every Day/);assert.equal(d.getElementById('nltDialogCancel').type,'button');b.dom.window.close();});
test('Deferred Beehive Back immediately invalidates pending Apply and cannot auto-reopen before popstate',async()=>{for(const reject of [false,true]){const b=setup(),a=b.w.SmartEaseNativeTimers,d=b.w.document; b.run('of21Local.menuStyles={version:1,devices:{A:2}};go("native/nokins/menu");go("native/nokins/timers")');await read(b);let finish,guard;b.w.writeMock=(t,g)=>{guard=g;return new Promise((r,j)=>finish=()=>reject?j(Error('late')):r(true));};b.run('cartDevices[2].ownerWriteTimers=writeMock');parked(b,true);const p=a.apply();let backCalls=0;b.w.history.go=()=>backCalls++;d.getElementById('nativeAppBack').click();assert.equal(backCalls,1);assert.equal(guard(),false);const result=d.getElementById('nltResult').textContent;b.w.dispatchEvent(new b.w.Event('smartease-of21-state'));assert.equal(d.getElementById('nativeLotusTimers').hidden,true);finish();assert.equal(await p,false);assert.equal(d.getElementById('nltResult').textContent,result);assert.equal(b.run('of21Busy'),false);b.dom.window.close();}});
test('Read/Apply guard identity, generation, device, owner epoch, route and visibility with no late updates',async()=>{for(const change of ['a.identity={id:"B"}','a.ownerLink.generation++','a.device={}','a.ownerEpoch++','nativeAppState.screen="color"','hidden']){const b=setup(),a=b.w.SmartEaseNativeTimers;let finish,guard;b.w.readMock=g=>{guard=g;return new Promise(r=>finish=r);};b.run('cartDevices[2].ownerReadTimers=readMock');parked(b);const p=a.read();assert.equal(guard(),true);if(change==='hidden')Object.defineProperty(b.w.document,'visibilityState',{value:'hidden',configurable:true});else b.run(change);assert.equal(guard(),false,change);finish(true);assert.equal(await p,false);assert.equal(a.state().fresh,false);b.dom.window.close();}});
test('Wrong profile and busy block commands without checkbox gates',async()=>{const b=setup(),a=b.w.SmartEaseNativeTimers;await read(b);let calls=0;b.w.writeMock=async()=>{calls++;return true;};b.run('cartDevices[2].ownerWriteTimers=writeMock');assert.equal(b.w.document.getElementById('nltConsent'),null);parked(b,true);b.run('cartDevices[2].profile="wrong"');assert.equal(await a.apply(),false);b.run('cartDevices[2].profile="melk-of21";of21Busy=true');assert.equal(await a.apply(),false);assert.equal(calls,0);b.run('of21Busy=false');assert.equal(await a.apply(),true);assert.equal(calls,1);b.dom.window.close();});
test('Readback mismatch retains submitted draft and reports uncertainty, incomplete read blocks further Apply',async()=>{const b=setup(),a=b.w.SmartEaseNativeTimers;await read(b);edit(b,0,'time','10:00');b.run('cartDevices[2].ownerWriteTimers=async guard=>true');parked(b,true);assert.equal(await a.apply(),true);assert.equal(a.state().drafts[0].hour,10);assert.equal(a.state().dirty[0],true);assert.match(b.w.document.getElementById('nltResult').textContent,/differs/);b.run('cartDevices[2].ownerReadTimers=async()=>false');parked(b,true);assert.equal(await a.apply(),false);assert.equal(a.state().fresh,false);b.dom.window.close();});
test('Visibility restoration closes editor and requires new explicit read; Back/Forward navigation sends nothing',async()=>{const b=setup(),a=b.w.SmartEaseNativeTimers,d=b.w.document;await read(b);a.edit(0,'time');let calls=0;b.w.forbidden=()=>{calls++;throw Error('automatic');};b.run('cartDevices[2].ownerReadTimers=forbidden;cartDevices[2].ownerWriteTimers=forbidden');Object.defineProperty(d,'visibilityState',{value:'hidden',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));assert.equal(d.getElementById('nltDialog').open,false);Object.defineProperty(d,'visibilityState',{value:'visible',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));assert.equal(d.getElementById('nativeLotusTimers').hidden,false);assert.equal(a.state().fresh,false);b.run('go("native/nokins/color")');await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Back traversal timed out')),5000);b.w.addEventListener('popstate',()=>{clearTimeout(timeout);resolve();},{once:true});b.w.history.back();});assert.equal(b.w.location.hash,'#native/nokins/timers');assert.equal(d.getElementById('nativeLotusTimers').hidden,false);await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Forward traversal timed out')),5000);b.w.addEventListener('popstate',()=>{clearTimeout(timeout);resolve();},{once:true});b.w.history.forward();});assert.equal(b.w.location.hash,'#native/nokins/color');assert.equal(d.getElementById('nativeLotusTimers').hidden,true);assert.equal(calls,0);b.dom.window.close();});
test('Apply OFF preserves unsent ON draft and selected OFF through own readback',async()=>{const b=setup(),a=b.w.SmartEaseNativeTimers;await read(b);edit(b,0,'time','12:34');edit(b,1,'days',0);b.w.writeMock=async(t,g)=>{assert.equal(g(),true);b.w.mockPair=[returned[0],{...t}];return true;};b.run('cartDevices[2].ownerWriteTimers=writeMock');parked(b,true);assert.equal(await a.apply(),true);assert.equal(a.state().selected,1);assert.equal(a.state().drafts[0].hour,12);assert.equal(a.state().drafts[0].minute,34);assert.equal(a.state().dirty[0],true);assert.equal(a.state().dirty[1],false);b.dom.window.close();});
