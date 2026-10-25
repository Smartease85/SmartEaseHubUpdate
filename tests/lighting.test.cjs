const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const E = require("../lighting-engine.js");
const Lotus = require("../lotus-protocol.js");
test("Lotus identity gates only explicitly researched models", () => {
  assert.equal(Lotus.profile("ELK-BLEDOB"), "bledob");
  assert.equal(Lotus.profile("MELK-OA10   5F"), "melk-oa10");
  for (const n of [
    "ELK-BLEDOM",
    "ELK-BLEDOB2",
    "ELK-CAR",
    "MELK-unknown",
    "NOKINS",
  ])
    assert.equal(Lotus.profile(n), null);
});
test("Lotus variants retain distinct captured brightness frames and exclude speculative MELK power", () => {
  const row = { on: true, color: "#123456", brightness: 45 };
  assert.deepEqual(Lotus.commands("bledob", row), [
    [126, 7, 4, 255, 0, 1, 2, 1, 239],
    [126, 7, 5, 3, 18, 52, 86, 16, 239],
    [126, 4, 1, 45, 1, 255, 2, 1, 239],
  ]);
  const melk = Lotus.commands("melk-oa10", row);
  assert.deepEqual(melk, [
    [126, 7, 5, 3, 18, 52, 86, 16, 239],
    [126, 7, 1, 45, 255, 255, 255, 0, 239],
  ]);
  assert.ok(melk.every((p) => p[2] !== 4));
  assert.equal(Lotus.commands("melk-oa10", { ...row, on: false })[0][3], 0);
  assert.throws(() => Lotus.commands("generic-elk", row));
});
const mapping = Object.fromEntries(
  E.zones.map((id, i) => [id, { channels: [i + 1] }]),
);
const calibrate = (n, c) => [
  0x88,
  0x89,
  5,
  1 << (n - 1),
  ...[1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)),
  255,
];
test("five zones: front-to-rear gradient retains equal left/right colors", () => {
  assert.equal(E.zones.length, 5);
  const rows = E.rows(["#ff0000", "#0000ff"]);
  assert.equal(rows["front-bumper"].color, "#ff0000");
  assert.equal(rows["rear-bumper"].color, "#0000ff");
  assert.equal(rows["left-under"].color, rows["right-under"].color);
});
test("all presets validate; Halloween contains three-color twinkles", () => {
  for (const scene of E.presets) E.validateRows(scene.rows);
  const h = E.presets[0];
  assert.equal(h.id, "haunted");
  assert.equal(new Set(Object.values(h.rows).map((r) => r.color)).size, 3);
  assert.ok(Object.values(h.rows).every((r) => r.effect === 3));
});
test("scene packets never touch unmapped outputs, RGB order, NVM, or pixels", () => {
  const jobs = E.commands(E.rows(), mapping, [1, 2, 3, 4, 5], calibrate);
  assert.equal(jobs.length, 20);
  for (const p of jobs) {
    assert.equal(p[0], 0x88);
    assert.equal(p[2], p.length - 3);
    assert.ok([0x82, 0x83, 0x85, 0x86, 0x89].includes(p[1]));
    assert.ok(p[3] <= 16);
  }
});
test("supplied RGB calibration is used on every output", () => {
  const visited = [];
  const jobs = E.commands(E.rows(), mapping, [1, 2, 3, 4, 5], (n, c) => {
    visited.push(n);
    return [0x88, 0x89, 5, 1 << (n - 1), 3, 2, 1, 255];
  });
  assert.deepEqual(visited, [1, 2, 3, 4, 5]);
  assert.ok(jobs.filter((p) => p[1] === 0x89).every((p) => p[4] === 3));
});
test("invalid mapping and malformed scene cannot produce commands", () => {
  const duplicate = structuredClone(mapping);
  duplicate.canopy.channels = [1];
  assert.throws(() =>
    E.commands(E.rows(), duplicate, [1, 2, 3, 4, 5], calibrate),
  );
  assert.throws(() => E.commands(E.rows(), mapping, [1, 2, 3, 4], calibrate));
  const bad = E.rows();
  bad.canopy.color = "bad";
  assert.throws(() => E.commands(bad, mapping, [1, 2, 3, 4, 5], calibrate));
  assert.throws(() => E.validateRows({}));
});
function legacy() {
  const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
  let source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  source = source.replace("installUI();installHaunted();installAutoBle();", "");
  const elements = new Map();
  const el = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        checked: false,
        textContent: "",
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        setAttribute() {},
        replaceChildren() {},
      });
    return elements.get(id);
  };
  const context = vm.createContext({
    console,
    Uint8Array,
    DataView,
    Date,
    Map,
    WeakSet,
    Set,
    Promise,
    URLSearchParams,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    navigator: {},
    location: { protocol: "http:", search: "" },
    document: {
      getElementById: el,
      visibilityState: "visible",
      querySelectorAll() {
        return [];
      },
      addEventListener() {},
    },
    window: { addEventListener() {} },
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(source, context);
  vm.runInContext(
    "updateCounters=()=>{};renderState=()=>{};updateTransport=()=>{};hauntedButtons=()=>{};notify=()=>{};scheduleRead=()=>{};",
    context,
  );
  return context;
}
test("simulated BLE serializes power/color/brightness writes byte for byte", async () => {
  const c = legacy();
  vm.runInContext(
    'globalThis.written=[];transport="ble";device={gatt:{connected:true}};char={properties:{write:true},writeValueWithResponse:async b=>{written.push(Array.from(b));}};',
    c,
  );
  await vm.runInContext(
    'Promise.all([sendPower(3,true),sendRgb(4,"#123456"),sendBrightness(16,115)])',
    c,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(c.written)), [
    [0x88, 0x82, 2, 3, 1],
    [0x88, 0x89, 5, 4, 18, 52, 86, 255],
    [0x88, 0x85, 2, 16, 115],
  ]);
});
test("cancelled session and guarded scene discard queued writes", async () => {
  const c = legacy();
  vm.runInContext(
    'globalThis.written=[];transport="ble";device={gatt:{connected:true}};char={properties:{write:true},writeValueWithResponse:async b=>written.push(Array.from(b))};',
    c,
  );
  assert.equal(
    await vm.runInContext(
      "(async()=>{const pending=sendPower(1,true);bleSession++;return await pending;})()",
      c,
    ),
    false,
  );
  assert.equal(c.written.length, 0);
  assert.equal(
    await vm.runInContext(
      'enqueuePackets(packet(0x82,[1,1]),"cancelled",{guard:()=>false})',
      c,
    ),
    false,
  );
  assert.equal(c.written.length, 0);
});
test("fragmented readback decodes; out-of-order fragments are rejected", () => {
  const c = legacy();
  vm.runInContext(
    "globalThis.payload=new Uint8Array(88);payload[0]=1;payload[1]=25;payload[3]=115;payload[8]=70;payload[9]=239;payload[10]=119;globalThis.emit=bytes=>onNotification({target:{value:new DataView(Uint8Array.from(bytes).buffer)}});emit([54,56,1,88,44,...payload.slice(0,44)]);emit([54,56,2,88,44,...payload.slice(44)]);",
    c,
  );
  assert.equal(vm.runInContext("channels[0].color", c), "#46ef77");
  assert.equal(vm.runInContext("channels[0].known", c), true);
  vm.runInContext("emit([54,56,3,88,1,0])", c);
  assert.equal(vm.runInContext("frameBuffer", c), null);
});
test("existing RGB permutation and exact manual matches remain intact", () => {
  const c = legacy();
  assert.deepEqual(
    JSON.parse(
      vm.runInContext(
        'hauntedColorFix[1]=["g","r","b"];JSON.stringify(hauntedMatchedBytes(1,"#123456"))',
        c,
      ),
    ),
    [52, 18, 86],
  );
  assert.deepEqual(
    JSON.parse(
      vm.runInContext(
        'hauntedManualMatches[1]={"#123456":[9,8,7]};JSON.stringify(hauntedMatchedBytes(1,"#123456"))',
        c,
      ),
    ),
    [9, 8, 7],
  );
});
