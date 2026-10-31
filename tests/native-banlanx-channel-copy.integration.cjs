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
  w.HTMLCanvasElement.prototype.getContext = function(){if(!this.className.startsWith("bxs-"))return null;return ({setTransform(){},clearRect(){},beginPath(){},arc(){},fill(){},stroke(){},roundRect(){},createConicGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}});};
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

function solidStatus(b,{mask=1,brightness=73,rgb=[128,64,32],effect=25}={}){b.w.report=Array.from({length:88},(_,i)=>i%11===0?1:i%11===1?effect:i%11===3?brightness:i%11>=8?rgb[i%11-8]:0);b.run('onNotification({target:{value:new DataView(Uint8Array.from([54,56,1,88,88,...report]).buffer)}})');}
async function control(options={}){const b=setup();live(b);b.run("go('native/sp608e/control/"+(options.mask||1)+"')");await b.w.SmartEaseNativeSP.readStatus();solidStatus(b,options);return b;}
function solidNoAck(b,on=true){assert.equal(b.w.document.querySelector('[data-solid-consent]'),null);if(!on)b.w.SmartEaseNativeSPSolid.reportInvalidated();}
const plain=v=>JSON.parse(JSON.stringify(v));
function menu(b){b.w.document.querySelector('[aria-label="Channel settings"]').click();[...b.w.document.querySelectorAll('.bxc-popup button')].find(n=>n.textContent.includes('Apply to channel...')).click();}
function target(b,i){const n=b.w.document.querySelector('[data-destination="'+i+'"]');n.checked=true;n.dispatchEvent(new b.w.Event('change'));}
function copyNoAck(b){for(const n of b.w.document.querySelectorAll('[data-admit]')){n.checked=true;n.dispatchEvent(new b.w.Event('change'));}}
function copyOK(b){b.w.document.querySelector('[data-confirm]').click();}
for(const effect of [25,7])test('actual shared header mode'+effect+' source menu and raw91 only, no localmap mutation',async()=>{const b=await control({effect});try{const initial=b.w.writes.length,before=JSON.stringify({...b.w.localStorage});menu(b);assert.equal(b.w.document.querySelectorAll('[data-destination]').length,7);assert.equal(b.w.document.querySelector('[data-destination="0"]'),null);assert.equal(b.w.writes.length,initial);target(b,1);target(b,7);copyNoAck(b);copyOK(b);assert.equal(b.w.document.querySelector('.bxc-dialog').open,false);await b.run('writeQueue');await tick();assert.deepEqual(plain(b.w.writes.slice(initial)),[[136,145,2,1,130]]);assert.equal(JSON.stringify({...b.w.localStorage}),before);assert.match(b.w.document.querySelector('.bxc-result').textContent,/unverified/);assert.equal(b.w.SmartEaseNativeSP.state().fresh,false);assert.equal(b.w.SmartEaseNativeSPSolid.state().wire,null);assert.equal(b.w.SmartEaseNativeSPSolid.state().consent,undefined);}finally{b.dom.window.close()}});
test('source empty OK closes no-op and calibration item remains explicitly gated',async()=>{const b=await control();try{menu(b);assert.equal([...b.w.document.querySelectorAll('.bxc-popup button')].find(x=>x.textContent==='Color calibration').disabled,true);copyOK(b);await tick();assert.equal(b.w.writes.length,1);assert.equal(b.w.document.querySelector('.bxc-dialog').open,false);}finally{b.dom.window.close()}});
for(const mask of [255,3])test('ALL/multibit'+mask+' has no channel menu',async()=>{const b=await control({mask});try{assert.equal(b.w.document.querySelector('[aria-label="Channel settings"]'),null);}finally{b.dom.window.close()}});
test('singlebit group never gets ordinary channel copy action',async()=>{const b=await control();try{b.run("SmartEaseNativeSPSolid.enter(document.getElementById('nativeBanlanX'),{identity:()=>({device,characteristic:char,id:device.id,session:bleSession,live:true}),valid:()=>true,exclusive:()=>true,proof:()=>null,control:{mask:1,title:'One port group',valid:()=>true}})");assert.equal(b.w.document.querySelector('[aria-label="Channel settings"]'),null);}finally{b.dom.window.close()}});
test('actual saved channelnames reused, no names overwritten',async()=>{const b=await control();try{b.run("const s=SmartEaseBanlanXChannelNameStore.create(localStorage);s.save('SP-A',1,'Front lights');s.save('SP-A',7,'Rear lights')");menu(b);assert.match(b.w.document.querySelector('.bxc-list').textContent,/Front lights/);assert.match(b.w.document.querySelector('.bxc-list').textContent,/Rear lights/);}finally{b.dom.window.close()}});
for(const why of ['route','generation','identity','resize','read','color','hide'])test('queued Copy invalidated by '+why+' never reaches radio or revives',async()=>{const b=await control();try{b.run('writeQueue=new Promise(r=>window.releaseCopyQueue=r)');menu(b);target(b,1);copyNoAck(b);copyOK(b);if(why==='route')b.run("go('native/sp608e/channels')");if(why==='generation')b.run('bleSession++;SmartEaseNativeSP.transportChanged()');if(why==='identity')b.run("device={...device,id:'SP-B'};SmartEaseNativeSP.transportChanged()");if(why==='resize')b.w.dispatchEvent(new b.w.Event('resize'));if(why==='read')b.w.SmartEaseNativeSPSolid.reportInvalidated();if(why==='color')b.w.SmartEaseNativeSPSolid.openRGB();if(why==='hide'){Object.defineProperty(b.w.document,'visibilityState',{value:'hidden',configurable:true});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));}b.w.releaseCopyQueue();await b.run('writeQueue');await tick();assert.equal(b.w.writes.length,1);}finally{b.dom.window.close()}});
test('unrelated command revokes queuedCopy, existing queue remains serial',async()=>{const b=await control();try{b.run('writeQueue=new Promise(r=>window.releaseCopyQueue=r)');menu(b);target(b,1);copyNoAck(b);copyOK(b);b.run('SmartEaseNativeSP.beforeWrite(packet(0x85,[1,50]),bleSession)');b.w.releaseCopyQueue();await b.run('writeQueue');assert.equal(b.w.writes.length,1);}finally{b.dom.window.close()}});
test('destination transientchipproof invalidated at dispatch only, savedmaps untouched; nextcolor reapplies targetorder',async()=>{const b=await control();try{b.run("hauntedColorFix[2]=['g','r','b'];spSetSavedChipOrder(2,['g','r','b']);spRgbBalance={2:[100,50,100]};spChipApplied[2]={session:bleSession,order:spChipRecord(2).target};spChipApplied[3]={session:bleSession,order:0}");const saved=b.run('JSON.stringify([spSavedChipOrders,spRgbBalance])');menu(b);target(b,1);copyNoAck(b);copyOK(b);await b.run('writeQueue');assert.equal(b.run('spChipApplied[2]'),undefined);assert.ok(b.run('spChipApplied[3]'));assert.equal(b.run('channels[1].known'),false);assert.equal(b.run('JSON.stringify([spSavedChipOrders,spRgbBalance])'),saved);b.run("go('native/sp608e/control/2')");await b.w.SmartEaseNativeSP.readStatus();solidStatus(b,{mask:2});solidNoAck(b);const before=b.w.writes.length;assert.equal(await b.w.SmartEaseNativeSPSolid.choosePreset(0,false),true);assert.deepEqual(plain(b.w.writes[before]).slice(0,4),[136,132,2,2]);assert.equal(b.run('JSON.stringify([spSavedChipOrders,spRgbBalance])'),saved);}finally{b.dom.window.close()}});
test('cache and dependency order includes exactsource helper before actual sharedhost',()=>{const h=fs.readFileSync(path.join(root,'index.html'),'utf8'),s=fs.readFileSync(path.join(root,'sw.js'),'utf8');for(const n of ['banlanx-channel-copy.js','banlanx-channel-menu.js','banlanx-channel-menu.css'])assert.ok(s.includes('./'+n));assert.ok(h.indexOf('src="banlanx-channel-copy.js"')<h.indexOf('src="banlanx-channel-menu.js"'));assert.ok(h.indexOf('src="banlanx-channel-menu.js"')<h.indexOf('src="native-banlanx-solid.js"'));});
test('blocked queued copy preserves transient proof until any actual dispatch; fresh permission required',async()=>{const b=await control();try{b.run("hauntedColorFix[2]=['g','r','b'];spSetSavedChipOrder(2,['g','r','b']);spChipApplied[2]={session:bleSession,order:spChipRecord(2).target};writeQueue=new Promise(r=>window.releaseCopyQueue=r)");menu(b);target(b,1);copyNoAck(b);copyOK(b);assert.equal(b.run('spChipReady(2)'),true);b.w.SmartEaseNativeSPSolid.openRGB();b.w.releaseCopyQueue();await b.run('writeQueue');assert.equal(b.run('spChipReady(2)'),true);assert.equal(b.w.writes.length,1);}finally{b.dom.window.close()}});
test('actual linked CSS keeps source Material glyph and clipped header title without hiding modes',async()=>{const b=await control();try{const d=b.w.document;for(const l of d.querySelectorAll('link[rel=stylesheet]')){const n=d.createElement('style');n.textContent=fs.readFileSync(path.join(root,new URL(l.href).pathname.slice(1)),'utf8');d.head.append(n);}assert.equal(b.w.getComputedStyle(d.querySelector('.bxc-icon')).fontFamily,'BanlanXChannelIcons');assert.equal(b.w.getComputedStyle(d.querySelector('.bx-control-header h3')).minWidth,'0px');assert.equal(b.w.getComputedStyle(d.querySelector('.bx-control-header h3')).textOverflow,'ellipsis');assert.equal(d.querySelector('[data-solid]').hidden,false);assert.equal(d.querySelector('[data-effects]').hidden,false);}finally{b.dom.window.close()}});
