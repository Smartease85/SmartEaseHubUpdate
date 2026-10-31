/* Development-only dependency: npm install jsdom; run with NODE_PATH configured. */
const { JSDOM, VirtualConsole } = require('jsdom');
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname,'..');

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
const key='smartease-native-coolledux-v1',libKey='coolledux:16x96';
const graffiti=()=>({width:96,height:16,pixels:Array(1536).fill(0),mask:Array(1536).fill(true),mode:1,speed:15,stay:3});
const fixture=()=>({format:'smartease-native-coolledux-library',version:1,opaque:{keep:true},libraries:{[libKey]:{family:'coolledux',rows:16,columns:96,records:[{id:'a',kind:'graffiti',repeat:1,graffiti:graffiti(),opaque:9},{id:'b',kind:'graffiti',repeat:10,graffiti:graffiti()}],selection:[],unknown:3},future:{opaque:true}},preferences:{opaque:4}});
function setup(value=fixture()){const b=boot(value?{[key]:JSON.stringify(value)}:{});b.run("go('native/coolled/program')");return b;}
const data=b=>JSON.parse(b.w.localStorage.getItem(key));


function connected(){const b=setup();b.run(`cartDevices[1].device={id:'ux',name:'CoolLEDUX-31B8',gatt:{connected:true}};cartDevices[1].identity={id:'ux',name:'CoolLEDUX-31B8'};cartDevices[1].link.device=cartDevices[1].device;cartDevices[1].link.service={};window.radioWrites=0;cartDevices[1].link.characteristic={uuid:'0000fff1-0000-1000-8000-00805f9b34fb',service:{uuid:'0000fff0-0000-1000-8000-00805f9b34fb'},properties:{notify:true,write:true},startNotifications:async()=>{},addEventListener(){},removeEventListener(){},writeValueWithResponse:async()=>{window.radioWrites++}};updateCartDeviceUI();`);return b;}
test('Actual patched Native host invalidates pending import before owner admission',async()=>{const b=connected(),d=b.w.document,before=b.w.localStorage.getItem(key);let release;Object.defineProperty(d.getElementById('nuxImport'),'files',{value:[{size:100,text:()=>new Promise(r=>release=r)}]});const pending=d.getElementById('nuxImport').onchange();assert.equal(b.w.SmartEaseNativeUX.send(),true);release(JSON.stringify(fixture()));await pending;assert.equal(d.getElementById('nuxDialog').open,false);assert.equal(d.querySelector('.nux-owner-send').open,true);assert.equal(b.w.localStorage.getItem(key),before);assert.equal(b.w.radioWrites,0);b.dom.window.close();});
test('Actual patched local dialog closes owner admission and clears confirmations',()=>{const b=connected(),d=b.w.document;assert.equal(b.w.SmartEaseNativeUX.send(),true);for(const i of d.querySelectorAll('.nux-owner-send input'))i.checked=true;b.w.SmartEaseNativeUX.add();assert.equal(d.querySelector('.nux-owner-send').open,false);assert.equal(d.getElementById('nuxDialog').open,true);assert.ok([...d.querySelectorAll('.nux-owner-send input')].every(i=>!i.checked));assert.equal(b.w.radioWrites,0);b.dom.window.close();});
test('Actual patched import start closes owner admission before awaiting file text',async()=>{const b=connected(),d=b.w.document;assert.equal(b.w.SmartEaseNativeUX.send(),true);let release;Object.defineProperty(d.getElementById('nuxImport'),'files',{value:[{size:100,text:()=>new Promise(r=>release=r)}]});const pending=d.getElementById('nuxImport').onchange();assert.equal(d.querySelector('.nux-owner-send').open,false);release(JSON.stringify(fixture()));await pending;assert.equal(d.getElementById('nuxDialog').open,true);assert.equal(b.w.radioWrites,0);b.dom.window.close();});
test('Actual patched Native navigation closes test and returning requires fresh admission',()=>{const b=connected(),d=b.w.document;b.w.SmartEaseNativeUX.send();b.run("go('native/coolled/settings')");assert.equal(d.querySelector('.nux-owner-send').open,false);b.run("go('native/coolled/program')");assert.equal(d.querySelector('.nux-owner-send').open,false);assert.equal(b.w.radioWrites,0);b.dom.window.close();});
const tick=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
function admit(b){assert.equal(b.w.SmartEaseNativeUX.send(),true);for(const input of b.w.document.querySelectorAll('.nux-owner-send input')){input.checked=true;input.dispatchEvent(new b.w.Event('change'));}}
function startTest(b){b.w.document.querySelector('.nux-owner-send button').click();}
test('Actual connection update cancels pending subscription and blocks renewed admission until settled',async()=>{const b=connected(),d=b.w.document;b.run('cartDevices[1].link.characteristic.startNotifications=()=>new Promise(r=>window.subscriptionResolve=r)');admit(b);startTest(b);await tick();b.run('cartDevices[1].link.generation++;updateCartDeviceUI()');assert.equal(d.querySelector('.nux-owner-send').open,false);assert.equal(b.w.SmartEaseNativeUX.send(),false);b.w.subscriptionResolve();await tick();assert.equal(b.w.radioWrites,0);assert.equal(b.w.SmartEaseNativeUX.send(),true);assert.ok([...d.querySelectorAll('.nux-owner-send input')].every(i=>!i.checked));b.dom.window.close();});
test('Actual Back/Forward during pending write never revives admission or auto writes',async()=>{const b=connected(),d=b.w.document;b.run("go('native/coolled/settings');go('native/coolled/program');cartDevices[1].link.characteristic.writeValueWithResponse=()=>{window.radioWrites++;return new Promise(r=>window.writeResolve=r)}");admit(b);startTest(b);await tick();assert.equal(b.w.radioWrites,1);let pop=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));b.w.history.back();await pop;assert.equal(d.querySelector('.nux-owner-send').open,false);pop=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));b.w.history.forward();await pop;assert.equal(d.querySelector('.nux-owner-send').open,false);assert.equal(b.w.SmartEaseNativeUX.send(),false);b.w.writeResolve();await tick();assert.equal(b.w.radioWrites,1);assert.equal(b.w.SmartEaseNativeUX.send(),true);b.dom.window.close();});
test('Actual Text Add after experimental admission closes it and retains original Text Save route',async()=>{const b=connected(),d=b.w.document;admit(b);b.w.SmartEaseNativeUX.add();assert.equal(d.querySelector('.nux-owner-send').open,false);const text=[...d.querySelectorAll('#nuxDialogBody button')].find(x=>x.textContent==='Text');assert.ok(text);text.click();assert.equal(b.w.location.hash,'#native/coolled/text');assert.equal(d.querySelector('.nux-owner-send').open,false);assert.equal(b.w.radioWrites,0);assert.ok(d.querySelector('#nuxTextHost textarea'));b.dom.window.close();});
test('Actual hidden page closes admission without resurrecting it on visibility return',()=>{const b=connected(),d=b.w.document;admit(b);Object.defineProperty(d,'visibilityState',{value:'hidden',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));Object.defineProperty(d,'visibilityState',{value:'visible',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));assert.equal(d.querySelector('.nux-owner-send').open,false);assert.ok([...d.querySelectorAll('.nux-owner-send input')].every(i=>!i.checked));assert.equal(b.w.radioWrites,0);b.dom.window.close();});
test('All experimental runtime dependencies cached, source transport bytes retained and build stamp explicit',()=>{const source=fs.readFileSync(path.join(root,'sw.js'),'utf8'),assets=vm.runInNewContext(source.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);for(const name of ['ux-source-codec.js','ux-source-program.js','ux-source-transaction.js','ux-experimental-uploader.js','owner-test-plan.js','ux-owner-send.js','ux-owner-send.css']){assert.ok(assets.includes('./'+name));assert.ok(fs.existsSync(path.join(root,name)));}assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/2026-10-31-native-test-candidate-04-ux-01/);});
