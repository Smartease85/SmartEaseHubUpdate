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
  if(!w.SmartEaseNativeName)vm.runInContext(fs.readFileSync(path.join(root,"native-lotus-name.js"),"utf8"),ctx);
  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}
const key='smartease-of21-native-v1';
function connect(b,id='device-a',name='MELK-OF21'){b.run(`cartDevices[2].identity={id:${JSON.stringify(id)},name:${JSON.stringify(name)}};cartDevices[2].ownerLink.generation=4;`);b.w.SmartEaseNativeName.paint();}
function input(b,value){b.w.document.getElementById('nnValue').value=value;}
function setup(storage){const b=boot(storage);let writes=0;b.run('cartDevices[2].ownerCommand=()=>{throw Error("Unexpected BLE")};cartDevices[2].ownerUploadDIY=()=>{throw Error("Unexpected upload")};');b.w.navigator.bluetooth={requestDevice:()=>{writes++;throw Error('Unexpected connect');}};b.w.SmartEaseNative.settingsBack=()=>{};connect(b);return b;}
test('Rename starts from source identity, preserves blank/whitespace exactly and does not mutate identity/cart',()=>{const b=setup(),a=b.w.SmartEaseNativeName,d=b.w.document,identity=b.run('JSON.stringify(cartDevices[2].identity)'),cart=b.w.localStorage.getItem('smartease-cart-studio-v1');assert.equal(a.get(),'MELK-OF21');a.enter();assert.equal(d.getElementById('nnValue').value,'MELK-OF21');input(b,'');assert.equal(a.save(),true);assert.equal(a.get(),'');assert.equal(a.save(),false);a.enter();assert.equal(d.getElementById('nnValue').value,'');input(b,'   ');assert.equal(a.save(),true);assert.equal(a.get(),'   ');assert.equal(b.run('JSON.stringify(cartDevices[2].identity)'),identity);assert.equal(b.w.localStorage.getItem('smartease-cart-studio-v1'),cart);assert.equal(d.getElementById('nnDialog').open,false);assert.equal(b.errors.length,0);b.dom.window.close();});
test('Unicode/markup stored raw and rendered as text; per-device aliases do not transfer',()=>{const b=setup(),a=b.w.SmartEaseNativeName,d=b.w.document,text='  🚙 灯 <img src=x onerror=alert(1)> & " ';a.enter();input(b,text);assert.equal(a.save(),true);assert.equal(a.get(),text);assert.equal(d.querySelectorAll('#nativeLotusName img').length,0);connect(b,'device-b','Other OF21');assert.equal(a.get(),'Other OF21');a.enter();assert.equal(d.getElementById('nnValue').value,'Other OF21');a.leave();connect(b);assert.equal(a.get(),text);assert.equal(b.errors.length,0);b.dom.window.close();});
test('Unknown identity cannot save or silently bind an unassigned alias',()=>{const b=boot(),a=b.w.SmartEaseNativeName,d=b.w.document,before=b.w.localStorage.getItem(key);a.enter();input(b,'Unbound');assert.equal(d.getElementById('nnConfirm').disabled,true);assert.equal(a.save(),false);assert.throws(()=>a.set('Unbound'),/no longer current/);connect(b);assert.equal(d.getElementById('nnDialog').open,false);assert.equal(a.get(),'MELK-OF21');assert.equal(b.w.localStorage.getItem(key),before);b.dom.window.close();});
test('Same-context enter preserves typed draft; Cancel/Escape invalidate immediately including queued close',async()=>{const b=setup(),a=b.w.SmartEaseNativeName,d=b.w.document;let backs=0;b.w.SmartEaseNative.settingsBack=()=>backs++;b.w.HTMLDialogElement.prototype.close=function(){this.open=false;b.w.setTimeout(()=>this.dispatchEvent(new b.w.Event('close')),0);};a.enter();input(b,'Not saved');a.enter();assert.equal(d.getElementById('nnValue').value,'Not saved');d.getElementById('nnCancel').click();d.getElementById('nnCancel').click();assert.equal(a.save(),false);assert.equal(backs,1);await new Promise(r=>b.w.setTimeout(r,10));assert.equal(backs,1);a.enter();d.getElementById('nnDialog').dispatchEvent(new b.w.Event('cancel',{cancelable:true}));assert.equal(backs,2);assert.equal(a.save(),false);await new Promise(r=>b.w.setTimeout(r,10));assert.equal(backs,2);assert.equal(a.get(),'MELK-OF21');b.dom.window.close();});
test('Identity/reconnect/navigation/visibility invalidate stale naming dialog without storage writes',()=>{for(const reason of ['identity','generation','route','visibility']){const b=setup(),a=b.w.SmartEaseNativeName,d=b.w.document;a.enter();input(b,'Stale');const before=b.w.localStorage.getItem(key);if(reason==='identity')b.run('cartDevices[2].identity={id:"device-b",name:"B"}');if(reason==='generation')b.run('cartDevices[2].ownerLink.generation++');if(reason==='route')b.run('nativeAppState.screen="color"');if(reason==='visibility'){Object.defineProperty(d,'visibilityState',{value:'hidden',configurable:true});d.dispatchEvent(new b.w.Event('visibilitychange'));}else a.paint();assert.equal(d.getElementById('nnDialog').open,false,reason);assert.equal(a.save(),false);assert.equal(b.w.localStorage.getItem(key),before);b.dom.window.close();}});
test('Alias write preserves unknown metadata, scenes and other schemas; failed write rolls back map absence/existence',()=>{for(const old of [undefined,{version:1,note:'keep',devices:{'device-b':'Other'}}]){const data={version:1,scenes:[],requested:{extra:{keep:1}},custom:'keep',...(old?{deviceAliases:old}:{})};const b=setup({[key]:JSON.stringify(data)}),a=b.w.SmartEaseNativeName;a.enter();input(b,'Named');assert.equal(a.save(),true);assert.equal(b.run('of21Local.custom'),'keep');assert.equal(b.run('of21Local.requested.extra.keep'),1);if(old){assert.equal(b.run('of21Local.deviceAliases.note'),'keep');assert.equal(b.run('of21Local.deviceAliases.devices["device-b"]'),'Other');}const before=b.run('JSON.stringify(of21Local)'),disk=b.w.localStorage.getItem(key);a.enter();input(b,'Fail');b.w.Storage.prototype.setItem=()=>{throw Error('quota');};assert.equal(a.save(),false);assert.equal(b.run('JSON.stringify(of21Local)'),before);assert.equal(b.w.localStorage.getItem(key),disk);assert.match(b.w.document.getElementById('nnResult').textContent,/not saved/);b.dom.window.close();}const b=setup(),a=b.w.SmartEaseNativeName;a.enter();b.w.Storage.prototype.setItem=()=>{throw Error('quota');};input(b,'Fail first');assert.equal(a.save(),false);assert.equal(b.run('Object.hasOwn(of21Local,"deviceAliases")'),false);b.dom.window.close();});
test('Cross-tab storage changes and256UTF16 guard preserve data and draft with no truncation',()=>{const b=setup(),a=b.w.SmartEaseNativeName,d=b.w.document;a.enter();const long='🚙'.repeat(129);input(b,long);assert.equal(a.save(),false);assert.equal(d.getElementById('nnValue').value,long);assert.match(d.getElementById('nnResult').textContent,/256 UTF-16/);input(b,'🚙'.repeat(128));assert.equal(a.save(),true);a.enter();b.run('localStorage.setItem(of21LocalKey,JSON.stringify({...of21Local,external:"other tab"}));');const before=b.run('JSON.stringify(of21Local)'),disk=b.w.localStorage.getItem(key);input(b,'No overwrite');assert.equal(a.save(),false);assert.equal(b.run('JSON.stringify(of21Local)'),before);assert.equal(b.w.localStorage.getItem(key),disk);assert.equal(d.getElementById('nnValue').value,'No overwrite');b.dom.window.close();});
test('Actual Name route Back/Forward opens current alias, repeated confirm writes only once',async()=>{const b=boot(),a=b.w.SmartEaseNativeName,d=b.w.document;connect(b);b.run('go("native/nokins/settings")');b.run('nativeAppEnter("nokins/settings/name")');assert.equal(d.getElementById('nnDialog').open,true);input(b,'Cart lights');const back=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));d.getElementById('nnConfirm').click();d.getElementById('nnConfirm').click();await back;assert.equal(b.w.location.hash,'#native/nokins/settings');assert.equal(a.get(),'Cart lights');const forward=new Promise(r=>b.w.addEventListener('popstate',r,{once:true}));b.w.history.forward();await forward;assert.equal(b.w.location.hash,'#native/nokins/settings/name');assert.equal(d.getElementById('nnDialog').open,true);assert.equal(d.getElementById('nnValue').value,'Cart lights');assert.equal(b.errors.length,0);b.dom.window.close();});

test('IME composition Enter and legacy229 retain draft; ordinary Enter confirms once',()=>{const b=setup(),a=b.w.SmartEaseNativeName,d=b.w.document;let backs=0;b.w.SmartEaseNative.settingsBack=()=>backs++;a.enter();input(b,'灯り');const before=b.w.localStorage.getItem(key),field=d.getElementById('nnValue');for(const options of [{key:'Enter',isComposing:true},{key:'Enter',keyCode:229}]){const event=new b.w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,...options});field.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(field.value,'灯り');assert.equal(d.getElementById('nnDialog').open,true);assert.equal(b.w.localStorage.getItem(key),before);assert.equal(backs,0);}const enter=new b.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});field.dispatchEvent(enter);assert.equal(enter.defaultPrevented,true);assert.equal(a.get(),'灯り');assert.equal(d.getElementById('nnDialog').open,false);assert.equal(backs,1);assert.equal(b.errors.length,0);b.dom.window.close();});
