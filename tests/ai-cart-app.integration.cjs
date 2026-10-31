/* Development-only dependency: npm install jsdom; run with NODE_PATH configured. */
const { JSDOM, VirtualConsole } = require('jsdom');
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname,'..');

function boot(storage = {}, beforeScripts, hash = "") {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "https://smartease.test/"+hash,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;
  w.structuredClone = structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
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
    if(script.src.endsWith("/ai-cart-app.js")&&w.__beforeAI)w.__beforeAI();
    vm.runInContext(source, ctx, { filename: script.src || "index.inline.js" });
  }
  if(!w.document.getElementById('nativeAppScreen')){const host=w.document.createElement('section');host.id='nativeAppScreen';w.document.body.append(host);}
  if(vm.runInContext("typeof nativeAppState",ctx)==='undefined')vm.runInContext("var nativeAppState={device:'nokins',screen:'settings',detail:'line-sequence'};",ctx);
  if(!hash)vm.runInContext("page='native';",ctx);
  if(!w.SmartEaseNativeSettings)vm.runInContext(fs.readFileSync(path.join(root,'native-lotus-settings.js'),'utf8'),ctx);

  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}

test('AI tab boots and returns to Native without writes',()=>{const b=boot();try{b.run("go('ai')");assert.equal(b.w.document.getElementById('aiCartPage').hidden,false);assert.equal(b.w.document.querySelectorAll('.bottom-nav [data-go=ai]').length,1);assert.equal(b.w.document.querySelectorAll('#aiCartPage input[type=checkbox]').length,0);b.run("go('native')");assert.equal(b.w.document.getElementById('aiCartPage').hidden,true);assert.equal(b.errors.length,0,b.errors.map(String).join('\n'));}finally{b.dom.window.close();}});

function liveSetup(extra=''){
 const b=boot({},({w,run})=>{w.__beforeAI=()=>run(`
 window.calls=[];window.transferComplete=true;window.holdDisplay=null;
 transport='ble';device={id:'sp',gatt:{connected:true}};char={};
 cartDevices[1].device={id:'ux',name:'CoolLEDUX-31B8',gatt:{connected:true}};cartDevices[1].identity={id:'ux',name:'CoolLEDUX-31B8'};cartDevices[1].link.device=cartDevices[1].device;cartDevices[1].link.service={};cartDevices[1].link.characteristic={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',service:{uuid:'0000fff0-0000-1000-8000-00805f9b34fb'},properties:{notify:true,write:true},startNotifications:async()=>{},addEventListener(){},removeEventListener(){},writeValueWithResponse:async()=>{throw Error('No radio permitted')}};
 cartDevices[2].profile='melk-of21';cartDevices[2].ownerLink={connected:true,generation:7,device:{id:'n'},identity:{id:'n'},characteristic:{},report:{writeMethod:'with-response'}};cartDevices[2].ownerUncertainGeneration=null;
 cartDevices[2].cancelOwner=()=>{};cartDevices[2].ownerCommands=async jobs=>{calls.push({kind:'nokins',jobs});return true;};cartDevices[2].ownerCommand=async(kind,value)=>{calls.push({kind:'ncolor',value});return true;};
 enqueuePackets=async(jobs,label,options)=>{if(!options.guard())return false;calls.push({kind:'sp',jobs,label});return true;};
 SmartEaseUXSelectedProgramController={create:o=>{let state={state:'idle',admission:'a',owner:{deviceId:'ux',generation:1}};return{prepare:async()=>{const plan=o.compile({library:o.readLibrary(),revision:'a'},{guard:()=>o.valid(),packageSize:1004});calls.push({kind:'compile',packets:plan.plans[0].packets.length});state.state='ready';return o.valid();},snapshot:()=>state,send:async()=>{calls.push({kind:'display'});if(window.holdDisplay)await window.holdDisplay;state.state=window.transferComplete?'complete':'failed';return state;},cancel:()=>{},dispose:()=>{},report:()=>null};}};
 `+extra);});b.run("go('ai')");return b;
}
const settle=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
test('AI explicit Start compiles display before calibrated SP and NOKINS, then edit stops',async()=>{const b=liveSetup();try{b.w.document.querySelector('#aiCartPage [data-start]').click();await settle();assert.equal(b.w.SmartEaseAICart.state().state,'running');const calls=b.w.calls;assert.deepEqual(Array.from(calls.slice(0,2),x=>x.kind),['compile','display']);assert.ok(calls.find(x=>x.kind==='sp'));assert.ok(calls.find(x=>x.kind==='nokins'));const initial=calls.find(x=>x.kind==='sp'&&x.label.includes('initialization'));assert.ok(initial);const raw=initial.jobs.map(a=>Array.from(a));assert.ok(raw.some(a=>a[1]===0x8a&&a.at(-1)===0));const color=b.w.document.querySelector('#aiCartPage input[type=color]');color.value='#112233';color.dispatchEvent(new b.w.Event('input'));assert.equal(b.w.SmartEaseAICart.state().state,'stopped');assert.equal(b.errors.length,0);}finally{b.w.SmartEaseAICart.stop();b.dom.window.close();}});
test('Failed display prevents all light writes',async()=>{const b=liveSetup('window.transferComplete=false;');try{b.w.document.querySelector('#aiCartPage [data-start]').click();await settle();assert.equal(b.w.SmartEaseAICart.state().state,'failed');assert.deepEqual(Array.from(b.w.calls,x=>x.kind),['compile','display']);}finally{b.dom.window.close();}});
test('Legacy calibration initialization happens before capture, not self-cancellation',async()=>{const b=liveSetup("hauntedColorFix[1]=['b','r','g'];spSavedChipOrders={};");try{b.w.document.querySelector('#aiCartPage [data-start]').click();await settle();assert.equal(b.w.SmartEaseAICart.state().state,'running');assert.ok(b.run('spSavedChipOrders[1]'));b.run("spRgbBalance[1]=[99,100,100];SmartEaseAICart.refresh();");assert.notEqual(b.w.SmartEaseAICart.state().state,'running');}finally{b.w.SmartEaseAICart.stop();b.dom.window.close();}});
test('NOKINS same-generation identity replacement invalidates active scene',async()=>{const b=liveSetup();try{b.w.document.querySelector('#aiCartPage [data-start]').click();await settle();assert.equal(b.w.SmartEaseAICart.state().state,'running');b.run("cartDevices[2].ownerLink.device={id:'other'};SmartEaseAICart.refresh();");assert.notEqual(b.w.SmartEaseAICart.state().state,'running');}finally{b.w.SmartEaseAICart.stop();b.dom.window.close();}});
test('Missing NOKINS blocks full-cart Start before display or other light changes',async()=>{const b=liveSetup('cartDevices[2].ownerLink.connected=false;');try{b.w.document.querySelector('#aiCartPage [data-start]').click();await settle();assert.equal(b.w.SmartEaseAICart.state().state,'failed');assert.match(b.w.SmartEaseAICart.state().reason,/NOKINS/);assert.equal(b.w.calls.length,0);}finally{b.dom.window.close();}});
test('Changing shared palette sends same authored front color to NOKINS, preserving SP correction',async()=>{const b=liveSetup();try{const color=b.w.document.querySelector('#aiCartPage input[type=color]');color.value='#123456';color.dispatchEvent(new b.w.Event('input'));b.w.document.querySelector('#aiCartPage [data-start]').click();await settle();const n=b.w.calls.find(x=>x.kind==='nokins');assert.equal(n.jobs.find(x=>x.kind==='color').value,'#123456');const sp=b.w.calls.find(x=>x.kind==='sp'&&x.label.includes('initialization'));assert.ok(sp.jobs.some(x=>x[1]===0x89&&x[3]===1&&x[4]===0x12&&x[5]===0x34&&x[6]===0x56));assert.equal(b.run('preferences.gradientChase.reverseCanopy'),true);}finally{b.w.SmartEaseAICart.stop();b.dom.window.close();}});
test('Disconnected local save/reload retains custom palette and does not rewrite existing user stores',()=>{const b=boot({'smartease-user-sentinel':'keep'});try{b.run("go('ai')");const c=b.w.document.querySelector('#aiCartPage input[type=color]');c.value='#123456';c.dispatchEvent(new b.w.Event('input'));b.w.document.querySelector('#aiCartPage [data-save]').click();const saved=JSON.parse(b.w.localStorage.getItem('smartease-ai-scene-library-v1'));assert.equal(saved.records[0].recipe.palette[0],0x123456);assert.equal(b.w.localStorage.getItem('smartease-user-sentinel'),'keep');assert.ok(b.run("SmartEaseAICartStudio.validateStore(JSON.parse(localStorage.getItem('smartease-ai-scene-library-v1')),SmartEaseAICartRecipe)"));assert.notEqual(b.w.SmartEaseAICart.state().state,'running');}finally{b.dom.window.close();}});

test('Direct #ai late mount exposes outer page and actual nav clicks preserve visibility',()=>{const b=boot({},undefined,'#ai');try{const d=b.w.document;assert.equal(d.getElementById('aiCartPage').hidden,false);assert.equal(d.querySelector('#aiCartPage .aics').hidden,false);assert.equal(d.querySelector('.bottom-nav [data-go=ai]').getAttribute('aria-current'),'page');d.querySelector('.bottom-nav [data-go=native]').click();assert.equal(d.getElementById('aiCartPage').hidden,true);d.querySelector('.bottom-nav [data-go=ai]').click();assert.equal(d.getElementById('aiCartPage').hidden,false);assert.equal(d.querySelector('#aiCartPage .aics').hidden,false);assert.equal(b.errors.length,0);}finally{b.dom.window.close();}});
