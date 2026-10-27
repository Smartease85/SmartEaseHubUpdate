/* Verified implementations register here. Unidentified devices never receive writes. */
"use strict";
class DeviceAdapter {
  constructor(id, name, capabilities = {}) {
    this.id = id;
    this.name = name;
    this.capabilities = Object.freeze(capabilities);
  }
  get connected() {
    return false;
  }
  async apply() {
    throw Error("This device is not ready for scene control.");
  }
}
class SP608EAdapter extends DeviceAdapter {
  constructor() {
    super("sp608e", "Cart lighting", {
      scenes: true,
      colors: true,
      builtInEffects: true,
      pixelUpload: false,
      firmwareSave: false,
    });
  }
  get connected() {
    return canSend();
  }
  connect() {
    return connect(rememberedDevice ? "remembered" : "name");
  }
  reconnect() {
    return connect("remembered");
  }
  disconnect() {
    disconnect();
  }
  async apply(rows, guard) {
    // Controller-native effects need the physical LED chip order corrected
    // BEFORE setting an effect. The same output mapping is shared by every
    // SmartEase scene and survives device power cycles through local storage.
    const outputs = [...new Set(SmartEaseEngine.zones.flatMap(
      (zone) => czState.zones[zone]?.channels || [],
    ))].filter(n => czState.activeOutputs.includes(n));
    if (!await spEnsureChipColors(outputs, guard)) return false;
    if (guard && !guard()) return false;
    const jobs = SmartEaseEngine.commands(
      rows,
      czState.zones,
      czState.activeOutputs,
      hauntedColorCommand,
    );
    return enqueuePackets(jobs, "SmartEase scene", { guard });
  }
  power(on) {
    const mask = czUniqueOutputs().reduce((m, n) => m | maskFor(n - 1), 0);
    return sendPower(mask, on);
  }
}
class IdentifiableDeviceAdapter extends DeviceAdapter {
  constructor(id, name) {
    super(id, name, {
      discovery: true,
      scenes: false,
      firmwareSave: false,
      pixelUpload: false,
    });
    this.device = null;
    this.identity = null;
    this.protocolReport = null;
  }
  async inspectCoolLedProtocol() {
    // Read-only interoperability discovery. No characteristic reads or writes,
    // notifications, firmware commands, pairing PINs or stored content changes.
    if (!this.device) throw Error("Identify your Devil Eyes first, then inspect the selected controller.");
    const serviceId="0000fff0-0000-1000-8000-00805f9b34fb";
    const name=this.device.name||"Unnamed display";
    const family=/coolledux/i.test(name)?"CoolLEDUX candidate":
      /coolledx/i.test(name)?"CoolLEDX candidate":
      /coolledm/i.test(name)?"CoolLEDM candidate":
      /coolledu/i.test(name)?"CoolLEDU candidate":"Family unknown";
    if(!this.device.gatt||typeof this.device.gatt.connect!=="function")
      throw Error("Selected device does not expose GATT access in this browser.");
    let server,service,characteristics=[],serviceFound=false,detail="";
    try{
      server=await this.device.gatt.connect();
      try{
        service=await server.getPrimaryService(serviceId);
        serviceFound=true;
        // UUIDs/properties are metadata only; do not call readValue/startNotifications.
        const chars=await service.getCharacteristics();
        characteristics=chars.map(ch=>({
          uuid:String(ch.uuid||""),
          read:!!ch.properties?.read,
          notify:!!ch.properties?.notify,
          write:!!ch.properties?.write,
          writeWithoutResponse:!!ch.properties?.writeWithoutResponse
        }));
      }catch(error){
        detail="FFF0 service unavailable: "+(error.message||String(error));
      }
    }finally{
      // Never hold a connection that would block CoolLED1248 from reattaching.
      if(this.device.gatt?.connected)this.device.gatt.disconnect();
    }
    this.protocolReport={
      name,family,service:serviceId,serviceFound,characteristics,
      detail:serviceFound?"Service discovered; controller family still unverified.":detail,
      inspectedAt:new Date().toISOString(),writesSent:0
    };
    return this.protocolReport;
  }
  async identify() {
    if (!navigator.bluetooth)
      throw Error("Open this app in Bluefy to find nearby lights.");
    // No speculative service access or protocol writes. Identity is evidence, not support.
    const picked = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      // Read-only protocol inspection needs explicit access to the
      // documented shared CoolLED service; identify itself does not connect.
      optionalServices: ["0000fff0-0000-1000-8000-00805f9b34fb"],
    });
    this.device = picked;
    this.protocolReport = null;
    this.identity = {
      name: picked.name || "Unnamed device",
      id: picked.id,
      identifiedAt: new Date().toISOString(),
    };
    return this.identity;
  }
}
class CartSession {
  constructor(adapters) {
    this.adapters = adapters;
    this.generation = 0;
  }
  stop() {
    this.generation++;
    hauntedEnd("Stopped");
    stopStudio();
  }
  async apply(rows, accessories) {
    this.stop();
    const generation = this.generation;
    const targets = this.adapters.filter(
      (a) => a.capabilities.scenes && a.connected && a.sceneEnabled !== false,
    );
    if (!targets.length) throw Error("Connect your cart lighting first.");
    const results = [];
    for (const adapter of targets) {
      try {
        const ok = await adapter.apply(
          rows,
          () =>
            this.generation === generation &&
            document.visibilityState !== "hidden",
          accessories,
        );
        results.push({ id: adapter.id, ok: !!ok });
      } catch (error) {
        results.push({ id: adapter.id, ok: false, error: error.message });
      }
      if (this.generation !== generation) break;
    }
    return { cancelled: this.generation !== generation, results };
  }
}
class LotusLampAdapter extends DeviceAdapter {
  constructor() {
    super("nokins", "NOKINS RGB Deluxe", {
      discovery: true,
      scenes: true,
      colors: true,
      builtInEffects: false,
      pixelUpload: false,
      firmwareSave: false,
    });
    this.device = null;
    this.characteristic = null;
    this.profile = null;
    this.sceneEnabled = false;
    this.queue = Promise.resolve();
    this.session = 0;
    this.connecting = false;
    this.manual = false;
    this.retry = 0;
    this.timer = null;
    this.lastError = "";
    this.listeners = new WeakSet();
  }
  get connected() {
    return (
      !!this.device?.gatt?.connected && !!this.characteristic && !!this.profile
    );
  }
  emit() {
    if (typeof window.updateCartDeviceUI === "function")
      window.updateCartDeviceUI();
  }
  async connect(pickNew = false) {
    if (this.connecting) return false;
    if (!navigator.bluetooth)
      throw Error("Open SmartEase in Bluefy to connect your lighting.");
    if (transport === "demo") exitDemo();
    const attempt = ++this.session;
    this.connecting = true;
    this.manual = false;
    clearTimeout(this.timer);
    this.emit();
    try {
      if (!this.device || pickNew) {
        this.device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ["0000fff0-0000-1000-8000-00805f9b34fb"],
        });
      }
      const picked = this.device;
      this.profile = SmartEaseLotus.profile(picked.name);
      this.identity = {
        name: picked.name || "Unnamed lighting",
        id: picked.id,
        identifiedAt: new Date().toISOString(),
      };
      if (!this.profile)
        throw Error(
          "This LotusLamp model still needs setup. Continue using LotusLamp X for now.",
        );
      if (!this.listeners.has(picked)) {
        picked.addEventListener("gattserverdisconnected", () => {
          if (this.device !== picked) return;
          this.session++;
          this.characteristic = null;
          this.emit();
          this.scheduleReconnect();
        });
        this.listeners.add(picked);
      }
      const server = await picked.gatt.connect();
      const service = await server.getPrimaryService(
        "0000fff0-0000-1000-8000-00805f9b34fb",
      );
      const characteristic = await service.getCharacteristic(
        "0000fff3-0000-1000-8000-00805f9b34fb",
      );
      if (
        !characteristic.properties.writeWithoutResponse ||
        typeof characteristic.writeValueWithoutResponse !== "function"
      )
        throw Error("This lighting controller needs a different setup.");
      if (attempt !== this.session || this.manual)
        throw Error("Connection cancelled.");
      this.characteristic = characteristic;
      this.session++;
      this.retry = 0;
      this.lastError = "";
      try {
        localStorage.setItem("smartease-nokins-device-v1", picked.id);
      } catch {}
      return true;
    } catch (error) {
      this.lastError = error.message;
      this.manual = true;
      try {
        this.device?.gatt?.disconnect();
      } catch {}
      this.characteristic = null;
      throw error;
    } finally {
      this.connecting = false;
      this.emit();
    }
  }
  reconnect() {
    return this.connect();
  }
  disconnect() {
    this.manual = true;
    this.session++;
    clearTimeout(this.timer);
    this.characteristic = null;
    try {
      this.device?.gatt?.disconnect();
    } catch {}
    this.emit();
  }
  scheduleReconnect() {
    clearTimeout(this.timer);
    if (
      this.manual ||
      !autoReconnectOn ||
      this.connected ||
      this.connecting ||
      !this.device ||
      document.visibilityState !== "visible" ||
      this.retry >= 6
    )
      return;
    const delay = [1500, 2500, 4500, 8000, 15000, 25000][this.retry++];
    this.timer = setTimeout(async () => {
      try {
        await this.reconnect();
      } catch {
        this.manual = false;
        this.scheduleReconnect();
      }
    }, delay);
  }
  async restoreGranted() {
    if (!navigator.bluetooth?.getDevices) return;
    try {
      const id = localStorage.getItem("smartease-nokins-device-v1");
      if (!id) return;
      const devices = await navigator.bluetooth.getDevices();
      this.device = devices.find((d) => d.id === id) || null;
      if (
        this.device &&
        autoReconnectOn &&
        !this.manual &&
        transport !== "demo"
      )
        await this.connect();
    } catch {}
  }
  write(jobs, guard = () => true) {
    const session = this.session;
    const task = this.queue
      .catch(() => false)
      .then(async () => {
        for (const bytes of jobs) {
          if (session !== this.session || !guard() || !this.connected)
            return false;
          try {
            await this.characteristic.writeValueWithoutResponse(
              Uint8Array.from(bytes),
            );
          } catch (e) {
            this.lastError = e.message;
            return false;
          }
          await sleep(180);
        }
        return true;
      });
    this.queue = task.catch(() => false);
    return task;
  }
  apply(rows, guard, accessories) {
    const design = SmartEaseEngine.accessories(
      accessories,
      rows["front-bumper"],
    ).nokins;
    const target =
      design.follow === "front"
        ? { ...rows["front-bumper"], on: design.on && rows["front-bumper"].on }
        : { on: design.on, color: design.color, brightness: design.brightness };
    return this.write(SmartEaseLotus.commands(this.profile, target), guard);
  }
  power(on) {
    return this.write(
      SmartEaseLotus.commands(this.profile, {
        on,
        color: "#49e3d2",
        brightness: 45,
      }),
    );
  }
}
const cartDevices = [
  new SP608EAdapter(),
  new IdentifiableDeviceAdapter("trinka", "TRINKA Devil Eyes"),
  new LotusLampAdapter(),
];
const cartSession = new CartSession(cartDevices);
document.addEventListener("visibilitychange", () => {
  const adapter = cartDevices[2];
  if (document.visibilityState === "hidden") clearTimeout(adapter.timer);
  else adapter.scheduleReconnect();
});
window.addEventListener("pagehide", () => clearTimeout(cartDevices[2].timer));
