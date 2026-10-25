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
