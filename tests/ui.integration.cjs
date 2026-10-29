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

test("owned CoolLEDUX size preset fills fields without resizing or saving an existing project",()=>{
 const D=require("../display-project.js"),project=D.create(128,64);project.programs[0].frames[0].pixels[8191]=0xa24aec;
 const saved=JSON.stringify(project),b=boot({"smartease-display-project-v1":saved}),d=b.w.document;
 const before=b.run("JSON.stringify(displayProject)");
 d.getElementById("displaySizePreset").value="owner-ux";d.getElementById("displaySizePreset").dispatchEvent(new b.w.Event("change"));
 assert.equal(d.getElementById("displayWidth").value,"96");assert.equal(d.getElementById("displayHeight").value,"16");
 assert.equal(b.run("JSON.stringify(displayProject)"),before);assert.equal(b.run("displayUndo.length"),0);assert.equal(b.w.localStorage.getItem("smartease-display-project-v1"),saved);
 assert.match(d.getElementById("displaySizeNote").textContent,/Orientation remains unverified/);assert.equal(b.run("displayOwnerSize.orientationVerified"),false);
 d.getElementById("displayWidth").value="64";d.getElementById("displayWidth").dispatchEvent(new b.w.Event("input"));assert.equal(d.getElementById("displaySizePreset").value,"manual");
 assert.equal(b.run("JSON.stringify(displayProject)"),before);b.dom.window.close();
 const again=boot({"smartease-display-project-v1":saved});assert.equal(again.run("displayProject.width"),128);assert.equal(again.run("displayProject.height"),64);assert.equal(again.run("displayCurrent().pixels[8191]"),0xa24aec);again.dom.window.close();
});

test("owned size applies only explicitly, preserves pixel coordinates and supports undo and manual override",()=>{
 const D=require("../display-project.js"),project=D.create(10,8);project.programs[0].frames[0].pixels[79]=0xff751e;
 const b=boot({"smartease-display-project-v1":JSON.stringify(project)}),d=b.w.document,before=b.run("JSON.stringify(displayProject)");
 d.getElementById("displaySizePreset").value="owner-ux";d.getElementById("displaySizePreset").dispatchEvent(new b.w.Event("change"));d.getElementById("displayResize").click();
 assert.equal(b.run("displayProject.width"),96);assert.equal(b.run("displayProject.height"),16);assert.equal(b.run("displayCurrent().pixels[7*96+9]"),0xff751e);assert.equal(b.run("displayCurrent().pixels[1535]"),0);
 d.getElementById("displayUndo").click();assert.equal(b.run("JSON.stringify(displayProject)"),before);
 d.getElementById("displayWidth").value="32";d.getElementById("displayHeight").value="12";d.getElementById("displayWidth").dispatchEvent(new b.w.Event("input"));d.getElementById("displayResize").click();
 assert.equal(b.run("displayProject.width"),32);assert.equal(b.run("displayProject.height"),12);assert.equal(d.getElementById("displaySizePreset").value,"manual");assert.equal(d.getElementById("displayUpload").disabled,true);assert.equal(b.errors.length,0);b.dom.window.close();
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

test("CoolLEDUX adapter never falls back to X, connects, or writes during offline preparation",async()=>{
 const b=boot();let connects=0,writes=0;
 const device={id:"ux-test",name:"CoolLEDUX-31B8",gatt:{connect:async()=>{connects++;throw Error("No connections during preparation");},writeValue:async()=>{writes++;}}};
 b.w.navigator.bluetooth={requestDevice:async()=>device};await b.run("cartDevices[1].identify()");
 b.run('SmartEaseCoolLEDX.image=()=>{throw Error("Wrong encoder");};SmartEaseCoolLEDX.animation=()=>{throw Error("Wrong encoder");}');
 const before=b.run("JSON.stringify(displayProject)"),plan=b.run("cartDevices[1].prepareProject(displayProject)");
 assert.equal(plan.family,"coolledux");assert.equal(plan.uploadEnabled,false);assert.equal(plan.dimensions.verified,false);
 assert.equal(b.run("cartDevices[1].profile"),"coolledux");assert.equal(b.run("cartDevices[1].connected"),false);assert.equal(b.run("cartDevices[1].capabilities.pixelUpload"),false);
 assert.equal(b.run("JSON.stringify(displayProject)"),before);await assert.rejects(b.run("cartDevices[1].upload()"),/not enabled/);
 for(const name of ["CoolLEDX","CoolLEDM","CoolLEDU","unknown","CoolLEDUXX"]){device.name=name;assert.throws(()=>b.run("cartDevices[1].prepareProject(displayProject)"),/CoolLEDUX display/);assert.throws(()=>b.run('cartDevices[1].prepareCommand("power",true)'),/CoolLEDUX display/);}
 assert.equal(connects,0);assert.equal(writes,0);assert.equal(b.errors.length,0);b.dom.window.close();
});

test("CoolLEDUX offline UI prepares a download and decodes historical info without live state or writes",async()=>{
 const b=boot(),d=b.w.document;let connects=0,downloads=0,blobs=0;
 b.w.navigator.bluetooth={requestDevice:async()=>({id:"ux-test",name:"CoolLEDUX",gatt:{connect:async()=>{connects++;throw Error("No BLE connection");}}})};
 b.w.URL.createObjectURL=()=>{blobs++;return "blob:ux-plan";};b.w.URL.revokeObjectURL=()=>{};b.w.HTMLAnchorElement.prototype.click=()=>{downloads++;};
 assert.equal(d.getElementById("uxPrepare").disabled,true);await b.run("cartDevices[1].identify()");b.run('go("devices");nativeSelectDevice(2);uxRender()');
 assert.equal(d.getElementById("uxPrepare").disabled,false);d.getElementById("uxIncludeSettings").checked=true;d.getElementById("uxBrightness").value="33";
 d.getElementById("uxPrepare").click();assert.equal(downloads,1);assert.equal(blobs,1);
 const report=JSON.parse(d.getElementById("uxReport").textContent);assert.equal(report.family,"coolledux");assert.equal(report.uploadEnabled,false);assert.equal(report.draftDimensions.verified,false);
 const encoded=b.run("SmartEaseCoolLEDUX.envelope([31,1,200,...Array(27).fill(0)])");d.getElementById("uxCapturedReply").value=Buffer.from(encoded).toString("hex");d.getElementById("uxDecode").click();
 const decoded=JSON.parse(d.getElementById("uxReport").textContent);assert.equal(decoded.brightness,200);assert.equal(decoded.dimensions,null);assert.equal(decoded.source,"imported-capture");assert.equal(decoded.hardwareVerified,false);
 d.getElementById("uxCapturedReply").value="ff ".repeat(1025);d.getElementById("uxDecode").click();assert.match(d.getElementById("uxReport").textContent,/bounded hexadecimal/);
 assert.equal(d.getElementById("displayUpload").disabled,true);assert.equal(b.run("cartDevices[1].connected"),false);assert.equal(connects,0);assert.equal(b.errors.length,0);b.dom.window.close();
});

test("UX captured info is associated with its selected device and cleared on successful reselection",async()=>{
 const b=boot();let selected={id:"ux-first",name:"CoolLEDUX-31B8"},cancel=false;
 b.w.navigator.bluetooth={requestDevice:async()=>{if(cancel)throw Error("Picker cancelled");return selected;}};
 await b.run("cartDevices[1].identify()");
 b.w.infoHex=Buffer.from(b.run("SmartEaseCoolLEDUX.envelope([31,1,180,...Array(27).fill(0)])")).toString("hex");
 const info=b.run("cartDevices[1].decodeCapturedInfo(infoHex)");
 assert.equal(info.selectedDeviceAtImport.id,"ux-first");assert.equal(info.selectedDeviceAtImport.name,"CoolLEDUX-31B8");assert.equal(info.captureOriginVerified,false);assert.equal(info.hardwareVerified,false);
 cancel=true;await assert.rejects(b.run("cartDevices[1].identify()"),/Picker cancelled/);assert.equal(b.run("cartDevices[1].capturedInfo.selectedDeviceAtImport.id"),"ux-first");
 cancel=false;selected={id:"ux-second",name:"CoolLEDUX-TEST"};await b.run("cartDevices[1].identify()");
 assert.equal(b.run("cartDevices[1].capturedInfo"),null,"old info must not enter the new display's export");assert.equal(b.run("cartDevices[1].identity.id"),"ux-second");
 const second=b.run("cartDevices[1].decodeCapturedInfo(infoHex)");assert.equal(second.selectedDeviceAtImport.id,"ux-second");assert.equal(second.captureOriginVerified,false,"association does not prove where the bytes originated");
 assert.equal(b.errors.length,0);b.dom.window.close();
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
test("built-in Halloween exposes one-tap edit and three RGB groups; Save persists a durable built-in override", () => {
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
 assert.equal(b.w.document.getElementById("sceneName").value,"Haunted Surge");
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
 assert.equal(newId,"haunted");
 assert.equal(b.run("czState.scenes[0].name"),"Haunted Surge");
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
 assert.equal(b.w.document.getElementById("sceneName").value,"Haunted Surge");
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
 assert.equal(b.w.document.getElementById("sceneName").value,"Haunted Surge");
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
    "1/3 connected",
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
 b.w.document.getElementById("studioParked").checked=true;
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
function installThreeDeviceMock(b, config={}) {
 const w=b.w,state={requests:[],connects:{sp608e:0,nokins:0,trinka:0},writes:{sp608e:[],nokins:[],trinka:[]},subscriptions:[],fail:{},pause:{},omitWriter:{},active:0,peak:0,notifyOnQuery:false,geometryTotal:96,reads:[],timers:{0:{hour:7,minute:30,kind:0,days:31,enabled:true},1:{hour:22,minute:15,kind:1,days:96,enabled:true}},lastTimerQuery:null,delays:[]};
 const specs={sp608e:{name:'SP608E_cart',id:'under-1',service:'ffe0',char:'ffe1'},nokins:{name:'MELK-OF21 1D',id:'nokins-1',service:'fff0',char:'fff3'},trinka:{name:'CoolLEDUX-31B8',id:'eyes-1',service:'fff0',char:'fff1'}};
 const uuid=short=>'0000'+short+'-0000-1000-8000-00805f9b34fb',devices={},chars={};
 for(const [id,spec] of Object.entries(specs)){
  const d=new w.EventTarget();d.id=spec.id;d.name=spec.name;
  const ch=new w.EventTarget();ch.uuid=uuid(spec.char);ch.properties=config.writeWithoutResponse?{write:true,writeWithoutResponse:true}:{write:true,writeWithoutResponse:false};
  const write=async bytes=>{state.active++;state.peak=Math.max(state.peak,state.active);await Promise.resolve();state.writes[id].push(Array.from(bytes));state.active--;
   if(id==='nokins'){
    if(bytes[2]===0x21)state.geometryTotal=bytes[3]|(bytes[4]<<8);
    if(bytes[2]===0x37&&state.notifyOnQuery)emitGeometry(state.geometryTotal);
    if(bytes[2]===0x82){const kind=bytes[6];if(bytes[3]===255){state.lastTimerQuery=kind;if(config.timerNotify)emitTimer(timerBytes(kind));}else if(!config.ignoreTimerWrites)state.timers[kind]={kind,hour:bytes[3],minute:bytes[4],days:bytes[7]&127,enabled:!!(bytes[7]&128)};}
   }
  };
  ch.writeValueWithResponse=write;if(config.writeWithoutResponse)ch.writeValueWithoutResponse=write;
  if(id==='nokins'&&config.read){ch.properties.read=true;ch.readValue=async()=>{state.reads.push(state.lastTimerQuery);const bytes=w.Uint8Array.from(timerBytes(state.lastTimerQuery));return new w.DataView(bytes.buffer);};}
  const notify=new w.EventTarget();notify.uuid=uuid('fff9');notify.properties={notify:true,indicate:true};notify.startNotifications=async()=>{state.subscriptions.push(notify.uuid);return notify;};
  const service={getCharacteristic:async expected=>{assert.equal(expected,ch.uuid);return ch;},getCharacteristics:async()=>state.omitWriter[id]?[notify]:id==='nokins'?[ch,notify]:[ch]};
  const server={getPrimaryService:async expected=>{assert.equal(expected,uuid(spec.service));if(state.pause[id])await state.pause[id];if(state.fail[id])throw Error('Missing expected service for '+id);return service;}};
  d.gatt={connected:false,connect:async()=>{state.connects[id]++;d.gatt.connected=true;return server;},disconnect:()=>{const was=d.gatt.connected;d.gatt.connected=false;if(was)d.dispatchEvent(new w.Event('gattserverdisconnected'));}};
  devices[id]=d;chars[id]={writer:ch,notify};
 }
 function emitGeometry(total){const data=w.Uint8Array.from([0x7e,7,0x37,total&255,total>>8,255,0,0x88,0xef]);chars.nokins.notify.value=new w.DataView(data.buffer);chars.nokins.notify.dispatchEvent(new w.Event('characteristicvaluechanged'));}
 function timerBytes(kind){if(config.timerEcho)return [0x7e,7,0x82,255,255,255,kind,0,0xef];const t=state.timers[kind];return t?[0x7e,7,0x82,t.hour,t.minute,0,kind,t.days|(t.enabled?128:0),0xef]:[0];}
 function emitTimer(bytes){const data=w.Uint8Array.from(bytes);chars.nokins.notify.value=new w.DataView(data.buffer);chars.nokins.notify.dispatchEvent(new w.Event('characteristicvaluechanged'));}
 const api={requestDevice:async options=>{assert.equal(options.acceptAllDevices,undefined,'main connections must use family filters');const prefix=options.filters[0].namePrefix.toLowerCase();const id=prefix.startsWith('sp608e')?'sp608e':prefix.startsWith('melk-of21')?'nokins':'trinka';state.requests.push({id,options});return devices[id];}};
 if(config.getDevices!==false)api.getDevices=async()=>config.grants||Object.values(devices);
 const timeout=w.setTimeout.bind(w);w.setTimeout=(fn,delay,...args)=>{state.delays.push(delay);return timeout(fn,[75,100,200,300].includes(delay)?0:delay,...args);};
 w.navigator.bluetooth=api;b.run('queryState=async()=>true;spEnsureChipColors=async()=>true;');return {state,devices,chars,api,emitGeometry,emitTimer};
}

test('fresh OF21 cancellation invalidates both late chooser and late GATT without touching UX',async()=>{
 for(const phase of ['chooser','gatt']){
  const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("trinka",{toggle:false})');
  const saved=b.w.localStorage.getItem('smartease-device-assignments-v1');let finish;
  if(phase==='chooser')m.api.requestDevice=()=>new Promise(resolve=>{finish=()=>resolve(m.devices.nokins);});
  else m.state.pause.nokins=new Promise(resolve=>{finish=resolve;});
  const pending=b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');await new Promise(r=>setTimeout(r,0));
  assert.equal(b.run('cartDevices[2].profile'),null);b.run('SmartEaseConnections.cancel("nokins")');finish();
  assert.equal(await pending,false);assert.equal(m.devices.nokins.gatt.connected,false);assert.equal(b.run('cartDevices[2].connected'),false);
  assert.equal(b.run('cartDevices[1].connected'),true);assert.equal(b.w.localStorage.getItem('smartease-device-assignments-v1'),saved);
  if(phase==='chooser')assert.equal(m.state.connects.nokins,0);assert.equal(b.errors.length,0);b.dom.window.close();
 }
});

test('slow grant recovery respects manual disconnect for each known device while restoring the others',async()=>{
 for(const id of ['sp608e','nokins','trinka']){
  const b=boot(),m=installThreeDeviceMock(b);for(const family of ['sp608e','nokins','trinka'])await b.run(`SmartEaseConnections.connectOne('${family}',{toggle:false})`);
  // Retained device objects with unavailable links must recover independently.
  for(const device of Object.values(m.devices))device.gatt.connected=false;
  let finish;m.api.getDevices=()=>new Promise(resolve=>{finish=resolve;});const pending=b.run('SmartEaseConnections.restore()');
  b.run(`cartDevices.find(a=>a.id==='${id}').disconnect()`);finish(Object.values(m.devices));await pending;
  assert.equal(m.devices[id].gatt.connected,false,id+' must remain disconnected');assert.equal(m.state.connects[id],1);
  for(const other of ['sp608e','nokins','trinka'].filter(x=>x!==id)){assert.equal(m.devices[other].gatt.connected,true);assert.equal(m.state.connects[other],2);}
  assert.equal(b.errors.length,0);b.dom.window.close();
 }
});

test('first UX connection remains usable when assignment storage is unavailable',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);
 b.run('Storage.prototype.setItem=function(){throw new DOMException("Storage full","QuotaExceededError");}');
 assert.equal(await b.run('SmartEaseConnections.connectOne("trinka",{toggle:false})'),true);
 assert.equal(b.run('cartDevices[1].connected'),true);assert.match(b.w.document.getElementById('deviceList').textContent,/could not save the device assignment/);
 assert.equal(b.w.localStorage.getItem('smartease-device-assignments-v1'),null);assert.equal(m.state.writes.trinka.length,0);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('OF21 mic UI maps all eight choices to hexadecimal native rhythm bytes',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;
 const select=b.w.document.getElementById('of21MicMode');assert.deepEqual([...select.options].map(o=>Number(o.value)),Array.from({length:8},(_,i)=>0x80+i));
 for(let i=0;i<8;i++){select.value=String(0x80+i);assert.equal(await b.run('of21Run("mic")'),true);assert.deepEqual(m.state.writes.nokins.at(-1),[0x7e,7,3,0x80+i,4,255,255,0,0xef]);}
 assert.equal(b.errors.length,0);b.dom.window.close();
});

test('each visible Connect routes to only its own family and establishes three independent transports',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);b.run('go("devices")');
 for(const id of ['sp608e','nokins','trinka'])assert.equal(await b.w.document.getElementById('deviceConnect-'+id).onclick(),true);
 assert.deepEqual(m.state.requests.map(r=>r.id),['sp608e','nokins','trinka']);assert.deepEqual(m.state.connects,{sp608e:1,nokins:1,trinka:1});
 assert.equal(b.run('isLive()&&cartDevices[1].connected&&cartDevices[2].connected'),true);assert.equal(b.run('cartDevices[2].profile'),'melk-of21');assert.equal(b.run('cartDevices[2].controlReady'),true);
 assert.equal(b.run('cartDevices[2].ownerLink.report.writeMethod'),'writeValueWithResponse');assert.deepEqual(m.state.subscriptions,['0000fff9-0000-1000-8000-00805f9b34fb']);
 assert.deepEqual(m.state.writes,{sp608e:[],nokins:[],trinka:[]},'connection alone does not send lighting commands');assert.equal(b.w.document.getElementById('connectionText').textContent,'3 connected');
 assert.equal(b.w.document.getElementById('displayUpload').disabled,true);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('stale remembered GATT failure is repaired by a fresh same-tap family chooser for every row',async()=>{
 for(const id of ['sp608e','nokins','trinka']){
  const b=boot(),m=installThreeDeviceMock(b);await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`);b.run(`cartDevices.find(a=>a.id==='${id}').disconnect()`);
  m.state.fail[id]=true;assert.equal(await b.run(`SmartEaseConnections.connectOne('${id}',{knownOnly:true,toggle:false})`),false);
  const requests=m.state.requests.length;m.state.fail[id]=false;
  let inGesture=true;const original=m.api.requestDevice;m.api.requestDevice=options=>{assert.equal(inGesture,true,'requestDevice must run before handler yields');return original(options);};
  const retry=b.w.document.getElementById('deviceConnect-'+id).onclick();assert.equal(m.state.requests.length,requests+1);inGesture=false;
  assert.equal(await retry,true);assert.equal(m.state.requests.at(-1).id,id);assert.equal(b.errors.length,0);b.dom.window.close();
 }
});

test('never-settling GATT can be cancelled and retried immediately without releasing the old operation',async()=>{
 for(const id of ['sp608e','nokins','trinka']){
  const b=boot(),m=installThreeDeviceMock(b),original=m.devices[id].gatt.connect;
  m.devices[id].gatt.connect=()=>new Promise(()=>{});
  const stuck=b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`);await new Promise(r=>setTimeout(r,0));
  b.run(`SmartEaseConnections.cancel('${id}')`);assert.equal(await stuck,false);assert.equal(b.w.document.getElementById('deviceConnect-'+id).disabled,false);
  m.devices[id].gatt.connect=original;
  assert.equal(await b.w.document.getElementById('deviceConnect-'+id).onclick(),true);assert.equal(m.devices[id].gatt.connected,true);assert.equal(b.errors.length,0);b.dom.window.close();
 }
});

test('bounded GATT stages retain exact native error code and never launch hidden chooser retries',async()=>{
 for(const id of ['sp608e','nokins','trinka']){
  const b=boot(),m=installThreeDeviceMock(b);b.run('SmartEasePairing.stageTimeoutMs=20');m.state.pause[id]=new Promise(()=>{});
  assert.equal(await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`),false);assert.equal(m.state.requests.length,1);assert.match(b.w.document.getElementById('pairDiagnostics').value,/TimeoutError/);
  m.state.pause[id]=null;m.devices[id].gatt.connect=async()=>{throw Object.assign(Error('error 2'),{name:'NetworkError',code:2});};
  assert.equal(await b.w.document.getElementById('deviceConnect-'+id).onclick(),false);assert.match(b.w.document.getElementById('pairDiagnostics').value,/NetworkError: error 2 \[code=2\]/);assert.match(b.w.document.getElementById('pairBuild').textContent,/cart-scenes-20261029-02/);
  assert.equal(m.state.requests.length,2);b.dom.window.close();
 }
});

test('late cancelled service completion cannot clear or disconnect a newer connection to the same object',async()=>{
 for(const id of ['sp608e','nokins','trinka']){
  const b=boot(),m=installThreeDeviceMock(b);let release;m.state.pause[id]=new Promise(resolve=>{release=resolve;});
  const old=b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`);await new Promise(r=>setTimeout(r,0));b.run(`SmartEaseConnections.cancel('${id}')`);assert.equal(await old,false);
  m.state.pause[id]=null;assert.equal(await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`),true);release();await new Promise(r=>setTimeout(r,0));
  assert.equal(m.devices[id].gatt.connected,true);assert.equal(b.run(`cartDevices.find(a=>a.id==='${id}').connected`),true);if(id==='sp608e')assert.equal(b.run('connectionInProgress'),false);
  assert.equal(b.errors.length,0);b.dom.window.close();
 }
});

test('a GATT connection arriving after its deadline is closed unless a newer attempt owns it',async()=>{
 for(const id of ['sp608e','nokins','trinka']){
  const b=boot(),m=installThreeDeviceMock(b);b.run('SmartEasePairing.stageTimeoutMs=15');let release;
  const original=m.devices[id].gatt.connect;
  m.devices[id].gatt.connect=()=>new Promise(resolve=>{release=async()=>resolve(await original());});
  assert.equal(await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`),false);
  await release();await new Promise(r=>setTimeout(r,0));assert.equal(m.devices[id].gatt.connected,false);assert.equal(b.run(`cartDevices.find(a=>a.id==='${id}').connected`),false);b.dom.window.close();
 }
});

test('preboot grant recovery has one owner, never starts background GATT, and yields to manual tap/cancel',async()=>{
 const storage={'smartease-device-assignments-v1':JSON.stringify({sp608e:{id:'under-1',name:'SP608E_cart'},trinka:{id:'eyes-1',name:'CoolLEDUX-31B8'},nokins:{id:'nokins-1',name:'MELK-OF21 1D'}})};
 for(const reject of [false,true]){
  let release,calls=0;const b=boot(storage,({w})=>{w.navigator.bluetooth={getDevices:()=>{calls++;return new Promise((resolve,fail)=>{release=reject?()=>fail(Error('grant recovery rejected')):resolve;});}};});
  const m=installThreeDeviceMock(b);assert.equal(calls,1,'legacy SP restore must not own a second getDevices call');
  const restoration=b.run('SmartEaseConnections.restore({reconnect:false})');assert.equal(calls,1);
  const manual=b.w.document.getElementById('deviceConnect-sp608e').onclick();assert.equal(m.state.requests.length,1);assert.equal(await manual,true);
  b.run('SmartEaseConnections.cancel("sp608e")');release(Object.values(m.devices));await restoration;
  assert.equal(m.devices.sp608e.gatt.connected,false);assert.deepEqual(m.state.connects,{sp608e:1,nokins:0,trinka:0});assert.equal(b.run('connectionInProgress'),false);
  if(reject)assert.match(b.w.document.getElementById('pairMemory').textContent,/grant recovery rejected/);else assert.equal(b.run('cartDevices[1].device.id'),'eyes-1');
  assert.equal(b.errors.length,0);b.dom.window.close();
 }
});

test('retained SP scan controls use the same fresh filtered chooser and Disconnect All releases pending tasks',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);
 for(const id of ['connectBtn','scanServiceBtn','scanAllBtn']){assert.equal(await b.w.document.getElementById(id).onclick(),true);b.w.document.getElementById('disconnectBtn').onclick();}
 assert.deepEqual(m.state.requests.map(x=>x.id),['sp608e','sp608e','sp608e']);
 m.devices.trinka.gatt.connect=()=>new Promise(()=>{});const pending=b.run('SmartEaseConnections.connectOne("trinka",{toggle:false})');await new Promise(r=>setTimeout(r,0));
 b.w.document.getElementById('disconnectCart').onclick();assert.equal(await pending,false);assert.equal(b.run('connectionTasks.size'),0);b.dom.window.close();
});

test('wrong-family selections and partial GATT failure cannot disconnect or reassign another device',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');
 const remembered=b.w.localStorage.getItem('smartease-device-assignments-v1');m.api.requestDevice=async()=>m.devices.nokins;
 assert.equal(await b.run('SmartEaseConnections.connectOne("sp608e",{toggle:false})'),false);assert.equal(m.state.connects.sp608e,0);assert.equal(b.run('cartDevices[2].connected'),true);assert.equal(b.w.localStorage.getItem('smartease-device-assignments-v1'),remembered);
 m.api.requestDevice=async()=>m.devices.trinka;m.state.fail.trinka=true;assert.equal(await b.run('SmartEaseConnections.connectOne("trinka",{toggle:false})'),false);
 assert.equal(b.run('cartDevices[1].connected'),false);assert.equal(b.run('cartDevices[2].connected'),true);assert.match(b.w.document.getElementById('deviceMessage').textContent,/Missing expected service/);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('cancelled chooser, repeated clicks and a late GATT completion are isolated to that device',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');let finish;
 m.api.requestDevice=()=>new Promise(resolve=>{finish=resolve;});const first=b.run('SmartEaseConnections.connectOne("trinka",{toggle:false})'),second=b.run('SmartEaseConnections.connectOne("trinka",{toggle:false})');assert.equal(first,second);
 b.run('SmartEaseConnections.cancel("trinka")');finish(m.devices.trinka);assert.equal(await first,false);assert.equal(m.state.connects.trinka,0);assert.equal(b.run('cartDevices[2].connected'),true);
 m.api.requestDevice=async()=>m.devices.trinka;let release;m.state.pause.trinka=new Promise(resolve=>{release=resolve;});const pending=b.run('SmartEaseConnections.connectOne("trinka",{toggle:false})');await new Promise(r=>setTimeout(r,0));b.run('SmartEaseConnections.cancel("trinka")');release();assert.equal(await pending,false);assert.equal(m.devices.trinka.gatt.connected,false);assert.equal(b.run('cartDevices[2].connected'),true);assert.equal(b.run('cartDevices[1].connected'),false);b.dom.window.close();
});

test('Connect All uses separate user steps, retaining successful devices through a cancelled step',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.start()');assert.deepEqual(m.state.requests.map(r=>r.id),['sp608e']);assert.equal(b.run('isLive()'),true);
 const original=m.api.requestDevice;m.api.requestDevice=async()=>{throw Object.assign(Error('cancel'),{name:'NotFoundError'});};await b.w.document.getElementById('pairNext').onclick();assert.equal(b.run('isLive()'),true);assert.equal(b.run('cartDevices[2].connected'),false);
 m.api.requestDevice=original;await b.w.document.getElementById('pairNext').onclick();assert.equal(b.run('cartDevices[1].connected'),true,b.run('JSON.stringify({guide:connectionGuide,notes:connectionNotes,error:cartDevices[1].lastError})'));assert.equal(b.run('cartDevices[2].connected'),false);assert.match(b.w.document.getElementById('pairProgress').textContent,/2\/3 connected/);b.dom.window.close();
});

test('assignments survive reload, restore only exact granted IDs, and preserve saved user data',async()=>{
 const storage={'smartease-experience-v1':JSON.stringify({favorites:['haunted'],trueColors:false,onboarded:true,deviceIdentities:{},nokinsSceneEnabled:true}),'smartease-sp608e-rgb-balance-v1':'{"2":[100,65,100]}','smartease-display-project-v1':JSON.stringify(require('../display-project.js').create(96,16))};
 const b=boot(storage);installThreeDeviceMock(b);for(const id of ['sp608e','nokins','trinka'])await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`);
 const values=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));b.dom.window.close();
 const again=boot(values);const m=installThreeDeviceMock(again);assert.equal(again.run('cartDevices.some(a=>a.id==="sp608e"?isLive():a.connected)'),false,'stored IDs never mean connected');await again.run('SmartEaseConnections.restore()');
 assert.equal(m.state.requests.length,0,'getDevices restoration never opens a chooser');assert.equal(again.run('isLive()&&cartDevices[1].connected&&cartDevices[2].connected'),true);
 for(const [key,value] of Object.entries(storage))assert.equal(again.w.localStorage.getItem(key),value);assert.equal(again.run('cartDevices[2].sceneEnabled'),true);again.dom.window.close();
 const wrong=boot(values),n=installThreeDeviceMock(wrong,{grants:[{id:'nokins-1',name:'CoolLEDUX-WRONG',gatt:{connected:false}},{id:'unassigned-eyes',name:'CoolLEDUX-OTHER',gatt:{connected:false}}]});await wrong.run('SmartEaseConnections.restore()');assert.equal(wrong.run('cartDevices.some(a=>a.id==="sp608e"?isLive():a.connected)'),false);assert.equal(n.state.requests.length,0);assert.equal(wrong.w.localStorage.getItem('smartease-device-assignments-v1'),values['smartease-device-assignments-v1']);wrong.dom.window.close();
 const limited=boot(values);installThreeDeviceMock(limited,{getDevices:false});await limited.run('SmartEaseConnections.restore()');assert.match(limited.w.document.getElementById('pairMemory').textContent,/cannot recover granted devices/);assert.equal(limited.run('cartDevices[1].connected'),false);limited.dom.window.close();
});

test('OF21 discovered write properties drive source controls, serialized writes and cancellation guards',async()=>{
 const b=boot(),m=installThreeDeviceMock(b,{writeWithoutResponse:true});await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');assert.equal(b.run('cartDevices[2].ownerLink.report.writeMethod'),'writeValueWithoutResponse');
 assert.equal(await b.run('of21Run("color")'),false);assert.equal(m.state.writes.nokins.length,0);b.w.document.getElementById('of21Parked').checked=true;b.w.document.getElementById('of21Level').value='50';b.w.document.getElementById('of21LiveColor').value='#ff0000';
 assert.equal(await b.run('of21Run("color")'),true);assert.deepEqual(m.state.writes.nokins,[[126,7,4,255,0,1,2,1,239],[126,4,1,50,1,255,2,1,239],[126,7,5,3,255,0,0,16,239]]);
 b.w.document.getElementById('of21Effects').value='233';assert.equal(await b.run('of21Run("effect")'),true);assert.deepEqual(m.state.writes.nokins.at(-3),[126,7,3,233,6,255,255,0,239]);assert.deepEqual(m.state.writes.nokins.at(-1),[126,4,1,50,0,255,2,1,239]);
 assert.equal(b.w.document.getElementById('of21Effects').options.length,234);assert.equal(b.w.document.getElementById('of21Scenes').options.length,33);assert.equal([...b.w.document.getElementById('of21Scenes').options].some(x=>x.value==='100'),false);
 await Promise.all([b.run('cartDevices[2].ownerCommand("speed",20)'),b.run('cartDevices[2].ownerCommand("brightness",30)')]);assert.equal(m.state.peak,1);
 assert.throws(()=>b.run('cartDevices[2].ownerCommand("point-count",9)'),/Unsupported OF21 value/);assert.throws(()=>b.run('cartDevices[2].write([[126,7,3,1,6,255,255,0,239]])'),/OA10 writes are blocked/);
 const before=m.state.writes.nokins.length,pending=b.run('cartDevices[2].ownerCommand("speed",40)');b.run('cartDevices[2].disconnect()');assert.equal(await pending,false);assert.equal(m.state.writes.nokins.length,before);assert.equal(m.state.writes.sp608e.length,0);b.dom.window.close();
});

test('OF21 LED-count read uses discovered notify characteristic, validates markers and bounds retries',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;m.state.notifyOnQuery=true;
 assert.equal(await b.run('of21Run("nodes")'),true);assert.equal(b.run('cartDevices[2].of21.totalNodes'),96);assert.equal(m.state.writes.nokins.length,1);assert.equal(b.run('cartDevices[2].of21.prepareExamples().diyExample.uploadEnabled'),false);
 m.state.notifyOnQuery=false;const before=m.state.writes.nokins.length;assert.equal(await b.run('of21Run("nodes")'),false);assert.equal(m.state.writes.nokins.length-before,3);assert.match(b.w.document.getElementById('of21LiveResult').textContent,/at most three/);b.dom.window.close();
});

test('a genuine GATT connection is reported even when its control characteristic is unavailable',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);m.state.omitWriter.nokins=true;await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');assert.equal(b.run('cartDevices[2].connected'),true);assert.equal(b.run('cartDevices[2].controlReady'),false);assert.equal(m.state.writes.nokins.length,0);b.w.document.getElementById('of21Parked').checked=true;assert.equal(await b.run('of21Run("on")'),false);b.dom.window.close();
});

test('OF21 native timer editor reads both slots, preserves the other slot and compares requested versus returned state',async()=>{
 const b=boot(),m=installThreeDeviceMock(b,{read:true});for(const id of ['sp608e','nokins','trinka'])await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`);
 assert.equal(m.state.writes.nokins.length,0);b.w.document.getElementById('of21Parked').checked=true;
 assert.equal(await b.run('of21NativeRun("timer")'),false);assert.equal(m.state.writes.nokins.length,0);assert.match(b.w.document.getElementById('of21NativeResult').textContent,/Read both timer slots/);
 assert.equal(await b.run('of21NativeRun("read-timers")'),true);assert.deepEqual(m.state.reads,[0,1]);assert.deepEqual(m.state.writes.nokins.map(bytes=>Buffer.from(bytes).toString('hex')),['7e0782ffffff0000ef','7e0782ffffff0100ef']);assert.ok(m.state.delays.filter(ms=>ms===300).length>=4);
 assert.match(b.w.document.getElementById('of21TimerReturned').textContent,/07:30.*Mon Tue Wed Thu Fri.*22:15.*Sat Sun/);
 b.w.document.getElementById('of21TimerTime').value='08:45';b.w.document.getElementById('of21TimerEnabled').checked=false;for(const day of b.w.document.querySelectorAll('.of21-day'))day.checked=['0','2'].includes(day.value);
 const before=m.state.writes.nokins.length;assert.equal(await b.run('of21NativeRun("timer")'),true);
 assert.deepEqual(m.state.writes.nokins.slice(before,before+2),[[126,7,130,8,45,0,0,5,239],[126,7,130,22,15,0,1,224,239]]);
 assert.match(b.w.document.getElementById('of21NativeResult').textContent,/Both returned timer slots match/);
 const requested=JSON.parse(b.w.localStorage.getItem('smartease-of21-native-v1')).requested['nokins-1'].timers;assert.deepEqual(requested,[{kind:0,hour:8,minute:45,days:5,enabled:false},{kind:1,hour:22,minute:15,days:96,enabled:true}]);
 assert.deepEqual(m.state.writes.sp608e,[]);assert.deepEqual(m.state.writes.trinka,[]);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('OF21 timer readback rejects echoes, missing slot and old connection state without resetting unknown timers',async()=>{
 for(const variant of ['echo','missing','reconnect']){
  const b=boot(),m=installThreeDeviceMock(b,{timerNotify:true,timerEcho:variant==='echo'});await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;
  if(variant==='missing')delete m.state.timers[1];
  assert.equal(await b.run('of21NativeRun("read-timers")'),variant==='reconnect');
  if(variant==='reconnect'){b.run('cartDevices[2].disconnect()');await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;}
  m.emitTimer([126,7,130,22,15,0,1,224,239]);const before=m.state.writes.nokins.length;
  assert.equal(await b.run('of21NativeRun("timer")'),false);assert.equal(m.state.writes.nokins.length,before);assert.equal(b.errors.length,0);b.dom.window.close();
 }
});

test('OF21 returned timer mismatch is disclosed without retrying or claiming device acceptance',async()=>{
 const b=boot(),m=installThreeDeviceMock(b,{read:true,ignoreTimerWrites:true});await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;
 await b.run('of21NativeRun("read-timers")');b.w.document.getElementById('of21TimerTime').value='09:15';
 const before=m.state.writes.nokins.length;assert.equal(await b.run('of21NativeRun("timer")'),true);assert.equal(m.state.writes.nokins.length-before,4);assert.match(b.w.document.getElementById('of21NativeResult').textContent,/differ/);b.dom.window.close();
});

test('OF21 setup is explicit, keeps requested count/order separate from returned geometry and never changes other devices',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;
 b.w.document.getElementById('of21Count').value='300';b.w.document.getElementById('of21Order').value='GRB';
 assert.equal(await b.run('of21NativeRun("count")'),false);assert.equal(await b.run('of21NativeRun("order")'),false);assert.equal(m.state.writes.nokins.length,0);
 b.w.document.getElementById('of21Topology').checked=true;m.state.notifyOnQuery=true;
 assert.equal(await b.run('of21NativeRun("count")'),true);assert.deepEqual(m.state.writes.nokins[0],[126,7,33,44,1,0,255,0,239]);assert.equal(b.run('cartDevices[2].of21.totalNodes'),300);assert.match(b.w.document.getElementById('of21NativeResult').textContent,/matches returned/);
 assert.equal(await b.run('of21NativeRun("order")'),true);assert.deepEqual(m.state.writes.nokins.at(-1),[126,7,129,2,1,3,255,0,239]);
 b.w.document.getElementById('of21Collapse').checked=true;assert.equal(await b.run('of21NativeRun("collapse")'),true);assert.deepEqual(m.state.writes.nokins.at(-1),[126,7,34,1,255,255,255,0,239]);
 b.w.document.getElementById('of21Sensitivity').value='100';assert.equal(await b.run('of21NativeRun("sensitivity")'),true);assert.deepEqual(m.state.writes.nokins.at(-1),[126,7,6,100,255,255,255,0,239]);
 const count=m.state.writes.nokins.length;b.w.document.getElementById('of21Count').value='1001';assert.equal(await b.run('of21NativeRun("count")'),false);assert.equal(m.state.writes.nokins.length,count);
 const storage=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));assert.match(b.w.document.getElementById('of21Requested').textContent,/Local last requests \(not readback\)/);assert.equal(b.errors.length,0);b.dom.window.close();
 const again=boot(storage),n=installThreeDeviceMock(again);await again.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');assert.deepEqual(n.state.writes.nokins,[]);assert.equal(again.run('cartDevices[2].of21.totalNodes??null'),null);assert.equal(again.w.document.getElementById('of21Count').value,'');assert.match(again.w.document.getElementById('of21Requested').textContent,/point-count 300/);assert.equal(again.errors.length,0);again.dom.window.close();
});

test('OF21 local pattern editor saves, reloads and deletes without commands or restoring configuration',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);assert.equal(await b.run('of21NativeRun("save")'),true);assert.equal(m.state.requests.length,0);assert.equal(b.run('of21Local.scenes.length'),1);assert.equal(b.w.document.getElementById('of21DiyPreview').children.length,10);
 const stored=b.w.localStorage.getItem('smartease-of21-native-v1');b.dom.window.close();const again=boot({'smartease-of21-native-v1':stored}),n=installThreeDeviceMock(again);
 again.w.document.getElementById('of21DiyColors').value='#00ff00';assert.equal(await again.run('of21NativeRun("load")'),true);assert.equal(again.w.document.getElementById('of21DiyColors').value.split(' ').length,10);
 again.w.document.getElementById('of21DiyMode').value='1';assert.equal(await again.run('of21NativeRun("save")'),false);again.w.document.getElementById('of21DiyColors').value='#804000 #0000ff';assert.equal(await again.run('of21NativeRun("save")'),true);
 assert.equal(await again.run('of21NativeRun("delete")'),true);assert.equal(again.run('of21Local.scenes.length'),1);assert.equal(n.state.requests.length,0);assert.deepEqual(n.state.writes,{sp608e:[],nokins:[],trinka:[]});assert.equal(again.errors.length,0);again.dom.window.close();
});

test('OF21 DIY upload requires current returned geometry and explicit consent, then serializes all nine-byte packets',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;
 assert.equal(await b.run('of21NativeRun("upload")'),false);b.w.document.getElementById('of21BulkConsent').checked=true;assert.equal(await b.run('of21NativeRun("upload")'),false);assert.equal(m.state.writes.nokins.length,0);
 m.state.notifyOnQuery=true;assert.equal(await b.run('of21Run("nodes")'),true);assert.equal(await b.run('of21NativeRun("use-geometry")'),true);assert.equal(b.w.document.getElementById('of21DiyTotal').value,'96');
 const before=m.state.writes.nokins.length;const expected=JSON.parse(b.run('JSON.stringify(SmartEaseOF21.diy(of21Draft()).packets)'));
 const bulk=b.run('of21NativeRun("upload")'),ordinary=b.run('cartDevices[2].ownerCommand("speed",50)');assert.equal(await bulk,true);assert.equal(await ordinary,true);
 assert.deepEqual(m.state.writes.nokins.slice(before,before+expected.length),expected);assert.deepEqual(m.state.writes.nokins.at(-1),[126,7,2,50,255,255,255,0,239]);assert.equal(m.state.peak,1);assert.equal(m.state.delays.filter(d=>d===75).length,expected.length);
 assert.match(b.w.document.getElementById('of21NativeResult').textContent,/No device ACK/);assert.equal(b.w.document.getElementById('of21BulkConsent').checked,false);
 b.run('cartDevices[2].disconnect()');await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;b.w.document.getElementById('of21BulkConsent').checked=true;
 assert.equal(await b.run('of21NativeRun("upload")'),false);assert.equal(m.state.writes.nokins.length,before+expected.length+1);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('OF21 cancellation of an in-flight DIY packet returns immediately, blocks unsafe follow-up and keeps other links',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);for(const id of ['sp608e','nokins','trinka'])await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`);b.w.document.getElementById('of21Parked').checked=true;m.state.notifyOnQuery=true;await b.run('of21Run("nodes")');await b.run('of21NativeRun("use-geometry")');b.w.document.getElementById('of21BulkConsent').checked=true;
 const before=m.state.writes.nokins.length;let started;const start=new Promise(resolve=>{started=resolve;});m.chars.nokins.writer.writeValueWithResponse=bytes=>{m.state.writes.nokins.push(Array.from(bytes));started();return new Promise(()=>{});};
 const pending=b.run('of21NativeRun("upload")');await start;b.w.document.getElementById('of21CancelNative').onclick();assert.equal(await pending,false);assert.equal(m.state.writes.nokins.length,before+1);assert.equal(b.run('of21Busy'),false);assert.equal(b.run('cartDevices[2].connected'),true);assert.equal(b.run('cartDevices[2].controlReady'),false);assert.throws(()=>b.run('cartDevices[2].ownerCommand("speed",50)'),/writable/);
 assert.equal(b.run('isLive()&&cartDevices[1].connected'),true);assert.deepEqual(m.state.writes.sp608e,[]);assert.deepEqual(m.state.writes.trinka,[]);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('OF21 failed bulk packet stops once with no automatic retry and leaves acceptance uncertain',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;m.state.notifyOnQuery=true;await b.run('of21Run("nodes")');await b.run('of21NativeRun("use-geometry")');b.w.document.getElementById('of21BulkConsent').checked=true;
 let writes=0;const original=m.chars.nokins.writer.writeValueWithResponse;m.chars.nokins.writer.writeValueWithResponse=async bytes=>{writes++;if(writes===2)throw Error('packet failed');return original(bytes);};
 assert.equal(await b.run('of21NativeRun("upload")'),false);assert.equal(writes,2);assert.equal(b.run('cartDevices[2].controlReady'),false);assert.match(b.w.document.getElementById('of21NativeResult').textContent,/partial pattern.*No retry/);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('OF21 uncertain write timeout requires reconnect and consent is cleared across connection changes',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;b.run('SmartEasePairing.stageTimeoutMs=20');
 const original=m.chars.nokins.writer.writeValueWithResponse;m.chars.nokins.writer.writeValueWithResponse=()=>new Promise(()=>{});
 assert.equal(await b.run('of21NativeRun("sensitivity")'),false);assert.equal(b.run('cartDevices[2].controlReady'),false);assert.match(b.w.document.getElementById('of21LiveStatus').textContent,/uncertain.*reconnect/);
 b.w.document.getElementById('of21Topology').checked=true;b.w.document.getElementById('of21BulkConsent').checked=true;
 b.run('cartDevices[2].disconnect()');m.chars.nokins.writer.writeValueWithResponse=original;await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');
 assert.equal(b.run('cartDevices[2].controlReady'),true);assert.equal(b.w.document.getElementById('of21Topology').checked,false);assert.equal(b.w.document.getElementById('of21BulkConsent').checked,false);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('OF21 offline library preserves unreadable storage and rolls back failed local saves',async()=>{
 const invalid='{"version":1,"scenes":[{"name":"broken","project":{}}],"requested":{}}';const b=boot({'smartease-of21-native-v1':invalid}),m=installThreeDeviceMock(b);
 assert.equal(await b.run('of21NativeRun("save")'),false);assert.equal(b.w.localStorage.getItem('smartease-of21-native-v1'),invalid);assert.equal(b.run('of21Local.scenes.length'),0);assert.match(b.w.document.getElementById('of21NativeResult').textContent,/preserved/);assert.equal(m.state.requests.length,0);assert.equal(b.errors.length,0);b.dom.window.close();
 const clean=boot();installThreeDeviceMock(clean);clean.run('Storage.prototype.setItem=function(){throw new Error("full");}');assert.equal(await clean.run('of21NativeRun("save")'),false);assert.equal(clean.run('of21Local.scenes.length'),0);assert.match(clean.w.document.getElementById('of21NativeResult').textContent,/could not save/);clean.dom.window.close();
});

test('OF21 returned geometry outside native bounds is surfaced and cannot enable bulk send',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("nokins",{toggle:false})');b.w.document.getElementById('of21Parked').checked=true;m.emitGeometry(2000);await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(b.run('cartDevices[2].of21.totalNodes'),2000,b.run('JSON.stringify({profile:cartDevices[2].profile,connected:cartDevices[2].connected,generation:cartDevices[2].ownerLink.generation,geometry:cartDevices[2].of21.geometryGeneration,parse:SmartEaseOF21.parseGeometry([126,7,55,208,7,255,0,136,239])})'));
 assert.equal(b.run('cartDevices[2].of21.geometryGeneration'),b.run('cartDevices[2].ownerLink.generation'));assert.equal(b.errors.length,0,b.errors.map(e=>e.stack).join('\n'));
 assert.match(b.w.document.getElementById('of21Nodes').textContent,/2000/);await b.run('of21NativeRun("use-geometry")');b.w.document.getElementById('of21BulkConsent').checked=true;
 assert.equal(await b.run('of21NativeRun("upload")'),false);assert.equal(m.state.writes.nokins.length,0);assert.match(b.w.document.getElementById('of21NativeResult').textContent,/10–1000/);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('every built-in scene saves an override with stable identity, distinct copy and latest Home playback after reload',async()=>{
 const b=boot();const ids=JSON.parse(b.run('JSON.stringify(E.presets.map(s=>s.id))'));
 for(const [index,id] of ids.entries()){
  b.run(`editScene(sceneById('${id}'))`);b.run(`draft['front-bumper'].color='#${(0x110000+index*257).toString(16).padStart(6,'0')}'`);
  assert.equal(b.run('!!saveDesignerScene()'),true);assert.equal(b.run(`sceneById('${id}').revision`),1);assert.equal(b.run('activeScene.id'),id);
  b.run("draft['front-bumper'].brightness=61");assert.equal(b.run('!!saveDesignerScene()'),true);assert.equal(b.run(`sceneById('${id}').revision`),2);
 }
 assert.equal(b.run('czState.scenes.length'),ids.length);assert.equal(b.run('new Set(allSceneVersions().map(s=>s.id)).size===allSceneVersions().length'),true);
 b.run('editScene(sceneById("haunted"))');const before=b.run('czState.scenes.length');assert.equal(b.run('!!saveDesignerScene(true)'),true);assert.equal(b.run('czState.scenes.length'),before+1);assert.notEqual(b.run('editingSceneId'),'haunted');
 b.run('editScene(sceneById("haunted"));saveDesignerScene()');const state=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));b.dom.window.close();
 const again=boot(state);assert.equal(again.run('sceneById("haunted").revision'),3);assert.equal(again.run('activeScene.id'),'haunted');
 again.run('chooseScene=scene=>{globalThis.playedSavedScene=scene;return true;}');again.w.document.getElementById('featureHauntedPlay').onclick();assert.equal(again.run('playedSavedScene.revision'),3);assert.equal(again.run('playedSavedScene.rows["front-bumper"].brightness'),61);assert.equal(again.errors.length,0);again.dom.window.close();
});

test('failed scene storage is visible and preserves the saved revision plus recoverable/exportable current draft',()=>{
 const b=boot();b.run('editScene(sceneById("haunted"));saveDesignerScene()');const saved=b.w.localStorage.getItem('smartease-cart-zones-v2')||b.run('localStorage.getItem(CZ_STORE)');
 b.run("draft.canopy.color='#123456'");b.w.document.getElementById('sceneName').value='Edited but not saved';b.run('rememberSceneDraft()');const recovery=b.w.localStorage.getItem('smartease-scene-draft-v1');assert.ok(recovery);
 b.run('Storage.prototype.setItem=function(){throw new DOMException("full","QuotaExceededError");}');assert.equal(b.run('saveDesignerScene()'),false);assert.equal(b.run('sceneById("haunted").revision'),1);assert.equal(b.run('draft.canopy.color'),'#123456');assert.equal(b.run('sceneDraftSnapshot().name'),'Edited but not saved');assert.match(b.w.document.getElementById('sceneSaveStatus').textContent,/Could not save.*Export/);assert.equal(b.run('localStorage.getItem(CZ_STORE)'),saved);
 b.w.document.getElementById('recoverSceneDraft').onclick();assert.equal(b.run('draft.canopy.color'),'#123456');assert.equal(b.w.document.getElementById('sceneName').value,'Edited but not saved');assert.equal(b.errors.length,0);b.dom.window.close();
});

test('Devices Edit actions allow independent offline editing and save complete scene snapshots without touching standalone project or calibration',async()=>{
 const project=require('../display-project.js').create(96,16);const original=JSON.stringify(project),cal='{"2":[100,65,100]}';
 const b=boot({'smartease-display-project-v1':original,'smartease-sp608e-rgb-balance-v1':cal}),m=installThreeDeviceMock(b);b.run('go("devices")');
 for(const [id,panel] of [['sp608e','studioSP'],['nokins','studioNokins'],['trinka','studioEyes']]){b.w.document.getElementById('deviceEdit-'+id).onclick();assert.equal(b.w.document.querySelector('[data-page="create"]').hidden,false);assert.equal(b.w.document.getElementById(panel).hidden,false);}
 b.w.document.getElementById('studioSPMode').value='outputs';b.w.document.getElementById('studioPortColor').value='#aabbcc';b.w.document.getElementById('studioPortColor').dispatchEvent(new b.w.Event('input',{bubbles:true}));
 b.w.document.getElementById('studioNKind').value='effect';b.w.document.getElementById('of21Effects').value='233';b.w.document.getElementById('of21Level').value='37';
 b.w.document.getElementById('displayPaint').value='#ff0000';b.w.document.getElementById('displayPixel').click();b.w.document.getElementById('sceneName').value='Complete cart draft';assert.equal(b.run('!!saveDesignerScene()'),true);const id=b.run('editingSceneId');
 assert.equal(b.run('sceneById(editingSceneId).composition.sp608e.channels[1].color'),'#aabbcc');assert.equal(b.run('sceneById(editingSceneId).composition.nokins.effect'),233);assert.equal(b.run('sceneById(editingSceneId).composition.trinka.project.programs[0].frames[0].pixels[0]'),0xff0000);assert.equal(b.w.localStorage.getItem('smartease-display-project-v1'),original);assert.equal(b.w.localStorage.getItem('smartease-sp608e-rgb-balance-v1'),cal);assert.equal(m.state.requests.length,0);
 const state=Object.fromEntries(Object.keys(b.w.localStorage).map(k=>[k,b.w.localStorage.getItem(k)]));b.dom.window.close();const again=boot(state);again.run(`editScene(sceneById('${id}'))`);assert.equal(again.w.document.getElementById('of21Effects').value,'233');assert.equal(again.run('displayProject.programs[0].frames[0].pixels[0]'),0xff0000);assert.equal(again.run('studioChannels[1].color'),'#aabbcc');assert.equal(again.w.localStorage.getItem('smartease-display-project-v1'),original);assert.equal(again.errors.length,0);again.dom.window.close();
});

test('whole-cart Apply coordinates supported queues and reports included UX as unsupported, never complete',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);for(const id of ['sp608e','nokins','trinka'])await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`);b.w.document.getElementById('studioParked').checked=true;
 b.run('cartDevices[0].apply=async(rows,guard)=>{globalThis.coordinatedSP=rows;return guard();}');b.w.document.getElementById('studioNKind').value='effect';b.w.document.getElementById('of21Effects').value='233';
 const result=await b.w.document.getElementById('studioApplyAll').onclick();assert.equal(result.complete,false);assert.deepEqual(Array.from(result.results,r=>r.status),['submitted','submitted','unsupported']);assert.ok(m.state.writes.nokins.some(bytes=>bytes[2]===3&&bytes[3]===233));assert.equal(m.state.writes.trinka.length,0);assert.match(b.w.document.getElementById('studioResults').textContent,/incomplete/);assert.match(b.w.document.getElementById('homeStudioResults').textContent,/unsupported/);
 b.w.document.getElementById('studioEyesInclude').checked=false;const lights=await b.w.document.getElementById('studioApplyAll').onclick();assert.equal(lights.complete,true);assert.equal(lights.results.at(-1).status,'excluded');assert.equal(b.errors.length,0);b.dom.window.close();
});

test('individual native SP drafts keep per-output settings and reapply calibrated RGB after power-on',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);await b.run('SmartEaseConnections.connectOne("sp608e",{toggle:false})');b.w.document.getElementById('studioParked').checked=true;b.w.document.getElementById('studioSPMode').value='outputs';
 b.run('for(const r of Object.values(studioChannels))r.include=false;studioChannels[1].include=true;studioChannels[1].effect=25;studioChannels[1].color="#123456";studioRenderPort();enqueuePackets=async packets=>{globalThis.studioPackets=packets;return true;}');
 const result=await b.w.document.getElementById('studioApplySP').onclick();assert.equal(result.complete,true);const packets=JSON.parse(b.run('JSON.stringify(studioPackets)'));const power=packets.findIndex(p=>p[1]===0x82),rgb=packets.findIndex(p=>p[1]===0x89);assert.ok(power>=0&&rgb>power);assert.ok(packets.every(p=>p[3]===1));assert.equal(m.state.writes.nokins.length,0);assert.equal(m.state.writes.trinka.length,0);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('stale scene objects and Home power-on resolve the latest persisted custom revision',async()=>{
 const b=boot();b.run('editScene(sceneById("haunted"));saveDesignerScene(true);globalThis.oldSceneObject=sceneById(editingSceneId);draft.canopy.color="#abcdef";saveDesignerScene();SmartEaseStudio.applyScene=async scene=>{globalThis.appliedRevisionScene=scene;return {complete:true,results:[]};}');
 await b.run('applyScene(oldSceneObject)');assert.equal(b.run('appliedRevisionScene.revision'),2);assert.equal(b.run('appliedRevisionScene.rows.canopy.color'),'#abcdef');b.run('activeScene=oldSceneObject;powered=false');await b.w.document.getElementById('cartPower').onclick();assert.equal(b.run('appliedRevisionScene.revision'),2);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('complete-build import validates locally and an older slow import cannot overwrite newer edits',async()=>{
 const b=boot(),m=installThreeDeviceMock(b),input=b.w.document.getElementById('studioImport');const snapshot=JSON.parse(b.run('JSON.stringify(studioCurrentScene())'));snapshot.name='Imported complete build';snapshot.composition.nokins.effect=233;
 const json=JSON.stringify({format:'smartease-complete-scene',version:1,scene:snapshot});let release;Object.defineProperty(input,'files',{configurable:true,value:[{size:json.length,text:()=>new Promise(resolve=>{release=resolve;})}]});const pending=input.onchange();b.w.document.getElementById('sceneName').value='Newer local edit';b.w.document.getElementById('sceneName').dispatchEvent(new b.w.Event('input',{bubbles:true}));release(json);assert.equal(await pending,false);assert.equal(b.w.document.getElementById('sceneName').value,'Newer local edit');
 Object.defineProperty(input,'files',{configurable:true,value:[{size:json.length,text:async()=>json}]});assert.equal(await input.onchange(),true);assert.equal(b.w.document.getElementById('sceneName').value,'Imported complete build');assert.equal(b.run('editingSceneId'),null);assert.equal(b.run('czState.scenes.length'),0);assert.equal(m.state.requests.length,0);assert.deepEqual(m.state.writes,{sp608e:[],nokins:[],trinka:[]});assert.equal(b.run('!!saveDesignerScene()'),true);assert.match(b.run('editingSceneId'),/^cart-/);assert.equal(b.errors.length,0);b.dom.window.close();
});

test('whole-cart partial failure and cancellation never report all included devices complete',async()=>{
 const b=boot(),m=installThreeDeviceMock(b);for(const id of ['sp608e','nokins','trinka'])await b.run(`SmartEaseConnections.connectOne('${id}',{toggle:false})`);b.w.document.getElementById('studioParked').checked=true;b.run('cartDevices[0].apply=async()=>false');
 const failed=await b.w.document.getElementById('studioApplyAll').onclick();assert.equal(failed.complete,false);assert.equal(failed.results[0].status,'failed');assert.equal(failed.results[1].status,'submitted');assert.equal(failed.results[2].status,'unsupported');
 let release;b.w.holdSP=new Promise(resolve=>{release=resolve;});b.run('cartDevices[0].apply=async(rows,guard)=>{await holdSP;return guard();}');const pending=b.w.document.getElementById('studioApplyAll').onclick();await Promise.resolve();b.w.document.getElementById('studioStop').onclick();release();const stopped=await pending;assert.equal(stopped.complete,false);assert.equal(stopped.results.some(r=>r.status==='cancelled'),true);assert.match(b.w.document.getElementById('studioResults').textContent,/incomplete/);assert.equal(m.state.writes.trinka.length,0);assert.equal(b.errors.length,0);b.dom.window.close();
});
