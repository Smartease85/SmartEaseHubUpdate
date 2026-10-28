/* Development-only dependency: npm install jsdom; run with NODE_PATH configured. */
const { JSDOM, VirtualConsole } = require("jsdom");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
function boot(storage = {}) {
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
  for (const script of w.document.querySelectorAll("script")) {
    const source = script.src
      ? fs.readFileSync(path.join(root, path.basename(script.src)), "utf8")
      : script.textContent;
    vm.runInContext(source, ctx, { filename: script.src || "index.inline.js" });
  }
  return { dom, w, ctx, errors, run: (code) => vm.runInContext(code, ctx) };
}

test("display studio paints, edits animation, undoes changes and survives reload without touching BLE",()=>{
 const b=boot(),d=b.w.document;let writes=0;
 b.w.navigator.bluetooth={requestDevice:()=>{writes++;throw Error("No BLE in editor");}};
 d.getElementById("displayPaint").value="#ff0000";d.getElementById("displayPixel").click();
 assert.equal(b.run("displayCurrent().pixels[0]"),0xff0000);
 d.getElementById("displayCopyFrame").click();assert.equal(b.run("displayProject.programs[0].frames.length"),2);
 d.getElementById("displayClear").click();assert.equal(b.run("displayCurrent().pixels[0]"),0);
 d.getElementById("displayUndo").click();assert.equal(b.run("displayCurrent().pixels[0]"),0xff0000);
 d.getElementById("displayRedo").click();assert.equal(b.run("displayCurrent().pixels[0]"),0);
 d.getElementById("displayDuration").value="350";d.getElementById("displayDuration").dispatchEvent(new b.w.Event("change"));
 d.getElementById("displayAddProgram").click();d.getElementById("displayName").value="Night eyes";d.getElementById("displayName").dispatchEvent(new b.w.Event("change"));
 d.querySelector('[data-template="gaze"]').click();assert.equal(b.run("displayCurrent().pixels.some(Boolean)"),true);
 const values=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));
 assert.equal(writes,0);assert.equal(d.getElementById("displayUpload").disabled,true);assert.equal(b.errors.length,0);b.dom.window.close();
 const again=boot(values);assert.equal(again.run("displayProject.programs.length"),2);assert.equal(again.run("displayProject.programs[1].name"),"Night eyes");assert.equal(again.run("displayProject.programs[0].frames[1].duration"),350);again.dom.window.close();
});

test("display editor invalid imports and dimensions preserve the current picture and history",async()=>{
 const b=boot(),d=b.w.document;
 d.getElementById("displayFill").click();const before=b.run("JSON.stringify(displayProject)");
 d.getElementById("displayWidth").value="999";d.getElementById("displayResize").click();assert.equal(b.run("JSON.stringify(displayProject)"),before);
 Object.defineProperty(d.getElementById("displayImport"),"files",{value:[{size:20,text:async()=>'{"format":"unknown"}'}],configurable:true});
 await d.getElementById("displayImport").onchange();assert.equal(b.run("JSON.stringify(displayProject)"),before);
 assert.match(d.getElementById("displayStatus").textContent,/SmartEase display project/);
 Object.defineProperty(d.getElementById("displayImage"),"files",{value:[{size:20,type:"image/gif"}],configurable:true});
 await d.getElementById("displayImage").onchange();assert.match(d.getElementById("displayStatus").textContent,/GIF import is not supported/);
 d.getElementById("displayUndo").click();assert.equal(b.run("displayCurrent().pixels.some(Boolean)"),false);assert.equal(b.errors.length,0);b.dom.window.close();
});

test("display playlist stops on navigation and visibility changes and never enables upload for a named candidate",async()=>{
 const b=boot(),d=b.w.document;b.run('go("devices");nativeSelectDevice(2)');
 d.getElementById("displayPlay").click();assert.equal(b.run("displayPlaying"),true);
 b.run('go("home")');await new Promise(r=>setTimeout(r,0));assert.equal(b.run("displayPlaying"),false);
 b.run('go("devices");cartDevices[1].identity={name:"CoolLEDX",id:"candidate"};renderNativeLibrary()');
 assert.equal(d.getElementById("displayUpload").disabled,true);assert.equal(b.run("cartDevices[1].capabilities.pixelUpload"),false);
 d.getElementById("displayPlay").click();Object.defineProperty(d,"visibilityState",{value:"hidden",configurable:true});d.dispatchEvent(new b.w.Event("visibilitychange"));assert.equal(b.run("displayPlaying"),false);b.dom.window.close();
});

test("slow display JSON import cannot overwrite edits or a newer import and does not pollute undo",async()=>{
 const b=boot(),d=b.w.document,input=d.getElementById("displayImport"),D=require("../display-project.js");
 const choose=file=>Object.defineProperty(input,"files",{value:[file],configurable:true});
 const stale=D.create(8,8);stale.programs[0].name="Old slow import";let finish;
 choose({size:100,text:()=>new Promise(resolve=>{finish=resolve;})});const pending=input.onchange();
 d.getElementById("displayPaint").value="#ff0000";d.getElementById("displayFill").click();
 const edited=b.run("JSON.stringify(displayProject)"),history=b.run("displayUndo.length");
 finish(JSON.stringify(stale));await pending;
 assert.equal(b.run("JSON.stringify(displayProject)"),edited);assert.equal(b.run("displayUndo.length"),history);
 let finishOlder;choose({size:100,text:()=>new Promise(resolve=>{finishOlder=resolve;})});const older=input.onchange();
 const fresh=D.create(16,8);fresh.programs[0].name="New import";
 choose({size:100,text:async()=>JSON.stringify(fresh)});await input.onchange();
 finishOlder(JSON.stringify(stale));await older;
 assert.equal(b.run("displayProject.width"),16);assert.equal(b.run("displayProject.programs[0].name"),"New import");
 assert.equal(b.run("displayUndo.length"),history+1,"only the accepted import adds undo history");
 d.getElementById("displayUndo").click();assert.equal(b.run("JSON.stringify(displayProject)"),edited);
 d.getElementById("displayRedo").click();assert.equal(b.run("displayProject.programs[0].name"),"New import");
 let finishBeforeUndo;choose({size:100,text:()=>new Promise(resolve=>{finishBeforeUndo=resolve;})});const beforeUndo=input.onchange();
 d.getElementById("displayUndo").click();finishBeforeUndo(JSON.stringify(stale));await beforeUndo;
 assert.equal(b.run("JSON.stringify(displayProject)"),edited,"undo supersedes a pending import");
 assert.equal(b.errors.length,0);b.dom.window.close();
});

test("native device tabs support keyboard navigation, preserve workspace and stop hidden previews",async()=>{
 const b=boot(),d=b.w.document;b.run('go("devices")');assert.equal(d.getElementById("nativeWorkspace0").hidden,false);assert.equal(d.getElementById("displayStudio").hidden,true);
 d.getElementById("nativeDeviceTab2").click();assert.equal(d.getElementById("displayStudio").hidden,false);assert.equal(d.getElementById("nativeDeviceTab2").getAttribute("aria-selected"),"true");
 d.getElementById("displayPlay").click();assert.equal(b.run("displayPlaying"),true);
 d.getElementById("nativeDeviceTab2").dispatchEvent(new b.w.KeyboardEvent("keydown",{key:"ArrowLeft",bubbles:true}));
 assert.equal(d.getElementById("nativeWorkspace1").hidden,false);assert.equal(b.run("displayPlaying"),false);assert.equal(d.activeElement.id,"nativeDeviceTab1");
 const values=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));b.dom.window.close();const again=boot(values);assert.equal(again.w.document.getElementById("nativeWorkspace1").hidden,false);again.dom.window.close();
});

test("native SP608E editor sends calibrated packets only to explicitly selected outputs",async()=>{
 const b=boot({"smartease-haunted-rgb-fix-v1":'{"2":["r","g","b"]}',"smartease-sp608e-rgb-balance-v1":'{"2":[100,50,100]}'}),d=b.w.document;
 b.run('enterDemo();globalThis.nativePackets=[];spEnsureChipColors=async(outputs)=>{globalThis.nativePorts=[...outputs];spChipRecord(2);spChipApplied[2]={session:bleSession,order:0};return true};enqueuePackets=async(jobs,label,options)=>{if(options?.guard&&!options.guard())return false;globalThis.nativePackets.push(...(typeof jobs[0]==="number"?[jobs]:jobs));return true}');
 for(const input of d.querySelectorAll("[data-native-output]"))input.checked=input.dataset.nativeOutput==="2";
 assert.equal(await b.run('nativeSpSend("apply")'),false);assert.equal(b.run("nativePackets.length"),0);
 d.getElementById("nativeSpParked").checked=true;d.getElementById("nativeSpColor").value="#a24aec";d.getElementById("nativeSpBrightness").value="30";
 assert.equal(await b.run('nativeSpSend("apply")'),true);
 assert.equal(b.run("JSON.stringify(nativePorts)"),"[2]");
 assert.equal(b.run("JSON.stringify(nativePackets)"),JSON.stringify([[136,131,2,2,25],[136,133,2,2,77],[136,130,2,2,1],[136,137,5,2,162,37,236,255]]));
 assert.equal(b.w.localStorage.getItem("smartease-golf-cart-zones-v2"),null);assert.equal(b.errors.length,0);b.dom.window.close();
});

test("native SP Apply restores per-output calibrated RGB after firmware resets color on power-on",async()=>{
 const b=boot({"smartease-haunted-rgb-fix-v1":'{"2":["b","r","g"],"5":["r","g","b"]}',"smartease-sp608e-rgb-balance-v1":'{"2":[100,50,100],"5":[50,100,100]}'}),d=b.w.document;
 b.run(`enterDemo();
  globalThis.nativeResetWrites=[];
  globalThis.nativeHardware=Array.from({length:8},()=>({power:false,color:[9,9,9],effect:25,order:0}));
  enqueuePackets=async(jobs,label,options)=>{
   for(const bytes of (typeof jobs[0]==="number"?[jobs]:jobs)){
    if(options?.guard&&!options.guard())return false;
    nativeResetWrites.push([...bytes]);
    const [,opcode,,mask,...args]=bytes;
    for(const index of indexes(mask)){
     const output=nativeHardware[index];
     if(opcode===0x82){output.power=!!args[0];if(output.power)output.color=[9,9,9];}
     if(opcode===0x83)output.effect=args[0];
     if(opcode===0x84)output.order=args[0];
     if(opcode===0x89)output.color=args.slice(0,3);
    }
   }return true;
  }`);
 for(const input of d.querySelectorAll("[data-native-output]"))input.checked=["2","5"].includes(input.dataset.nativeOutput);
 d.getElementById("nativeSpParked").checked=true;d.getElementById("nativeSpColor").value="#a24aec";
 for(const effect of [25,7,102,1]){
  b.run("nativeResetWrites=[]");d.getElementById("nativeSpEffect").value=String(effect);
  const untouched=b.run("JSON.stringify(nativeHardware.filter((_,i)=>![1,4].includes(i)))");
  assert.equal(await b.run('nativeSpSend("apply")'),true);
  assert.equal(b.run("JSON.stringify(nativeHardware.filter((_,i)=>![1,4].includes(i)))"),untouched,"unselected outputs remain intact");
  assert.equal(b.run("nativeHardware[1].order"),4,"saved BRG chip calibration is retained");
  assert.equal(b.run("nativeHardware[4].order"),0);
  if(effect===1){assert.equal(b.run("nativeResetWrites.some(p=>p[1]===0x89)"),false,"factory palette must not receive user RGB");continue;}
  assert.equal(b.run("JSON.stringify(nativeHardware[1].color)"),"[162,37,236]","output 2 retains its own RGB balance after reset");
  assert.equal(b.run("JSON.stringify(nativeHardware[4].color)"),"[81,74,236]","output 5 retains its independent balance");
  assert.equal(b.run("nativeHardware[1].power&&nativeHardware[4].power"),true);
  assert.equal(b.run("nativeResetWrites.filter(p=>p[1]===0x89).every(p=>nativeResetWrites.indexOf(p)>nativeResetWrites.findLastIndex(x=>x[1]===0x82))"),true);
 }
 assert.equal(b.errors.length,0);b.dom.window.close();
});

test("native SP608E queued settings cancel when a new scene takes over",async()=>{
 const b=boot(),d=b.w.document;
 b.run('enterDemo();globalThis.nativePackets=[];spEnsureChipColors=async()=>{applyGeneration++;return true};enqueuePackets=async(jobs,label,opts)=>{if(!opts.guard())return false;nativePackets.push(...jobs);return true}');
 d.getElementById("nativeSpParked").checked=true;
 assert.equal(await b.run('nativeSpSend("apply")'),false);assert.equal(b.run("nativePackets.length"),0);assert.equal(b.run("nativeSpBusy"),false);b.dom.window.close();
});

test("native SP608E global recall requires explicit whole-controller confirmation",async()=>{
 const b=boot(),d=b.w.document;let confirmations=0;b.w.confirm=message=>{confirmations++;assert.match(message,/all eight/);return false;};
 b.run('enterDemo();globalThis.recalls=0;recallScene=async()=>{recalls++;return true}');d.getElementById("nativeSpParked").checked=true;
 assert.equal(await b.run('nativeSpSend("recall")'),false);assert.equal(b.run("recalls"),0);assert.equal(confirmations,1);b.dom.window.close();
});

test("native Lotus solid control keeps OF21 blocked and uses existing exact-profile packets",async()=>{
 const b=boot(),d=b.w.document;installLotusMock(b);await b.run("cartDevices[2].connect()");
 assert.equal(await b.run("nativeLotusSolid(true)"),false);assert.equal(b.run("lotusWrites.length"),0);
 d.getElementById("nativeLotusParked").checked=true;d.getElementById("nativeLotusColor").value="#ff751e";d.getElementById("nativeLotusBrightness").value="33";
 assert.equal(await b.run("nativeLotusSolid(true)"),true);assert.equal(b.run("JSON.stringify(lotusWrites[1])"),"[126,7,5,3,255,117,30,16,239]");
 b.run('cartDevices[2].profile=null;cartDevices[2].identity={name:"MELK-OF21 1D"}');const count=b.run("lotusWrites.length");assert.equal(await b.run("nativeLotusSolid(true)"),false);assert.equal(b.run("lotusWrites.length"),count);b.dom.window.close();
});

test("full backup validation accepts display projects and rejects invalid project content before writes",async()=>{
 const b=boot(),values={"smartease-display-project-v1":JSON.stringify(require("../display-project.js").create(8,8)),"smartease-sp608e-rgb-balance-v1":'{"2":[100,50,100]}'};
 const invalid=JSON.parse(values["smartease-display-project-v1"]);invalid.programs[0].frames[0].pixels=[];
 const bad={...values,"smartease-display-project-v1":JSON.stringify(invalid)};let confirmations=0;b.w.confirm=()=>{confirmations++;return false;};
 b.w.badBackup={size:500,text:async()=>JSON.stringify({format:"smartease-cart-backup",version:1,values:bad})};
 await b.run("restoreBackup(badBackup)");assert.equal(confirmations,0);assert.equal(b.w.localStorage.getItem("smartease-display-project-v1"),null);
 b.w.goodBackup={size:500,text:async()=>JSON.stringify({format:"smartease-cart-backup",version:1,values})};
 await b.run("restoreBackup(goodBackup)");assert.equal(confirmations,1,"valid project reaches explicit restore confirmation");assert.equal(b.w.localStorage.getItem("smartease-display-project-v1"),null,"declining leaves storage intact");b.dom.window.close();
});
test("real SmartEase house logo replaces placeholder S in header and installed icons", () => {
 const b=boot();
 const brand=b.w.document.querySelector("#app .wordmark .brand-symbol");
 assert.ok(brand && brand.tagName==="IMG", "consumer wordmark must show supplied vector logo");
 assert.equal(brand.getAttribute("src"),"smartease-logo.svg");
 assert.equal(brand.getAttribute("alt"),"", "wordmark already has accessible SmartEase text");
 const legacy=b.w.document.querySelector(".shell .identity .mark img");
 assert.ok(legacy, "advanced header must show the same logo");
 assert.equal(legacy.getAttribute("src"),"smartease-logo.svg");
 assert.equal(b.w.document.querySelector('link[rel="icon"]').getAttribute("href"),"icon.svg");
 assert.equal(b.w.document.querySelector('link[rel="apple-touch-icon"]').getAttribute("href"),"icon-192.png");
 for(const file of ["smartease-logo.svg","icon.svg"]){
   const svg=fs.readFileSync(path.join(root,file),"utf8");
   assert.match(svg,/<svg/);
   assert.match(svg,/fill="#00FFFF"/);
   assert.match(svg,/fill-rule="evenodd"/);
   assert.doesNotMatch(svg,/M350 122H210/,"no old S icon remains");
 }
 for(const file of ["icon-192.png","icon-512.png"]){
   const buf=fs.readFileSync(path.join(root,file));
   assert.deepEqual([...buf.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("gradient chase lab remembers palettes, speed and canopy reversal without transmitting on load", () => {
 const b=boot();
 const card=b.w.document.getElementById("gradientChaseLab");
 assert.ok(card);
 assert.equal(b.w.document.querySelector('[data-page="scenes"]').hidden,true);
 assert.equal(b.w.document.getElementById("gradientColorFront").value,"#46ef77");
 assert.equal(b.w.document.getElementById("gradientColorCanopy").value,"#a24aec");
 assert.equal(b.w.document.getElementById("gradientColorRear").value,"#ff751e");
 assert.equal(b.w.document.getElementById("gradientReverseCanopy").checked,true);
 assert.equal(b.w.document.getElementById("gradientParked").checked,false,"safety acknowledgment never persisted");
 b.w.document.getElementById("gradientColorRear").value="#ff9933";
 b.w.document.getElementById("gradientColorRear").dispatchEvent(new b.w.Event("input"));
 const reverse=b.w.document.getElementById("gradientReverseCanopy");
 reverse.checked=false;reverse.dispatchEvent(new b.w.Event("input"));
 b.w.document.getElementById("gradientNativeSpeed").value="8";
 b.w.document.getElementById("gradientNativeSpeed").dispatchEvent(new b.w.Event("input"));
 assert.equal(b.run("preferences.gradientChase.colors[2]"),"#ff9933");
 assert.equal(b.run("preferences.gradientChase.reverseCanopy"),false);
 assert.equal(b.run("preferences.gradientChase.speed"),8);
 assert.equal(b.w.document.getElementById("gradientLiveStop").disabled,true);
 const store=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));
 b.dom.window.close();
 const again=boot(store);
 assert.equal(again.w.document.getElementById("gradientColorRear").value,"#ff9933");
 assert.equal(again.w.document.getElementById("gradientReverseCanopy").checked,false);
 assert.equal(again.w.document.getElementById("gradientParked").checked,false);
 assert.equal(again.w.document.getElementById("gradientNativeSpeed").value,"8");
 assert.equal(again.errors.length,0);
 again.dom.window.close();
});
test("gradient chase refuses unsafe or disconnected starts with zero controller writes", async () => {
 const b=boot();
 let sent=0;
 b.run('cartDevices[0].apply=async()=>{globalThis.writesSent=(globalThis.writesSent||0)+1;return true;}');
 assert.equal(await b.run("gradientRunNative()"),false,"requires explicit parked agreement");
 assert.equal(await b.run("startGradientLive(1)"),false);
 b.w.document.getElementById("gradientParked").checked=true;
 assert.equal(await b.run("gradientRunNative()"),false,"requires real or demo SP608E connection");
 assert.equal(b.run("globalThis.writesSent||0"),0);
 assert.equal(b.w.localStorage.getItem("smartease-golf-cart-zones-v2"),null,"no scenes saved by test");
 b.dom.window.close();
});
test("native chase writes calibrated five-zone colors and only documented per-output direction packets", async () => {
 const b=boot();
 b.run("enterDemo()");
 b.w.document.getElementById("gradientParked").checked=true;
 b.run('cartDevices[0].apply=async(rows)=>{globalThis.appliedGradientRows=rows;return true;};enqueuePackets=async(jobs)=>{globalThis.nativeGradientDir=jobs;return true;};');
 assert.equal(await b.run("gradientRunNative()"),true);
 assert.equal(b.run('appliedGradientRows["front-bumper"].color'),"#46ef77");
 assert.equal(b.run('appliedGradientRows.canopy.color'),"#a24aec");
 assert.equal(b.run('appliedGradientRows["rear-bumper"].color'),"#ff751e");
 assert.equal(b.run('appliedGradientRows["left-under"].color'),b.run('appliedGradientRows["right-under"].color'));
 assert.equal(b.run('Object.values(appliedGradientRows).every(r=>r.effect===7)'),true);
 assert.deepEqual(JSON.parse(b.run('JSON.stringify(nativeGradientDir)')),[
  [136,138,2,1,1],[136,138,2,16,0],[136,138,2,2,1],
  [136,138,2,4,1],[136,138,2,8,1]
 ]);
 assert.equal(b.run("czState.scenes.length"),0,"test cannot overwrite saved scenes");
 assert.equal(b.w.document.getElementById("gradientNativeRun").disabled,false);
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("canopy direction test sends exactly one mapped 0x8a packet, and toggle can restore forward", async () => {
 const b=boot();
 b.run("enterDemo()");
 const parked=b.w.document.getElementById("gradientParked");
 assert.equal(await b.run("gradientFlipCanopy()"),false);
 parked.checked=true;
 b.run('enqueuePackets=async(jobs)=>{globalThis.canopyDirectionJobs=jobs;return true;}');
 assert.equal(await b.run("gradientFlipCanopy()"),true);
 assert.deepEqual(JSON.parse(b.run('JSON.stringify(canopyDirectionJobs)')),[ [136,138,2,16,0] ]);
 const reverse=b.w.document.getElementById("gradientReverseCanopy");
 reverse.checked=false;reverse.dispatchEvent(new b.w.Event("input"));
 assert.equal(await b.run("gradientFlipCanopy()"),true);
 assert.deepEqual(JSON.parse(b.run('JSON.stringify(canopyDirectionJobs)')),[ [136,138,2,16,1] ]);
 assert.equal(b.run("czState.scenes.length"),0);
 b.dom.window.close();
});
test("traveling gradient sweeps front canopy both undercarriages rear; completes without saving firmware scenes", async () => {
 const b=boot();
 b.run("enterDemo()");
 b.w.document.getElementById("gradientParked").checked=true;
 b.run('cartDevices[0].apply=async(rows)=>{globalThis.initialSweepRows=rows;return true;};enqueuePackets=async(jobs,label)=>{(globalThis.gradientFrames??=[]).push({jobs,label});return true;};');
 assert.equal(await b.run("startGradientLive(1,0)"),true);
 assert.equal(b.run("gradientFrames.length"),36,"one cycle is three colors times four groups times three fades");
 const packets=JSON.parse(b.run("JSON.stringify(gradientFrames.map(item=>item.jobs))"));
 assert.deepEqual(packets.slice(0,4).map(jobs=>jobs.map(pkt=>pkt[3])),[[1],[1],[1],[16]]);
 assert.deepEqual(packets.slice(6,9).map(jobs=>jobs.map(pkt=>pkt[3])),[[2,4],[2,4],[2,4]]);
 assert.equal(b.run('initialSweepRows["front-bumper"].effect'),25,"traveling sweep needs steady colors not native chase");
 assert.ok(packets.flat().every(pkt=>pkt[1]===0x89),"only mapped colors are updated after initialization");
 assert.equal(b.w.document.getElementById("gradientLiveStop").disabled,true);
 assert.equal(b.w.document.getElementById("stopShow").hidden,true);
 assert.equal(b.run("czState.scenes.length"),0);
 b.dom.window.close();
});
test("full app boots with unique IDs and no runtime errors", () => {
  const b = boot();
  const ids = [...b.w.document.querySelectorAll("[id]")].map((e) => e.id);
  assert.equal(
    new Set(ids).size,
    ids.length,
    "duplicate IDs must not shadow retained controls",
  );
  assert.equal(b.errors.length, 0);
  assert.equal(
    b.w.document.getElementById("connectionText").textContent,
    "Disconnected",
  );
  assert.equal(
    b.w.document.querySelectorAll("#favoriteScenes .scene-tile").length,
    4,
  );
  b.dom.window.close();
});
test("create, favorite, reload: existing mapping/calibration and scene storage survive", () => {
  const b = boot({ "smartease-haunted-rgb-fix-v1": '{"1":["g","r","b"]}' });
  b.w.document.querySelector('[data-go="create"]').click();
  b.w.document.getElementById("sceneName").value = "My Halloween ride";
  b.w.document.getElementById("gradientFront").value = "#ff751e";
  b.w.document.getElementById("gradientRear").value = "#a24aec";
  b.w.document.getElementById("blendGradient").click();
  b.w.document.getElementById("saveDesign").click();
  assert.equal(b.run("czState.scenes.at(-1).name"), "My Halloween ride");
  assert.equal(
    b.run('czState.scenes.at(-1).rows["front-bumper"].color'),
    "#ff751e",
  );
  const values = Object.fromEntries(
    Object.keys(b.w.localStorage).map((k) => [k, b.w.localStorage.getItem(k)]),
  );
  b.dom.window.close();
  const again = boot(values);
  assert.equal(again.run("czState.scenes.at(-1).name"), "My Halloween ride");
  assert.equal(
    again.w.localStorage.getItem("smartease-haunted-rgb-fix-v1"),
    '{"1":["g","r","b"]}',
  );
  assert.equal(
    again.w.document.querySelectorAll("#favoriteScenes .scene-tile").length,
    5,
  );
  again.dom.window.close();
});
test("built-in Halloween exposes one-tap edit and three RGB groups; Save creates a durable personal copy", () => {
 const b=boot({
   "smartease-haunted-rgb-fix-v1":'{"1":["b","r","g"]}',
   "smartease-sp608e-rgb-balance-v1":'{"1":[100,42,0]}'
 });
 const halloween=b.run('E.presets.find(scene=>scene.id==="haunted")');
 const old=JSON.parse(b.run('JSON.stringify(E.presets[0].rows)'));
 const tile=b.w.document.querySelector("#allScenes .scene-tile");
 assert.match(tile.querySelector(".scene-copy strong").textContent,/Haunted Surge/);
 const edit=tile.querySelector(".edit-scene");
 assert.ok(edit,"a factory scene must have an accessible edit button");
 edit.click();
 assert.equal(b.w.document.querySelector('[data-page="create"]').hidden,false);
 assert.equal(b.w.document.getElementById("sceneName").value,"My Haunted Surge");
 assert.equal(b.w.document.querySelectorAll(".scene-palette-choice").length,3,"Halloween should group three actual shades");
 const options=b.w.document.querySelectorAll(".scene-palette-choice");
 options[1].click();
 assert.equal(b.w.document.getElementById("scenePaletteHex").textContent,"#A24AEC");
 assert.equal(b.run('designerPaletteActive().ids.length'),3);
 const green=b.w.document.getElementById("scenePaletteG");
 green.value="30";green.dispatchEvent(new b.w.Event("input"));
 const purple=b.run('draft.canopy.color');
 assert.equal(purple,"#a21eec");
 assert.equal(b.run('draft["left-under"].color'),purple);
 assert.equal(b.run('draft["right-under"].color'),purple);
 assert.equal(b.run('draft["front-bumper"].color'),"#46ef77");
 assert.equal(b.run('draft["rear-bumper"].color'),"#ff751e");
 b.w.document.getElementById("saveDesign").click();
 assert.equal(b.run("czState.scenes.length"),1);
 const newId=b.run("czState.scenes[0].id");
 assert.match(newId,/^cart-/);
 assert.equal(b.run("czState.scenes[0].name"),"My Haunted Surge");
 assert.equal(b.run('czState.scenes[0].rows.canopy.color'),purple);
 assert.equal(b.run('E.presets[0].rows.canopy.color'),"#a24aec","factory preset must not change");
 assert.equal(b.run('E.presets[0].id'),"haunted");
 assert.equal(b.w.localStorage.getItem("smartease-haunted-rgb-fix-v1"),'{"1":["b","r","g"]}');
 assert.equal(b.w.localStorage.getItem("smartease-sp608e-rgb-balance-v1"),'{"1":[100,42,0]}');
 const current=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));
 b.dom.window.close();
 const later=boot(current);
 assert.equal(later.run("czState.scenes.length"),1);
 assert.equal(later.run("czState.scenes[0].id"),newId);
 assert.equal(later.run('czState.scenes[0].rows.canopy.color'),purple);
 assert.equal(later.run('E.presets[0].rows.canopy.color'),"#a24aec");
 assert.equal(later.run("sceneById('haunted').id"),"haunted");
 assert.equal(later.errors.length,0);
 later.dom.window.close();
});
test("holding a scene edits it without accidentally playing; tapping still plays", async () => {
 const b=boot();
 b.w.document.querySelector('[data-go="scenes"]').click();
 const first=b.w.document.querySelector('#allScenes .scene-tile button.scene-main');
 assert.ok(first);
 first.dispatchEvent(new b.w.MouseEvent("pointerdown",{bubbles:true,button:0,clientX:25,clientY:60}));
 await new Promise(resolve=>setTimeout(resolve,610));
 assert.equal(b.w.document.querySelector('[data-page="create"]').hidden,false);
 assert.equal(b.w.document.getElementById("sceneName").value,"My Haunted Surge");
 first.click();
 assert.equal(b.run("activeScene===null"),true,"synthetic followup click must not play after hold");
 assert.equal(b.errors.length,0);
 b.dom.window.close();
 const tap=boot();
 tap.w.document.querySelector('[data-go="scenes"]').click();
 tap.w.document.querySelector('#allScenes .scene-tile button.scene-main').click();
 assert.equal(tap.run("activeScene.id"),"haunted","short tap must still play/preview");
 tap.dom.window.close();
});
test("dragging to scroll cancels scene long press, but holding favorite edits it", async () => {
 const b=boot();
 b.w.document.querySelector('[data-go="scenes"]').click();
 const main=b.w.document.querySelector("#allScenes .scene-tile .scene-main");
 main.dispatchEvent(new b.w.MouseEvent("pointerdown",{bubbles:true,button:0,clientX:20,clientY:40}));
 main.dispatchEvent(new b.w.MouseEvent("pointermove",{bubbles:true,clientX:20,clientY:70}));
 await new Promise(resolve=>setTimeout(resolve,600));
 assert.equal(b.w.document.querySelector('[data-page="scenes"]').hidden,false,"scroll must cancel editor");
 b.w.document.querySelector('[data-go="home"]').click();
 const favorite=b.w.document.querySelector("#quickFavorites .quick-scene");
 favorite.dispatchEvent(new b.w.MouseEvent("pointerdown",{bubbles:true,button:0,clientX:10,clientY:10}));
 await new Promise(resolve=>setTimeout(resolve,590));
 assert.equal(b.w.document.querySelector('[data-page="create"]').hidden,false);
 assert.equal(b.w.document.getElementById("sceneName").value,"My Haunted Surge");
 b.dom.window.close();
});
test("editing an existing saved scene keeps its ID and updates that scene instead of duplicating", () => {
 const b=boot();
 b.w.document.querySelector("#allScenes .scene-tile .edit-scene").click();
 b.w.document.getElementById("saveDesign").click();
 assert.equal(b.run("czState.scenes.length"),1);
 const originalId=b.run("czState.scenes[0].id");
 b.w.document.querySelector('[data-go="scenes"]').click();
 const saved=b.w.document.querySelector("#allScenes .scene-tile.saved-tile");
 assert.ok(saved);
 saved.querySelector(".edit-scene").click();
 assert.equal(b.run("editingSceneId"),originalId);
 const picker=b.w.document.getElementById("scenePaletteR");
 picker.value="221";picker.dispatchEvent(new b.w.Event("input"));
 const expected=b.run('draft["front-bumper"].color');
 b.w.document.getElementById("saveDesign").click();
 assert.equal(b.run("czState.scenes.length"),1);
 assert.equal(b.run("czState.scenes[0].id"),originalId);
 assert.equal(b.run('czState.scenes[0].rows["front-bumper"].color'),expected);
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("scene palette color test writes the saved calibrated shade only to selected mapped outputs", async () => {
 const b=boot({
   "smartease-haunted-rgb-fix-v1":'{"2":["b","r","g"]}',
   "smartease-sp608e-chip-orders-v1":'{"2":{"observed":["b","r","g"],"baseline":0,"target":4}}',
   "smartease-sp608e-rgb-balance-v1":'{"2":[100,50,100]}'
 });
 b.w.document.querySelector("#allScenes .scene-tile .edit-scene").click();
 b.w.document.querySelectorAll(".scene-palette-choice")[1].click();
 b.run('isLive=()=>true;spEnsureChipColors=async(outputs)=>{globalThis.rgbTestTargets=[...outputs];return true;};enqueuePackets=async(jobs)=>{globalThis.rgbTestWrites=jobs;return true;};');
 assert.equal(await b.run("designerPaletteTest()"),true);
 assert.deepEqual(JSON.parse(b.run("JSON.stringify(rgbTestTargets)")),[2,3,5]);
 assert.equal(b.run("rgbTestWrites.length"),12);
 assert.deepEqual(JSON.parse(b.run("JSON.stringify(rgbTestWrites[3])")),[136,137,5,2,162,37,236,255]);
 assert.deepEqual(JSON.parse(b.run("JSON.stringify(rgbTestWrites[7])")),[136,137,5,4,162,74,236,255]);
 assert.equal(b.run("czState.scenes.length"),0,"testing a color must not auto-save scenes");
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("preview scene applies mapped zones and power off cancels the pending scene", async () => {
  const b = boot();
  b.run("enterDemo()");
  const done = b.run("applyScene(E.presets[1])");
  await new Promise((r) => setTimeout(r, 100));
  await b.run("lightsOff()");
  await done;
  assert.equal(b.run("channels.slice(0,5).every(c=>!c.power)"), true);
  assert.equal(b.run("applying"), false);
  assert.equal(b.run("channels[5].color"), b.run("COLORS[5]"));
  b.dom.window.close();
});
test("Devil Eyes read-only inspection identifies FFF0/FFF1 without reading or writing LED data", async () => {
 const b=boot();
 let gattConnects=0,gattDisconnects=0,infoReads=0,writes=0,requested=null;
 const mock={
  id:"devil-led-1",name:"CoolLEDUX-DEVIL",
  gatt:{
   connected:false,
   connect:async function(){
    gattConnects++;this.connected=true;
    return {getPrimaryService:async id=>{
      assert.equal(id,"0000fff0-0000-1000-8000-00805f9b34fb");
      return {getCharacteristics:async()=>[{
        uuid:"0000fff1-0000-1000-8000-00805f9b34fb",
        properties:{notify:true,writeWithoutResponse:true,read:false,write:false},
        readValue:async()=>{infoReads++;throw Error("Read forbidden");},
        writeValueWithoutResponse:async()=>{writes++;throw Error("Write forbidden");}
      }]};
    }};
   },
   disconnect:function(){gattDisconnects++;this.connected=false;}
  }
 };
 b.w.navigator.bluetooth={requestDevice:async options=>{requested=options;return mock;}};
 await b.run("cartDevices[1].identify()");
 assert.ok(requested.optionalServices.includes("0000fff0-0000-1000-8000-00805f9b34fb"));
 assert.equal(gattConnects,0,"Identify alone must not connect");
 const report=await b.run("cartDevices[1].inspectCoolLedProtocol()");
 assert.equal(report.name,"CoolLEDUX-DEVIL");
 assert.equal(report.family,"CoolLEDUX candidate");
 assert.equal(report.serviceFound,true);
 assert.equal(report.characteristics.length,1);
 assert.equal(report.characteristics[0].writeWithoutResponse,true);
 assert.equal(report.writesSent,0);
 assert.equal(infoReads,0);
 assert.equal(writes,0);
 assert.equal(gattConnects,1);
 assert.equal(gattDisconnects,1,"Inspection must release the GATT connection");
 b.run("renderDevices()");
 assert.match(b.w.document.getElementById("devilEyesProtocolReport").value,/CoolLEDUX candidate/);
 assert.match(b.w.document.getElementById("devilEyesProtocolReport").value,/fff1/);
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("Devil Eyes missing FFF0 remains identify-only with zero writes", async () => {
 const b=boot();
 let disconnects=0;
 b.w.navigator.bluetooth={requestDevice:async()=>({
  name:"Unknown Eyes",id:"x",gatt:{
   connected:false,
   connect:async function(){this.connected=true;return {getPrimaryService:async()=>{throw Error("Service not found");}};},
   disconnect:function(){disconnects++;this.connected=false;}
  }
 })};
 await b.run("cartDevices[1].identify()");
 const report=await b.run("cartDevices[1].inspectCoolLedProtocol()");
 assert.equal(report.serviceFound,false);
 assert.equal(report.family,"Family unknown");
 assert.equal(report.characteristics.length,0);
 assert.equal(disconnects,1);
 assert.equal(b.run("cartDevices[1].capabilities.pixelUpload"),false);
 b.dom.window.close();
});
test("TRINKA identifies without GATT writes; unknown Lotus model never connects", async () => {
  const b = boot();
  let gattCalls = 0;
  b.w.navigator.bluetooth = {
    requestDevice: async () => ({
      id: "test-display",
      name: "Example display",
      gatt: {
        connect() {
          gattCalls++;
        },
        disconnect() {},
      },
    }),
  };
  const identity = await b.run("cartDevices[1].identify()");
  assert.equal(identity.name, "Example display");
  assert.equal(b.run("cartDevices[1].capabilities.scenes"), false);
  await assert.rejects(
    () => b.run("cartDevices[2].connect()"),
    /still needs setup/,
  );
  assert.equal(gattCalls, 0);
  assert.equal(b.run("cartDevices[2].connected"), false);
  b.dom.window.close();
});
function installLotusMock(b, name = "ELK-BLEDOB") {
  b.run(
    `globalThis.lotusWrites=[];globalThis.mockLotus=new EventTarget();mockLotus.name=${JSON.stringify(name)};mockLotus.id='lotus-test';globalThis.lotusConnects=0;mockLotus.gatt={connected:false,connect:async()=>{lotusConnects++;mockLotus.gatt.connected=true;return {getPrimaryService:async uuid=>{if(uuid!=='0000fff0-0000-1000-8000-00805f9b34fb')throw Error('unexpected service');return {getCharacteristic:async id=>{if(id!=='0000fff3-0000-1000-8000-00805f9b34fb')throw Error('unexpected characteristic');return {properties:{writeWithoutResponse:true},writeValueWithoutResponse:async bytes=>lotusWrites.push(Array.from(bytes))};}};}};},disconnect:()=>{mockLotus.gatt.connected=false;mockLotus.dispatchEvent(new Event('gattserverdisconnected'));}};navigator.bluetooth={requestDevice:async()=>mockLotus};`,
  );
}
test("NOKINS on-cart test is gated by connection and parked acknowledgment and leaves SP608E untouched", async () => {
 const b=boot();
 const red=b.w.document.getElementById("nokinsTestRed");
 assert.equal(red.disabled,true,"never test before identification");
 installLotusMock(b,"ELK-BLEDOB");
 await b.run("cartDevices[2].connect()");
 b.run("renderDevices()");
 assert.equal(red.disabled,true,"connected alone cannot write");
 assert.equal(b.run("lotusWrites.length"),0,"connecting must not actuate lights");
 const parked=b.w.document.getElementById("nokinsParked");
 parked.checked=true;parked.dispatchEvent(new b.w.Event("change"));
 assert.equal(red.disabled,false);
 assert.equal(await b.run('testNokinsColor("#ff0000","red")'),true);
 assert.equal(b.run("lotusWrites.length"),3);
 assert.deepEqual(JSON.parse(b.run("JSON.stringify(lotusWrites[1])")),[126,7,5,3,255,0,0,16,239]);
 assert.equal(b.run("cartDevices[2].sceneEnabled"),false,"scene following remains opt-in");
 assert.equal(b.run("czState.scenes.length"),0);
 assert.equal(b.run("isLive()"),false,"NOKINS test never connects SP608E");
 assert.match(b.w.document.getElementById("nokinsTestResult").textContent,/Sent red/);
 b.run("cartDevices[2].disconnect()");
 b.run("renderDevices()");
 assert.equal(red.disabled,true);
 assert.equal(parked.checked,false);
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("unknown Lotus controller identity cannot activate NOKINS RGB test buttons", async () => {
 const b=boot();
 installLotusMock(b,"UNVERIFIED-NOKINS-RGB");
 await assert.rejects(()=>b.run("cartDevices[2].connect()"),/still needs setup/);
 b.run("renderDevices()");
 assert.match(b.w.document.getElementById("nokinsControllerInfo").textContent,/UNVERIFIED-NOKINS-RGB/);
 assert.match(b.w.document.getElementById("nokinsControllerInfo").textContent,/No RGB commands will be sent/);
 b.w.document.getElementById("nokinsParked").checked=true;
 b.w.document.getElementById("nokinsParked").dispatchEvent(new b.w.Event("change"));
 assert.equal(b.w.document.getElementById("nokinsTestRed").disabled,true);
 assert.equal(await b.run('testNokinsColor("#ff0000","red")'),false);
 assert.equal(b.run("lotusWrites.length"),0);
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("individual-device library exposes SP608E advanced control and gates MELK effects", async () => {
 const b=boot();
 const box=b.w.document.getElementById("nativeControllerLibrary");
 assert.ok(box,"Devices must provide a discoverable original-function panel");
 assert.equal(b.w.document.getElementById("nativeLotusMode").options.length,47);
 assert.equal(b.w.document.getElementById("nativeLotusApply").disabled,true);
 assert.equal(b.w.document.getElementById("nativeLotusParked").checked,false);
 b.w.document.getElementById("nativeSpEffects").click();
 assert.equal(b.w.document.body.classList.contains("advanced-open"),true);
 assert.equal(b.w.document.getElementById("tab-effects").getAttribute("aria-hidden"),"false");
 b.w.document.getElementById("nativeSpScenes").click();
 assert.equal(b.w.document.getElementById("tab-scenes").getAttribute("aria-hidden"),"false");
 const categories=b.w.document.getElementById("nativeLotusCategory");
 categories.value="flow";categories.dispatchEvent(new b.w.Event("change"));
 assert.equal(b.w.document.getElementById("nativeLotusMode").options.length,24);
 assert.equal(b.w.document.getElementById("nativeLotusMode").value,"143");
 const mode=b.w.document.getElementById("nativeLotusMode");
 mode.value="157";mode.dispatchEvent(new b.w.Event("change"));
 const speed=b.w.document.getElementById("nativeLotusSpeed");
 speed.value="29";speed.dispatchEvent(new b.w.Event("input"));
 const current=JSON.parse(b.w.localStorage.getItem("smartease-experience-v1"));
 assert.equal(current.lotusNative.mode,157);
 assert.equal(current.lotusNative.speed,29);
 assert.equal(current.lotusNative.category,"flow");
 const stored=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));
 b.dom.window.close();
 const again=boot(stored);
 assert.equal(again.w.document.getElementById("nativeLotusCategory").value,"flow");
 assert.equal(again.w.document.getElementById("nativeLotusMode").value,"157");
 assert.equal(again.w.document.getElementById("nativeLotusSpeed").value,"29");
 assert.equal(again.w.document.getElementById("nativeLotusParked").checked,false);
 assert.equal(again.errors.length,0);
 again.dom.window.close();
});
test("Lotus native MELK mode only writes with recognized hardware and parked consent", async () => {
 const b=boot();
 const park=b.w.document.getElementById("nativeLotusParked");
 assert.equal(await b.run("applyNativeLotusMode()"),false);
 installLotusMock(b,"MELK-OA10   5F");
 await b.run("cartDevices[2].connect()");
 b.run("renderDevices()");
 assert.equal(b.w.document.getElementById("nativeLotusApply").disabled,true);
 assert.equal(b.run("lotusWrites.length"),0,"connection alone should not act");
 park.checked=true;park.dispatchEvent(new b.w.Event("change"));
 assert.equal(b.w.document.getElementById("nativeLotusApply").disabled,false);
 const cat=b.w.document.getElementById("nativeLotusCategory");
 cat.value="flow";cat.dispatchEvent(new b.w.Event("change"));
 const mode=b.w.document.getElementById("nativeLotusMode");
 mode.value="143";mode.dispatchEvent(new b.w.Event("change"));
 const speed=b.w.document.getElementById("nativeLotusSpeed");
 speed.value="30";speed.dispatchEvent(new b.w.Event("input"));
 const brightness=b.w.document.getElementById("nativeLotusBrightness");
 brightness.value="45";brightness.dispatchEvent(new b.w.Event("input"));
 assert.equal(await b.run("applyNativeLotusMode()"),true);
 assert.deepEqual(JSON.parse(b.run("JSON.stringify(lotusWrites)")),[
  [126,7,3,143,255,255,255,0,239],
  [126,4,2,30,255,255,255,0,239],
  [126,7,1,45,255,255,255,0,239],
 ]);
 assert.equal(b.run("czState.scenes.length"),0);
 assert.equal(b.run("cartDevices[2].sceneEnabled"),false);
 assert.equal(b.run("cartDevices[1].capabilities.pixelUpload"),false);
 b.run("cartDevices[2].disconnect()");
 b.run("renderDevices()");
 assert.equal(park.checked,false,"disconnect clears parked approval");
 assert.equal(b.w.document.getElementById("nativeLotusApply").disabled,true);
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("ELK-BLEDOB profile never inherits MELK native effects or sends unverified packets", async () => {
 const b=boot();
 installLotusMock(b,"ELK-BLEDOB");
 await b.run("cartDevices[2].connect()");
 b.run("renderDevices()");
 const park=b.w.document.getElementById("nativeLotusParked");
 park.checked=true;park.dispatchEvent(new b.w.Event("change"));
 assert.equal(b.w.document.getElementById("nativeLotusApply").disabled,true);
 assert.match(b.w.document.getElementById("nativeLotusInfo").textContent,/not verified/);
 assert.equal(await b.run("applyNativeLotusMode()"),false);
 assert.equal(b.run("lotusWrites.length"),0);
 assert.equal(b.run("czState.scenes.length"),0);
 assert.equal(b.errors.length,0);
 b.dom.window.close();
});
test("Lotus connects without side effects, matches opted-in color and cancels after disconnect", async () => {
  const b = boot();
  installLotusMock(b);
  await b.run("cartDevices[2].connect()");
  assert.equal(
    b.run("lotusWrites.length"),
    0,
    "connection must not change lights",
  );
  assert.equal(b.run("cartDevices[2].connected"), true);
  assert.equal(b.run("cartDevices[2].sceneEnabled"), false);
  b.run("cartDevices[2].sceneEnabled=true");
  const result = await b.run("cartSession.apply(E.presets[1].rows)");
  assert.equal(result.results[0].ok, true);
  assert.equal(b.run("lotusWrites.length"), 3);
  const applying = b.run("cartDevices[2].apply(E.presets[2].rows,()=>true)");
  b.run("cartDevices[2].disconnect()");
  assert.equal(await applying, false);
  assert.equal(b.run("cartDevices[2].connected"), false);
  b.dom.window.close();
});
test("preview mode disconnects every physical adapter before simulating lights", async () => {
  const b = boot();
  installLotusMock(b);
  await b.run("cartDevices[2].connect()");
  b.run("enterDemo()");
  assert.equal(b.run("transport"), "demo");
  assert.equal(b.run("cartDevices[2].connected"), false);
  assert.equal(b.run("lotusWrites.length"), 0);
  b.dom.window.close();
});
test("emergency reconnect refreshes a stale Lotus link and restores independent status", async () => {
  const b = boot();
  installLotusMock(b);
  await b.run("cartDevices[2].connect()");
  b.run(
    "cartDevices[0].connect=async()=>false;cartDevices[0].reconnect=async()=>false;",
  );
  await b.run("reconnectAll(true)");
  assert.equal(b.run("lotusConnects"), 2);
  assert.equal(b.run("cartDevices[2].connected"), true);
  assert.equal(
    b.w.document.getElementById("connectionText").textContent,
    "1/2 connected",
  );
  b.dom.window.close();
});
test("legacy maps migrate without overwriting user channel assignments", () => {
  const raw = {
    zones: {
      "front-left": { channels: [4] },
      "under-left": { channels: [7] },
      "under-right": { channels: [3] },
      "rear-left": { channels: [2] },
      "canopy-left": { channels: [6] },
    },
    activeOutputs: [2, 3, 4, 6, 7],
    scenes: [],
  };
  const b = boot({ "smartease-golf-cart-zones-v1": JSON.stringify(raw) });
  assert.equal(b.run('czState.zones["front-bumper"].channels[0]'), 4);
  assert.equal(b.run('czState.zones["left-under"].channels[0]'), 7);
  assert.equal(b.run("czState.zones.canopy.channels[0]"), 6);
  b.dom.window.close();
});
test("front/rear views retain a single five-zone map and never trigger radio writes", () => {
  const b = boot();
  b.w.document.querySelector('#homeCart [data-cart-view="rear"]').click();
  assert.match(
    b.w.document.querySelector("#homeCart image").getAttribute("href"),
    /rear/,
  );
  assert.equal(
    b.w.document.querySelectorAll("#homeCart [data-nokins]").length,
    2,
  );
  assert.equal(
    b.w.document.querySelectorAll("#homeCart .windshield-display").length,
    0,
  );
  b.w.document.querySelector('#homeCart [data-cart-view="front"]').click();
  assert.equal(
    b.w.document.querySelectorAll("#homeCart .windshield-display").length,
    1,
  );
  assert.equal(b.run("txCount"), 0);
  assert.equal(b.run("E.zones.length"), 5);
  b.dom.window.close();
});
test("whole-cart accessory designs save, reload and edit without duplicating a scene", () => {
  const b = boot();
  b.run(
    'draftAccessories.trinka.pattern="blink";draftAccessories.trinka.color="#ff751e";draftAccessories.nokins.follow="custom";draftAccessories.nokins.color="#a24aec";',
  );
  b.w.document.getElementById("sceneName").value = "Complete cart";
  b.w.document.getElementById("saveDesign").click();
  const values = Object.fromEntries(
    Object.keys(b.w.localStorage).map((k) => [k, b.w.localStorage.getItem(k)]),
  );
  b.dom.window.close();
  const again = boot(values);
  assert.equal(
    again.run("czState.scenes[0].accessories.trinka.pattern"),
    "blink",
  );
  assert.equal(
    again.run("czState.scenes[0].accessories.nokins.color"),
    "#a24aec",
  );
  again.run("editScene(savedScenes()[0])");
  assert.equal(
    again.w.document.getElementById("designEyesColor").value,
    "#ff751e",
  );
  again.w.document.getElementById("sceneName").value = "Complete cart edited";
  again.w.document.getElementById("saveDesign").click();
  assert.equal(again.run("czState.scenes.length"), 1);
  assert.equal(again.run("czState.scenes[0].name"), "Complete cart edited");
  again.dom.window.close();
});
test("Lotus receives the explicit decorative accent; eyes are never sent to an unsupported display", async () => {
  const b = boot();
  installLotusMock(b);
  await b.run("cartDevices[2].connect()");
  b.run("cartDevices[2].sceneEnabled=true;");
  const result = await b.run(
    'cartSession.apply(E.presets[1].rows,{nokins:{follow:"custom",on:true,color:"#ff751e",brightness:33},trinka:{on:true,pattern:"blink",color:"#a24aec",brightness:90}})',
  );
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].id, "nokins");
  assert.equal(
    b.run("JSON.stringify(lotusWrites[1])"),
    "[126,7,5,3,255,117,30,16,239]",
  );
  assert.equal(b.run("lotusWrites[2][3]"), 33);
  assert.equal(b.run("cartDevices[1].capabilities.pixelUpload"), false);
  b.dom.window.close();
});


test("calibration wizard stays accessible in SmartEase 2.0 and preserves per-strip RGB mappings", () => {
  const b=boot({"smartease-haunted-rgb-fix-v1":'{"2":["g","r","b"]}'});
  b.w.document.querySelector('[data-go="settings"]').click();
  const entry=b.w.document.getElementById("openColorCalibration");
  assert.ok(entry, "Settings should expose Fix my colors");
  entry.click();
  assert.equal(b.w.document.querySelector('[data-page="calibrate"]').hidden,false);
  assert.equal(b.w.document.querySelectorAll("#app [data-cal-test]").length,3);
  assert.equal(b.w.document.getElementById("calOutput").value,"2");
  assert.equal(b.w.document.getElementById("calSeenR").value,"g");
  const seen=["calSeenR","calSeenG","calSeenB"];
  ["g","r","b"].forEach((v,i)=>{b.w.document.getElementById(seen[i]).value=v;});
  b.w.document.getElementById("calSave").click();
  assert.deepEqual(JSON.parse(b.w.localStorage.getItem("smartease-haunted-rgb-fix-v1"))["2"],["g","r","b"]);
  b.w.document.getElementById("calOutput").value="3";
  b.w.document.getElementById("calOutput").dispatchEvent(new b.w.Event("change"));
  ["white","orange","blue"].forEach((v,i)=>{
    b.w.document.getElementById(seen[i]).value=v==="blue"?"b":v;
  });
  b.w.document.getElementById("calSave").click();
  assert.equal(b.w.document.getElementById("calFineTune").open,true,"non-permutation results should offer manual tuning");
  assert.equal(JSON.parse(b.w.localStorage.getItem("smartease-haunted-rgb-fix-v1"))["3"],undefined);
  assert.equal(JSON.parse(b.w.localStorage.getItem("smartease-haunted-observations-v1"))["3"].colors[0],"white");
  b.w.document.querySelector('[data-go="devices"]').click();
  assert.ok(b.w.document.getElementById("devicesColorCalibration"));
  b.w.document.getElementById("devicesColorCalibration").click();
  assert.equal(b.w.document.querySelector('[data-page="calibrate"]').hidden,false);
  assert.equal(b.errors.length,0);
  b.dom.window.close();
});

test("confirmed BRG results can be copied to mapped SP608E outputs and survive reload", async () => {
  const b=boot();
  const sceneKey=b.w.localStorage.getItem("smartease-golf-cart-zones-v2");
  b.w.document.getElementById("openColorCalibration").click();
  const actual=["b","r","g"];
  ["R","G","B"].forEach((name,i)=>{
    const el=b.w.document.getElementById("calSeen"+name);
    el.value=actual[i];el.dispatchEvent(new b.w.Event("change"));
  });
  assert.equal(b.w.document.getElementById("calCopyMapped").disabled,true,"cannot copy before live connection");
  // Test the storage and chip-order path with a simulated SP608E acknowledgment.
  b.run("isLive=()=>true;spEnsureChipColors=async(outputs,guard,opts)=>{globalThis.bulkSync={outputs:[...outputs],force:opts.force};return true;}");
  b.run("calRefreshButtons()");
  assert.equal(b.w.document.getElementById("calCopyMapped").disabled,false);
  assert.equal(await b.run("calCopyMapped()"),true);
  const orders=JSON.parse(b.w.localStorage.getItem("smartease-sp608e-chip-orders-v1"));
  const observed=JSON.parse(b.w.localStorage.getItem("smartease-haunted-rgb-fix-v1"));
  for(const n of [1,2,3,4,5]){
    assert.deepEqual(orders[n].observed,actual);
    assert.equal(orders[n].target,4);
    assert.deepEqual(observed[n],actual);
    assert.deepEqual(JSON.parse(b.run('JSON.stringify(spCorrectedColorBytes('+n+',"#ff0000"))')),[255,0,0]);
  }
  assert.equal(b.run("bulkSync.force"),true);
  assert.deepEqual(JSON.parse(b.run("JSON.stringify(bulkSync.outputs)")),[1,2,3,4,5]);
  assert.equal(b.w.localStorage.getItem("smartease-golf-cart-zones-v2"),sceneKey,"zones and scenes unchanged");
  const data=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));
  b.dom.window.close();
  const again=boot(data);
  assert.equal(again.run('spChipRecord(3).target'),4);
  again.dom.window.close();
});
test("exact colors default on for existing users and saved choices persist across reload", async () => {
 const b=boot();
 assert.equal(b.run("preferences.trueColors"), true);
 const haunted=b.run("E.presets.find(p=>p.id==='haunted')");
 b.run("enterDemo()");
 b.run("cartDevices[0].apply=async(rows)=>{globalThis.lastSentEffects=Object.values(rows).map(r=>r.effect);return true;}");
 assert.equal(await b.run("applyScene(E.presets.find(p=>p.id==='haunted'))"),true);
 assert.equal(b.run("lastSentEffects.every(id=>id===25)"),true);
 assert.equal(b.run("E.presets.find(p=>p.id==='haunted').rows.canopy.effect"),3);
 const toggle=b.w.document.getElementById("appTrueColors");
 assert.equal(toggle.checked,true);
 toggle.checked=false;toggle.dispatchEvent(new b.w.Event("change"));
 assert.equal(await b.run("applyScene(E.presets.find(p=>p.id==='haunted'))"),true);
 assert.equal(b.run("lastSentEffects.every(id=>id===3)"),true);
 const values=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));
 b.dom.window.close();
 const later=boot(values);
 assert.equal(later.run("preferences.trueColors"),false);
 later.dom.window.close();
});
test("RGB balance UI saves per-output correction and restores sliders after reload", () => {
 const b=boot();
 b.w.document.getElementById("openColorCalibration").click();
 b.w.document.getElementById("calOutput").value="2";
 b.w.document.getElementById("calOutput").dispatchEvent(new b.w.Event("change"));
 b.w.document.getElementById("calBalanceG").value="70";
 b.w.document.getElementById("calBalanceG").dispatchEvent(new b.w.Event("input"));
 assert.equal(b.run("calBalanceDraft[1]"),70);
 b.w.document.getElementById("calBalanceSave").click();
 assert.deepEqual(JSON.parse(b.w.localStorage.getItem("smartease-sp608e-rgb-balance-v1"))["2"],[100,70,100]);
 const state=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));
 b.dom.window.close();
 const later=boot(state);
 later.w.document.getElementById("openColorCalibration").click();
 later.w.document.getElementById("calOutput").value="2";
 later.w.document.getElementById("calOutput").dispatchEvent(new later.w.Event("change"));
 assert.equal(later.w.document.getElementById("calBalanceG").value,"70");
 assert.equal(later.run("spCorrectedColorBytes(2,'#ff751e')[1]"),82);
 assert.equal(later.errors.length,0);
 later.dom.window.close();
});
test("balance sliders really reach 0%, send zero-valued BLE channels and save 0% across reloads", async () => {
 const b=boot({
  "smartease-haunted-rgb-fix-v1":'{"2":["b","r","g"]}',
  "smartease-sp608e-chip-orders-v1":'{"2":{"observed":["b","r","g"],"baseline":0,"target":4}}'
 });
 b.w.document.getElementById("openColorCalibration").click();
 b.w.document.getElementById("calOutput").value="2";
 b.w.document.getElementById("calOutput").dispatchEvent(new b.w.Event("change"));
 for(const color of ["R","G","B"]){
  assert.equal(b.w.document.getElementById("calBalance"+color).min,"0");
 }
 for(const color of ["G","B"]){
  const el=b.w.document.getElementById("calBalance"+color);
  el.value="0";el.dispatchEvent(new b.w.Event("input"));
  assert.equal(b.w.document.getElementById("calBalance"+color+"Value").textContent,"0%");
 }
 assert.deepEqual(JSON.parse(b.run("JSON.stringify(calBalanceDraft)")),[100,0,0]);
 b.run('isLive=()=>true;spEnsureChipColors=async()=>true;enqueuePackets=async(jobs)=>{globalThis.zeroBalancePackets=jobs;return true;}');
 assert.equal(await b.run("calBalanceTest()"),true);
 assert.deepEqual(JSON.parse(b.run("JSON.stringify(zeroBalancePackets.at(-1))")),[136,137,5,2,255,0,0,255]);
 assert.equal(b.run("calBalanceSave()"),true);
 assert.deepEqual(JSON.parse(b.w.localStorage.getItem("smartease-sp608e-rgb-balance-v1"))["2"],[100,0,0]);
 const state=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));
 b.dom.window.close();
 const later=boot(state);
 later.w.document.getElementById("openColorCalibration").click();
 later.w.document.getElementById("calOutput").value="2";
 later.w.document.getElementById("calOutput").dispatchEvent(new later.w.Event("change"));
 assert.deepEqual(JSON.parse(later.run("JSON.stringify(calBalanceDraft)")),[100,0,0]);
 assert.equal(later.w.document.getElementById("calBalanceG").value,"0");
 assert.equal(later.w.document.getElementById("calBalanceB").value,"0");
 assert.deepEqual(JSON.parse(later.run('JSON.stringify(spCorrectedColorBytes(2,"#ff751e"))')),[255,0,0]);
 assert.equal(later.errors.length,0);
 later.dom.window.close();
});
test("Less yellow quick action can reach 0% and disabled-channel fine tune avoids invalid saved bytes", () => {
 const b=boot({
  "smartease-haunted-rgb-fix-v1":'{"2":["b","r","g"]}',
  "smartease-sp608e-chip-orders-v1":'{"2":{"observed":["b","r","g"],"baseline":0,"target":4}}'
 });
 b.w.document.getElementById("openColorCalibration").click();
 b.w.document.getElementById("calOutput").value="2";
 b.w.document.getElementById("calOutput").dispatchEvent(new b.w.Event("change"));
 const green=b.w.document.getElementById("calBalanceG");
 green.value="15";green.dispatchEvent(new b.w.Event("input"));
 b.w.document.getElementById("calBalanceWarmer").click();
 assert.equal(b.run("calBalanceDraft[1]"),0);
 assert.equal(b.w.document.getElementById("calBalanceGValue").textContent,"0%");
 b.run('spSaveRgbBalance([2],[100,0,100]);calTestedSignature=calSignature()');
 b.w.document.getElementById("calRawG").value="1";
 b.run('calTestedSignature=calSignature()');
 // Normal UI keeps Save disabled until a real LED test has completed.
 // Exercise the validator directly to verify impossible zero-gain matches
 // cannot be saved even by callers outside the button handler.
 b.run("calSaveMix()");
 assert.match(b.w.document.getElementById("calMixStatus").textContent,/set to 0%/);
 assert.equal(b.w.localStorage.getItem("smartease-haunted-manual-rgb-v1"),null);
 b.dom.window.close();
});
test("fine-tune sends corrected-order RGB and saves matches without double-swapping", async () => {
 const b=boot({
  "smartease-haunted-rgb-fix-v1":JSON.stringify({"2":["b","r","g"]}),
  "smartease-sp608e-chip-orders-v1":JSON.stringify({"2":{observed:["b","r","g"],baseline:0,target:4}})
 });
 b.w.document.getElementById("openColorCalibration").click();
 b.w.document.getElementById("calOutput").value="2";
 b.w.document.getElementById("calOutput").dispatchEvent(new b.w.Event("change"));
 b.w.document.getElementById("calTarget").value="#ff751e";
 b.w.document.getElementById("calTarget").dispatchEvent(new b.w.Event("change"));
 b.w.document.getElementById("calRawR").value="255";
 b.w.document.getElementById("calRawG").value="70";
 b.w.document.getElementById("calRawB").value="15";
 b.run('isLive=()=>true;spEnsureChipColors=async()=>true;enqueuePackets=async(jobs)=>{globalThis.lastShadeWrites=jobs;return true;};');
 await b.run("calTestMix()");
 assert.deepEqual(JSON.parse(b.run("JSON.stringify(lastShadeWrites.at(-1))")),[136,137,5,2,255,70,15,255]);
 b.w.document.getElementById("calMatchSave").click();
 assert.deepEqual(JSON.parse(b.w.localStorage.getItem("smartease-haunted-manual-rgb-v1"))["2"]["#ff751e"],[15,255,70]);
 assert.deepEqual(JSON.parse(b.run('JSON.stringify(spCorrectedColorBytes(2,"#ff751e"))')),[255,70,15]);
 b.dom.window.close();
});
test("custom scene effects are not replaced with solid colors on apply", async () => {
 const b=boot();
 b.run("enterDemo()");
 b.run('cartDevices[0].apply=async(rows)=>{globalThis.sentEffects=Object.values(rows).map(x=>x.effect);return true;}');
 b.w.document.getElementById("designerEffect").value="7";
 b.w.document.getElementById("designerEffect").dispatchEvent(new b.w.Event("change"));
 b.w.document.getElementById("applyDesign").click();
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(b.run("sentEffects.every(effect=>effect===7)"),true);
 b.dom.window.close();
});
test("corrected-color controls exist and never transmit from preview mode",async()=>{
 const b=boot();
 b.run("enterDemo()");
 b.w.document.querySelector('[data-go="settings"]').click();
 b.w.document.getElementById("appColorCheck").click();
 assert.equal(b.w.document.querySelector('[data-page="calibrate"]').hidden,false);
 assert.ok(b.w.document.getElementById("calVerifyR"));
 assert.ok(b.w.document.getElementById("calVerifyG"));
 assert.ok(b.w.document.getElementById("calVerifyB"));
 const count=b.run("txCount");
 assert.equal(await b.run("calVerifySaved('r')"),false);
 assert.equal(b.run("txCount"),count);
 b.dom.window.close();
});
test("color tests never write to a real controller while preview mode is enabled",async()=>{
  const b=boot();
  b.run("enterDemo()");
  b.w.document.getElementById("openColorCalibration").click();
  const before=b.run("txCount");
  await b.run("calTestPrimary('r')");
  assert.equal(b.run("txCount"),before);
  assert.match(b.w.document.getElementById("calStatus").textContent,/connect|devices/i);
  b.dom.window.close();
});
