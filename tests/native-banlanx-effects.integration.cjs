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

function effectReport(b,{effect=6,brightness=73,rgb=[128,64,32],speed=5,length=100,direction=0,gain=8}={}){b.w.effectBytes=Array.from({length:88},(_,i)=>{const n=i%11;return n===0?1:n===1?effect:n===3?brightness:n===4?speed:n===5?length>>8:n===6?length&255:n===7?direction:n>=8?rgb[n-8]:0});if(gain!==null)b.w.effectBytes.push(gain);b.run('onNotification({target:{value:new DataView(Uint8Array.from([54,56,1,effectBytes.length,effectBytes.length,...effectBytes]).buffer)}})');}
async function effectsControl(options={}){const b=setup();b.w.CSS={supports:()=>options.noMasks!==true};live(b);b.run("go('native/sp608e/control/"+(options.mask||1)+"')");await b.w.SmartEaseNativeSP.readStatus();effectReport(b,options);solidNoAck(b);return b;}
const E=b=>b.w.SmartEaseNativeSPSolid;

test('Actual Effects body reads source fields without automatic mode or color commands',async()=>{const b=await effectsControl();assert.equal(E(b).state().mode,0);const s=E(b).effectsState().state;assert.equal(s.speed,5);assert.equal(s.length,100);assert.equal(s.sensitivity,8);assert.equal(s.reversed,true);assert.equal(s.index,5);assert.equal(b.w.document.querySelectorAll('.bxe-palette button').length,9);assert.deepEqual(plain(b.w.writes),[[136,143,0]]);b.dom.window.close();});
test('Ordinary effect controls emit exact masked packets, no automatic color or power',async()=>{const b=await effectsControl({mask:255});await E(b).effectsControl('brightness',40);await E(b).effectsControl('speed',7);await E(b).effectsControl('length',240);await E(b).effectsControl('direction',false);assert.deepEqual(plain(b.w.writes.slice(1)),[[136,133,2,255,40],[136,134,2,255,7],[136,135,3,255,0,240],[136,138,2,255,1]]);assert.equal(E(b).effectsState().state.authored,null);b.dom.window.close();});
test('Music uses global sensitivity and blocks brightness in every entry path',async()=>{const b=await effectsControl({effect:102,gain:14});assert.equal(E(b).effectsState().state.sensitivity,14);assert.equal(await E(b).effectsControl('brightness',60),false);assert.equal(await E(b).effectsControl('sensitivity',16),true);assert.deepEqual(plain(b.w.writes.slice(1)),[[136,139,2,1,16]]);b.dom.window.close();});
test('Missing or out-of-range global gain never uses stale cached sensitivity',async()=>{for(const gain of [null,0,17,255]){const b=await effectsControl({effect:102,gain});assert.equal(E(b).effectsState().state.sensitivity,null);assert.equal(await E(b).effectsControl('sensitivity',8),false);assert.equal(b.w.writes.length,1);b.dom.window.close();}});
test('Source lower zero remains unknown while upper speed and length bounds clamp',async()=>{for(const [speed,length,a,z]of [[0,0,null,null],[255,65535,10,240]]){const b=await effectsControl({speed,length});const s=E(b).effectsState().state;assert.equal(s.speed,a);assert.equal(s.length,z);if(a===null)assert.equal(await E(b).effectsControl('speed',6),false);b.dom.window.close();}});
test('Explicit Effects selector sets remembered effect for Solid roundtrip',async()=>{const b=await effectsControl();assert.equal(await E(b).effectsControl('effect',28),true);assert.equal(await E(b).chooseMode(1),true);assert.equal(await E(b).chooseMode(0),true);assert.deepEqual(plain(b.w.writes.slice(1)),[[136,131,2,1,105],[136,131,2,1,25],[136,131,2,1,105]]);b.dom.window.close();});
test('Effects palette uses authored color and first brightness without any Solid DIY storage',async()=>{const b=await effectsControl({mask:255,brightness:71});const key=b.w.SmartEaseBanlanXDIYStore.key;assert.equal(await E(b).effectsPalette(0),true);assert.deepEqual(plain(b.w.writes.slice(1)),Array.from({length:8},(_,i)=>[136,137,5,1<<i,255,0,0,71]));assert.equal(b.w.localStorage.getItem(key),null);b.dom.window.close();});
test('Effects brightness85 preserves mixed calibrated wire colors, palette applies each gain once',async()=>{const b=await effectsControl({mask:255});b.run('spRgbBalance={1:[100,50,100],2:[50,100,100]}');await E(b).effectsControl('brightness',31);assert.deepEqual(plain(b.w.writes.slice(1)),[[136,133,2,255,31]]);assert.equal(E(b).effectsState().state.authored,null);await E(b).effectsPalette(8);assert.deepEqual(plain(b.w.writes[2]),[136,137,5,1,255,128,255,31]);assert.deepEqual(plain(b.w.writes[3]),[136,137,5,2,128,255,255,31]);b.dom.window.close();});
test('Pending Effects command is cancelled before dispatch by explicit mode switch',async()=>{const b=await effectsControl();b.run('writeQueue=new Promise(r=>window.release=r)');const pending=E(b).effectsControl('speed',6),mode=E(b).chooseMode(1);b.w.release();assert.equal(await pending,false);assert.equal(await mode,true);assert.deepEqual(plain(b.w.writes.slice(1)),[[136,131,2,1,25]]);b.dom.window.close();});
test('Effects queued actions do not revive across consent revoke/recheck or navigation',async()=>{for(const action of ['consent','route']){const b=await effectsControl();b.run('writeQueue=new Promise(r=>window.release=r)');const pending=E(b).effectsPalette(0);if(action==='consent'){solidNoAck(b,false);solidNoAck(b,true);}else b.run("go('native/sp608e/channels')");b.w.release();assert.equal(await pending,false);assert.equal(b.w.writes.length,1);b.dom.window.close();}});
test('External write removes Effects authority until explicit current-session read',async()=>{const b=await effectsControl();b.run('SmartEaseNativeSP.beforeWrite(packet(0x85,[1,80]),bleSession)');assert.equal(await E(b).effectsControl('speed',6),false);assert.equal(await E(b).effectsPalette(0),false);assert.equal(b.w.writes.length,1);b.dom.window.close();});
test('Native Effects assets, dependencies and source palette disabled overlay are cached',()=>{const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');for(const x of ['banlanx-effects-host.js','banlanx-effects-model.js','banlanx-effects-selector.js','banlanx-disk.js','banlanx-disk-math.js','assets/native-banlanx/MaterialIcons-Regular.otf','assets/native-banlanx/circular_gradient-2x.png']){assert(sw.includes('./'+x));assert(fs.existsSync(path.join(root,x)));}const css=fs.readFileSync(path.join(root,'banlanx-effects-host.css'),'utf8');assert(css.includes('background:rgba(0,0,0,.5647058823529412)'));assert(!css.includes('button:disabled{opacity:.45}'));});

test('Effects color never updates hidden selected Solid DIY record',async()=>{const b=await effectsControl();await E(b).chooseMode(1);await E(b).choosePreset(0,true);const key=b.w.SmartEaseBanlanXDIYStore.key,before=b.w.localStorage.getItem(key);assert.equal(E(b).state().selected,0);await E(b).chooseMode(0);await E(b).effectsPalette(2);assert.equal(b.w.localStorage.getItem(key),before);assert.deepEqual(plain(b.w.writes.at(-1)),[136,137,5,1,0,0,255,255]);b.dom.window.close();});
test('Effects pending color cannot survive reconnect, hide, or resize consent reset',async()=>{for(const action of ['reconnect','hide','resize']){const b=await effectsControl();b.run('writeQueue=new Promise(r=>window.release=r)');const pending=E(b).effectsPalette(0);if(action==='reconnect')b.run('bleSession++;SmartEaseNativeSP.transportChanged()');else if(action==='hide'){Object.defineProperty(b.w.document,'visibilityState',{value:'hidden',configurable:true});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));}else b.w.dispatchEvent(new b.w.Event('resize'));b.w.release();assert.equal(await pending,false);assert.equal(b.w.writes.length,1);b.dom.window.close();}});

test('Resize preserves owned Effects authored and numeric drafts without silently authoring from wire',async()=>{const b=await effectsControl();await E(b).effectsPalette(6);await E(b).effectsControl('speed',8);const before=plain(E(b).effectsState().state),count=b.w.writes.length;b.w.dispatchEvent(new b.w.Event('resize'));const after=plain(E(b).effectsState().state);assert.deepEqual(after.authored,before.authored);assert.equal(after.speed,8);assert.equal(E(b).state().consent,undefined);assert.equal(b.w.writes.length,count);solidNoAck(b);assert.equal(b.w.document.querySelector('.bx-disk-area').getAttribute('aria-disabled'),'false');assert.equal(b.w.writes.length,count);b.dom.window.close();});

test('Fresh Effects read replaces brightness provenance and clears old authored inference',async()=>{const b=await effectsControl({brightness:73});await E(b).effectsPalette(0);await b.w.SmartEaseNativeSP.readStatus();effectReport(b,{brightness:20});assert.equal(E(b).effectsState().state.brightness,20);assert.equal(E(b).effectsState().state.authored,null);assert.equal(E(b).state().authored,null);await E(b).effectsPalette(2);assert.deepEqual(plain(b.w.writes.at(-1)),[136,137,5,1,0,0,255,20]);b.dom.window.close();});

test('Actual global disabled opacity cannot fade source palette and direction under their overlay',async()=>{const b=await effectsControl({effect:2});const style=b.w.document.createElement('style');style.textContent=fs.readFileSync(path.join(root,'banlanx-effects-host.css'),'utf8');b.w.document.head.append(style);for(const element of [b.w.document.querySelector('.bxe-palette button'),b.w.document.querySelector('.bxe-direction')]){assert.equal(element.disabled,true);assert.equal(b.w.getComputedStyle(element).opacity,'1');}b.dom.window.close();});

test('Original music notes are active-mode decoration without parked consent',async()=>{const b=await effectsControl({effect:102});const note=b.w.document.querySelector('.bx-music-notes'),writes=b.w.writes.length;assert.equal(note.style.opacity,'1');assert.equal(note.style.transition,'none');assert.equal(note.children.length,5);solidNoAck(b);assert.equal(b.w.document.querySelector('.bx-music-notes'),note);assert.equal(note.hidden,false);assert.equal(note.style.opacity,'1');solidNoAck(b,true);assert.equal(b.w.document.querySelector('.bx-music-notes'),note);assert.equal(note.style.opacity,'1');assert.equal(b.w.writes.length,writes);await E(b).effectsControl('effect',0);assert.equal(note.style.opacity,'0');assert.equal(note.style.transition,'opacity 300ms linear');assert.deepEqual(plain(b.w.writes.at(-1)),[136,131,2,1,1]);b.dom.window.close();});
test('Music note mode exit follows sourceactivity without adding commands or a waveform loop',async()=>{const b=await effectsControl({effect:102});const note=b.w.document.querySelector('.bx-music-notes');await E(b).chooseMode(1);assert.equal(note.style.opacity,'0');assert.equal(note.closest('.bx-effect-pending').hidden,true);assert.deepEqual(plain(b.w.writes.slice(1)),[[136,131,2,1,25]]);b.dom.window.close();});
test('Unsupported image masking hides decoration but does not disable verified Effects commands',async()=>{const b=await effectsControl({effect:102,noMasks:true});assert.equal(b.w.document.querySelector('.bx-music-notes').hidden,true);assert.equal(await E(b).effectsControl('sensitivity',9),true);assert.deepEqual(plain(b.w.writes.at(-1)),[136,139,2,1,9]);b.dom.window.close();});
test('Music notes hide on background and do not revive stale route or commands',async()=>{const b=await effectsControl({effect:102});const note=b.w.document.querySelector('.bx-music-notes'),count=b.w.writes.length;Object.defineProperty(b.w.document,'visibilityState',{value:'hidden',configurable:true});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));assert.equal(note.hidden,true);Object.defineProperty(b.w.document,'visibilityState',{value:'visible',configurable:true});b.w.document.dispatchEvent(new b.w.Event('visibilitychange'));assert.equal(b.w.writes.length,count);assert(!b.w.document.contains(note));b.dom.window.close();});
