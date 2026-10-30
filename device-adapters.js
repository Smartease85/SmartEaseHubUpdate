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
  constructor(id, name, capabilities = {}) {
    super(id, name, {
      discovery: true,
      scenes: false,
      firmwareSave: false,
      pixelUpload: false,
      ...capabilities,
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
    const selectedFamily=SmartEaseCoolLEDUX.family(name);
    const family=({coolledux:"CoolLEDUX candidate",coolledx:"CoolLEDX candidate",coolledm:"CoolLEDM candidate",coolledu:"CoolLEDU candidate"})[selectedFamily]||"Family unknown";
    if(!this.device.gatt||typeof this.device.gatt.connect!=="function")
      throw Error("Selected device does not expose GATT access in this browser.");
    const wasConnected=!!this.device.gatt.connected;
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
      if(!wasConnected&&this.device.gatt?.connected)this.device.gatt.disconnect();
    }
    this.protocolReport={
      name,family,service:serviceId,serviceFound,characteristics,
      detail:serviceFound?"Service discovered; command compatibility still unverified.":detail,
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
class CoolLEDUXAdapter extends IdentifiableDeviceAdapter {
  constructor(){
    super("trinka","TRINKA Devil Eyes",{offlineCompile:true});
    // Owner screenshots establish CoolLEDUX-31B8, 16x96; connection capability remains separate.
    this.expectedFamily="coolledux";
    this.capturedInfo=null;
    this.link=new SmartEasePairing.MetadataTransport("trinka");
  }
  get connected(){return !!this.link?.connected;}
  get connecting(){return !!this.link?.connecting;}
  get lastError(){return this.link?.error||"";}
  async connect(pickNew=false){
    const previous=this.identity?.id;
    try{return await this.link.connect(pickNew);}
    finally{if(this.link.identity){this.device=this.link.device;this.identity=this.link.identity;if(previous!==this.identity.id)this.capturedInfo=null;}}
  }
  reconnect(){return this.connect();}
  disconnect(){this.link.disconnect();}
  restoreGranted(devices){if(this.link.restore(devices)){this.device=this.link.device;this.identity=this.link.identity;return true;}return false;}
  get profile(){return SmartEaseCoolLEDUX.family(this.device?.name||this.identity?.name);}
  async identify(){
    const identity=await super.identify();
    if(this.link.device&&this.link.device!==this.device)this.link.disconnect();
    this.link.device=this.device;this.link.identity=identity;
    // A capture associated with a prior selection must never follow a newly
    // selected display into its identification report. Cancelled pickers leave
    // the existing selection and its explicitly historical capture intact.
    this.capturedInfo=null;return identity;
  }
  requireUX(){
    if(this.profile!=="coolledux")throw Error("Identify the CoolLEDUX display first. X, U, M and unknown names cannot use the UX encoder.");
  }
  prepareProject(project){this.requireUX();return SmartEaseCoolLEDUX.compileProject(project);}
  prepareCommand(kind,value){this.requireUX();return SmartEaseCoolLEDUX.command(kind,value);}
  decodeCapturedInfo(text){
    this.requireUX();
    const info=SmartEaseCoolLEDUX.decodeInfo(SmartEaseCoolLEDUX.parseHex(text));
    this.capturedInfo={...info,selectedDeviceAtImport:{id:this.device?.id||this.identity?.id||null,name:this.device?.name||this.identity?.name||null},captureOriginVerified:false,importedAt:new Date().toISOString()};return this.capturedInfo;
  }
  async upload(){throw Error("Selected-program CoolLEDUX upload is not enabled. Native offers a separately admitted owner-only static test for the known UX 16x96 target; physical acceptance is pending.");}
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
      (a) => a.capabilities.scenes && a.connected && a.controlReady !== false && a.sceneEnabled !== false,
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
class OF21OfflineAdapter extends DeviceAdapter {
  constructor(){super("nokins-of21","MELK-OF21 native preparation",{offlineCompile:true,scenes:false,pixelUpload:false,firmwareSave:false});this.identity=null;}
  select(identity){if(this.identity?.id!==identity?.id){this.totalNodes=null;this.geometryGeneration=null;this.timers={};}this.identity=identity&&SmartEaseOF21.profile(identity.name)?{...identity}:null;}
  get profile(){return SmartEaseOF21.profile(this.identity?.name);}
  prepareCommand(kind,value,options){if(!this.profile)throw Error("Select the exact MELK-OF21 controller first.");return SmartEaseOF21.command(kind,value,options);}
  prepareExamples(color){if(!this.profile)throw Error("Select the exact MELK-OF21 controller first.");return {...SmartEaseOF21.examples(color),selectedDevice:{...this.identity}};}
  async transmit(){throw Error("Offline preparation cannot write. Use the selected OF21 controller's explicit guarded pattern send.");}
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
    this.of21 = new OF21OfflineAdapter();
    this.ownerLink=new SmartEasePairing.MetadataTransport("nokins");
    this.ownerLink.onNotification=bytes=>this.ownerResponse(bytes);
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
    if(this.profile==="melk-of21")return this.ownerLink.connected;
    return (
      !!this.device?.gatt?.connected && !!this.characteristic && !!this.profile
    );
  }
  get controlReady(){return this.connected&&(this.profile!=="melk-of21"||(!!this.ownerLink.report?.writeMethod&&this.ownerUncertainGeneration!==this.ownerLink.generation));}
  get connecting(){return !!this.legacyConnecting||!!this.ownerLink?.connecting;}
  set connecting(value){this.legacyConnecting=!!value;}
  async connectOwner(pickNew=false){
    this.manual=false;
    this.session++;
    try{return await this.ownerLink.connect(pickNew);}
    finally{
      if(this.ownerLink.identity){this.device=this.ownerLink.device;this.identity=this.ownerLink.identity;this.profile="melk-of21";this.characteristic=this.ownerLink.characteristic;this.of21.select(this.identity);}
      this.lastError=this.ownerLink.error;this.emit();
    }
  }
  ownerCommands(commands,guard=()=>true){
    const allowed=["power","rgb-power","color","brightness","speed","effect","scene","microphone","mic-rhythm","sensitivity","geometry-query","point-count","wire-order","collapse","clock"];
    if(this.profile!=="melk-of21"||!this.controlReady)throw Error("Connect the exact OF21 controller with writable FFF3 first.");
    const jobs=commands.map(c=>{if(!allowed.includes(c.kind))throw Error("This OF21 configuration or bulk operation is not enabled.");return SmartEaseOF21.command(c.kind,c.value,c.options);});
    return this.ownerSequence(jobs.map((bytes,index)=>({bytes,delay:100,before:()=>{if(commands[index].kind==="point-count"){this.of21.totalNodes=null;this.of21.geometryGeneration=null;}}})),guard);
  }
  ownerResponse(bytes){
    if(this.profile!=="melk-of21"||!this.ownerLink.connected)return;
    const result=SmartEaseOF21.parseGeometry(bytes),timer=SmartEaseOF21.parseTimer(bytes);
    if(result){this.of21.totalNodes=result.totalNodes;this.of21.geometryGeneration=this.ownerLink.generation;}
    const readWindow=this.ownerTimerWindow;
    if(timer&&readWindow&&readWindow.epoch===(this.ownerEpoch||0)&&readWindow.generation===this.ownerLink.generation&&readWindow.requested.has(timer.kind)){
      this.of21.timers??={};this.of21.timers[timer.kind]={...timer,generation:this.ownerLink.generation,readRevision:readWindow.revision,source:"device-returned"};
    }
    if(result||timer){this.emit();window.dispatchEvent(new Event("smartease-of21-state"));}
  }
  ownerUncertain(generation){
    if(generation!==this.ownerLink.generation)return;
    this.ownerUncertainGeneration=generation;this.lastError=this.ownerLink.error="OF21 operation outcome is uncertain. Disconnect and reconnect before sending more commands.";this.emit();
  }
  cancelOwner(){this.ownerEpoch=(this.ownerEpoch||0)+1;for(const cancel of [...(this.ownerCancels||[])])cancel();this.ownerTimerWindow=null;}
  ownerSequence(steps,guard=()=>true,lifecycle={}){
    if(this.profile!=="melk-of21"||!this.controlReady)throw Error("Connect writable OF21 FFF3 first.");
    const generation=this.ownerLink.generation,picked=this.device,epoch=this.ownerEpoch||0;
    let cancelled=false,inFlight=false,stop;
    const stopped=new Promise(resolve=>{stop=()=>{cancelled=true;if(inFlight)this.ownerUncertain(generation);resolve(false);};});
    this.ownerCancels??=new Set();this.ownerCancels.add(stop);
    const valid=()=>!cancelled&&guard()&&this.controlReady&&generation===this.ownerLink.generation&&this.device===picked&&epoch===(this.ownerEpoch||0);
    const work=this.queue.catch(()=>false).then(async()=>{
      try{
      if(!valid())return false;lifecycle.begin?.();
      for(const step of steps){
        if(!valid())return false;
        try{
          const ch=this.ownerLink.characteristic;
          step.before?.();
          if(step.bytes){inFlight=true;await SmartEasePairing.stage(ch[this.ownerLink.report.writeMethod](Uint8Array.from(step.bytes)),"nokins","OF21 command submission");inFlight=false;}
          if(step.read&&ch.properties?.read&&typeof ch.readValue==="function"){
            inFlight=true;const value=await SmartEasePairing.stage(ch.readValue(),"nokins","OF21 timer readback");inFlight=false;if(!valid())return false;
            if(value&&value.byteLength<=1024)this.ownerResponse(Array.from(new Uint8Array(value.buffer,value.byteOffset,value.byteLength)));
          }
        }
        catch(error){inFlight=false;if(generation===this.ownerLink.generation){this.ownerUncertain(generation);this.lastError=SmartEasePairing.describeError(error)+". Reconnect before sending more OF21 commands.";this.emit();}return false;}
        if(step.delay)await sleep(step.delay);
      }return !!valid();
      }finally{lifecycle.end?.();}
    });
    // Preserve serialization until a pending GATT call settles or times out,
    // even when cancellation returns to the UI immediately.
    this.queue=work.catch(()=>false);const task=Promise.race([work,stopped]);task.finally(()=>this.ownerCancels.delete(stop)).catch(()=>{});return task;
  }
  async ownerReadTimers(guard=()=>true){
    const window={epoch:this.ownerEpoch||0,generation:this.ownerLink.generation,revision:(this.ownerTimerRevision||0)+1,requested:new Set()};this.ownerTimerRevision=window.revision;
    const ok=await this.ownerSequence([0,1].flatMap(kind=>[{before:()=>window.requested.add(kind),bytes:SmartEaseOF21.command("timer-query",kind),delay:300},{read:true,delay:300}]),guard,{begin:()=>{this.of21.timers={};this.ownerTimerWindow=window;},end:()=>{if(this.ownerTimerWindow===window)this.ownerTimerWindow=null;}});
    return !!ok&&[0,1].every(kind=>this.of21.timers[kind]?.generation===window.generation&&this.of21.timers[kind]?.readRevision===window.revision);
  }
  ownerWriteTimers(edited,guard=()=>true){
    if(!SmartEaseOF21.validTimer(edited))throw Error("Invalid timer fields.");
    const current=this.of21.timers;
    if(![0,1].every(kind=>SmartEaseOF21.validTimer(current?.[kind])&&current[kind].generation===this.ownerLink.generation&&current[kind].readRevision===this.ownerTimerRevision))throw Error("Read both timer slots from this connection first; the other slot must be preserved.");
    const pair=[0,1].map(kind=>kind===edited.kind?{...edited}:{...current[kind]}),revision=this.ownerTimerRevision;
    return this.ownerSequence(pair.map(t=>({bytes:SmartEaseOF21.command("timer",t),delay:100})),()=>guard()&&this.ownerTimerRevision===revision,{begin:()=>{this.of21.timers={};}});
  }
  ownerUploadDIY(project,guard=()=>true){
    const reported=this.of21.totalNodes,generation=this.ownerLink.generation;
    if(this.of21.geometryGeneration!==generation||project.totalNodes!==reported)throw Error("Read matching LED geometry from this connection before upload.");
    const plan=SmartEaseOF21.diy(project);
    return this.ownerSequence(plan.packets.map(bytes=>({bytes,delay:75})),()=>guard()&&this.of21.geometryGeneration===generation&&this.of21.totalNodes===reported);
  }
  ownerCommand(kind,value,options,guard){return this.ownerCommands([{kind,value,options}],guard);}
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
      this.of21.select(this.identity);
      if (!this.profile)
        throw Error(
          this.of21.profile?"MELK-OF21 identified. Offline native preparation is available; live transport remains gated.":"This LotusLamp model still needs setup. Continue using LotusLamp X for now.",
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
    return this.profile==="melk-of21"?this.connectOwner():this.connect();
  }
  disconnect() {
    // A fresh owner connection has no profile until its async work finishes.
    // Cancel that pending attempt too, before a late chooser/GATT can adopt it.
    this.cancelOwner();this.ownerLink.disconnect();
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
    if(!navigator.bluetooth?.getDevices)return false;
    const devices=await navigator.bluetooth.getDevices();
    if(!this.ownerLink.restore(devices))return false;
    this.device=this.ownerLink.device;this.identity=this.ownerLink.identity;this.profile="melk-of21";this.of21.select(this.identity);this.emit();return true;
  }
  write(jobs, guard = () => true) {
    if(this.profile==="melk-of21")throw Error("Use the exact OF21 command path; OA10 writes are blocked.");
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
    if(this.profile==="melk-of21")return this.ownerCommands(target.on?[{kind:"power",value:true},{kind:"brightness",value:Math.round(target.brightness)},{kind:"color",value:target.color}]:[{kind:"power",value:false}],guard);
    return this.write(SmartEaseLotus.commands(this.profile, target), guard);
  }
  nativeMode(mode, settings, guard = () => true) {
    if (!this.connected || this.profile !== "melk-oa10")
      throw Error("Connect a supported MELK-OA10 LotusLamp X controller first.");
    // Deliberate, single-device user action. Unrecognized ELK models and the
    // TRINKA display receive no commands. The queue enforces 180ms pacing.
    return this.write(
      SmartEaseLotus.nativeModeCommands(this.profile, mode, settings),
      guard,
    );
  }
  power(on) {
    if(this.profile==="melk-of21")return this.ownerCommand("power",on);
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
  new CoolLEDUXAdapter(),
  new LotusLampAdapter(),
];
const cartSession = new CartSession(cartDevices);
document.addEventListener("visibilitychange", () => {
  const adapter = cartDevices[2];
  if (document.visibilityState === "hidden") clearTimeout(adapter.timer);
  else adapter.scheduleReconnect();
});
window.addEventListener("pagehide", () => clearTimeout(cartDevices[2].timer));
