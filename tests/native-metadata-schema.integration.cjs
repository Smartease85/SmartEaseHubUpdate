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
  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}
const key='smartease-of21-native-v1';
const library=(fields={})=>({version:1,scenes:[],requested:{},...fields});
const metadata=(devices={})=>({version:1,devices});
test('Absent metadata remains absent; valid raw aliases/preferences/icons and unknown metadata are preserved',()=>{const plain=JSON.stringify(library()),a=boot({[key]:plain});assert.equal(a.w.localStorage.getItem(key),plain);assert.equal(a.run('Object.hasOwn(of21Local,"deviceAliases")'),false);a.dom.window.close();const value=library({unknown:{keep:1},deviceAliases:{...metadata({a:'',b:'  ',c:'🚙 <b>灯</b>'}),opaque:{keep:true}},menuStyles:metadata({a:0,b:1,c:2}),deviceIcons:metadata({a:'ic_symphony3_s',b:'ic_icons16'})}),raw=JSON.stringify(value,null,2),b=boot({[key]:raw});assert.equal(b.run('of21LocalLoadError'),'');assert.equal(b.run('JSON.stringify(of21Local)'),JSON.stringify(value));assert.equal(b.w.localStorage.getItem(key),raw);assert.equal(b.errors.length,0);b.dom.window.close();});
test('Every optional schema rejects malformed shape, reserved IDs and invalid values without rewriting raw startup bytes',()=>{const cases=[];for(const field of ['deviceAliases','menuStyles','deviceIcons']){for(const value of [null,[],{version:2,devices:{}},{version:1,devices:[]},{version:1}])cases.push({[field]:value});for(const id of ['', 'x'.repeat(257),'__proto__','constructor','prototype'])cases.push({[field]:metadata(JSON.parse(JSON.stringify({[id]:field==='deviceAliases'?'A':field==='menuStyles'?0:'ic_icons1'})))});}for(const entry of [null,1,'x'.repeat(257)])cases.push({deviceAliases:metadata({a:entry})});for(const entry of [-1,3,1.5,'1',null])cases.push({menuStyles:metadata({a:entry})});for(const entry of ['bad','https://example.test/icon.png',0,null])cases.push({deviceIcons:metadata({a:entry})});const b=boot();for(const fields of cases){b.w.probe=fields;assert.throws(()=>b.run('of21ValidateNativeMetadata(probe)'),JSON.stringify(fields));}b.dom.window.close();for(const fields of [{deviceAliases:metadata({constructor:'x'})},{menuStyles:metadata({a:3})},{deviceIcons:metadata({a:'bad'})}]){const raw=JSON.stringify(library(fields)),c=boot({[key]:raw});assert.match(c.run('of21LocalLoadError'),/preserved/);assert.equal(c.w.localStorage.getItem(key),raw);assert.equal(c.run('Object.hasOwn(of21Local,"'+Object.keys(fields)[0]+'")'),false);c.dom.window.close();}});
test('Metadata bounds are32 IDs,256 ID codeunits and256 raw alias codeunits; exact icon allowlist only',()=>{const b=boot();for(const field of ['deviceAliases','menuStyles','deviceIcons']){const entry=field==='deviceAliases'?'🚙'.repeat(128):field==='menuStyles'?2:'ic_icons1',devices=Object.fromEntries(Array.from({length:32},(_,i)=>['d'+i,entry]));b.w.probe={[field]:metadata(devices)};assert.doesNotThrow(()=>b.run('of21ValidateNativeMetadata(probe)'));devices.extra=entry;b.w.probe={[field]:metadata(devices)};assert.throws(()=>b.run('of21ValidateNativeMetadata(probe)'));b.w.probe={[field]:metadata({['x'.repeat(256)]:entry})};assert.doesNotThrow(()=>b.run('of21ValidateNativeMetadata(probe)'));}for(const r of b.w.SmartEaseNativeIconData){b.w.probe={deviceIcons:metadata({a:r.key})};assert.doesNotThrow(()=>b.run('of21ValidateNativeMetadata(probe)'));}assert.equal(b.w.SmartEaseNativeIconData.length,39);b.dom.window.close();});
test('Backup rejects invalid metadata before confirmation or any unrelated storage replacement',async()=>{const b=boot({[key]:JSON.stringify(library()),'smartease-experience-v1':'{"keep":true}'});let confirmations=0;b.w.confirm=()=>{confirmations++;return true;};for(const fields of [{deviceAliases:metadata({a:1})},{menuStyles:metadata({a:9})},{deviceIcons:metadata({a:'arbitrary'})}]){const before=b.w.localStorage.getItem(key),text=JSON.stringify({format:'smartease-cart-backup',version:1,values:{'smartease-experience-v1':'{"replace":true}',[key]:JSON.stringify(library(fields))}});b.w.backupProbe={size:text.length,text:async()=>text};await b.run('restoreBackup(backupProbe)');assert.equal(b.w.localStorage.getItem(key),before);assert.equal(b.w.localStorage.getItem('smartease-experience-v1'),'{"keep":true}');}assert.equal(confirmations,0);b.dom.window.close();});
test('Valid metadata backup reaches confirmation unchanged and declining leaves storage intact',async()=>{const b=boot({[key]:JSON.stringify(library())});let confirmations=0;b.w.confirm=()=>{confirmations++;return false;};const raw=JSON.stringify(library({deviceAliases:metadata({a:''}),menuStyles:{...metadata({a:2}),unknown:1},deviceIcons:metadata({a:'ic_icons1'})})),text=JSON.stringify({format:'smartease-cart-backup',version:1,values:{[key]:raw}}),before=b.w.localStorage.getItem(key);b.w.backupProbe={size:text.length,text:async()=>text};await b.run('restoreBackup(backupProbe)');assert.equal(confirmations,1);assert.equal(b.w.localStorage.getItem(key),before);b.dom.window.close();});
