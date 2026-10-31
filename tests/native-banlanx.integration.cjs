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
function setup(){const b=boot();b.run("go('native/sp608e/channels')");return b;}
function live(b){b.w.writes=[];b.run("device={id:'SP-A',name:'SP608E',gatt:{connected:true}};char={properties:{write:true},writeValueWithResponse:async bytes=>writes.push([...bytes])};transport='ble';bleSession++;SmartEaseNativeSP.transportChanged()");}
function status(b,on=true){b.w.report=Array.from({length:88},(_,i)=>i%11===0?(on?1:0):i%11===3?100:0);b.run('onNotification({target:{value:new DataView(Uint8Array.from([54,56,1,88,88,...report]).buffer)}})');}
const tick=()=>new Promise(r=>setTimeout(r,5));
function consent(b,on=true){assert.equal(b.w.document.querySelector('#nativeBanlanX [data-parked]'),null);if(!on)b.w.SmartEaseNativeSP.transportChanged();}
test('Native source header tabs, overview migration and explicit pending legacy links send nothing',()=>{const b=setup();assert.deepEqual(Array.from(b.w.document.querySelectorAll('#nativeBanlanX .bx-tabs button'),x=>x.textContent),['Channels','Scenes','Triggers','Groups']);b.run("go('native/sp608e/overview')");assert.equal(b.w.location.hash,'#native/sp608e/channels');for(const name of ['effects','settings']){b.run("go('native/sp608e/"+name+"')");assert.equal(b.w.location.hash,'#native/sp608e/'+name);assert.match(b.w.document.querySelector('.bx-pending').textContent,/not integrated/);}b.dom.window.close();});
test('Demo known ON never becomes Native authoritative status and read sends nothing',async()=>{const b=setup();b.run("enterDemo();SmartEaseNativeSP.transportChanged()");assert.equal(b.w.SmartEaseNativeSP.snapshot().connected,false);assert.equal(await b.w.SmartEaseNativeSP.readStatus(),false);assert.ok(b.w.SmartEaseNativeSP.snapshot().channels.every(c=>c.lightingOn===null));b.dom.window.close();});
test('Only explicit dispatched read accepts complete current status; readback does not navigate or write',async()=>{const b=setup();live(b);status(b);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.w.writes.length,0);assert.equal(await b.w.SmartEaseNativeSP.readStatus(),true);assert.deepEqual(JSON.parse(JSON.stringify(b.w.writes)),[[136,143,0]]);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);status(b);assert.equal(b.w.SmartEaseNativeSP.state().fresh,true);assert.equal(b.w.SmartEaseNativeSP.firstBrightness(255),100);assert.equal(b.w.location.hash,'#native/sp608e/channels');assert.equal(b.w.writes.length,1);b.w.document.querySelector('[data-channel="3"]').click();assert.equal(b.w.location.hash,'#native/sp608e/control/4');assert.equal(b.w.document.querySelector('.bx-solid-host')!==null,true);assert.equal(b.w.writes.length,1);b.dom.window.close();});
test('Malformed partial read invalidates only Native proof, never rewrites retained legacy channel cache',async()=>{const b=setup();live(b);await b.w.SmartEaseNativeSP.readStatus();status(b);b.run('readChannelState(new Uint8Array(20))');assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.run('channels[0].known'),true);assert.equal(b.run('channels[0].power'),true);assert.ok(b.w.SmartEaseNativeSP.snapshot().channels.every(c=>c.lightingOn===null));b.dom.window.close();});
test('Power uses exact82 only, requires explicit read/consent and successful write never establishes ON',async()=>{const b=setup();live(b);await b.w.SmartEaseNativeSP.readStatus();status(b);consent(b);b.w.document.querySelector('[data-toggle="1"]').click();await new Promise(r=>setTimeout(r,250));assert.deepEqual(JSON.parse(JSON.stringify(b.w.writes)),[[136,143,0],[136,130,2,1,0]]);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.ok(b.w.SmartEaseNativeSP.snapshot().channels.every(c=>c.lightingOn===null));b.dom.window.close();});
test('Deferred read is invalidated before Back/Forward and cannot accept later old status',async()=>{const b=setup();live(b);b.w.release=null;b.run('writeQueue=new Promise(r=>release=r)');const read=b.w.SmartEaseNativeSP.readStatus();const pop=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));b.w.history.back();await pop;const forward=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));b.w.history.forward();await forward;b.w.release();assert.equal(await read,false);status(b);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.w.writes.length,0);b.dom.window.close();});
test('Reconnect, changed identity and background cancel pending read provenance',async()=>{for(const change of ["bleSession++;SmartEaseNativeSP.transportChanged()","device={...device,id:'SP-B'};SmartEaseNativeSP.transportChanged()",'hidden']){const b=setup();live(b);await b.w.SmartEaseNativeSP.readStatus();if(change==='hidden'){Object.defineProperty(b.w.document,'visibilityState',{value:'hidden',configurable:true});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));}else b.run(change);status(b);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.w.writes.length,1);b.dom.window.close();}});
test('Queued power revocation and recheck cannot revive older command',async()=>{const b=setup();live(b);await b.w.SmartEaseNativeSP.readStatus();status(b);consent(b);b.w.release=null;b.run('writeQueue=new Promise(r=>release=r)');b.w.document.querySelector('[data-toggle="1"]').click();b.w.SmartEaseNativeSP.transportChanged();consent(b);b.w.release();await tick();assert.equal(b.w.writes.length,1);b.dom.window.close();});
test('Fragment assembly invalidates old display until the complete explicitly requested report arrives',async()=>{const b=setup();live(b);await b.w.SmartEaseNativeSP.readStatus();status(b);await b.w.SmartEaseNativeSP.readStatus();b.w.fragment=payload=>b.run('onNotification({target:{value:new DataView(Uint8Array.from('+JSON.stringify(payload)+').buffer)}})');const payload=Array.from({length:88},(_,i)=>i%11===0?1:i%11===3?80:0);b.w.fragment([54,56,1,88,44,...payload.slice(0,44)]);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.w.SmartEaseNativeSP.state().reading,true);b.w.fragment([54,56,2,88,44,...payload.slice(44)]);assert.equal(b.w.SmartEaseNativeSP.state().fresh,true);assert.equal(b.w.SmartEaseNativeSP.firstBrightness(2),80);b.w.fragment([54,56,3,88,1,0]);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.run('channels[0].known'),true);b.dom.window.close();});
test('Unknown or busy-cart power refuses before enqueue without canceling another playback',async()=>{const b=setup();live(b);consent(b);b.w.document.querySelector('[data-power="ON"]').click();await tick();assert.equal(b.w.writes.length,0);await b.w.SmartEaseNativeSP.readStatus();status(b);consent(b);b.run('studioRunning=true');b.w.document.querySelector('[data-power="ON"]').click();await tick();assert.equal(b.run('studioRunning'),true);assert.equal(b.w.writes.length,1);b.run('studioRunning=false');b.dom.window.close();});
test('Visibility and pageshow restore only current view with unknown state; old operations and switched routes never revive',async()=>{for(const switchRoute of [false,true]){const b=setup();live(b);b.w.release=null;b.run('writeQueue=new Promise(r=>release=r)');const old=b.w.SmartEaseNativeSP.readStatus();Object.defineProperty(b.w.document,'visibilityState',{value:'hidden',configurable:true});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));assert.equal(b.w.document.getElementById('nativeBanlanX').hidden,true);if(switchRoute)b.run("go('native/coolled/program')");Object.defineProperty(b.w.document,'visibilityState',{value:'visible',configurable:true});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));b.w.dispatchEvent(new b.w.Event('pageshow'));assert.equal(b.w.document.getElementById('nativeBanlanX').hidden,switchRoute);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.w.SmartEaseNativeSP.state().reading,false);if(!switchRoute)assert.equal(b.w.document.querySelector('#nativeBanlanX [data-parked]'),null);b.w.release();assert.equal(await old,false);status(b);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.w.writes.length,0);b.dom.window.close();}});
test('Old power completion after reentry cannot clear a newer operation busy state',async()=>{const b=setup();live(b);b.w.completions=[];b.run('sendPower=(mask,on,options)=>new Promise(resolve=>completions.push({resolve,guard:options.guard}))');await b.w.SmartEaseNativeSP.readStatus();status(b);consent(b);b.w.document.querySelector('[data-toggle="1"]').click();b.run("go('native/sp608e/scenes');go('native/sp608e/channels')");await b.w.SmartEaseNativeSP.readStatus();status(b);consent(b);b.w.document.querySelector('[data-toggle="1"]').click();assert.equal(b.w.completions.length,2);assert.equal(b.w.completions[0].guard(),false);b.w.completions[0].resolve(true);await tick();assert.equal(await b.w.SmartEaseNativeSP.readStatus(),false);assert.equal(b.w.completions[1].guard(),true);b.w.completions[1].resolve(true);await tick();assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);b.dom.window.close();});

test('A status frame started before the explicit read dispatch cannot establish Native authority',async()=>{for(const queued of [false,true]){const b=setup();live(b);const payload=Array.from({length:88},(_,i)=>i%11===0?1:i%11===3?100:0);function frame(seq,bytes){b.w.frame=[54,56,seq,88,bytes.length,...bytes];b.run('onNotification({target:{value:new DataView(Uint8Array.from(frame).buffer)}})');}let request;if(queued){b.w.release=null;b.run('writeQueue=new Promise(r=>release=r)');request=b.w.SmartEaseNativeSP.readStatus();}frame(1,payload.slice(0,44));if(queued)b.w.release();else request=b.w.SmartEaseNativeSP.readStatus();assert.equal(await request,true);frame(2,payload.slice(44));assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.run('channels[0].power'),true);assert.ok(b.w.SmartEaseNativeSP.snapshot().channels.every(c=>c.lightingOn===null));assert.equal(b.w.document.querySelector('[data-channel="1"]').disabled,true);b.dom.window.close();}});
test('Same-ID new connection generation clears obsolete power busy UI before an old completion settles',async()=>{const b=setup();live(b);b.w.completePower=null;b.run('sendPower=(mask,on,options)=>new Promise(resolve=>completePower={resolve,guard:options.guard})');await b.w.SmartEaseNativeSP.readStatus();status(b);consent(b);b.w.document.querySelector('[data-toggle="1"]').click();b.run('bleSession++;SmartEaseNativeSP.transportChanged()');assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.w.document.querySelector('#nativeBanlanX [data-parked]'),null);assert.equal(b.w.document.querySelector('#nativeBanlanX .row-actions button').disabled,false);assert.equal(b.w.completePower.guard(),false);assert.equal(await b.w.SmartEaseNativeSP.readStatus(),true);b.w.completePower.resolve(true);await tick();assert.equal(b.w.SmartEaseNativeSP.state().reading,true);status(b);assert.equal(b.w.SmartEaseNativeSP.state().fresh,true);b.dom.window.close();});
