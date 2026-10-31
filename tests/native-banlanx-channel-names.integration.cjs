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
  w.HTMLCanvasElement.prototype.getContext = function(){return ({save(){},restore(){},clip(){},fillRect(){},setTransform(){},clearRect(){},beginPath(){},arc(){},fill(){},stroke(){},roundRect(){},createConicGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}});};
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
function groupNoAck(b,on=true){assert.equal(b.w.document.querySelector('[data-group-consent]'),null);if(!on)b.w.SmartEaseNativeSP.transportChanged();}
function groups(){const b=setup();live(b);b.w.SmartEaseBanlanXGroupsStore.add('SP-A','Front pair',5);b.run("go('native/sp608e/groups')");return b;}
async function groupControl(options={}){const b=groups();b.run("go('native/sp608e/group-control/0/SP-A')");await b.w.SmartEaseNativeSP.readStatus();solidStatus(b,options);solidNoAck(b);return b;}
const nameKey='smartease-native-banlanx-channel-names-v1';
const nameButton=(b,text)=>[...b.w.document.querySelectorAll('.bxc-name-dialog button')].find(x=>x.textContent===text);
function rename(b,i,value){assert.equal(b.w.SmartEaseNativeSPChannelNames.rename(i),true);b.w.document.querySelector('.bxc-name-dialog input').value=value;nameButton(b,'OK').click();}
function pointer(b,target,type,x=0,y=0){const e=new b.w.Event(type,{bubbles:true});Object.assign(e,{button:0,pointerId:1,clientX:x,clientY:y});target.dispatchEvent(e);}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('Connected exact identity local rename updates original Channels without writes or whole-cart mutation',()=>{const b=setup();live(b);const cart=b.run('JSON.stringify(settings.names)'),id=b.run('device.id');rename(b,0,'  Front 灯 ');assert.equal(b.w.document.querySelector('[data-channel="1"]').textContent,'  Front 灯 ');assert.equal(b.w.SmartEaseNativeSP.snapshot().channels[0].name,'  Front 灯 ');assert.equal(b.run('device.id'),id);assert.equal(b.run('JSON.stringify(settings.names)'),cart);assert.equal(b.w.writes.length,0);assert.equal(b.w.document.querySelectorAll('.bx-channel-name-host').length,1);b.dom.window.close();});
test('Channel title-area longpress works ON/OFF/unknown; power button is excluded',async()=>{const b=setup();live(b);for(const on of [null,false,true]){if(on!==null){await b.w.SmartEaseNativeSP.readStatus();status(b,on);}const open=b.w.document.querySelector('[data-channel="1"]');pointer(b,open,'pointerdown');await wait(515);assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,'Channel 1');nameButton(b,'Rename channel').click();nameButton(b,'Cancel').click();const power=b.w.document.querySelector('[data-toggle="1"]');pointer(b,power,'pointerdown');await wait(515);assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,null);}assert.equal(b.w.writes.filter(x=>x[1]!==143).length,0);const css=fs.readFileSync(path.join(root,'banlanx-channel-names.css'),'utf8');assert.match(css,/channel-open\[data-channel-name-gesture\]:disabled\{pointer-events:none\}/);b.dom.window.close();});
test('Local names populate Groups member picker; original control title domains stay unchanged pending source closure',async()=>{const b=setup();live(b);rename(b,0,'Front');b.w.SmartEaseBanlanXGroupsStore.add('SP-A','Pair',3);b.run("go('native/sp608e/groups')");groupNoAck(b);b.w.document.querySelector('.bxg-add').click();assert([...b.w.document.querySelectorAll('dialog label')].some(x=>x.textContent==='Front'));b.run("go('native/sp608e/control/1')");assert.equal(b.w.document.querySelector('.bx-control-header h3').textContent,'Channel 1');b.run("go('native/sp608e/control/255')");assert.equal(b.w.document.querySelector('.bx-control-header h3').textContent,'ALL');b.run("go('native/sp608e/group-control/0/SP-A')");assert.equal(b.w.document.querySelector('.bx-control-header h3').textContent,'Pair');assert.equal(b.w.writes.length,0);b.dom.window.close();});
test('Reconnection/identity change, route and deferred Back invalidate detached local saves',()=>{for(const action of [b=>b.run('bleSession++;SmartEaseNativeSP.transportChanged()'),b=>b.run("device={id:'SP-B',name:'Other',gatt:{connected:true}};bleSession++;SmartEaseNativeSP.transportChanged()"),b=>b.run("go('native/sp608e/scenes')"),b=>{b.w.history.back=()=>{};b.w.document.getElementById('nativeAppBack').click();}]){const b=setup();live(b);b.w.SmartEaseNativeSPChannelNames.rename(0);b.w.document.querySelector('.bxc-name-dialog input').value='Stale';const save=nameButton(b,'OK');action(b);save.click();assert.equal(b.w.localStorage.getItem(nameKey),null);assert.equal(b.w.writes.length,0);b.dom.window.close();}});
test('Current exact device only, no disconnected synthetic namespace and no global names migration',()=>{const b=setup();assert.equal(b.w.SmartEaseNativeSPChannelNames.rename(0),false);live(b);rename(b,0,'A name');b.run("device={id:'SP-B',name:'Other',gatt:{connected:true}};bleSession++;SmartEaseNativeSP.transportChanged()");assert.equal(b.w.document.querySelector('[data-channel="1"]').textContent,'Channel 1');rename(b,0,'B name');const v=JSON.parse(b.w.localStorage.getItem(nameKey));assert.equal(v.devices['SP-A'].channels[0].name,'A name');assert.equal(v.devices['SP-B'].channels[0].name,'B name');assert.equal(v.devices['unconnected-sp608e'],undefined);b.dom.window.close();});
test('External change-back event cancels local dialog and stale menu callback',()=>{for(const menu of [false,true]){const b=setup();live(b);if(menu)b.w.document.querySelector('.bx-channel').dispatchEvent(new b.w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));else b.w.SmartEaseNativeSPChannelNames.rename(0);const old=nameButton(b,menu?'Rename channel':'OK');b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:nameKey,newValue:'{bad'}));b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:nameKey,newValue:null}));old.click();assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,null);assert.equal(b.w.localStorage.getItem(nameKey),null);assert.equal(b.w.writes.length,0);b.dom.window.close();}});
test('Malformed saved library fails closed without repair or boot crash; disabled device rename stays gated',()=>{const b=boot({[nameKey]:'{bad'});b.run("go('native/sp608e/channels')");live(b);assert.equal(b.w.SmartEaseNativeSPChannelNames.rename(0),false);assert.equal(b.w.localStorage.getItem(nameKey),'{bad');assert.match(b.w.document.querySelector('.bx-channel-name-host').textContent,/Original data was preserved/);assert.equal(b.errors.length,0);assert.equal(b.w.writes.length,0);b.dom.window.close();});
test('Name library backup validator and actual import allowlist are wired before restore mutation',()=>{const source=fs.readFileSync(path.join(root,'app.js'),'utf8');assert(source.includes('"'+nameKey+'"'));assert(source.includes('SmartEaseBanlanXChannelNameStore.validate(value)'));assert(source.indexOf('SmartEaseBanlanXChannelNameStore.validate(value)')<source.indexOf('const before = entries.map'));const b=setup();assert.throws(()=>b.w.SmartEaseBanlanXChannelNameStore.validate(JSON.stringify({format:'smartease-native-banlanx-channel-names',version:2,devices:{}})));b.dom.window.close();});
test('No pending longpress survives chooser repaint and old bound title cannot rename',async()=>{const b=setup();live(b);const old=b.w.document.querySelector('[data-channel="1"]');pointer(b,old,'pointerdown');b.w.SmartEaseNativeSP.namesChanged();await wait(520);assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,null);pointer(b,old,'pointerdown');await wait(520);assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,null);assert.equal(b.w.writes.length,0);b.dom.window.close();});
test('Invalid name backup blocks entire import; quota rollback preserves other settings and original bytes',async()=>{const b=setup();live(b);rename(b,0,'Saved');const raw=b.w.localStorage.getItem(nameKey),other='smartease-experience-v1',before=b.w.localStorage.getItem(other);for(const value of ['{bad',JSON.stringify({format:'smartease-native-banlanx-channel-names',version:2,devices:{}})]){b.w.payload={format:'smartease-cart-backup',version:1,values:{[other]:'{"experience":"new"}',[nameKey]:value}};await b.run('restoreBackup({size:100,text:async()=>JSON.stringify(payload)})');assert.equal(b.w.localStorage.getItem(other),before);assert.equal(b.w.localStorage.getItem(nameKey),raw);}const changed=JSON.parse(raw);changed.devices['SP-A'].channels[0].name='Imported';b.w.payload={format:'smartease-cart-backup',version:1,values:{[other]:'{"experience":"new"}',[nameKey]:JSON.stringify(changed)}};const original=b.w.Storage.prototype.setItem;let failed=false;b.w.Storage.prototype.setItem=function(k,v){if(k===nameKey&&!failed){failed=true;throw Error('quota');}return original.call(this,k,v)};await b.run('restoreBackup({size:100,text:async()=>JSON.stringify(payload)})');assert(failed);assert.equal(b.w.localStorage.getItem(other),before);assert.equal(b.w.localStorage.getItem(nameKey),raw);b.w.Storage.prototype.setItem=original;b.dom.window.close();});
test('Actual name backup restore preserves unknown records and import does not mutate cart names',async()=>{const b=setup();live(b);const originalNames=b.run('JSON.stringify(settings.names)'),value={format:'smartease-native-banlanx-channel-names',version:1,extra:{opaque:1},devices:{'SP-A':{extra:'keep',channels:{0:{name:'Imported',opaque:[1,2]},future:{unchanged:true}}}}};b.w.payload={format:'smartease-cart-backup',version:1,values:{[nameKey]:JSON.stringify(value)}};await b.run('restoreBackup({size:100,text:async()=>JSON.stringify(payload)})');assert.deepEqual(JSON.parse(b.w.localStorage.getItem(nameKey)),value);assert.equal(b.run('JSON.stringify(settings.names)'),originalNames);assert.equal(b.w.writes.length,0);b.dom.window.close();});
test('Fresh attached gesture reopens after valid external edit; old dialogs and detached cards remain inert',()=>{const b=setup();live(b);b.w.SmartEaseNativeSPChannelNames.rename(0);const oldSave=nameButton(b,'OK'),input=b.w.document.querySelector('.bxc-name-dialog input');input.value='Old';const value={format:'smartease-native-banlanx-channel-names',version:1,devices:{'SP-A':{channels:{0:{name:'External'}}}}};b.w.localStorage.setItem(nameKey,JSON.stringify(value));b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:nameKey,newValue:JSON.stringify(value)}));oldSave.click();assert.equal(JSON.parse(b.w.localStorage.getItem(nameKey)).devices['SP-A'].channels[0].name,'External');const card=b.w.document.querySelector('.bx-channel');card.dispatchEvent(new b.w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,'External');nameButton(b,'Rename channel').click();assert.equal(b.w.document.querySelector('.bxc-name-dialog input').value,'External');nameButton(b,'Cancel').click();b.w.SmartEaseNativeSP.namesChanged();b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:nameKey,newValue:JSON.stringify(value)}));card.dispatchEvent(new b.w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,null);const attached=b.w.document.querySelector('.bx-channel');attached.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'F2',bubbles:true}));assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,'External');assert.equal(b.w.writes.length,0);b.dom.window.close();});
test('Fresh explicit gestures do not rearm malformed/future data or wrong route',()=>{const b=setup();live(b);const card=b.w.document.querySelector('.bx-channel');for(const raw of ['{bad',JSON.stringify({format:'smartease-native-banlanx-channel-names',version:2,devices:{}})]){b.w.localStorage.setItem(nameKey,raw);b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:nameKey,newValue:raw}));card.dispatchEvent(new b.w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,null);assert.equal(b.w.localStorage.getItem(nameKey),raw);}b.w.localStorage.removeItem(nameKey);b.run("go('native/sp608e/groups')");card.dispatchEvent(new b.w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));assert.equal(b.w.SmartEaseNativeSPChannelNames.state(),null);assert.equal(b.w.localStorage.getItem(nameKey),null);assert.equal(b.w.writes.length,0);b.dom.window.close();});
test('Explicit valid readmission clears only owned malformed-startup notice',()=>{const b=boot({[nameKey]:'{bad'});b.run("go('native/sp608e/channels')");live(b);assert(b.w.document.querySelector('.bx-channel-name-error'));b.w.localStorage.removeItem(nameKey);b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:nameKey,newValue:null}));b.w.document.querySelector('.bx-channel').dispatchEvent(new b.w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));assert.equal(b.w.SmartEaseNativeSPChannelNames.state().dialog,'Channel 1');assert.equal(b.w.document.querySelector('.bx-channel-name-error'),null);assert.equal(b.w.document.querySelector('.bx-safety'),null);assert.equal(b.w.writes.length,0);b.dom.window.close();});
