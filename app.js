"use strict";
/* Consumer layer on the retained, tested SP608E transport and storage model. */
const E = SmartEaseEngine;
const ui = (id) => document.getElementById(id);
const uiStore = "smartease-experience-v1";
let preferences = {
  favorites: ["haunted", "signature", "sunset", "starlight"],
  trueColors: true,
  onboarded: false,
  deviceIdentities: {},
};
try {
  const p = JSON.parse(localStorage.getItem(uiStore) || "null");
  if (p && Array.isArray(p.favorites))
    preferences = {
      ...preferences,
      ...p,
      favorites: p.favorites.filter((x) => typeof x === "string"),
    };
} catch {}
if (
  !preferences.deviceIdentities ||
  typeof preferences.deviceIdentities !== "object"
)
  preferences.deviceIdentities = {};
if (typeof preferences.trueColors !== "boolean") preferences.trueColors = true;
const GRADIENT_DEFAULTS = {
  colors: ["#46ef77", "#a24aec", "#ff751e"],
  effect: 7,
  speed: 5,
  brightness: 55,
  reverseCanopy: true,
};
function gradientValidSettings(raw) {
  const source=raw&&typeof raw==="object"?raw:{};
  const colors=Array.isArray(source.colors)&&source.colors.length===3&&
    source.colors.every(E.color)?source.colors.map(c=>c.toLowerCase()):[...GRADIENT_DEFAULTS.colors];
  return {
    colors,
    effect:[7,8].includes(source.effect)?source.effect:GRADIENT_DEFAULTS.effect,
    speed:Number.isInteger(source.speed)&&source.speed>=1&&source.speed<=10?source.speed:GRADIENT_DEFAULTS.speed,
    brightness:Number.isInteger(source.brightness)&&source.brightness>=0&&source.brightness<=100?source.brightness:GRADIENT_DEFAULTS.brightness,
    reverseCanopy:typeof source.reverseCanopy==="boolean"?source.reverseCanopy:true,
  };
}
preferences.gradientChase = gradientValidSettings(preferences.gradientChase);
const legacyNative = preferences.lotusNative || {};
preferences.lotusNative = {
  category: SmartEaseLotus.categories.some(x => x.id === legacyNative.category)
    ? legacyNative.category : "basic",
  mode: Number.isInteger(legacyNative.mode) && legacyNative.mode >= 0 &&
        legacyNative.mode <= 212 ? legacyNative.mode : 0,
  speed: Number.isInteger(legacyNative.speed) && legacyNative.speed >= 0 &&
         legacyNative.speed <= 100 ? legacyNative.speed : 50,
  brightness: Number.isInteger(legacyNative.brightness) && legacyNative.brightness >= 0 &&
              legacyNative.brightness <= 100 ? legacyNative.brightness : 45,
};
let draft = E.rows(),
  activeScene = null,
  previewRows = E.presets[1].rows,
  page = "home",
  filter = "All",
  applying = false,
  applyGeneration = 0,
  liveToken = 0,
  liveName = "",
  powered = false;
let editingSceneId = null,
  designerPaletteSelection = "front-bumper",
  cartView = "front",
  draftAccessories = E.accessories(null, draft["front-bumper"]),
  previewAccessories = E.accessories(null, previewRows["front-bumper"]);
let draftComposition=null;
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  scenes:
    '<path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z"/>',
  create:
    '<path d="m5 19 3-7L18 2l4 4-10 10-7 3Z"/><path d="m15 5 4 4M3 22h18"/>',
  devices: '<path d="m8 7 8 10-4 4V3l4 4L8 17"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
};
const app = document.createElement("main");
app.id = "app";
app.innerHTML = `
<header class="topline"><a class="wordmark" href="#home" aria-label="SmartEase home" style="color:inherit;text-decoration:none"><img class="brand-symbol" src="smartease-logo.svg" alt="" aria-hidden="true">SmartEase<sup>®</sup></a><div class="connection-actions"><button class="status-pill" id="connectionSummary" aria-label="View device connection status"><span class="dot" id="connectionDot"></span><span id="connectionText">Disconnected</span></button><button class="reconnect" id="emergencyReconnect" aria-label="Reconnect all supported lighting devices">↻ Reconnect</button></div></header>
<section class="page" data-page="home"><div class="welcome"><div><div class="overline">Your cart. Your atmosphere.</div><h1>Good nights.<br>Great lights.</h1><p>A little color makes every evening yours.</p></div><span class="pill">✦ Made simple. Made SmartEase.</span></div><div class="quick-favorites" id="quickFavorites" aria-label="Favorite scenes"></div><div class="dashboard"><article class="card cart-card"><div class="card-top"><div><h3>Your cart, in color</h3><p id="cartSubtitle">Five zones. Endless possibilities.</p></div><button class="round" id="cartPower" aria-label="Turn mapped decorative lights on" aria-pressed="false">⏻</button></div><div id="homeCart"></div><div class="now-playing"><div><small id="playState">SCENE PREVIEW</small><strong id="nowPlaying">SmartEase glow</strong></div><div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></div><p class="busy-line" id="playProgress" role="status"></p></article><div class="right-stack"><article class="card feature"><div class="overline">A little seasonal magic</div><h2>Haunted Surge</h2><p>Toxic green. Haunted purple. Pumpkin orange. Let the night come alive.</p><div class="feature-orbs"><i style="--orb:#46ef77"></i><i style="--orb:#a24aec"></i><i style="--orb:#ff751e"></i><span>Flow + twinkle</span></div><button class="primary" id="featureHauntedPlay">Play scene <span>↗</span></button><button class="text-btn" id="stopShow" hidden>Stop live flow</button></article><article class="card brightness"><label for="appBrightness">Set the mood <span id="appBrightnessValue">45%</span></label><input id="appBrightness" type="range" min="0" max="100" value="45" aria-label="Mapped light brightness"><div style="display:flex;justify-content:space-between;font-size:10px;color:#718f89"><span>Subtle</span><span>Brilliant</span></div></article></div></div><div class="section-heading"><h2>Your favorites</h2><button class="text-btn" data-go="scenes">Explore scenes ↗</button></div><div class="scene-list" id="favoriteScenes"></div><p class="safety-note">Decorative lighting, your way.</p></section>
<section class="page" data-page="scenes" hidden><div class="welcome"><div><div class="overline">Find your kind of night</div><h1>A scene for<br>every mood.</h1><p>One tap. A whole new atmosphere.</p></div><button class="secondary" data-go="create">＋ Create a scene</button></div><p class="small-note scene-hold-hint">Tap a scene to play it. <strong>Press and hold to edit</strong> its colors, or tap the pencil.</p><article class="card gradient-chase-lab" id="gradientChaseLab">
  <div class="card-top"><div><div class="overline">NEW · SP608E LAB</div><h3>Front → Rear Gradient Chase</h3><p>Green → purple → orange, mapped around your cart. Test controller-native motion or a SmartEase-driven traveling color sweep.</p></div><span class="pill">Experimental</span></div>
  <div class="gradient-chase-ribbon" id="gradientChaseRibbon" aria-label="Front green, canopy purple, rear orange"><span>FRONT</span><span>CANOPY</span><span>REAR</span></div>
  <div class="gradient-chase-controls">
   <label for="gradientColorFront">Front <input id="gradientColorFront" type="color" value="#46ef77" aria-label="Front color"></label>
   <label for="gradientColorCanopy">Canopy <input id="gradientColorCanopy" type="color" value="#a24aec" aria-label="Canopy color"></label>
   <label for="gradientColorRear">Rear <input id="gradientColorRear" type="color" value="#ff751e" aria-label="Rear color"></label>
   <label for="gradientNativeEffect">Strip animation <select class="input" id="gradientNativeEffect"><option value="7">Wave</option><option value="8">Chase</option></select></label>
   <label for="gradientNativeSpeed">Motion speed <span id="gradientNativeSpeedValue">5/10</span><input id="gradientNativeSpeed" type="range" min="1" max="10" value="5"></label>
   <label for="gradientBrightness">Brightness <span id="gradientBrightnessValue">55%</span><input id="gradientBrightness" type="range" min="0" max="100" value="55"></label>
  </div>
  <label class="switchline"><input type="checkbox" id="gradientReverseCanopy" checked> Reverse canopy strip direction</label>
  <p class="small-note">Reversal changes the SP608E's native per-strip Wave/Chase direction. The traveling sweep below instead moves through the mapped cart zones; it cannot reverse individual pixels.</p>

  <div class="row-actions gradient-chase-actions"><button class="primary" type="button" id="gradientNativeRun">Try controller chase ↗</button><button class="secondary" type="button" id="gradientLiveRun">Try traveling gradient ↗</button><button class="secondary" type="button" id="gradientFlipCanopy">Test canopy reversal</button><button class="text-btn" type="button" id="gradientLiveStop">Stop live sweep</button></div>
  <p class="small-note">Controller Chase can continue without Bluefy if the SP608E retains its settings. Traveling Gradient needs Bluefy connected in the foreground. Neither button overwrites an onboard scene slot.</p>
  <p class="inline-status" id="gradientChaseStatus" role="status" aria-live="polite">Adjust your colors. Connecting and editing alone never sends lighting commands.</p>
 </article><div class="filters" id="sceneFilters"><button class="active" data-filter="All">All scenes</button><button data-filter="Everyday">Everyday</button><button data-filter="Holidays">Holidays</button><button data-filter="Saved">My scenes</button></div><div class="scene-list library-grid" id="allScenes"></div><p class="small-note">Your saved scenes stay in this browser. Back them up in Settings to take them with you.</p></section>
<section class="page" data-page="create" hidden><div class="welcome"><div><div class="overline">Made by you</div><h1>Paint the night.</h1><p id="designerIntro">Blend a front-to-rear gradient or make every zone your own.</p></div></div><div class="designer"><article class="card cart-card"><div class="card-top"><h3>Your canvas</h3><span class="pill">Preview</span></div><div id="designerCart"></div><div class="small-note">A visual guide to the mood. Actual motion depends on your lights.</div></article><article class="card designer-controls"><div><label class="field-label" for="sceneName">Give your scene a name</label><input class="input" id="sceneName" value="My evening glow" maxlength="40"></div><section class="scene-palette-editor"><div class="card-top"><h3>Mix your scene colors</h3><span class="pill">RGB editor</span></div><p class="small-note">Pick a color below, mix red, green and blue, then test it on the cart. Lights that share a color change together. Your saved BRG calibration stays intact.</p><div id="scenePaletteOptions" class="scene-palette-options" aria-label="Colors used in this scene"></div><div class="scene-palette-preview"><span id="scenePaletteColorPreview" class="scene-color-disc"></span><strong id="scenePaletteHex">#FFFFFF</strong><small>Scene color · 0 to 255 per channel</small></div><div class="scene-palette-sliders"><label for="scenePaletteR">Red <span id="scenePaletteRValue">0</span></label><input id="scenePaletteR" type="range" min="0" max="255" step="1" value="0"><label for="scenePaletteG">Green <span id="scenePaletteGValue">0</span></label><input id="scenePaletteG" type="range" min="0" max="255" step="1" value="0"><label for="scenePaletteB">Blue <span id="scenePaletteBValue">0</span></label><input id="scenePaletteB" type="range" min="0" max="255" step="1" value="0"></div><div class="row-actions"><button id="scenePaletteTest" class="secondary" type="button">Test selected color on cart ↗</button></div><p class="small-note" id="scenePaletteStatus" role="status">Adjust the colors, test them, then save your scene below. Your per-strip RGB balance still applies.</p></section><div><label class="field-label" for="gradientFront">Front → rear gradient</label><div class="palette-row"><input type="color" id="gradientFront" value="#49e3d2" aria-label="Front gradient color"><div class="gradient-line" id="gradientLine"></div><input type="color" id="gradientRear" value="#278dff" aria-label="Rear gradient color"></div><button class="text-btn" id="blendGradient">Blend across my cart ↗</button></div><div><label class="field-label" for="designerEffect">A little movement</label><select class="input" id="designerEffect"><option value="25">Steady glow</option><option value="3">Twinkling stars</option><option value="17">Soft breathing</option><option value="7">Color wave</option><option value="6">Comet</option><option value="1">Rainbow</option></select><p class="small-note" id="designerEffectHelp">Your chosen effect will be kept when playing this scene.</p></div><div><label class="field-label" for="designerBrightness">Brightness <span id="designerBrightnessValue">45%</span></label><input type="range" id="designerBrightness" min="0" max="100" value="45"></div><div><label class="field-label" for="designerSpeed">Movement speed <span id="designerSpeedValue">5</span></label><input type="range" id="designerSpeed" min="1" max="10" value="5"></div><div id="zoneEditors"></div><section class="accessory-editor"><div class="card-top"><h3>NOKINS RGB accents</h3><span class="pill">Front + rear</span></div><label class="switchline"><input type="checkbox" id="designNokinsOn" checked>Include decorative RGB accents</label><label class="switchline"><input type="checkbox" id="designNokinsFollow" checked>Match the front zone color</label><div class="palette-row"><label class="field-label" for="designNokinsColor">Accent color</label><input type="color" id="designNokinsColor" value="#49e3d2"></div><label class="field-label" for="designNokinsBrightness" style="margin-top:14px">Accent brightness</label><input type="range" min="0" max="100" value="45" id="designNokinsBrightness"><p class="small-note">One decorative color across compatible NOKINS lights.</p></section><section class="accessory-editor"><div class="card-top"><h3>Windshield Devil Eyes</h3><span class="pill">Preview</span></div><label class="switchline"><input type="checkbox" id="designEyesOn" checked>Include Devil Eyes in my design</label><label class="field-label" for="designEyesPattern">Expression</label><select class="input" id="designEyesPattern"><option value="devil">Devil gaze</option><option value="blink">Blinking eyes</option><option value="sleep">Sleepy eyes</option></select><div class="palette-row" style="margin-top:14px"><label class="field-label" for="designEyesColor">Eye color</label><input type="color" id="designEyesColor" value="#49e3d2"></div><label class="field-label" for="designEyesBrightness" style="margin-top:14px">Eye brightness</label><input type="range" min="0" max="100" value="70" id="designEyesBrightness"><p class="small-note">Saved with your design. Visual preview for now. Apply the eyes with your display’s app.</p></section><div class="row-actions"><button class="primary" id="applyDesign">Send to cart ↗</button><button class="secondary" id="saveDesign">Save scene ♡</button></div><p class="small-note">Saved on this device, ready whenever you are.</p></article></div></section>
<section class="page" data-page="devices" hidden><div class="welcome"><div><div class="overline">Everything, together</div><h1>Meet your cart.</h1><p>Your lighting, connections, and a little peace of mind.</p></div></div><article class="card"><div id="deviceList"></div><p class="inline-status" id="deviceMessage" role="status"></p></article><article class="card nokins-test-card" id="nokinsTestPanel" style="margin-top:20px"><div class="card-top"><div><h3>NOKINS decorative RGB test</h3><p class="small-note">Connect the RGB controller using the NOKINS row above. This tests LotusLamp X-compatible decorative lighting—not turn signals, brake lights, headlights, or the stalk.</p></div><span class="pill">Color test</span></div><p class="nokins-controller-info" id="nokinsControllerInfo">Bluetooth controller not identified.</p><div class="row-actions nokins-test-actions"><button class="secondary" id="nokinsTestRed" type="button">Test red</button><button class="secondary" id="nokinsTestGreen" type="button">Test green</button><button class="secondary" id="nokinsTestBlue" type="button">Test blue</button><button class="secondary" id="nokinsTestOrange" type="button">Test orange</button></div><p id="nokinsTestResult" class="inline-status" role="status">Connecting does not change the lights. Test colors individually, then enable scene matching on the NOKINS device row if they work.</p><p class="small-note">Exact supported profiles use separate command definitions. MELK-OF21 uses source-derived E1 commands; unknown models receive no writes. Test buttons do not change your saved SP608E scenes, mappings, or controller memory. Commands have no physical readback.</p></article><article class="card" style="margin-top:20px"><h3>Ready for a brighter evening?</h3><p class="small-note" style="margin:12px 0 18px">Turn the cart’s lighting switch to the first position for underglow and Devil Eyes. Use the second position to include the canopy. Close other lighting apps before connecting here.</p><div class="row-actions"><button class="primary" id="connectCart">Connect cart lighting ↗</button><button class="secondary" id="syncCart">Refresh lights</button><button class="text-btn" id="disconnectCart">Disconnect</button></div></article><div class="row-actions cal-device-link"><button class="secondary" type="button" id="devicesColorCalibration">🎨 Fix underglow colors</button></div><div class="row-actions map-device-link"><button class="secondary" id="devicesLightMap" type="button">🗺️ Fix light locations</button></div><p class="small-note">Brake, turn, and hazard lights continue to use your cart’s own controls.</p>
<article class="card native-controllers" id="nativeControllerLibrary" style="margin-top:20px">
  <div class="card-top"><div><div class="overline">SmartEase · Individual Device</div><h3>Original controller functions</h3><p class="small-note">Choose a controller to use its own capabilities. Whole-cart scenes remain under Scenes and Create.</p></div><span class="pill">Parity in progress</span></div>
  <div class="native-controller-grid">
   <section class="native-control-panel">
    <h4>SP608E · BanlanX</h4>
    <p class="small-note">Control decorative outputs and 41 factory effects below. Color calibration and the existing Bluetooth queue are retained. Saving new onboard slots, triggers and firmware timers still need protocol evidence. Advanced opens the full channel readback and local look library.</p>
    <div class="row-actions"><button class="secondary" id="nativeSpChannels" type="button">8-channel controls</button><button class="secondary" id="nativeSpEffects" type="button">Factory effects</button><button class="secondary" id="nativeSpScenes" type="button">9 scene slots</button></div>
   </section>
   <section class="native-control-panel">
    <h4>NOKINS · LotusLamp X</h4>
    <p id="nativeLotusInfo" class="small-note">Connect NOKINS above. Basic color tests are available for supported controllers. The MELK-OA10 native effects are a separate, model-specific option.</p>
    <label class="field-label" for="nativeLotusCategory">Effect category</label>
    <select class="input" id="nativeLotusCategory" aria-label="Lotus native effect category"></select>
    <label class="field-label" for="nativeLotusMode">Controller effect</label>
    <select class="input" id="nativeLotusMode" aria-label="Lotus native effect ID"></select>
    <label class="field-label" for="nativeLotusSpeed">Speed <span id="nativeLotusSpeedValue">50%</span></label><input type="range" id="nativeLotusSpeed" min="0" max="100" value="50" step="1">
    <label class="field-label" for="nativeLotusBrightness">Brightness <span id="nativeLotusBrightnessValue">45%</span></label><input type="range" id="nativeLotusBrightness" min="0" max="100" value="45" step="1">

    <button class="primary" type="button" id="nativeLotusApply">Play selected native effect ↗</button>
    <p class="small-note" id="nativeLotusStatus" role="status">Nothing is sent until you connect a matching MELK-OA10 controller and tap Play. The tested MELK-OA10 profile has 213 modes; other LotusLamp models may use different codes.</p>
   </section>
   <section class="native-control-panel">
    <h4>Devil Eyes · CoolLED1248</h4>
    <p class="small-note" id="nativeEyesInfo">Build text, pictures, frame animations and program playlists below. Exact96×16 CoolLEDUX projects have a separately confirmed experimental Send path.</p>
    <p class="small-note">The studio works locally. Experimental Send requires the exact CoolLEDUX target, a96×16 project and an explicit Send action. Physical capacity, orientation and retention remain unverified; other profiles and sizes stay local-only.</p>
   </section>
  </div>
</article></section>
<section class="page" data-page="settings" hidden><div class="welcome"><div><div class="overline">Just the way you like it</div><h1>Make yourself<br>at home.</h1><p>A few thoughtful touches for an effortless ride.</p></div></div><div class="settings-grid"><article class="card true-color-card"><h3>Show my actual colors</h3><label class="switchline"><input type="checkbox" id="appTrueColors">Play my scenes in their chosen colors</label><p>For built-in scenes, choose exact solid shades or original controller animations. Scenes you create always keep the movement you selected. Some native effects (especially Rainbow) choose their own palette.</p><button type="button" class="secondary" id="appColorCheck">Check my calibrated colors ↗</button></article><article class="card"><h3>Connection preferences</h3><label class="switchline"><input type="checkbox" id="appAutoReconnect">Reconnect my lighting automatically</label><p>When your lights have power and Bluefy is open, we’ll try to bring your connection back. You can always use Reconnect above.</p><button class="secondary" id="previewMode">Explore in preview mode</button><p class="inline-status" id="previewStatus"></p></article><article class="card"><h3>Keep your favorites close</h3><p>Back up your saved scenes, light connections, and color tuning. Restore a backup when changing browsers or app addresses.</p><div class="row-actions"><button class="secondary" id="backupSetup">Back up my setup</button><button class="secondary" id="restoreSetup">Restore backup</button><input type="file" id="backupFile" accept="application/json,.json" hidden></div><button class="text-btn" id="importPrevious">Import previous cart-zone backup ↗</button></article><article class="card"><h3>Restore a controller scene</h3><p>Recall a scene you already saved with your controller’s own app.</p><label class="field-label" for="controllerScene">Controller scene</label><select class="input" id="controllerScene">${Array.from({ length: 9 }, (_, i) => `<option value="${i}">Scene ${i + 1}</option>`).join("")}</select><button class="secondary" id="recallController" style="margin-top:14px">Recall scene</button></article><article class="card map-launch"><div class="map-launch-head"><span class="map-launch-icon" aria-hidden="true">🗺️</span><div><h3>Map my lights</h3><p>Something lighting up in the wrong place? Show each strip, tell SmartEase where it is, and save it once.</p></div></div><button class="primary" id="openLightMap" type="button">Map my lights ↗</button></article><article class="card cal-launch"><div class="cal-launch-title"><span aria-hidden="true">🎨</span><div><h3>Fix my light colors</h3><p>Blue looks red? Purple looks orange? Tune each light in a few taps.</p></div></div><button class="primary" id="openColorCalibration" type="button">Fix my colors ↗</button></article><article class="card"><h3>A little extra help</h3><p>Fine-tune your five light connections, adjust color calibration, or get help with a connection.</p><div class="row-actions"><button class="secondary" id="openAdvanced">Advanced settings ↗</button><button class="text-btn" id="showWelcome">Getting started</button></div><a class="text-btn" href="docs/HARDWARE.md" target="_blank" rel="noopener" style="display:inline-block">Device compatibility details ↗</a></article></div></section>

<section class="page cal-page" data-page="calibrate" hidden>
 <div class="welcome cal-welcome"><div><div class="overline">SmartEase light tuning</div><h1>Every color.<br>Just right.</h1><p>Show a color, tell us what the LEDs display, and we'll adjust the lighting scenes for you.</p></div><button class="secondary" id="calGoBack" type="button">← Settings</button></div>
 <div class="cal-grid">
  <article class="card cal-selector-card"><div class="overline">First, choose a light</div><h2>Which strip looks wrong?</h2><p>With the lights powered, choose the strip you want to tune.</p><label class="field-label" for="calOutput">Cart lighting location</label><select class="input" id="calOutput"></select><p class="cal-muted" id="calConnection">Connect your cart lighting to begin.</p><button type="button" class="secondary" id="calGoConnect">Connect in Devices ↗</button></article>
  <article class="card cal-primary-card"><div class="overline">Then, check three colors</div><h2>What do you actually see?</h2><p>Tap one color at a time and choose what the real LEDs show. We'll remember the correction.</p><div class="cal-primary-grid"><div class="cal-test-item"><button id="calTestR" data-cal-test="r" class="cal-test-button" style="--cal-hue:#f44d5d" type="button"><i aria-hidden="true"></i> Show red</button><label class="field-label" for="calSeenR">What appeared?</label><select class="input" id="calSeenR"><option value="">Choose actual color</option><option value="r">Red</option><option value="g">Green</option><option value="b">Blue</option><option value="white">White</option><option value="orange">Orange</option><option value="yellow">Yellow</option><option value="teal">Teal / cyan</option><option value="purple">Purple</option><option value="pink">Pink</option><option value="mixed">Several colors</option><option value="dim">Very dim</option><option value="off">No response</option><option value="other">Something else</option></select></div><div class="cal-test-item"><button id="calTestG" data-cal-test="g" class="cal-test-button" style="--cal-hue:#47eb84" type="button"><i aria-hidden="true"></i> Show green</button><label class="field-label" for="calSeenG">What appeared?</label><select class="input" id="calSeenG"><option value="">Choose actual color</option><option value="r">Red</option><option value="g">Green</option><option value="b">Blue</option><option value="white">White</option><option value="orange">Orange</option><option value="yellow">Yellow</option><option value="teal">Teal / cyan</option><option value="purple">Purple</option><option value="pink">Pink</option><option value="mixed">Several colors</option><option value="dim">Very dim</option><option value="off">No response</option><option value="other">Something else</option></select></div><div class="cal-test-item"><button id="calTestB" data-cal-test="b" class="cal-test-button" style="--cal-hue:#518df9" type="button"><i aria-hidden="true"></i> Show blue</button><label class="field-label" for="calSeenB">What appeared?</label><select class="input" id="calSeenB"><option value="">Choose actual color</option><option value="r">Red</option><option value="g">Green</option><option value="b">Blue</option><option value="white">White</option><option value="orange">Orange</option><option value="yellow">Yellow</option><option value="teal">Teal / cyan</option><option value="purple">Purple</option><option value="pink">Pink</option><option value="mixed">Several colors</option><option value="dim">Very dim</option><option value="off">No response</option><option value="other">Something else</option></select></div></div><p class="cal-result" id="calStatus" role="status" aria-live="polite">Start with the red test.</p><div class="cal-verify"><h3>Check your saved correction</h3><p>After saving, these show strong, solid colors using your stored calibration—not a special effect.</p><div class="row-actions"><button id="calVerifyR" class="secondary" type="button">● Red</button><button id="calVerifyG" class="secondary" type="button">● Green</button><button id="calVerifyB" class="secondary" type="button">● Blue</button></div></div><div class="row-actions"><button id="calSave" class="primary" type="button">Save color correction</button><button id="calReset" class="secondary" type="button">Reset this light</button></div><div class="row-actions"><button id="calCopyMapped" class="secondary" type="button">Use this color order for all mapped SP608E lights</button></div><p class="cal-muted">Only use this when every SP608E strip showed the same three colors. Your zone locations and saved scenes stay unchanged. NOKINS and Devil Eyes are separate.</p></article>
  <article class="card cal-balance-card"><details id="calBalanceDetails"><summary>Orange too yellow? Tune colors for every scene <span aria-hidden="true">⌄</span></summary><p>Channel order is corrected. If mixed shades still look wrong, tune the relative red, green and blue strength on one strip. These values apply automatically to all its SmartEase scene colors, even colors you pick yourself.</p><p class="cal-muted">Tip: When orange looks yellow, lower the green percentage. Each physical SP608E output can have its own balance.</p><div class="cal-swatches"><div><span>Pumpkin orange reference</span><i style="background:#ff751e"></i></div><div><span>Adjusted command preview</span><i id="calBalanceSwatch"></i></div></div><div class="cal-sliders"><label for="calBalanceR">Red balance <span id="calBalanceRValue">100%</span></label><input id="calBalanceR" type="range" min="0" max="150" step="1" value="100"><label for="calBalanceG">Green balance <span id="calBalanceGValue">100%</span></label><input id="calBalanceG" type="range" min="0" max="150" step="1" value="100"><label for="calBalanceB">Blue balance <span id="calBalanceBValue">100%</span></label><input id="calBalanceB" type="range" min="0" max="150" step="1" value="100"></div><p class="cal-muted">0% fully disables that channel for solid colors on this strip; 100% is unadjusted. A 0% green balance also removes green from other scenes using this strip. Built-in rainbow animations may use their own colors.</p><div class="row-actions"><button id="calBalanceWarmer" class="secondary" type="button">Less yellow (reduce green)</button><button id="calBalanceTest" class="primary" type="button">Test orange on this light</button></div><div class="row-actions"><button id="calBalanceSave" class="primary" type="button">Save balance for this light</button><button id="calBalanceCopy" class="secondary" type="button">Apply balance to all mapped lights</button><button id="calBalanceReset" class="secondary" type="button">Reset balance</button></div><p id="calBalanceStatus" class="cal-result" role="status">Adjust a channel, test it on the real LEDs, then save once the physical color is right.</p></details></article>
  <article class="card cal-fine-card"><details id="calFineTune"><summary>Still the wrong shade? Fine-tune the color <span aria-hidden="true">⌄</span></summary><p>Some strips need a custom match. Adjust the strengths until the real lights look like the target, test it, then save.</p>
   <div class="cal-color-choice"><div><label class="field-label" for="calTarget">Color to match</label><select class="input" id="calTarget"><option value="#46ef77">Halloween green</option><option value="#a24aec">Halloween purple</option><option value="#ff751e">Halloween orange</option><option value="#ffffff">White</option><option value="#49e3d2">SmartEase mint</option><option value="custom">Custom color</option></select></div><div id="calCustomWrap" hidden><label class="field-label" for="calCustom">Choose shade</label><input type="color" id="calCustom" value="#ffffff"></div></div>
   <div class="cal-swatches"><div><span>Color to match</span><i id="calTargetSwatch"></i></div><div><span>Values to send</span><i id="calSendSwatch"></i></div></div>
   <div class="cal-sliders"><label for="calRawR">Red strength <span id="calValueR">70</span></label><input id="calRawR" type="range" min="0" max="255" value="70"><label for="calRawG">Green strength <span id="calValueG">239</span></label><input id="calRawG" type="range" min="0" max="255" value="239"><label for="calRawB">Blue strength <span id="calValueB">119</span></label><input id="calRawB" type="range" min="0" max="255" value="119"></div>
   <div class="row-actions"><button class="secondary" id="calMatchTest" type="button">Test this shade</button><button class="primary" id="calMatchSave" type="button">Save this match</button></div><p class="cal-result" id="calMixStatus" role="status" aria-live="polite">Test a shade on the real cart, then save the match.</p>
  </details></article>
 </div>
</section>
<section class="page map-page" data-page="map" hidden>
 <div class="welcome map-welcome"><div><div class="overline">SmartEase cart setup</div><h1>Every light.<br>In its place.</h1><p>Each row is a connection on your lighting controller. Find the real strip, then choose where it belongs. Your scenes follow this map automatically.</p></div><button class="secondary" id="mapGoBack" type="button">← Settings</button></div>
 <div class="map-overview card"><div class="map-overview-mark" aria-hidden="true">✦</div><div><h3>Find it. Name its place. All set.</h3><p>Park the cart, turn on the lighting, and tap <b>Show this light</b> next to an output. Once you see it illuminate, choose its real location. Your changes save automatically in Bluefy.</p></div><button class="secondary" id="mapGoDevices" type="button">Connect lights ↗</button></div>
 <div class="map-outputs" id="mapOutputRows" aria-label="Physical lighting output assignments"></div>
 <div class="map-footer card"><div><strong id="mapCount">Your cart locations</strong><p id="mapSaved">Changes are saved on this phone and included in your SmartEase backup.</p></div><div class="row-actions"><button class="secondary" id="mapCalibrate" type="button">🎨 Fix colors</button><button class="primary" id="mapDone" type="button">Done ✓</button></div></div>
 <p class="map-status" id="mapStatus" role="status" aria-live="polite">Ready to identify your lights.</p>
</section>
<nav class="bottom-nav" aria-label="Main navigation">${Object.entries(icons)
  .map(
    ([id, icon]) =>
      `<button data-go="${id}" class="${id === "home" ? "active" : ""}" aria-label="${id === "create" ? "Create a scene" : id}" ${id === "home" ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${{ home: "My cart", scenes: "Scenes", create: "Create", devices: "Devices", settings: "Settings" }[id]}</button>`,
  )
  .join("")}</nav>
<dialog id="welcomeDialog" aria-labelledby="welcomeTitle"><div class="overline">Welcome to SmartEase®</div><h2 id="welcomeTitle" style="margin-top:12px">Your best nights<br>start with a little color.</h2><p>Let’s get your cart glowing.</p><ol><li>Turn on your cart’s lighting power.</li><li>Open in Bluefy and close BanlanX or other lighting apps.</li><li>Tap Connect and choose your SP608E.</li></ol><div class="modal-actions"><button class="primary" id="welcomeConnect">Connect my cart ↗</button><button class="secondary" id="welcomePreview">Look around first</button></div><p class="small-note">Scenes save in this browser. No account. No subscription.</p></dialog>
<dialog id="liveDialog" aria-labelledby="liveTitle"><div class="overline">Haunted Surge</div><h2 id="liveTitle" style="margin-top:12px">Choose your magic.</h2><p>Twinkle layers green, purple, and orange across the cart. Live flow sweeps color from front to rear, then bursts into stars.</p><p class="small-note">Keep Bluefy open for live flow. Your cart’s switch must power the lights.</p><div class="modal-actions"><button class="primary" id="startLive">Play live flow ↗</button><button class="secondary" id="startTwinkle">Just twinkle</button><button class="text-btn" id="cancelLive">Cancel</button></div></dialog>
<div class="toast-live" id="appToast" role="status" aria-live="polite" hidden></div>`;
document.body.prepend(app);
function persist() {
  try {
    localStorage.setItem(uiStore, JSON.stringify(preferences));
    return true;
  } catch {
    toast("Your browser couldn’t save this. Try backing up your setup.");
    return false;
  }
}
function toast(message) {
  ui("appToast").textContent = message;
  ui("appToast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (ui("appToast").hidden = true), 4200);
}
// All original diagnostics remain available in Advanced; consumer messages are concise.
function renderAccessoryEditor() {
  const n = draftAccessories.nokins,
    t = draftAccessories.trinka;
  ui("designNokinsOn").checked = n.on;
  ui("designNokinsFollow").checked = n.follow === "front";
  ui("designNokinsColor").value = n.color;
  ui("designNokinsColor").disabled = n.follow === "front";
  ui("designNokinsBrightness").value = n.brightness;
  ui("designNokinsBrightness").disabled = n.follow === "front";
  ui("designEyesOn").checked = t.on;
  ui("designEyesPattern").value = t.pattern;
  ui("designEyesColor").value = t.color;
  ui("designEyesBrightness").value = t.brightness;
}
const legacyNotify = notify;
notify = function (message) {
  if (document.body.classList.contains("advanced-open")) {
    toast(message);
    return;
  }
  const known = [
    [
      /Connect to SP608E|Connect first|Connect to your SP608E/,
      "Connect your cart lighting first.",
    ],
    [
      /Bluetooth write failed/,
      "Your connection was interrupted. Tap Reconnect to try again.",
    ],
    [
      /Could not connect/,
      "Couldn’t connect. Check the lighting power and close other lighting apps, then tap Reconnect.",
    ],
    [/DEMO|Demo UI/, "Preview mode is on. Your real lights aren’t connected."],
  ];
  toast(known.find(([pattern]) => pattern.test(message))?.[1] || message);
};
function go(next, mode = "auto") {
  if(String(next||"home").replace(/^#/,"")!==page)window.SmartEaseStudio?.stop();
  next = String(next || "home").replace(/^#/, "");
  if (next === "native" || next.startsWith("native/")) {
    if (window.SmartEaseNative) return window.SmartEaseNative.enter(next, mode === "auto" ? "push" : mode);
    page = "native";
    document.querySelectorAll("#app [data-page]").forEach(el => el.hidden = true);
    if (mode !== "pop") history.replaceState(history.state, "", "#" + next);
    return;
  }
  window.SmartEaseNative?.leave();
  if (next !== "calibrate" && next !== "map" && !Object.hasOwn(icons, next)) next = "home";
  page = next;
  document
    .querySelectorAll("#app [data-page]")
    .forEach((el) => (el.hidden = el.dataset.page !== next));
  document.querySelectorAll("#app .bottom-nav button").forEach((el) => {
    el.classList.toggle("active", el.dataset.go === next);
    if (el.dataset.go === next) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  document.body.classList.remove("advanced-open");
  if (mode !== "pop" || location.hash !== "#" + next) history.replaceState(null, "", "#" + next);
  if (next === "home") renderScenesUI();
  if (next === "create") renderDesigner();
  if (next === "create") window.SmartEaseStudio?.enter();
  if (next === "scenes") renderScenesUI();
  if (next === "devices") renderDevices();
  if (next === "calibrate") calOpen();
  if (next === "map") mapOpen();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function cartDrawing(prefix) {
  const rear = cartView === "rear",
    glow = prefix === "home" ? "glow" : "glow-designer";
  const lighting = rear
    ? `<path data-light="canopy" d="M177 150 Q520 203 1114 141"/><path data-light="rear-bumper" d="M686 1037 1265 977"/><path data-light="left-under" d="M146 894 330 959"/><path data-light="right-under" d="M1000 1030 1200 982"/>`
    : `<path data-light="canopy" d="M221 129 Q437 153 680 172 Q940 192 1160 167"/><path data-light="front-bumper" d="M151 958 Q224 986 301 973"/><path data-light="left-under" d="M713 992 1032 928"/><path data-light="rear-bumper" d="m1220 814 62-20"/>`;
  const nokins = rear
    ? `<path data-nokins d="M511 771 Q550 742 627 744 L637 794 Q567 793 511 771Z"/><path data-nokins d="m1103 730 48 13 6 16-51 14Z"/>`
    : `<path data-nokins d="m136 871 26 9 13 43 105 26 17-43 39 1"/><path data-nokins d="m141 882 16 6m-12 2 17 7m-14 0 17 7m142 6 24-4m-27 12 23-4m-26 12 21-5"/>`;
  const eyes = rear
    ? ""
    : `<g class="windshield-display" transform="matrix(1 .035 -.20 1 292 424)"><rect width="280" height="86" rx="9" fill="#030b0e" stroke="#425253" stroke-width="3"/><defs><pattern id="eye-dots-${prefix}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="3.8" height="3.8" fill="white"/></pattern><mask id="eye-mask-${prefix}"><rect width="280" height="86" fill="url(#eye-dots-${prefix})"/></mask></defs><g class="eye-glyphs" mask="url(#eye-mask-${prefix})"><path data-eye d="M20 19 128 40 113 66 62 63Z"/><path data-eye d="M152 40 260 19 218 63 166 66Z"/></g></g>`;
  return `<div class="view-switch" role="group" aria-label="Cart view"><button data-cart-view="front" aria-pressed="${!rear}">Front</button><button data-cart-view="rear" aria-pressed="${rear}">Rear</button><span>2008 Precedent</span></div><div class="cart-stage model-stage"><svg class="cart-svg" viewBox="0 0 1312 1199" role="img" aria-label="${rear ? "Rear" : "Front"} view of a white 2008 Club Car Precedent with black trim, NOKINS lighting${rear ? "" : " and windshield Devil Eyes"}"><defs><filter id="${glow}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><image href="cart-precedent-${cartView}.webp" width="1312" height="1199"/><g fill="none" stroke-linecap="round" style="filter:url(#${glow})">${lighting}<g class="nokins-preview">${nokins}</g></g>${eyes}</svg><span class="preview-label">Whole-cart preview</span></div><div class="zone-tags">${E.zones.map((id) => `<span class="zone-tag" data-tag="${id}"><i></i>${{ "front-bumper": "Front", canopy: "Canopy", "left-under": "Left", "right-under": "Right", "rear-bumper": "Rear" }[id]}</span>`).join("")}<span class="zone-tag accessory-tag">NOKINS RGB</span>${rear ? "" : '<span class="zone-tag accessory-tag">Devil Eyes</span>'}</div>`;
}
ui("homeCart").innerHTML = cartDrawing("home");
ui("designerCart").innerHTML = cartDrawing("designer");
function paintCart(
  container,
  rows,
  accessories = container === "designerCart"
    ? draftAccessories
    : previewAccessories,
) {
  for (const el of ui(container).querySelectorAll("[data-light]")) {
    const r = rows[el.dataset.light];
    el.style.stroke = r.on ? r.color : "#294244";
    el.style.opacity = r.on ? String(0.25 + r.brightness / 133) : ".25";
    el.classList.toggle("sparkle", r.on && r.effect !== 25);
    el.classList.add("cart-light");
  }
  for (const el of ui(container).querySelectorAll("[data-tag]"))
    el.style.setProperty(
      "--light",
      rows[el.dataset.tag].on ? rows[el.dataset.tag].color : "#294244",
    );
  const design = E.accessories(accessories, rows["front-bumper"]),
    n = design.nokins,
    t = design.trinka;
  const accent =
    n.follow === "front"
      ? rows["front-bumper"]
      : { on: n.on, color: n.color, brightness: n.brightness };
  for (const el of ui(container).querySelectorAll("[data-nokins]")) {
    el.style.stroke = n.on && accent.on ? accent.color : "#3a4a4a";
    el.style.opacity =
      n.on && accent.on ? String(0.25 + accent.brightness / 133) : ".2";
  }
  const display = ui(container).querySelector(".windshield-display");
  if (display) {
    display.style.opacity = t.on ? String(0.3 + t.brightness / 143) : ".2";
    for (const el of display.querySelectorAll("[data-eye]"))
      el.style.fill = t.on ? t.color : "#132326";
    display
      .querySelector(".eye-glyphs")
      .setAttribute("class", "eye-glyphs " + t.pattern);
  }
}
function redrawCartViews() {
  for (const [id, prefix, rows, accessories] of [
    ["homeCart", "home", previewRows, previewAccessories],
    ["designerCart", "designer", draft, draftAccessories],
  ]) {
    ui(id).innerHTML = cartDrawing(prefix);
    paintCart(id, rows, accessories);
  }
}
app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-view]");
  if (button) {
    cartView = button.dataset.cartView;
    redrawCartViews();
  }
});
function savedScenes() {
  return czState.scenes.map((s) => ({
    ...s,
    category: E.presets.find(p=>p.id===s.id)?.category||"Saved",
    palette: [s.rows["front-bumper"].color, s.rows["rear-bumper"].color],
    caption: "Made by you · saved here",
    saved: true,
  }));
}
function allSceneVersions(){const saved=savedScenes();return [...E.presets.map(s=>saved.find(x=>x.id===s.id)||s),...saved.filter(s=>!E.presets.some(p=>p.id===s.id))];}
function sceneById(id) {
  return savedScenes().find(s=>s.id===id)||E.presets.find(s=>s.id===id);
}
/* A tap still plays the scene. Holding for 550 ms opens the same editor
   as the accessible pencil button, with movement cancellation for scrolling. */
function installSceneLongPress(control,scene){
 let timer=null,startX=0,startY=0,suppressTap=false,reset=null;
 const cancel=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
 control.addEventListener("pointerdown",event=>{
  if(event.pointerType==="mouse"&&event.button!==0)return;
  cancel();startX=event.clientX;startY=event.clientY;
  timer=setTimeout(()=>{
   timer=null;suppressTap=true;
   if(reset!==null)clearTimeout(reset);
   reset=setTimeout(()=>{suppressTap=false;reset=null;},1400);
   editScene(scene);
  },550);
 });
 control.addEventListener("pointermove",event=>{
  if(Math.abs(event.clientX-startX)>14||Math.abs(event.clientY-startY)>14)cancel();
 });
 for(const type of ["pointerup","pointercancel","pointerleave"])control.addEventListener(type,cancel);
 control.addEventListener("contextmenu",event=>event.preventDefault());
 control.addEventListener("click",event=>{
  if(!suppressTap)return;
  event.preventDefault();event.stopImmediatePropagation();
  suppressTap=false;
  if(reset!==null)clearTimeout(reset);
  reset=null;
 },true);
}
function sceneTile(scene) {
  const tile = document.createElement("article");
  tile.className =
    "scene-tile" +
    (scene.saved ? " saved-tile" : "") +
    (activeScene?.id === scene.id ? " active-scene" : "");
  tile.style.setProperty("--a", scene.palette[0]);
  tile.style.setProperty("--b", scene.palette.at(-1));
  const use = document.createElement("button");
  use.className = "scene-main";
  use.setAttribute("aria-label", "Play " + scene.name);
  const art = document.createElement("span");
  art.className = "scene-art";
  art.style.display = "block";
  art.setAttribute("aria-hidden", "true");
  const copy = document.createElement("span");
  copy.className = "scene-copy";
  const title = document.createElement("strong");
  title.textContent = scene.name;
  const subtitle = document.createElement("small");
  subtitle.textContent = scene.caption;
  copy.append(title, subtitle);
  use.append(art, copy);
  use.onclick = () => chooseScene(scene);
  installSceneLongPress(use,scene);
  const favorite = document.createElement("button");
  favorite.className =
    "favorite" + (preferences.favorites.includes(scene.id) ? " selected" : "");
  favorite.textContent = preferences.favorites.includes(scene.id) ? "★" : "☆";
  favorite.setAttribute(
    "aria-label",
    (preferences.favorites.includes(scene.id) ? "Unfavorite " : "Favorite ") +
      scene.name,
  );
  favorite.setAttribute(
    "aria-pressed",
    String(preferences.favorites.includes(scene.id)),
  );
  favorite.onclick = () => {
    preferences.favorites = preferences.favorites.includes(scene.id)
      ? preferences.favorites.filter((id) => id !== scene.id)
      : [...preferences.favorites, scene.id];
    persist();
    renderScenesUI();
  };
  tile.append(use, favorite);
  const edit = document.createElement("button");
  edit.className = "edit-scene";
  edit.textContent = "✎";
  edit.setAttribute("aria-label", (scene.saved ? "Edit " : "Customize ") + scene.name);
  edit.title = "Edit colors and save your version";
  edit.onclick = () => editScene(scene);
  tile.append(edit);
  if (scene.saved) {
    const del = document.createElement("button");
    del.className = "delete-scene";
    del.textContent = "×";
    del.setAttribute("aria-label", "Delete " + scene.name);
    del.onclick = () => {
      if (confirm("Delete “" + scene.name + "” from this browser?")) {
        const previousScenes=czState.scenes;czState.scenes = czState.scenes.filter((s) => s.id !== scene.id);
        if(!czSave()){czState.scenes=previousScenes;sceneSaveMessage("Could not delete the saved scene; the previous library is retained.",true);toast("Scene could not be deleted. Your saved library is unchanged.");return;}
        preferences.favorites = preferences.favorites.filter(
          (id) => id !== scene.id,
        );
        persist();
        renderScenesUI();
        czRenderSaved();
      }
    };
    tile.append(del);
  }
  return tile;
}
function renderScenesUI() {
  const quick = preferences.favorites.map(sceneById).filter(Boolean);
  ui("quickFavorites").replaceChildren(
    ...quick.map((scene) => {
      const button = document.createElement("button");
      button.className = "quick-scene";
      button.setAttribute("aria-label", "Play favorite " + scene.name);
      const dot = document.createElement("i");
      dot.style.background =
        "linear-gradient(135deg," +
        scene.palette[0] +
        "," +
        scene.palette.at(-1) +
        ")";
      button.append(dot, document.createTextNode(scene.name));
      button.onclick = () => chooseScene(scene);
      button.title = "Tap to play · hold to edit";
      installSceneLongPress(button,scene);
      return button;
    }),
  );
  ui("favoriteScenes").replaceChildren(
    ...preferences.favorites.map(sceneById).filter(Boolean).map(sceneTile),
  );
  if (!ui("favoriteScenes").children.length)
    ui("favoriteScenes").innerHTML =
      '<div class="empty-state">Tap ☆ on any scene to make it a favorite.</div>';
  const all = allSceneVersions().filter(
    (s) => filter === "All" || (filter==="Saved"?s.saved:s.category === filter),
  );
  ui("allScenes").replaceChildren(...all.map(sceneTile));
  if (!all.length)
    ui("allScenes").innerHTML =
      '<div class="empty-state">Your next favorite is yours to create. Save your first scene in Create.</div>';
}
function renderGradientLab(){
 const g=preferences.gradientChase;
 if(!ui("gradientChaseLab"))return;
 for(const [i,id] of ["gradientColorFront","gradientColorCanopy","gradientColorRear"].entries())
  ui(id).value=g.colors[i];
 ui("gradientNativeEffect").value=String(g.effect);
 ui("gradientNativeSpeed").value=String(g.speed);
 ui("gradientNativeSpeedValue").textContent=g.speed+"/10";
 ui("gradientBrightness").value=String(g.brightness);
 ui("gradientBrightnessValue").textContent=g.brightness+"%";
 ui("gradientReverseCanopy").checked=g.reverseCanopy;
 const ribbon=ui("gradientChaseRibbon");
 ribbon.style.setProperty("--gradient-front",g.colors[0]);
 ribbon.style.setProperty("--gradient-canopy",g.colors[1]);
 ribbon.style.setProperty("--gradient-rear",g.colors[2]);
 ui("gradientLiveStop").disabled=liveName!=="Gradient Sweep";
}
function gradientReadSettings(){
 const options={
  colors:["gradientColorFront","gradientColorCanopy","gradientColorRear"].map(id=>ui(id).value),
  effect:Number(ui("gradientNativeEffect").value),
  speed:Number(ui("gradientNativeSpeed").value),
  brightness:Number(ui("gradientBrightness").value),
  reverseCanopy:ui("gradientReverseCanopy").checked
 };
 preferences.gradientChase=gradientValidSettings(options);
 persist();
 renderGradientLab();
 ui("gradientChaseStatus").textContent="Your gradient settings were saved in Bluefy. No lights were changed.";
}
function gradientReady(){
 const status=ui("gradientChaseStatus");
 if(!canSend()){
  status.textContent="Connect your SP608E first. The gradient only controls SP608E decorative outputs.";
  return false;
 }
 if(document.visibilityState!=="visible"){
  status.textContent="Keep Bluefy open in the foreground to begin this test.";
  return false;
 }
 if(applying||liveName||nokinsTestBusy){
  status.textContent="Finish or stop the current lighting action before starting another.";
  return false;
 }
 for(const id of ["front-bumper","canopy","rear-bumper"]){
  if(!czValidAssigned(id).length){
   status.textContent="Map the front bumper, canopy and rear bumper SP608E outputs first. No controller writes were sent.";
   return false;
  }
 }
 return true;
}
function gradientLiveMapping(){
 return Object.fromEntries(E.zones.map(id=>[id,{channels:czValidAssigned(id)}]));
}
async function gradientRunNative(){
 if(!gradientReady())return false;
 const g=preferences.gradientChase,rows=E.gradientRows(g.colors,g.effect,g.brightness,g.speed);
 const direction=E.gradientDirectionCommands(gradientLiveMapping(),czState.activeOutputs,g.reverseCanopy);
 const stamp=++applyGeneration,guard=()=>stamp===applyGeneration&&canSend()&&document.visibilityState==="visible";
 applying=true;
 ui("gradientNativeRun").disabled=true;
 ui("gradientChaseStatus").textContent="Sending calibrated colors, controller motion and per-strip direction to mapped outputs…";
 try{
  // Existing SP608E adapter restores physical BRG order and calibrated colors.
  if(!await cartDevices[0].apply(rows,guard)||!guard())throw Error("Color/effect setup was interrupted");
  if(!await enqueuePackets(direction,"Gradient chase directional strips",{guard,skipRefresh:true})||!guard())
   throw Error("Direction setup was interrupted");
  showPreview({id:"gradient-native",name:"Gradient Chase",rows});
  powered=true;
  ui("playState").textContent="CONTROLLER WAVE/CHASE SENT";
  ui("gradientChaseStatus").textContent="Controller-native "+(g.effect===7?"Wave":"Chase")+
   " sent: front "+g.colors[0]+", canopy "+g.colors[1]+", rear "+g.colors[2]+
   ". "+(g.reverseCanopy?"Canopy reverse":"Canopy forward")+
   " command sent. Watch the real LED motion; the strips may not be phase-synchronized.";
  return true;
 }catch(error){
  if(guard())ui("gradientChaseStatus").textContent="Chase interrupted: "+error.message+". Reconnect and retry.";
  return false;
 }finally{
  if(stamp===applyGeneration)applying=false;
  ui("gradientNativeRun").disabled=false;
  updateHeader();
 }
}
async function gradientFlipCanopy(){
 if(!gradientReady())return false;
 const g=preferences.gradientChase,ports=czValidAssigned("canopy"),guard=()=>canSend()&&document.visibilityState==="visible";
 // Direction 0 is reverse and 1 forward in the SP608E firmware model.
 const commands=ports.map(n=>packet(0x8A,[maskFor(n-1),g.reverseCanopy?0:1]));
 ui("gradientChaseStatus").textContent="Sending canopy "+(g.reverseCanopy?"reverse":"forward")+" command…";
 try{
  const ok=await enqueuePackets(commands,"Test canopy chase direction",{guard,skipRefresh:true});
  ui("gradientChaseStatus").textContent=ok
   ?"Canopy direction command sent to "+ports.map(n=>"CH"+n).join(", ")+". It is visible only when a directional Wave/Chase effect is running."
   :"Canopy direction command was interrupted. Reconnect and try again.";
  return !!ok;
 }catch(error){
  ui("gradientChaseStatus").textContent="Canopy direction failed: "+error.message;
  return false;
 }
}
async function startGradientLive(cycles=Infinity,frameDelayOverride=null){
 if(!gradientReady())return false;
 const g=preferences.gradientChase,groups=[
  ["front-bumper"],["canopy"],["left-under","right-under"],["rear-bumper"]
 ];
 cancelPlayback();
 const token=++liveToken,generation=cartSession.generation;
 const guard=()=>token===liveToken&&generation===cartSession.generation&&canSend()&&document.visibilityState==="visible";
 liveName="Gradient Sweep";powered=true;
 ui("gradientLiveStop").disabled=false;
 ui("stopShow").hidden=false;
 ui("nowPlaying").textContent="Gradient Sweep";
 ui("playState").textContent=transport==="demo"?"GRADIENT PREVIEW":"TRAVELING GRADIENT · BLUEFY OPEN";
 let previous=g.colors[2],cycle=0;
 const current=E.rows([previous,previous],25,g.brightness);
 try{
  if(!await cartDevices[0].apply(current,guard))throw Error("Could not initialize the solid-color cart zones");
  while(guard()&&cycle<cycles){
   for(const stage of g.colors){
    if(!guard())break;
    for(const ids of groups){
     if(!guard())break;
     for(let step=1;step<=3&&guard();step++){
      const portion=step/3;
      const jobs=ids.flatMap(id=>czValidAssigned(id).map(n=>hauntedFadeCommand(n,previous,stage,portion,Math.round(current[id].brightness*255/100))));
      if(jobs.length&&!await enqueuePackets(jobs,"SmartEase front-to-rear gradient",{guard,skipRefresh:true}))
       throw Error("The controller stopped accepting gradient frames");
      for(const id of ids)current[id].color=E.mix(previous,stage,portion);
      paintCart("homeCart",current);
      ui("playProgress").textContent="Front → rear · "+stage;
      ui("gradientChaseStatus").textContent="Traveling "+stage+" across mapped cart zones. Stop to leave the last color displayed.";
      const pause=Number.isInteger(frameDelayOverride)&&frameDelayOverride>=0?frameDelayOverride:90+(10-g.speed)*25;
      if(guard()&&pause>0)await sleep(pause);
     }
    }
    previous=stage;
   }
   cycle++;
  }
  return true;
 }catch(error){
  if(guard())ui("gradientChaseStatus").textContent="Traveling gradient stopped: "+error.message;
  return false;
 }finally{
  if(token===liveToken){
   liveName="";
   ui("gradientLiveStop").disabled=true;
   ui("stopShow").hidden=true;
   ui("playState").textContent="TRAVELING GRADIENT STOPPED · LAST COLORS REMAIN";
   ui("playProgress").textContent="";
   if(cycle>=cycles)ui("gradientChaseStatus").textContent="Gradient sweep complete. The last colors remain on your cart; no scene slot was saved.";
  }
 }
}
function gradientStopLive(){
 if(liveName!=="Gradient Sweep")return;
 cancelPlayback();
 ui("gradientLiveStop").disabled=true;
 ui("gradientChaseStatus").textContent="Traveling gradient stopped. Last colors remain until you play another scene or turn the lights off.";
 ui("playState").textContent="GRADIENT STOPPED · LAST COLORS REMAIN";
}
function showPreview(scene) {
  window.SmartEaseStudio?.preview(scene);
  activeScene = scene;
  previewRows = structuredClone(scene.rows);
  previewAccessories = E.accessories(
    scene.accessories,
    scene.rows["front-bumper"],
  );
  paintCart("homeCart", previewRows);
  ui("nowPlaying").textContent = scene.name;
  ui("playState").textContent = "SCENE PREVIEW";
  const brightness = scene.rows["front-bumper"].brightness;
  ui("appBrightness").value = brightness;
  ui("appBrightnessValue").textContent = brightness + "%";
  renderScenesUI();
}
async function chooseScene(scene) {
  scene=sceneById(scene.id)||scene;
  showPreview(E.forPlayback(scene, preferences.trueColors));
  if(scene.composition&&window.SmartEaseStudio)return applyScene(scene);
  if (!hasSceneTarget()) {
    toast("Preview ready. Connect your cart to play it on your lights.");
    return;
  }
  await applyScene(scene);
}
function hasSceneTarget() {
  return cartDevices.some(
    (a) => a.capabilities.scenes && a.connected && a.controlReady !== false && a.sceneEnabled !== false,
  );
}
async function applyScene(scene) {
  scene=sceneById(scene.id)||scene;
  if(scene.composition&&window.SmartEaseStudio){const result=await SmartEaseStudio.applyScene(scene);return result.complete;}
  if (!hasSceneTarget()) {
    toast("Connect your cart lighting first.");
    go("devices");
    return false;
  }
  if (applying || window.SmartEaseStudio?.applying) {
    toast("Finishing your last scene. You can stop it with the power button.");
    return false;
  }
  const playScene = E.forPlayback(scene, preferences.trueColors);
  const generation = beginScenePlayback();
  updateHeader();
  ui("playProgress").textContent = "Setting the mood…";
  try {
    const result = await cartSession.apply(playScene.rows, scene.accessories);
    if (generation !== applyGeneration || result.cancelled) return false;
    const ok = result.results.length > 0 && result.results.every((r) => r.ok);
    if (!ok)
      throw Error(
        "Your lights didn’t finish updating. Reconnect, then play the scene again.",
      );
    showPreview(playScene);
    powered = Object.values(playScene.rows).some((r) => r.on);
    ui("playState").textContent =
      transport === "demo"
        ? "PREVIEW MODE"
        : previewAccessories.trinka.on
          ? "LIGHTING SENT · EYES PREVIEW"
          : "LIGHTING SENT TO YOUR CART";
    toast(
      transport === "demo"
        ? "Preview playing."
        : result.results
            .map((r) => (r.id === "sp608e" ? "Cart lighting" : "NOKINS"))
            .join(" + ") +
            " updated." +
            (previewAccessories.nokins.on &&
            !result.results.some((r) => r.id === "nokins")
              ? " NOKINS stays in preview."
              : "") +
            (previewAccessories.trinka.on ? " Eyes stay in preview." : ""),
    );
    return true;
  } catch (e) {
    if (generation === applyGeneration) toast(e.message);
    return false;
  } finally {
    if (generation === applyGeneration) {
      applying = false;
      ui("playProgress").textContent = "";
    }
    updateHeader();
  }
}
function beginScenePlayback(){cancelPlayback();applying=true;return applyGeneration;}
function cancelPlayback() {
  window.SmartEaseStudio?.stop();
  applyGeneration++;
  applying = false;
  liveToken++;
  liveName = "";
  cartSession.stop();
  ui("stopShow").hidden = true;
  ui("playProgress").textContent = "";
}
async function lightsOff() {
  cancelPlayback();
  const targets = cartDevices.filter(
    (a) => a.capabilities.scenes && a.connected && a.sceneEnabled !== false,
  );
  if (!targets.length) {
    toast("Connect your cart lighting first.");
    return;
  }
  const results = await Promise.allSettled(targets.map((a) => a.power(false)));
  if (results.every((r) => r.status === "fulfilled" && r.value)) {
    powered = false;
    previewAccessories.nokins.on = false;
    previewRows = Object.fromEntries(
      E.zones.map((id) => [id, { ...previewRows[id], on: false }]),
    );
    paintCart("homeCart", previewRows);
    ui("playState").textContent = "DECORATIVE LIGHTS OFF";
    toast("Decorative lighting off request sent.");
  } else toast("Some lights didn’t respond. Reconnect and try again.");
  updateHeader();
}
async function startHauntedFlow() {
  if (!canSend()) {
    ui("liveDialog").close();
    go("devices");
    toast("Connect your cart lighting first.");
    return;
  }
  if (applying) {
    toast("Let the current scene finish first.");
    return;
  }
  ui("liveDialog").close();
  cancelPlayback();
  const token = ++liveToken,
    generation = cartSession.generation;
  const guard = () =>
    token === liveToken &&
    generation === cartSession.generation &&
    canSend() &&
    document.visibilityState === "visible";
  liveName = "Haunted Surge";
  powered = true;
  ui("stopShow").hidden = false;
  ui("playState").textContent =
    transport === "demo" ? "LIVE PREVIEW" : "LIVE FLOW · KEEP BLUEFY OPEN";
  ui("nowPlaying").textContent = liveName;
  const order = E.zones.slice().sort((a, b) => E.positions[a] - E.positions[b]);
  let previous = "#ff751e";
  try {
    while (guard()) {
      for (const stage of ["#46ef77", "#a24aec", "#ff751e"]) {
        if (!guard()) break;
        if (cartDevices[2].connected && cartDevices[2].sceneEnabled)
          await cartDevices[2].apply(
            E.rows([stage, stage], 25, Number(ui("appBrightness").value)),
            guard,
          );
        const initial = E.rows(
          [previous, previous],
          25,
          Number(ui("appBrightness").value),
        );
        if (!(await cartDevices[0].apply(initial, guard)))
          throw Error(
            "Connection interrupted. Tap Reconnect to resume your lights.",
          );
        for (const id of order) {
          if (!guard()) break;
          const ports = czValidAssigned(id);
          if (!ports.length) continue;
          for (let step = 1; step <= 2; step++) {
            if (!guard()) break;
            const col = E.mix(previous, stage, step / 2);
            const ok = await enqueuePackets(
              ports.map((n) =>
                hauntedFadeCommand(n, previous, stage, step / 2, Math.round(initial[id].brightness * 255 / 100)),
              ),
              "SmartEase live gradient",
              { guard, skipRefresh: true },
            );
            if (!ok && guard())
              throw Error(
                "Connection interrupted. Tap Reconnect to resume your lights.",
              );
            initial[id].color = col;
            paintCart("homeCart", initial);
          }
        }
        if (!guard()) break;
        const twinkle = E.rows(
          [stage, stage],
          3,
          Number(ui("appBrightness").value),
        );
        if (!(await cartDevices[0].apply(twinkle, guard)))
          throw Error(
            "Connection interrupted. Tap Reconnect to resume your lights.",
          );
        paintCart("homeCart", twinkle);
        ui("playProgress").textContent =
          "Twinkling " +
          {
            "#46ef77": "toxic green",
            "#a24aec": "haunted purple",
            "#ff751e": "pumpkin orange",
          }[stage];
        for (let t = 0; t < 2400 && guard(); t += 100) await sleep(100);
        previous = stage;
      }
    }
  } catch (e) {
    if (guard()) toast(e.message);
  } finally {
    if (token === liveToken) {
      liveName = "";
      ui("stopShow").hidden = true;
      ui("playState").textContent = "LIVE FLOW STOPPED";
      ui("playProgress").textContent = "";
    }
  }
}
/* Scene color palette groups equal RGB colors together, so Halloween has
   three editable colors (green, purple and orange) while retaining its five
   physical zones. Only Save writes a scene to persistent browser storage. */
function designerPaletteGroups(){
 const groups=[];
 for(const id of E.zones){
  const color=draft[id].color.toLowerCase();
  let group=groups.find(item=>item.color===color);
  if(!group){group={id,color,ids:[]};groups.push(group);}
  group.ids.push(id);
 }
 return groups;
}
function designerPaletteActive(){
 const groups=designerPaletteGroups();
 return groups.find(group=>group.ids.includes(designerPaletteSelection))||groups[0];
}
function designerPaletteRender(){
 const groups=designerPaletteGroups(),host=ui("scenePaletteOptions");
 host.replaceChildren();
 for(const [index,group] of groups.entries()){
  const button=document.createElement("button");
  button.type="button";button.className="scene-palette-choice";
  const selected=group.ids.includes(designerPaletteSelection);
  button.setAttribute("aria-pressed",String(selected));
  if(selected)button.classList.add("active");
  const circle=document.createElement("i");circle.style.background=group.color;
  const label=document.createElement("span");
  const first=czState.zones[group.ids[0]]?.name||group.ids[0];
  label.textContent="Color "+(index+1)+" · "+first+(group.ids.length>1?" + "+(group.ids.length-1)+" more":"");
  button.append(circle,label);
  button.onclick=()=>{designerPaletteSelection=group.id;designerPaletteRender();};
  host.append(button);
 }
 const group=designerPaletteActive();
 if(!group)return;
 const components=rgbFromHex(group.color);
 for(const [i,channel] of ["R","G","B"].entries()){
  ui("scenePalette"+channel).value=String(components[i]);
  ui("scenePalette"+channel+"Value").textContent=String(components[i]);
 }
 ui("scenePaletteColorPreview").style.background=group.color;
 ui("scenePaletteHex").textContent=group.color.toUpperCase();
 const names=group.ids.map(id=>czState.zones[id]?.name||id);
 ui("scenePaletteTest").disabled=group.ids.every(id=>!czValidAssigned(id).length);
 ui("scenePaletteStatus").textContent=names.join(", ")+" · "+group.ids.length+" zone"+(group.ids.length===1?"":"s")+". Adjust RGB, test on your lights, then save below.";
}
function designerPaletteChanged(){
 const group=designerPaletteActive();
 if(!group)return;
 const bytes=["R","G","B"].map(channel=>Number(ui("scenePalette"+channel).value));
 const color=colorToHex(...bytes);
 for(const id of group.ids){
  draft[id].color=color;
  const picker=ui("zoneEditors").querySelector('[data-scene-zone="'+id+'"]');
  if(picker)picker.value=color;
 }
 ui("gradientFront").value=draft["front-bumper"].color;
 ui("gradientRear").value=draft["rear-bumper"].color;
 ui("gradientLine").style.setProperty("--a",ui("gradientFront").value);
 ui("gradientLine").style.setProperty("--b",ui("gradientRear").value);
 designerPaletteRender();
 paintCart("designerCart",draft);
 ui("scenePaletteStatus").textContent="Color adjusted · unsaved. Test on the real cart, then Save your version.";
}
async function designerPaletteTest(){
 const group=designerPaletteActive();
 if(!group||!isLive()||document.visibilityState!=="visible"){
  ui("scenePaletteStatus").textContent="Connect your SP608E in Bluefy and keep this screen open to test a scene color.";
  return false;
 }
 const ports=[...new Set(group.ids.flatMap(id=>czValidAssigned(id)))].sort((a,b)=>a-b);
 if(!ports.length){
  ui("scenePaletteStatus").textContent="This color is not mapped to an active SP608E output. Map the light in Settings first.";
  return false;
 }
 const button=ui("scenePaletteTest"),color=group.color,guard=()=>isLive()&&document.visibilityState==="visible";
 button.disabled=true;
 ui("scenePaletteStatus").textContent="Testing "+color+" as a solid color on "+ports.length+" mapped output(s)…";
 try{
  cancelPlayback();
  if(!await spEnsureChipColors(ports,guard))throw Error("Could not restore the saved BRG color order");
  const commands=ports.flatMap(n=>{
   const mask=maskFor(n-1);
   return [packet(0x83,[mask,25]),packet(0x85,[mask,153]),
    packet(0x82,[mask,1]),spCorrectedColorCommand(n,color,153)];
  });
  const ok=await enqueuePackets(commands,"Test selected SmartEase scene color",{skipRefresh:true,guard});
  ui("scenePaletteStatus").textContent=ok
   ?"Solid "+color+" sent to your selected cart lights. If the physical shade is right, save your scene; otherwise adjust RGB and test again."
   :"The test was interrupted. Reconnect and try again.";
  return !!ok;
 }catch(error){
  ui("scenePaletteStatus").textContent="Couldn't test the scene color: "+error.message;
  return false;
 }finally{button.disabled=false;}
}
for(const channel of ["R","G","B"])ui("scenePalette"+channel).addEventListener("input",designerPaletteChanged);
ui("scenePaletteTest").onclick=designerPaletteTest;
function renderDesigner() {
  ui("zoneEditors").replaceChildren();
  for (const id of E.zones) {
    const row = document.createElement("div");
    row.className = "edit-row";
    const label = document.createElement("span");
    label.textContent = czState.zones[id]?.name || CZ_DEFS.find((z) => z.id === id).name;
    const picker = document.createElement("input");
    picker.type = "color";
    picker.value = draft[id].color;
    picker.setAttribute("aria-label", label.textContent + " color");
    picker.dataset.sceneZone = id;
    picker.oninput = () => {
      draft[id].color = picker.value;
      paintCart("designerCart", draft);
    };
    picker.onchange = () => {
      designerPaletteSelection = id;
      designerPaletteRender();
    };
    const state = document.createElement("select");
    state.className = "input";
    state.setAttribute("aria-label", label.textContent + " state");
    for (const [value, text] of [
      ["on", "Included"],
      ["off", "Light off"],
    ]) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = text;
      state.append(opt);
    }
    state.value = draft[id].on ? "on" : "off";
    state.onchange = () => {
      draft[id].on = state.value === "on";
      paintCart("designerCart", draft);
    };
    row.append(label, picker, state);
    ui("zoneEditors").append(row);
  }
  ui("gradientLine").style.setProperty("--a", ui("gradientFront").value);
  ui("gradientLine").style.setProperty("--b", ui("gradientRear").value);
  renderAccessoryEditor();
  paintCart("designerCart", draft);
  designerEffectNotice();
  designerPaletteRender();
}
function designerEffectNotice() {
 const effect=Number(ui("designerEffect").value);
 ui("designerEffectHelp").textContent=effect===25
  ?"Steady glow gives the most reliable exact colors on your LEDs."
  :effect===1
   ?"Rainbow uses the controller's changing palette; individual colors you pick do not control its rainbow."
   :"Your scene keeps this animation. SP608E effects can change the visible shade; choose Steady glow to verify an exact color.";
}
/* Original device controls are deliberately separate from Whole Cart.
   MELK mode IDs come from the tested MELK-OA10 profile only: no guessing
   for other Lotus variants or the Devil Eyes display. */
let nativeLotusBusy=false;
function nativeLotusMenu(){
 const category=ui("nativeLotusCategory").value;
 const menu=ui("nativeLotusMode"),old=Number(menu.value);
 const entries=SmartEaseLotus.nativeModes("melk-oa10",category);
 menu.replaceChildren();
 for(const entry of entries){
  const option=document.createElement("option");
  option.value=String(entry.id);
  option.textContent=entry.label+" · "+entry.category;
  menu.append(option);
 }
 const saved=preferences.lotusNative.mode;
 const next=entries.some(e=>e.id===old)?old:
   entries.some(e=>e.id===saved)?saved:entries[0]?.id;
 if(next!==undefined)menu.value=String(next);
 preferences.lotusNative.mode=Number(menu.value);
}
function initNativeLibrary(){
 const categories=ui("nativeLotusCategory");
 for(const cat of SmartEaseLotus.categories){
  const option=document.createElement("option");
  option.value=cat.id;option.textContent=cat.name;
  categories.append(option);
 }
 categories.value=preferences.lotusNative.category;
 nativeLotusMenu();
 for(const id of ["Speed","Brightness"]){
  ui("nativeLotus"+id).value=String(preferences.lotusNative[id.toLowerCase()]);
  ui("nativeLotus"+id+"Value").textContent=ui("nativeLotus"+id).value+"%";
  ui("nativeLotus"+id).addEventListener("input",()=>{
   preferences.lotusNative[id.toLowerCase()]=Number(ui("nativeLotus"+id).value);
   ui("nativeLotus"+id+"Value").textContent=ui("nativeLotus"+id).value+"%";
   persist();
  });
 }
 categories.onchange=()=>{
  preferences.lotusNative.category=categories.value;
  nativeLotusMenu();persist();
 };
 ui("nativeLotusMode").onchange=()=>{
  preferences.lotusNative.mode=Number(ui("nativeLotusMode").value);
  persist();
 };
 ui("nativeLotusApply").onclick=applyNativeLotusMode;
 ui("nativeSpChannels").onclick=()=>openAdvanced("control");
 ui("nativeSpEffects").onclick=()=>openAdvanced("effects");
 ui("nativeSpScenes").onclick=()=>openAdvanced("scenes");
}
function renderNativeLibrary(){
 const adapter=cartDevices[2];
 const supported=adapter.connected&&adapter.profile==="melk-oa10";
 ui("nativeLotusApply").disabled=!supported||
   nativeLotusBusy||applying||!!liveName||nokinsTestBusy||
   document.visibilityState!=="visible";
 ui("nativeLotusInfo").textContent=supported
  ?"MELK-OA10 connected. Native modes 0–212 are available for hardware testing. Other app features still need separate validation."
  :adapter.of21?.profile
   ?"MELK-OF21 uses its separate source-derived controls below: 234 effect IDs and 33 native scenes. The OA10 library is not used for it."
  :adapter.connected
   ?"Connected "+adapter.identity?.name+". Native mode codes are not verified for this controller profile. Only the existing color tests are enabled."
   :adapter.identity
    ?"Detected "+adapter.identity.name+". Reconnect a verified MELK-OA10 to try native effects."
    :"Connect your NOKINS decorative controller above. Unknown LotusLamp variants receive no effect packets.";
 ui("nativeEyesInfo").textContent=cartDevices[1].identity
  ?"Detected "+cartDevices[1].identity.name+". Create text, art and animations below. Only exact96×16 CoolLEDUX projects can open experimental Send; capacity, orientation and retention remain physically unverified."
  :"Create text, pictures, animations and playlists below. Connect the exact CoolLEDUX target for experimental96×16 Send; other profiles and sizes remain local-only.";
}
async function applyNativeLotusMode(){
 const adapter=cartDevices[2],status=ui("nativeLotusStatus");
 const mode=Number(ui("nativeLotusMode").value),settings={
  speed:Number(ui("nativeLotusSpeed").value),
  brightness:Number(ui("nativeLotusBrightness").value)
 };
 if(!adapter.connected||adapter.profile!=="melk-oa10"||
    document.visibilityState!=="visible"||
    transport==="demo"||applying||!!liveName||nokinsTestBusy||nativeLotusBusy){
  status.textContent="No commands sent. Connect a verified MELK-OA10 and stop other active shows first.";
  return false;
 }
 // Validate before touching the write queue. No command for unknown profiles.
 let jobs;
 try{jobs=SmartEaseLotus.nativeModeCommands(adapter.profile,mode,settings);}
 catch(error){status.textContent=error.message;return false;}
 const guard=()=>adapter.connected&&adapter.profile==="melk-oa10"&&
  document.visibilityState==="visible"&&!applying&&!liveName;
 nativeLotusBusy=true;renderNativeLibrary();
 status.textContent="Sending native effect "+mode+" at "+settings.brightness+"% brightness…";
 try{
  const ok=await adapter.nativeMode(mode,settings,guard);
  status.textContent=ok
   ?"Sent "+jobs.length+" verified-format MELK-OA10 commands for mode "+mode+
      ". Check the real NOKINS light; mode names and appearance still need on-cart verification. This did not save an onboard slot."
   :"Native effect interrupted. Reconnect the controller and try again.";
  return !!ok;
 }catch(error){status.textContent="Native effect failed: "+error.message;return false;}
 finally{nativeLotusBusy=false;renderNativeLibrary();}
}
function renderDevices() {
  const list = ui("deviceList");
  list.replaceChildren();
  for (const adapter of cartDevices) {
    const row = document.createElement("div");
    row.className = "device-row";
    const info = document.createElement("div");
    info.className = "device-info";
    const symbol = document.createElement("span");
    symbol.className = "device-icon";
    symbol.textContent =
      adapter.id === "sp608e" ? "✦" : adapter.id === "trinka" ? "◉" : "◈";
    symbol.setAttribute("aria-hidden", "true");
    const words = document.createElement("div"),
      heading = document.createElement("h3"),
      detail = document.createElement("p");
    heading.textContent = adapter.name;
    if (adapter.id === "sp608e")
      detail.textContent = isLive()
        ? (device.name || "SP608E") + " · Connected"
        : transport === "demo"
          ? "Preview mode · No physical connection"
          : connectionInProgress
            ? "Connecting…"
            : "SP608E · Disconnected";
    else if (adapter.id === "nokins") {
      detail.textContent = adapter.connected
        ? adapter.device.name + (adapter.controlReady?" · Connected · Source-derived color control ready":" · Connected · Control transport unavailable")
        : adapter.connecting
          ? "Connecting…"
          : adapter.identity
            ? adapter.identity.name +
              " · " +
              (adapter.profile ? "Disconnected" : "Setup needed")
            : "LotusLamp X · Connect compatible decorative lighting";
      if (adapter.connected && adapter.controlReady !== false) {
        const label = document.createElement("label");
        label.className = "switchline";
        const match = document.createElement("input");
        match.type = "checkbox";
        match.checked = adapter.sceneEnabled;
        match.onchange = () => {
          adapter.sceneEnabled = match.checked;
          preferences.nokinsSceneEnabled=match.checked;persist();
          toast(
            match.checked
              ? "NOKINS will follow the front scene color."
              : "NOKINS scene matching is off.",
          );
        };
        label.append(
          match,
          document.createTextNode(
            "Match scene colors on decorative NOKINS lighting",
          ),
        );
        words.append(heading, detail, label);
        const note = document.createElement("p");
        note.className = "small-note";
        note.textContent =
          "One matching color. Factory driving controls stay independent.";
        words.append(note);
      }
    } else {
      const identity = adapter.link?.identity||adapter.identity||preferences.deviceIdentities?.[adapter.id]||SmartEasePairing.assignment(adapter.id);
      detail.textContent = adapter.connected?identity.name+" · Connected · Upload remains gated":adapter.connecting?"Connecting CoolLEDUX…":identity?identity.name+(SmartEasePairing.assignment(adapter.id)?.id===identity.id?" · Remembered; tap Connect":" · Selected; disconnected"):"CoolLEDUX · Disconnected";
    }
    if (!words.children.length) words.append(heading, detail);
    info.append(symbol, words);
    const action = document.createElement("button");
    action.className = adapter.id === "sp608e" ? "primary" : "secondary";
    action.dataset.deviceConnect=adapter.id;
    action.id="deviceConnect-"+adapter.id;
    action.textContent =
      adapter.id === "sp608e"
        ? isLive()
          ? "Disconnect"
          : connectionInProgress
            ? "Connecting…"
            : "Connect"
        : adapter.id === "nokins"
          ? adapter.connected
            ? "Disconnect"
            : adapter.connecting
              ? "Connecting…"
              : "Connect"
          : adapter.connected?"Disconnect":adapter.connecting?"Connecting…":"Connect";
    action.disabled =
      (adapter.id === "sp608e" && connectionInProgress) ||
      adapter.connecting === true;
    action.onclick = async () => {
      if(window.SmartEaseConnections)return SmartEaseConnections.connectOne(adapter.id);
      if (adapter.id === "sp608e") {
        await adapter.connect();
        return;
      }
      if (adapter.id === "nokins" && adapter.connected) {
        adapter.disconnect();
        renderDevices();
        updateHeader();
        return;
      }
      action.disabled = true;
      try {
        if (adapter.id === "nokins") {
          await adapter.connect(!adapter.profile);
          toast(
            "NOKINS connected. Choose scene matching to include its decorative lights.",
          );
        } else {
          const identity = await adapter.identify();
          preferences.deviceIdentities[adapter.id] = identity;
          persist();
          ui("deviceMessage").textContent =
            identity.name +
            " identified. Its control setup still needs verification; continue using its original app.";
          toast("Device identified. Control setup is still needed.");
        }
      } catch (error) {
        if (error.name !== "NotFoundError") toast(error.message);
      } finally {
        renderDevices();
        updateHeader();
      }
    };
    const error=adapter.id==="sp608e"?lastConnectError:adapter.profile==="melk-of21"?adapter.ownerLink.error:adapter.lastError;
    if(error){const message=document.createElement("p");message.className="small-note";message.textContent=error;words.append(message);}
    const stage=document.createElement("p");stage.className="small-note";stage.dataset.deviceStage=adapter.id;
    const latest=window.SmartEasePairing?.diagnostics[adapter.id]?.at(-1);stage.textContent=latest?"Connection: "+latest.phase+(latest.error?" — "+latest.error:""):"Connection: ready for a Connect tap";words.append(stage);
    row.append(info, action);
    if(adapter.connecting||(adapter.id==="sp608e"&&connectionInProgress)){
      const cancel=document.createElement("button");cancel.className="text-btn";cancel.type="button";cancel.textContent="Cancel";cancel.dataset.deviceCancel=adapter.id;cancel.onclick=()=>window.SmartEaseConnections?.cancel(adapter.id);row.append(cancel);
    }
    list.append(row);
    if(adapter.id==="trinka"){
      const inspect=document.createElement("button");
      inspect.className="text-btn";
      inspect.textContent="Inspect Devil Eyes Bluetooth (read-only) ↗";
      inspect.disabled=!adapter.device;
      inspect.title=adapter.device?"Collect only service UUIDs and characteristic permissions. Sends no commands.":"Identify the display first.";
      inspect.onclick=async()=>{
        inspect.disabled=true;
        ui("deviceMessage").textContent="Reading Devil Eyes Bluetooth service metadata. No lighting commands will be sent.";
        try{
          const report=await adapter.inspectCoolLedProtocol();
          preferences.devilEyesProtocolReport=report;
          persist();
          ui("deviceMessage").textContent="Read-only inspection complete. The report is shown below; share it so we can choose the right upload protocol.";
        }catch(error){
          ui("deviceMessage").textContent="Protocol inspection unavailable: "+error.message;
        }finally{renderDevices();}
      };
      const report=document.createElement("textarea");
      report.className="input";
      report.readOnly=true;
      report.rows=5;
      report.id="devilEyesProtocolReport";
      report.setAttribute("aria-label","Devil Eyes Bluetooth protocol inspection report");
      const saved=adapter.protocolReport||preferences.devilEyesProtocolReport;
      report.value=saved
        ?"Name: "+saved.name+"\nPossible family: "+saved.family+
         "\nFFF0 service: "+(saved.serviceFound?"present":"not accessible")+
         "\nCharacteristics: "+(saved.characteristics?.length
            ?saved.characteristics.map(ch=>ch.uuid+
              " [write "+ch.write+", writeWithoutResponse "+ch.writeWithoutResponse+
              ", notify "+ch.notify+"]").join("; "):"none exposed")+
         "\n"+saved.detail+"\nNo BLE commands sent. Actual device family requires confirmation."
        :"Identify and inspect your Devil Eyes to get a read-only protocol report. Close CoolLED1248 first.";
      report.onclick=()=>{report.focus();report.select();};
      const note=document.createElement("p");
      note.className="small-note";
      note.textContent="Connects briefly to inspect known CoolLED FFF0 service and characteristic metadata, then disconnects. No reads, firmware changes, animation uploads or write commands. The service alone cannot identify the protocol.";
      list.append(inspect,note,report);
    }
    if (adapter.id === "nokins" && adapter.identity && !adapter.connected) {
      const another = document.createElement("button");
      another.className = "text-btn";
      another.textContent = "Choose a different LotusLamp controller ↗";
      another.onclick = async () => {
        try {
          if(window.SmartEaseConnections)await SmartEaseConnections.connectOne("nokins",{newDevice:true,toggle:false});else await adapter.connectOwner(true);
          toast("NOKINS connected.");
        } catch (error) {
          if (error.name !== "NotFoundError") toast(error.message);
        }
        renderDevices();
        updateHeader();
      };
      list.append(another);
    }
  }
  renderNokinsTestPanel();
  renderNativeLibrary();
}
/* Explicit on-cart NOKINS check. Connecting/identifying never writes RGB
   commands. A supported identity, explicit user action and live GATT
   connection are required before each harmless decorative solid-color test. */
let nokinsTestBusy = false;
function renderNokinsTestPanel(){
 const adapter=cartDevices.find(a=>a.id==="nokins");
 const info=ui("nokinsControllerInfo");
 if(adapter.connected)info.textContent="Connected: "+adapter.identity.name+
  " · Profile "+adapter.profile+" · Basic RGB color/brightness test available.";
 else if(adapter.identity)info.textContent="Detected: "+adapter.identity.name+
  (adapter.profile?" · Supported profile, currently disconnected. Reconnect to test.":" · Protocol unsupported. No RGB commands will be sent. Share this name to add a verified adapter.");
 else info.textContent="No NOKINS controller identified yet. In Devices, tap Connect beside NOKINS, then select the Bluetooth device shown in LotusLamp X.";
 for(const id of ["nokinsTestRed","nokinsTestGreen","nokinsTestBlue","nokinsTestOrange"])
  ui(id).disabled=nokinsTestBusy||!adapter.connected||adapter.controlReady===false||document.visibilityState!=="visible";
}
async function testNokinsColor(hex,label){
 const adapter=cartDevices.find(a=>a.id==="nokins");
 const status=ui("nokinsTestResult");
 if(!adapter.connected||!adapter.profile||adapter.controlReady===false){
  status.textContent="Connect a recognized LotusLamp X controller before testing colors.";
  return false;
 }
 if(document.visibilityState!=="visible"){
  status.textContent="Keep Bluefy visible before testing.";
  return false;
 }
 if(applying||liveName||nokinsTestBusy){
  status.textContent="Stop the current lighting show before testing NOKINS alone.";
  return false;
 }
 nokinsTestBusy=true;renderNokinsTestPanel();
 status.textContent="Sending "+label+" at 35% to the NOKINS RGB controller…";
 const guard=()=>adapter.connected&&document.visibilityState==="visible"&&!applying&&!liveName;
 try{
  const ok=adapter.profile==="melk-of21"?await adapter.ownerCommands([{kind:"power",value:true},{kind:"brightness",value:35},{kind:"color",value:hex}],guard):await adapter.write(SmartEaseLotus.commands(adapter.profile,{on:true,color:hex,brightness:35}),guard);
  status.textContent=ok
   ?"Sent "+label+" RGB test at 35%. Confirm the actual decorative color. Before driving, verify the stalk, turn signals, brake lights and hazards still work normally. No on-cart readback is available."
   :"The RGB test was interrupted. Check the controller is powered, close LotusLamp X, reconnect and try again.";
  return !!ok;
 }catch(error){
  status.textContent="Test failed: "+error.message;
  return false;
 }finally{nokinsTestBusy=false;renderNokinsTestPanel();}
}
for(const [id,hex,label] of [
 ["nokinsTestRed","#ff0000","red"],["nokinsTestGreen","#00ff00","green"],
 ["nokinsTestBlue","#0000ff","blue"],["nokinsTestOrange","#ff751e","orange"],
])ui(id).onclick=()=>testNokinsColor(hex,label);
async function reconnectAll(force = false) {
  if(window.SmartEaseConnections)return SmartEaseConnections.reconnectRemembered(force===true);
  if (connectionInProgress) return;
  if (force === true) {
    cancelPlayback();
    for (const adapter of cartDevices.filter(
      (a) => a.capabilities.scenes && a.connected,
    ))
      adapter.disconnect();
  }
  if (transport === "demo") {
    exitDemo();
  }
  const targets = cartDevices.filter(
    (a) =>
      a.capabilities.scenes &&
      !a.connected &&
      (a.id === "sp608e" || (a.device && a.profile)),
  );
  if (!targets.length) {
    toast("Your supported cart lighting is already connected.");
    go("devices");
    return;
  }
  ui("emergencyReconnect").disabled = true;
  ui("emergencyReconnect").textContent = "↻ Connecting";
  ui("deviceMessage").textContent = "Connecting your supported lighting…";
  try {
    for (const adapter of targets) {
      try {
        if (rememberedDevice) await adapter.reconnect();
        else await adapter.connect();
      } catch (error) {
        log(adapter.name + " reconnect: " + error.message, "warn");
      }
    }
    const connected = targets.filter((a) => a.connected);
    ui("deviceMessage").textContent =
      connected.length === targets.length
        ? "Cart lighting connected. Your other devices can be identified below."
        : "Check the lighting switch, close other lighting apps, and try again. If needed, choose Find another controller.";
    if (connected.length !== targets.length) {
      toast("Reconnect didn’t finish. Open Devices to try another controller.");
      go("devices");
    } else toast("Your cart lighting is connected.");
  } catch (e) {
    toast("Couldn’t reconnect. Check power and try again.");
  } finally {
    ui("emergencyReconnect").disabled = false;
    ui("emergencyReconnect").textContent = "↻ Reconnect";
    renderDevices();
    updateHeader();
  }
}
function updateHeader() {
  const live = isLive();
  ui("connectionDot").classList.toggle("live", live);
  const known = cartDevices;
  const count = known.filter((a) =>
    a.id === "sp608e" ? live : a.connected,
  ).length;
  ui("connectionDot").classList.toggle("live", count > 0);
  ui("connectionText").textContent =
    connectionInProgress || cartDevices[2].connecting || cartDevices[1].connecting
      ? "Connecting"
      : count === known.length && count > 0
        ? count === 1
          ? "Connected"
          : count + " connected"
        : count > 0
          ? count + "/" + known.length + " connected"
          : transport === "demo"
            ? "Preview"
            : "Disconnected";
  ui("cartSubtitle").textContent = live
    ? "SP608E connected. This image shows your scene preview, not live LED colors."
    : transport === "demo"
      ? "Preview mode · real lights disconnected"
      : "Five zones. Endless possibilities.";
  ui("cartPower").classList.toggle("on", powered && hasSceneTarget());
  ui("cartPower").setAttribute(
    "aria-pressed",
    String(powered && hasSceneTarget()),
  );
  ui("cartPower").setAttribute(
    "aria-label",
    applying
      ? "Stop and turn mapped decorative lights off"
      : powered
        ? "Turn mapped decorative lights off"
        : "Turn mapped decorative lights on",
  );
  ui("appAutoReconnect").checked = autoReconnectOn;
  ui("appTrueColors").checked = preferences.trueColors;
  ui("previewMode").textContent =
    transport === "demo" ? "Leave preview mode" : "Explore in preview mode";
  ui("previewStatus").textContent =
    transport === "demo"
      ? "Preview only. Your real lights are disconnected."
      : "";
  ui("disconnectCart").disabled = !cartDevices.some(a=>a.id==="sp608e"?isLive():a.connected);
  ui("syncCart").disabled = !canSend();
  if (page === "devices") renderDevices();
}
const oldUpdateTransport = updateTransport;
updateTransport = function () {
  oldUpdateTransport();
  if (ui("connectionText")) updateHeader();
};
function backup() {
  const values = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("smartease-") || key==="smartease.native.lotus.groups.v1"||SmartEaseUXTemplate.keys.includes(key)) values[key] = localStorage.getItem(key);
  }
  const blob = new Blob(
    [
      JSON.stringify(
        {
          format: "smartease-cart-backup",
          version: 1,
          date: new Date().toISOString(),
          values,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "SmartEase-cart-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
  toast("Your SmartEase backup is ready.");
}
let backupRestoreEpoch = 0;
// A pending full-backup file read never owns a later Native/device session.
window.SmartEaseBackupRestore = Object.freeze({invalidate(){backupRestoreEpoch++;}});
async function restoreBackup(file) {
  if (!file) return;
  // Cancel radio admissions synchronously, without blanking unrelated Native editors.
  // Capture our epoch AFTER that hook so its own cancellation cannot stale this restore.
  window.SmartEaseStudio?.stop();
  window.SmartEaseNativeUX?.cancelForBackupRestore();
  const restoreEpoch = ++backupRestoreEpoch;
  const restoreCurrent = () => restoreEpoch === backupRestoreEpoch;
  if (file.size > 32_000_000) {
    toast("Choose a SmartEase backup smaller than 32 MB.");
    return;
  }
  try {
    const raw = await file.text();
    if (!restoreCurrent()) return;
    const data = JSON.parse(raw);
    if (
      data.format !== "smartease-cart-backup" ||
      data.version !== 1 ||
      !data.values ||
      typeof data.values !== "object"
    )
      throw Error(
        "Choose a full SmartEase backup. Older cart-zone backups can be imported separately.",
      );
    const allowed = new Set([
      "smartease-cart-lights-v1",
      "smartease-golf-cart-zones-v2",
      "smartease-golf-cart-zones-v1",
      "smartease-experience-v1",
      "smartease-cart-ble-auto-v1",
      "smartease-cart-ble-id-v1",
      "smartease-nokins-device-v1",
      "smartease-haunted-surge-v1",
      "smartease-haunted-rgb-fix-v1",
      "smartease-haunted-observations-v1",
      "smartease-haunted-manual-rgb-v1",
      "smartease-sp608e-chip-orders-v1",
      "smartease-sp608e-rgb-balance-v1",
      "smartease-display-project-v1",
      "smartease-native-coolledux-v1",
      "smartease.native.coolledux.square.graffiti.v1",
      "smartease.native.coolledux.square.animation.v1",
      "smartease-native-banlanx-diy-v1",
      "smartease-native-banlanx-scene-names-v1",
      "smartease-native-banlanx-groups-v1",
      "smartease-native-banlanx-channel-names-v1",
      "smartease-native-banlanx-trigger-names-v1",
      "smartease-device-assignments-v1",
      "smartease-of21-native-v1",
      "smartease.native.lotus.groups.v1",
      "smartease-scene-draft-v1",
    ]);
    const entries = Object.entries(data.values).filter(([k]) => allowed.has(k));
    if (!entries.length) throw Error("This backup has no restorable settings.");
    for (const [key, value] of entries) {
      const limit=SmartEaseUXTemplate.keys.includes(key)?SmartEaseUXTemplate.Square.LIMIT:key==="smartease.native.lotus.groups.v1"?1_000_000:key==="smartease-native-banlanx-trigger-names-v1"?SmartEaseBanlanXTriggerNames.LIMIT:key==="smartease-native-banlanx-channel-names-v1"?SmartEaseBanlanXChannelNameStore.LIMIT:key==="smartease-native-banlanx-groups-v1"?SmartEaseBanlanXGroupsStore.LIMIT:key==="smartease-native-banlanx-scene-names-v1"?SmartEaseBanlanXSceneNames.LIMIT:key==="smartease-native-banlanx-diy-v1"?SmartEaseBanlanXDIYStore.LIMIT:key==="smartease-native-coolledux-v1"?4*1024*1024:key==="smartease-golf-cart-zones-v2"||key==="smartease-golf-cart-zones-v1"?24_000_000:key==="smartease-scene-draft-v1"?4_000_000:key==="smartease-of21-native-v1"?131072:key === "smartease-display-project-v1"?1_000_000:500000;
      if (typeof value !== "string" || (["smartease-native-coolledux-v1","smartease-native-banlanx-diy-v1","smartease-native-banlanx-scene-names-v1","smartease-native-banlanx-groups-v1","smartease-native-banlanx-channel-names-v1","smartease-native-banlanx-trigger-names-v1"].includes(key) ? new Blob([value]).size : value.length) > limit)
        throw Error("This backup has an invalid setting.");
      if (!/ble-auto|ble-id|nokins-device/.test(key)) JSON.parse(value);
      if (key === "smartease-golf-cart-zones-v2") czSanitize(JSON.parse(value));
      if (key === "smartease-golf-cart-zones-v2" || key === "smartease-golf-cart-zones-v1") {const parsed=JSON.parse(value);if(parsed.scenes!==undefined&&(!Array.isArray(parsed.scenes)||parsed.scenes.length>24))throw Error("A scene library supports at most 24 scenes.");for(const scene of parsed.scenes||[])if(scene.composition?.version===1)SmartEaseStudio.validate(scene.composition);}
      if(key==="smartease.native.lotus.groups.v1")LotusGroups.validate(JSON.parse(value));
      if(key==="smartease-of21-native-v1"){const parsed=JSON.parse(value);if(parsed.version!==1||!Array.isArray(parsed.scenes)||parsed.scenes.length>32||!parsed.requested||typeof parsed.requested!=="object"||Array.isArray(parsed.requested))throw Error("Invalid OF21 pattern library.");for(const scene of parsed.scenes){if(typeof scene.name!=="string"||!scene.name.trim()||scene.name.length>70)throw Error("Invalid OF21 pattern name.");SmartEaseOF21.diy(scene.project);}of21ValidateNativeMetadata(parsed);}
      if (key === "smartease-display-project-v1") SmartEaseDisplay.validate(JSON.parse(value));
      if (key === "smartease-native-coolledux-v1") SmartEaseNativeUXStore.validate(JSON.parse(value));
      if(SmartEaseUXTemplate.keys.includes(key))SmartEaseUXTemplate.Square.validate(JSON.parse(value),key.includes(".graffiti.")?"graffiti":"animation");
      if (key === "smartease-native-banlanx-diy-v1") SmartEaseBanlanXDIYStore.validate(value);
      if (key === "smartease-native-banlanx-trigger-names-v1") SmartEaseBanlanXTriggerNames.validate(value);
      if (key === "smartease-native-banlanx-channel-names-v1") SmartEaseBanlanXChannelNameStore.validate(value);
      if (key === "smartease-native-banlanx-groups-v1") SmartEaseBanlanXGroupsStore.validate(value);
      if (key === "smartease-native-banlanx-scene-names-v1") SmartEaseBanlanXSceneNames.validate(value);
    }
    if (!restoreCurrent()) return;
    if (
      !confirm(
        "Restore this backup? Your current saved setup will be replaced.",
      )
    )
      return;
    if (!restoreCurrent()) return;
    const before = entries.map(([k]) => [k, localStorage.getItem(k)]);
    try {
      for (const [key, value] of entries) {
        if (!restoreCurrent()) throw Error("Backup restore was superseded; saved setup retained.");
        localStorage.setItem(key, value);
      }
    } catch (e) {
      for (const [key, value] of before) {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
      throw e;
    }
    cancelPlayback();
    disconnect();
    location.reload();
  } catch (e) {
    if (restoreCurrent()) toast(e.message || "That backup could not be restored.");
  } finally {
    if (restoreCurrent()) ui("backupFile").value = "";
  }
}
app
  .querySelectorAll("[data-go]")
  .forEach((el) => (el.onclick = () => go(el.dataset.go)));
for(const id of ["gradientColorFront","gradientColorCanopy","gradientColorRear",
 "gradientNativeEffect","gradientNativeSpeed","gradientBrightness","gradientReverseCanopy"])
 ui(id).addEventListener("input",gradientReadSettings);
ui("gradientNativeRun").onclick=gradientRunNative;
ui("gradientLiveRun").onclick=()=>startGradientLive();
ui("gradientFlipCanopy").onclick=gradientFlipCanopy;
ui("gradientLiveStop").onclick=gradientStopLive;
ui("connectionSummary").onclick = () => go("devices");
ui("emergencyReconnect").onclick = () => reconnectAll(true);
ui("connectCart").onclick = reconnectAll;
ui("disconnectCart").onclick = () => {
  cancelPlayback();
  disconnect();
  powered = false;
  updateHeader();
};
ui("syncCart").onclick = async () => {
  const ok = await queryState();
  toast(ok ? "Refreshing your lights." : "Connect your cart first.");
};
ui("cartPower").onclick = () =>
  powered || applying || liveName || window.SmartEaseStudio?.applying
    ? lightsOff()
    : applyScene(sceneById(activeScene?.id)||activeScene||sceneById(E.presets[1].id));
ui("featureHauntedPlay").onclick = () => {
  if(sceneById(E.presets[0].id)?.saved)return chooseScene(sceneById(E.presets[0].id));
  showPreview(sceneById(E.presets[0].id));
  ui("liveDialog").showModal();
};
ui("startLive").onclick = startHauntedFlow;
ui("startTwinkle").onclick = () => {
  ui("liveDialog").close();
  applyScene(sceneById(E.presets[0].id));
};
ui("cancelLive").onclick = () => ui("liveDialog").close();
ui("stopShow").onclick = () => {
  cancelPlayback();
  ui("playState").textContent = "FLOW STOPPED · LAST LOOK REMAINS";
  toast("Live flow stopped. Use power to turn the lights off.");
};
ui("sceneFilters").onclick = (event) => {
  const el = event.target.closest("[data-filter]");
  if (!el) return;
  filter = el.dataset.filter;
  ui("sceneFilters")
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b === el));
  renderScenesUI();
};
ui("appBrightness").oninput = () =>
  (ui("appBrightnessValue").textContent = ui("appBrightness").value + "%");
ui("appBrightness").onchange = async () => {
  if (applying) {
    toast("Let your scene finish before changing brightness.");
    return;
  }
  if (liveName) return;
  const value = Number(ui("appBrightness").value);
  const rows = Object.fromEntries(
    E.zones.map((id) => [id, { ...previewRows[id], brightness: value }]),
  );
  previewRows = rows;
  paintCart("homeCart", rows);
  if (!hasSceneTarget()) {
    toast("Brightness preview updated. Connect to change your lights.");
    return;
  }
  const mask = czUniqueOutputs().reduce((m, n) => m | maskFor(n - 1), 0);
  const results = [];
  if (canSend())
    results.push(await sendBrightness(mask, Math.round((value * 255) / 100)));
  if (cartDevices[2].connected && cartDevices[2].sceneEnabled)
    results.push(
      await cartDevices[2].apply(rows, () => true, previewAccessories),
    );
  toast(
    results.every(Boolean)
      ? "Brightness updated."
      : "Some lights didn’t finish updating. Tap Reconnect.",
  );
};
function blend() {
  const brightness = Number(ui("designerBrightness").value),
    speed = Number(ui("designerSpeed").value);
  draft = E.rows(
    [ui("gradientFront").value, ui("gradientRear").value],
    Number(ui("designerEffect").value),
    brightness,
  );
  for (const row of Object.values(draft)) row.speed = speed;
  renderDesigner();
}
ui("blendGradient").onclick = blend;
for (const id of ["gradientFront", "gradientRear"])
  ui(id).oninput = () => {
    ui("gradientLine").style.setProperty("--a", ui("gradientFront").value);
    ui("gradientLine").style.setProperty("--b", ui("gradientRear").value);
  };
ui("designerEffect").onchange = () => {
  for (const r of Object.values(draft))
    r.effect = Number(ui("designerEffect").value);
  paintCart("designerCart", draft);
  designerEffectNotice();
};
ui("designerBrightness").oninput = () => {
  const n = Number(ui("designerBrightness").value);
  ui("designerBrightnessValue").textContent = n + "%";
  for (const r of Object.values(draft)) r.brightness = n;
  paintCart("designerCart", draft);
};
ui("designerSpeed").oninput = () => {
  const n = Number(ui("designerSpeed").value);
  ui("designerSpeedValue").textContent = n;
  for (const r of Object.values(draft)) r.speed = n;
};
ui("applyDesign").onclick = () => {
  const scene = {
    id: "draft",
    custom: true,
    name: ui("sceneName").value.trim() || "My evening glow",
    rows: E.validateRows(draft),
    accessories: E.accessories(draftAccessories, draft["front-bumper"]),
  };
  showPreview(scene);
  applyScene(scene);
};
function saveDesignerScene(copy=false){
  sceneDraftEpoch++;
  clearTimeout(sceneDraftTimer);
  if((copy||!czState.scenes.some(s=>s.id===editingSceneId))&&czState.scenes.length>=24){sceneSaveMessage("Your library has 24 saved scenes. Export or delete one before adding another.",true);return false;}
  let scene;
  try{
    const previousScene=copy?null:sceneById(editingSceneId);
    scene={...(previousScene||{}),id:!copy&&editingSceneId||"cart-"+(globalThis.crypto?.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2)),revision:copy?1:(previousScene?.revision||0)+1,custom:true,name:ui("sceneName").value.trim()||"My evening glow",rows:E.validateRows(draft),accessories:E.accessories(draftAccessories,draft["front-bumper"])};
    const composition=window.SmartEaseStudio?.capture()||draftComposition;if(composition)scene.composition=structuredClone(composition);
  }catch(error){sceneSaveMessage(error.message,true);return false;}
  const previous=structuredClone(czState.scenes),index=czState.scenes.findIndex(s=>s.id===scene.id);
  if(index>=0)czState.scenes[index]=scene;else czState.scenes.push(scene);
  if(!czSave()){czState.scenes=previous;sceneSaveMessage("Could not save. Your edits are still open. Export the draft before closing, free browser storage, then try Save again.",true);return false;}
  editingSceneId=scene.id;draftComposition=scene.composition?structuredClone(scene.composition):null;
  sceneDraftDirty=false;
  if(!preferences.favorites.includes(scene.id))preferences.favorites.push(scene.id);
  preferences.lastSceneId=scene.id;const preferencesSaved=persist();czRenderSaved();renderScenesUI();showPreview(sceneById(scene.id));
  ui("saveDesign").textContent="Save changes";
  sceneSaveMessage("Saved “"+scene.name+"” · revision "+scene.revision+". Reopening and playback use this version."+(preferencesSaved?"":" Scene saved, but favorites could not be saved."));
  try{localStorage.removeItem("smartease-scene-draft-v1");}catch{}
  return scene;
}
ui("saveDesign").onclick=()=>saveDesignerScene(false);
function editScene(scene){
  sceneDraftEpoch++;
  if(sceneDraftDirty){rememberSceneDraft();sceneDraftDirty=false;}
  scene=sceneById(scene.id)||scene;editingSceneId=scene.id;draftComposition=scene.composition?structuredClone(scene.composition):null;
  designerPaletteSelection="front-bumper";draft=E.validateRows(scene.rows);draftAccessories=E.accessories(scene.accessories,draft["front-bumper"]);
  ui("sceneName").value=scene.name;ui("designerIntro").textContent="Save changes updates this scene everywhere. Save a copy makes a separate scene.";
  ui("gradientFront").value=draft["front-bumper"].color;ui("gradientRear").value=draft["rear-bumper"].color;
  ui("designerEffect").value=String(draft["front-bumper"].effect);ui("designerBrightness").value=draft["front-bumper"].brightness;ui("designerBrightnessValue").textContent=draft["front-bumper"].brightness+"%";
  ui("designerSpeed").value=draft["front-bumper"].speed;ui("designerSpeedValue").textContent=draft["front-bumper"].speed;ui("saveDesign").textContent="Save changes";
  window.SmartEaseStudio?.load(scene.composition);go("create");
}
const newDesign = document.createElement("button");
newDesign.className = "secondary";
newDesign.textContent = "＋ New design";
newDesign.onclick = () => {
  sceneDraftEpoch++;
  if(sceneDraftDirty){rememberSceneDraft();sceneDraftDirty=false;}
  editingSceneId = null;
  draftComposition=null;window.SmartEaseStudio?.load(null);
  designerPaletteSelection="front-bumper";
  ui("designerIntro").textContent="Mix your own colors, test them, then save a scene that uses them.";
  draft = E.rows();
  draftAccessories = E.accessories(null, draft["front-bumper"]);
  ui("sceneName").value = "My evening glow";
  ui("designerEffect").value = "25";
  ui("designerBrightness").value = "45";
  ui("designerBrightnessValue").textContent = "45%";
  ui("designerSpeed").value = "5";
  ui("designerSpeedValue").textContent = "5";
  ui("gradientFront").value = "#49e3d2";
  ui("gradientRear").value = "#278dff";
  ui("saveDesign").textContent = "Save scene ♡";
  renderDesigner();
};
document.querySelector('#app [data-page="create"] .welcome').append(newDesign);
ui("appAutoReconnect").onchange = () => {
  ui("autoReconnect").checked = ui("appAutoReconnect").checked;
  ui("autoReconnect").onchange();
  cartDevices[2].scheduleReconnect();
};
ui("appTrueColors").onchange = () => {
  preferences.trueColors = ui("appTrueColors").checked;
  if (persist()) toast(preferences.trueColors ? "Exact scene colors are enabled." : "Original scene animations are enabled.");
};
ui("appColorCheck").onclick = () => go("calibrate");
ui("previewMode").onclick = () => {
  cancelPlayback();
  if (transport === "demo") exitDemo();
  else enterDemo();
  powered = false;
  updateHeader();
};
ui("backupSetup").onclick = backup;
ui("restoreSetup").onclick = () => ui("backupFile").click();
ui("backupFile").onchange = () => restoreBackup(ui("backupFile").files[0]);
ui("importPrevious").onclick = () => {
  openAdvanced("zones");
  ui("czImport").click();
};
ui("recallController").onclick = () => {
  if (!canSend()) {
    toast("Connect your cart lighting first.");
    return;
  }
  cancelPlayback();
  recallScene(Number(ui("controllerScene").value));
  ui("nowPlaying").textContent =
    "Controller scene " + (Number(ui("controllerScene").value) + 1);
  ui("playState").textContent = "RECALL REQUESTED";
  toast("Controller scene requested.");
};
function openAdvanced(tab = "diagnostics") {
  cancelPlayback();
  document.body.classList.add("advanced-open");
  switchTab(tab);
  document.querySelector("body>.shell").scrollIntoView({ behavior: "smooth" });
}

/* Guided SmartEase color tuning: same serialized SP608E GATT commands and
   persisted RGB/matched-color corrections as the original advanced tools. */
const calPrimaries={r:"#ff0000",g:"#00ff00",b:"#0000ff"};
let calBusy=false,calTestedSignature=null;
const calTell=(id,msg)=>{ui(id).textContent=msg;};
const calOutput=()=>Number(ui("calOutput").value);
const calOutputValid=()=>czState.activeOutputs.includes(calOutput());
function calRefreshButtons(){
 const connected=isLive()&&calOutputValid();
 ui("calConnection").textContent=isLive()?"SP608E connected · ready for testing":transport==="demo"?"Preview mode is not connected to your real lights.":"Connect SP608E in Devices to test the real lights.";
 ui("calGoConnect").hidden=isLive();
 for(const button of document.querySelectorAll("#app [data-cal-test]"))button.disabled=calBusy||!connected;
 for(const code of ["R","G","B"])ui("calVerify"+code).disabled=calBusy||!connected;
 for(const id of ["calSave","calReset"])ui(id).disabled=calBusy||!calOutputValid();
 ui("calCopyMapped").disabled=calBusy||!connected||czUniqueOutputs().length<2||!hauntedGoodMap(["R","G","B"].map(k=>ui("calSeen"+k).value));
 ui("calMatchTest").disabled=calBusy||!connected;
 ui("calMatchSave").disabled=calBusy||!calOutputValid()||calTestedSignature!==calSignature();
 ui("calBalanceTest").disabled=calBusy||!connected;
 for(const id of ["calBalanceSave","calBalanceReset"])ui(id).disabled=calBusy||!calOutputValid();
 ui("calBalanceCopy").disabled=calBusy||!calOutputValid()||czUniqueOutputs().length<2;
}
function calPopulate(){
 const n=calOutput(),found=[];
 for(const id of E.zones){
  for(const channel of czState.zones[id]?.channels||[]){
   if(czState.activeOutputs.includes(channel)&&!found.some(p=>p.channel===channel))
    found.push({channel,name:czState.zones[id]?.name||id});
  }
 }
 for(const channel of czState.activeOutputs)if(!found.some(p=>p.channel===channel))found.push({channel,name:"Other cart light"});
 const select=ui("calOutput");select.replaceChildren();
 for(const p of found)select.add(new Option(p.name+" · output "+p.channel,String(p.channel)));
 if(found.some(p=>p.channel===n))select.value=String(n);
 else{
  const choice=found.find(p=>/undercarriage/i.test(p.name))||found[0];
  if(choice)select.value=String(choice.channel);
 }
}
function calLoadSeen(){
 const n=calOutput(),values=hauntedObserved[n]?.colors||hauntedColorFix[n]||[];
 for(const [i,k] of ["R","G","B"].entries()){
  ui("calSeen"+k).value=values[i]||"";
  if(ui("calSeen"+k).value!==(values[i]||""))ui("calSeen"+k).value="";
 }
 calTell("calStatus",hauntedGoodMap(hauntedColorFix[n])?"This light has a saved color correction. Retest anytime.":values.length?"Your previous observations are loaded. Confirm what you see.":"Show red, green and blue on your light to begin.");
 calLoadMix();calBalanceLoad();calRefreshButtons();
}
function calOpen(){calPopulate();calLoadSeen();}
async function calWrite(bytes,description){
 if(!isLive()){calTell("calStatus","Connect SP608E in Devices before testing.");return false;}
 if(!calOutputValid()){calTell("calStatus","Select a connected cart light first.");return false;}
 if(document.visibilityState==="hidden"||calBusy){calTell("calStatus","Keep this screen open to run the color test.");return false;}
 const n=calOutput(),mask=maskFor(n-1);
 calBusy=true;calRefreshButtons();
 try{
  cancelPlayback();
  // Establish a known reference order before recording actual color responses.
  const commands=[packet(0x84,[mask,0]),packet(0x83,[mask,25]),packet(0x85,[mask,130]),packet(0x82,[mask,1]),packet(0x89,[mask,...bytes,130])];
  const ok=await enqueuePackets(commands,description,{skipRefresh:true,guard:()=>isLive()&&document.visibilityState==="visible"});
  if(ok){
   delete spChipApplied[n];
   if(channels[n-1]?.known)channels[n-1].order=0;
  }else calTell("calStatus","The light didn't respond. Reconnect your SP608E and try again.");
  return !!ok;
 }catch(err){calTell("calStatus","The test couldn't finish. "+err.message);return false;}
 finally{calBusy=false;calRefreshButtons();}
}
/* Match tuning uses the already-corrected chip order, just like scenes. */
async function calSendNormalized(bytes,description){
 if(!hauntedValidBytes(bytes)||!isLive()||!calOutputValid()||calBusy||document.visibilityState!=="visible")return false;
 const n=calOutput(),mask=maskFor(n-1);
 calBusy=true;calRefreshButtons();
 try{
  cancelPlayback();
  const guard=()=>isLive()&&document.visibilityState==="visible";
  if(!await spEnsureChipColors([n],guard))return false;
  return !!await enqueuePackets([
   packet(0x83,[mask,25]),packet(0x85,[mask,130]),packet(0x82,[mask,1]),
   packet(0x89,[mask,...bytes,130])
  ],description,{skipRefresh:true,guard});
 }catch(error){calTell("calStatus","Color test failed: "+error.message);return false;}
 finally{calBusy=false;calRefreshButtons();}
}
async function calVerifySaved(primary) {
 const hex=calPrimaries[primary],n=calOutput();
 if(!hex||!isLive()){calTell("calStatus","Connect your SP608E to check the saved color.");return false;}
 if(!calOutputValid()){calTell("calStatus","Choose a connected strip to check.");return false;}
 if(calBusy||document.visibilityState!=="visible")return false;
 calBusy=true;calRefreshButtons();
 try {
  cancelPlayback();
  const synced=await spEnsureChipColors([n],()=>isLive()&&document.visibilityState==="visible");
  if(!synced){calTell("calStatus","Couldn't restore that strip's saved color order. Reconnect and try again.");return false;}
  const mask=maskFor(n-1);
  const jobs=[
   packet(0x83,[mask,25]),
   packet(0x85,[mask,153]),
   packet(0x82,[mask,1]),
   hauntedColorCommand(n,hex,153)
  ];
  const ok=await enqueuePackets(jobs,"Verify calibrated "+primary+" output "+n,{
   skipRefresh:true,guard:()=>isLive()&&document.visibilityState==="visible"
  });
  if(ok)calTell("calStatus","Showing corrected "+({r:"red",g:"green",b:"blue"}[primary])+" on output "+n+". It should look strongly colored, not white. If it's pale, check the LED type and original BanlanX solid color too.");
  else calTell("calStatus","The test was interrupted. Reconnect your controller.");
  return ok;
 } catch(e){calTell("calStatus","Couldn't finish the corrected-color test: "+e.message);return false;}
 finally{calBusy=false;calRefreshButtons();}
}
async function calTestPrimary(primary){
 const color=calPrimaries[primary];if(!color)return;
 calTell("calStatus","Testing "+{r:"red",g:"green",b:"blue"}[primary]+" on output "+calOutput()+"…");
 const ok=await calWrite(rgbFromHex(color),"SmartEase color test "+primary);
 if(ok)calTell("calStatus","What color did the LEDs actually display? Choose it under the test you just ran.");
}
function calSaveObserved(){
 if(!calOutputValid())return;
 const values=["R","G","B"].map(k=>ui("calSeen"+k).value);
 if(values.some(v=>!v)){calTell("calStatus","Choose the actual displayed color for all three tests first.");return;}
 const n=calOutput();
 hauntedObserved[n]={colors:[...values],note:"SmartEase color tuning"};
 if(hauntedGoodMap(values)){
  hauntedColorFix[n]=[...values];hauntedCalibrationPersist();
  const saved=spSetSavedChipOrder(n,values,0);
  calTell("calStatus",saved?"Color correction saved for this strip. Restoring its calibrated output…":"Could not save the correction; check Bluefy browser storage.");
  if(saved&&isLive())spEnsureChipColors([n],null,{force:true}).then(ok=>{
    calTell("calStatus",ok?"Saved and applied! Your calibrated colors will follow every scene.":"Saved on this phone; the correction will be applied next time the light connects.");
  });
 }else{
  delete hauntedColorFix[n];spResetSavedChipOrder(n);hauntedCalibrationPersist();
  ui("calFineTune").open=true;calLoadMix();
  calTell("calStatus","These don't form a simple red/green/blue swap. Your observations are saved. Try fine-tuning the shades below.");
 }
}
async function calCopyMapped(){
 if(calBusy)return false;
 const values=["R","G","B"].map(k=>ui("calSeen"+k).value),outputs=czUniqueOutputs();
 if(!hauntedGoodMap(values)){calTell("calStatus","Select a different actual primary for each color before copying.");return false;}
 if(!isLive()||document.visibilityState!=="visible"){calTell("calStatus","Connect SP608E in Bluefy to apply this correction to your cart.");return false;}
 if(outputs.length<2||!outputs.includes(calOutput())){calTell("calStatus","Select a mapped SP608E strip first.");return false;}
 const order=values.map(v=>v.toUpperCase()).join(""),target=spOrderFromObserved(values,0);
 if(target===null)return false;
 if(!confirm("Use the observed "+order+" color order for all "+outputs.length+" mapped SP608E outputs? Do this only if you personally tested that each strip has the same color swap. This does not change your zones, scenes, NOKINS or Devil Eyes."))return false;
 calBusy=true;calRefreshButtons();
 const oldFix=structuredClone(hauntedColorFix),oldSeen=structuredClone(hauntedObserved),
       oldOrders=structuredClone(spSavedChipOrders),oldApplied=structuredClone(spChipApplied);
 const keys=["smartease-haunted-rgb-fix-v1","smartease-haunted-observations-v1",SP_COLOR_STORE];
 const oldStorage=keys.map(k=>localStorage.getItem(k));
 try{
  cancelPlayback();
  for(const n of outputs){
   hauntedColorFix[n]=[...values];
   hauntedObserved[n]={colors:[...values],note:"Confirmed shared "+order+" LED order"};
   spSavedChipOrders[n]={observed:[...values],baseline:0,target};
   delete spChipApplied[n];
  }
  // Persist all related correction records; roll back if storage is unavailable.
  localStorage.setItem(keys[0],JSON.stringify(hauntedColorFix));
  localStorage.setItem(keys[1],JSON.stringify(hauntedObserved));
  localStorage.setItem(keys[2],JSON.stringify(spSavedChipOrders));
 }catch(error){
  hauntedColorFix=oldFix;hauntedObserved=oldSeen;spSavedChipOrders=oldOrders;spChipApplied=oldApplied;
  for(let i=0;i<keys.length;i++)try{if(oldStorage[i]===null)localStorage.removeItem(keys[i]);else localStorage.setItem(keys[i],oldStorage[i]);}catch{}
  calTell("calStatus","Could not save the shared color order: "+error.message);
  calBusy=false;calRefreshButtons();
  return false;
 }
 calTell("calStatus","Saved "+order+" for "+outputs.length+" mapped outputs. Applying to your SP608E…");
 try{
  const applied=await spEnsureChipColors(outputs,()=>isLive()&&document.visibilityState==="visible",{force:true}).catch(()=>false);
  calTell("calStatus",applied
   ?"Saved and applied "+order+" to "+outputs.length+" mapped outputs. Check Red, Green, Blue below, then try your scenes."
   :"Saved "+order+" for "+outputs.length+" outputs on this phone. Reconnect, then check the saved colors.");
  return true;
 }finally{calBusy=false;calRefreshButtons();}
}
function calReset(){
 const n=calOutput();
 if(!calOutputValid()||!confirm("Reset color tuning for this light? Your scenes will remain saved."))return;
 delete hauntedColorFix[n];delete hauntedObserved[n];delete hauntedManualMatches[n];
 spResetSavedChipOrder(n);
 hauntedCalibrationPersist();hauntedManualPersist();calLoadSeen();
 if(isLive())enqueuePackets(packet(0x84,[maskFor(n-1),0]),"Reset LED color order").then(ok=>{
   if(ok&&channels[n-1]?.known)channels[n-1].order=0;
 });
 calTell("calStatus","Color corrections reset for this light. Your scenes remain saved.");
}
/* Reusable per-output scene color balance; saving is explicit. */
let calBalanceDraft=[100,100,100];
const calBalanceInputs=["calBalanceR","calBalanceG","calBalanceB"];
function calBalancePreview(){
 for(let i=0;i<3;i++){
  ui(calBalanceInputs[i]).value=String(calBalanceDraft[i]);
  ui(calBalanceInputs[i]+"Value").textContent=calBalanceDraft[i]+"%";
 }
 ui("calBalanceSwatch").style.background=colorToHex(...spBalanceBytes(rgbFromHex("#ff751e"),calBalanceDraft));
}
function calBalanceLoad(){
 calBalanceDraft=spBalanceFor(calOutput());
 calBalancePreview();
 calTell("calBalanceStatus",calBalanceDraft.every(x=>x===100)
  ?"Standard balance for this strip. If orange looks yellow, lower green and test."
  :"Saved balance: "+calBalanceDraft.join(" / ")+"%. Change a slider to test a new mix.");
}
async function calBalanceTest(){
 const bytes=spBalanceBytes(rgbFromHex("#ff751e"),calBalanceDraft);
 calTell("calBalanceStatus","Testing adjusted orange with your saved BRG order…");
 const ok=await calSendNormalized(bytes,"Orange scene shade balance");
 calTell("calBalanceStatus",ok
  ?"Orange sent. If it looks right on the cart, save this balance. Otherwise reduce green and test again."
  :"Orange test was interrupted. Reconnect the SP608E in Bluefy.");
 return ok;
}
function calBalanceSave(){
 if(!calOutputValid())return false;
 const saved=spSaveRgbBalance([calOutput()],calBalanceDraft);
 calTell("calBalanceStatus",saved
  ?"Balance saved for this strip. Every future scene color on this output uses it."
  :"Could not save in Bluefy storage.");
 return saved;
}
function calBalanceCopy(){
 const outputs=czUniqueOutputs();
 if(!calOutputValid()||outputs.length<2)return false;
 if(!confirm("Copy this color balance to all "+outputs.length+" mapped SP608E outputs? Only use this when the other strips have similar color strength. Existing scene colors and zone locations stay unchanged."))return false;
 const saved=spSaveRgbBalance(outputs,calBalanceDraft);
 calTell("calBalanceStatus",saved
  ?"Saved this balance on "+outputs.length+" mapped outputs. Your scenes and zone locations were preserved."
  :"Could not save the other profiles.");
 return saved;
}
function calBalanceReset(){
 if(!calOutputValid())return false;
 const saved=spSaveRgbBalance([calOutput()],[100,100,100]);
 if(saved)calBalanceLoad();
 calTell("calBalanceStatus",saved?"Standard color balance restored for this strip.":"Unable to reset balance.");
 return saved;
}
function calTarget(){return ui("calTarget").value==="custom"?ui("calCustom").value:ui("calTarget").value;}
function calBytes(){return ["R","G","B"].map(k=>Number(ui("calRaw"+k).value));}
function calSignature(){return [calOutput(),calTarget(),...calBytes()].join("|");}
function calPreview(){
 const values=calBytes();
 ui("calTargetSwatch").style.background=calTarget();
 ui("calSendSwatch").style.background=colorToHex(...values);
 for(const [i,k] of ["R","G","B"].entries())ui("calValue"+k).textContent=String(values[i]);
 ui("calMatchSave").disabled=calBusy||!calOutputValid()||calTestedSignature!==calSignature();
}
function calLoadMix(){
 const n=calOutput(),hex=calTarget();
 const values=Number.isInteger(n)&&n>=1&&n<=8?spCorrectedColorBytes(n,hex):rgbFromHex(hex);
 for(const [i,k] of ["R","G","B"].entries())ui("calRaw"+k).value=String(values[i]);
 ui("calCustomWrap").hidden=ui("calTarget").value!=="custom";
 calTestedSignature=null;calPreview();
 calTell("calMixStatus","Adjust the strengths, test on the cart, then save the shade you like.");
}
async function calTestMix(){
 const bytes=calBytes(),signature=calSignature();
 calTell("calMixStatus","Showing the selected shade on your cart…");
 const ok=await calSendNormalized(bytes,"SmartEase shade match with saved LED order");
 if(ok){
  calTestedSignature=signature;
  calTell("calMixStatus","If the LEDs match your target color, tap Save this match.");
 }else calTell("calMixStatus","The test couldn't complete. Reconnect and try again.");
 calPreview();
}
function calSaveMix(){
 const n=calOutput(),target=calTarget();
 if(!calOutputValid())return;
 if(calTestedSignature!==calSignature()){calTell("calMixStatus","Test this shade on your cart before saving it.");return;}
 const rawMatch=spRawManualMatchFromBalanced(n,calBytes());
 if(!hauntedValidBytes(rawMatch)){
  calTell("calMixStatus","This tested shade cannot be reproduced exactly with the current RGB balance. Your draft is unchanged. Adjust the balance or shade, then test again.");
  return;
 }
 const previous=JSON.stringify(hauntedManualMatches);
 if(!hauntedManualMatches[n])hauntedManualMatches[n]={};
 hauntedManualMatches[n][target]=rawMatch;
 const saved=hauntedManualPersist();
 if(!saved)hauntedManualMatches=JSON.parse(previous);
 calTell("calMixStatus",saved?"Saved! Scenes reuse these tested color bytes with the saved LED order and current balance; scene brightness is controlled separately.":"Couldn't save the match. Check browser storage.");
 if(saved&&isLive())spEnsureChipColors([n],null,{force:true}).catch(()=>{});
}
function calInstall(){
 ui("openColorCalibration").onclick=()=>go("calibrate");
 ui("devicesColorCalibration").onclick=()=>go("calibrate");
 ui("calGoBack").onclick=()=>go("settings");
 ui("calGoConnect").onclick=()=>go("devices");
 ui("calOutput").addEventListener("change",calLoadSeen);
 for(const button of document.querySelectorAll("#app [data-cal-test]"))
  button.onclick=()=>calTestPrimary(button.dataset.calTest);
 for(const code of ["R","G","B"])ui("calVerify"+code).onclick=()=>calVerifySaved(code.toLowerCase());
 ui("calSave").onclick=calSaveObserved;ui("calReset").onclick=calReset;ui("calCopyMapped").onclick=calCopyMapped;
 for(const id of ["calSeenR","calSeenG","calSeenB"])ui(id).addEventListener("change",calRefreshButtons);
 for(const id of ["calTarget","calCustom"])ui(id).addEventListener("change",calLoadMix);
 for(const k of ["R","G","B"])ui("calRaw"+k).addEventListener("input",()=>{calTestedSignature=null;calPreview();});
 ui("calMatchTest").onclick=calTestMix;ui("calMatchSave").onclick=calSaveMix;
 for(let i=0;i<3;i++)ui(calBalanceInputs[i]).addEventListener("input",()=>{
  calBalanceDraft[i]=Number(ui(calBalanceInputs[i]).value);
  calBalancePreview();
  calTell("calBalanceStatus","Unsaved balance. Test orange on the cart, then save if it looks correct.");
 });
 ui("calBalanceWarmer").onclick=()=>{
  calBalanceDraft[1]=Math.max(0,calBalanceDraft[1]-15);
  calBalancePreview();
  calTell("calBalanceStatus","Green reduced. Test orange on the cart, then save if yellow improves.");
 };
 ui("calBalanceTest").onclick=calBalanceTest;
 ui("calBalanceSave").onclick=calBalanceSave;
 ui("calBalanceCopy").onclick=calBalanceCopy;
 ui("calBalanceReset").onclick=calBalanceReset;
 calPopulate();calLoadSeen();
}
calInstall();

/* Cart map in the consumer UI. Save the existing v2 zone model directly:
   no second mapping store and no assumptions about which port is connected. */
const mapLocations=[
  {id:"front-bumper",name:"Front bumper"},
  {id:"left-under",name:"Left undercarriage"},
  {id:"right-under",name:"Right undercarriage"},
  {id:"rear-bumper",name:"Rear bumper"},
  {id:"canopy",name:"Canopy"}
];
let mapFinding=false;
const mapSay=message=>ui("mapStatus").textContent=message;
function mapCurrentArea(n){
 return mapLocations.find(x=>(czState.zones[x.id]?.channels||[]).includes(n))?.id||"unused";
}
function mapRefresh(){
 const host=ui("mapOutputRows");host.replaceChildren();
 for(let n=1;n<=8;n++){
  const row=document.createElement("article");row.className="card map-output";
  const label=document.createElement("div");label.className="map-output-label";
  const tag=document.createElement("span");tag.className="map-number";tag.textContent=String(n);
  const info=document.createElement("div");
  const title=document.createElement("strong");title.textContent="Light output "+n;
  const desc=document.createElement("span");desc.textContent=czState.activeOutputs.includes(n)?"Included in your cart":"Not currently used";
  info.append(title,desc);label.append(tag,info);
  const select=document.createElement("select");select.className="input";select.id="mapArea"+n;
  select.setAttribute("aria-label","Location for lighting output "+n);
  const unused=new Option("Not connected / unused","unused");select.add(unused);
  for(const x of mapLocations)select.add(new Option(czState.zones[x.id]?.name||x.name,x.id));
  select.value=mapCurrentArea(n);
  select.onchange=()=>mapAssign(n,select.value);
  const test=document.createElement("button");test.type="button";test.className="secondary map-test";
  test.textContent="Show this light";
  test.disabled=mapFinding||!isLive();
  test.onclick=()=>mapFind(n);
  row.append(label,select,test);
  host.append(row);
 }
 const assigned=mapLocations.filter(x=>czState.zones[x.id]?.channels.some(n=>czState.activeOutputs.includes(n)));
 ui("mapCount").textContent=assigned.length+" of 5 cart locations mapped";
 ui("mapSaved").textContent="Saved on this phone · "+czState.activeOutputs.length+" active outputs · Included in SmartEase backups";
 ui("mapGoDevices").hidden=isLive();
}
function mapOpen(){mapRefresh();mapSay("Tap Show this light beside an output, then choose the location where it illuminates.");}
async function mapFind(n){
 if(mapFinding)return;
 if(!isLive()){mapSay("Connect your cart lighting in Devices before identifying strips.");return;}
 if(document.visibilityState==="hidden"){mapSay("Keep Bluefy open while identifying a strip.");return;}
 mapFinding=true;mapRefresh();mapSay("Showing output "+n+" in white. Look at the cart and select the matching location.");
 try{
  cancelPlayback();
  const mask=maskFor(n-1);
  // White is permutation-independent and changes only this decorative output.
  const packets=[packet(0x83,[mask,25]),packet(0x85,[mask,112]),packet(0x82,[mask,1]),packet(0x89,[mask,255,255,255,112])];
  const ok=await enqueuePackets(packets,"Identify cart light "+n,{skipRefresh:true,guard:()=>isLive()&&document.visibilityState==="visible"});
  mapSay(ok?"Output "+n+" is lit in white. Choose its real location from the list.":"Couldn't light that output. Confirm cart power and the Bluetooth connection.");
 }catch(e){mapSay("Could not identify the strip. "+e.message);}
 finally{mapFinding=false;mapRefresh();}
}
function mapAssign(n,zoneId){
 if(mapFinding){mapSay("Finish identifying the light first.");mapRefresh();return;}
 if(zoneId!=="unused"&&!mapLocations.some(x=>x.id===zoneId)){mapSay("Choose a valid cart location.");mapRefresh();return;}
 const prior=mapCurrentArea(n),wasActive=[...czState.activeOutputs];
 const previous=Object.fromEntries(mapLocations.map(x=>[x.id,[...(czState.zones[x.id]?.channels||[])]]));
 for(const x of mapLocations)czState.zones[x.id].channels=czState.zones[x.id].channels.filter(v=>v!==n);
 if(zoneId==="unused"){
  czState.activeOutputs=czState.activeOutputs.filter(x=>x!==n);
 }else{
  czState.zones[zoneId].channels.push(n);
  czState.zones[zoneId].channels.sort((a,b)=>a-b);
  czState.activeOutputs=[...new Set([...czState.activeOutputs,n])].sort((a,b)=>a-b);
 }
 if(!czSave()){
  for(const x of mapLocations)czState.zones[x.id].channels=previous[x.id];
  czState.activeOutputs=wasActive;mapRefresh();mapSay("Could not save your locations. Check Bluefy storage.");return;
 }
 czRenderAll();
 renderDesigner();
 renderScenesUI();
 calPopulate();
 mapRefresh();
 const area=mapLocations.find(x=>x.id===zoneId);
 mapSay(zoneId==="unused"?"Output "+n+" marked unused. SmartEase scenes won't touch it.":"Saved! Output "+n+" now controls "+(czState.zones[zoneId]?.name||area?.name)+". Your scenes will use this location automatically.");
}
function mapInstall(){
 ui("openLightMap").onclick=()=>go("map");
 ui("devicesLightMap").onclick=()=>go("map");
 ui("mapGoBack").onclick=()=>go("settings");
 ui("mapGoDevices").onclick=()=>go("devices");
 ui("mapDone").onclick=()=>go("home");
 ui("mapCalibrate").onclick=()=>go("calibrate");
 mapRefresh();
}
mapInstall();


ui("openAdvanced").onclick = () => openAdvanced();
ui("showWelcome").onclick = () => ui("welcomeDialog").showModal();
ui("welcomeConnect").onclick = () => {
  preferences.onboarded = true;
  persist();
  ui("welcomeDialog").close();
  go("devices");
  reconnectAll();
};
ui("welcomePreview").onclick = () => {
  preferences.onboarded = true;
  persist();
  ui("welcomeDialog").close();
};
// A fresh chooser is always available if the remembered device cannot reconnect.
const findAnother = document.createElement("button");
findAnother.className = "text-btn";
findAnother.textContent = "Find another controller ↗";
findAnother.onclick = () => {
  cancelPlayback();
  disconnect();
  connect("all");
};
ui("connectCart").parentElement.append(findAnother);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    const wasLive = !!liveName;
    cancelPlayback();
    if (wasLive)
      ui("playState").textContent = "LIVE FLOW PAUSED · REOPEN TO PLAY";
  }
});
window.addEventListener("pagehide", cancelPlayback);
window.addEventListener("popstate", () => go(location.hash.slice(1), "pop"));
window.addEventListener("hashchange", () => {
  const next = location.hash.slice(1) || "home";
  if (page === "native" && window.SmartEaseNative?.state.path === next) return;
  if (page !== "native" && page === next) return;
  go(next, "pop");
});
ui("welcomeDialog").addEventListener("close", () => {
  preferences.onboarded = true;
  persist();
});
initNativeLibrary();
renderScenesUI();
renderDesigner();
renderGradientLab();
paintCart("homeCart", previewRows);
renderDevices();
updateHeader();
go(location.hash.slice(1) || "home");
if (!preferences.onboarded)
  setTimeout(() => ui("welcomeDialog").showModal(), 300);

window.updateCartDeviceUI = () => {
  updateHeader();
  window.SmartEaseNativeUX?.refresh();
  window.SmartEaseStudio?.refresh();
  if (page === "devices") renderDevices();
};
// Per-device granted assignments are restored by connection-workspace.js.

const legacyEnterDemo = enterDemo;
enterDemo = function () {
  if (connectionInProgress || cartDevices[2].connecting || cartDevices[1].connecting) {
    toast("Let the connection finish before entering preview mode.");
    return;
  }
  cartDevices[2].disconnect();
  cartDevices[1].disconnect();
  return legacyEnterDemo();
};

const legacyHandleDisconnect = handleDisconnect;
handleDisconnect = function () {
  cancelPlayback();
  return legacyHandleDisconnect();
};

function editAccessory() {
  draftAccessories = {
    nokins: {
      on: ui("designNokinsOn").checked,
      follow: ui("designNokinsFollow").checked ? "front" : "custom",
      color: ui("designNokinsColor").value,
      brightness: Number(ui("designNokinsBrightness").value),
    },
    trinka: {
      on: ui("designEyesOn").checked,
      pattern: ui("designEyesPattern").value,
      color: ui("designEyesColor").value,
      brightness: Number(ui("designEyesBrightness").value),
    },
  };
  renderAccessoryEditor();
  paintCart("designerCart", draft);
}
for (const id of [
  "designNokinsOn",
  "designNokinsFollow",
  "designNokinsColor",
  "designNokinsBrightness",
  "designEyesOn",
  "designEyesPattern",
  "designEyesColor",
  "designEyesBrightness",
])
  ui(id).addEventListener("input", editAccessory);
renderAccessoryEditor();

// Persistent, visible save feedback and a recoverable authoring draft.
const sceneSavePanel=document.createElement("section");sceneSavePanel.className="card";
let sceneDraftTimer=null,sceneDraftDirty=false,sceneDraftEpoch=0;
sceneSavePanel.innerHTML=`<p id="sceneSaveStatus" class="inline-status" role="status">Save changes keeps this scene's identity. Save a copy creates a new scene.</p><div class="row-actions"><button class="secondary" id="saveDesignCopy" type="button">Save a copy</button><button class="secondary" id="exportSceneDraft" type="button">Export current draft</button><button class="secondary" id="recoverSceneDraft" type="button">Recover unsaved draft</button></div>`;
ui("saveDesign").parentElement.after(sceneSavePanel);
function sceneSaveMessage(message,error=false){ui("sceneSaveStatus").textContent=message;ui("sceneSaveStatus").dataset.error=String(error);}
function sceneDraftSnapshot(){return {format:"smartease-scene-draft",version:1,editingSceneId,name:ui("sceneName").value,rows:structuredClone(draft),accessories:structuredClone(draftAccessories),composition:window.SmartEaseStudio?.captureDraft?.()||draftComposition};}
function exportCurrentSceneDraft(){const url=URL.createObjectURL(new Blob([JSON.stringify(sceneDraftSnapshot(),null,2)],{type:"application/json"})),link=document.createElement("a");link.href=url;link.download="smartease-scene-draft.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
ui("saveDesignCopy").onclick=()=>saveDesignerScene(true);ui("exportSceneDraft").onclick=exportCurrentSceneDraft;
function rememberSceneDraft(){clearTimeout(sceneDraftTimer);sceneDraftDirty=true;try{localStorage.setItem("smartease-scene-draft-v1",JSON.stringify(sceneDraftSnapshot()));sceneSaveMessage("Unsaved edits. Save changes to keep this revision, or export your draft.");}catch{sceneSaveMessage("Unsaved edits remain open, but browser storage failed. Export the draft before closing.",true);}}
function scheduleSceneDraft(){window.SmartEaseStudio?.draftChanged();sceneDraftEpoch++;clearTimeout(sceneDraftTimer);sceneDraftDirty=true;sceneSaveMessage("Unsaved edits. Save changes to keep this revision.");sceneDraftTimer=setTimeout(rememberSceneDraft,120);}
ui("recoverSceneDraft").onclick=()=>{sceneDraftEpoch++;try{const saved=JSON.parse(localStorage.getItem("smartease-scene-draft-v1")||"null");if(saved?.format!=="smartease-scene-draft"||saved.version!==1)throw Error("No recoverable draft was found.");draft=E.validateRows(saved.rows);draftAccessories=E.accessories(saved.accessories,draft["front-bumper"]);draftComposition=saved.composition||null;editingSceneId=typeof saved.editingSceneId==="string"?saved.editingSceneId:null;ui("sceneName").value=saved.name||"Recovered scene";window.SmartEaseStudio?.load(saved.composition);go("create");sceneSaveMessage("Draft recovered. Save changes or Save a copy to keep it.");}catch(error){sceneSaveMessage(error.message,true);}};
document.querySelector('[data-page="create"]').addEventListener("input",event=>{if(event.target.type!=="file")scheduleSceneDraft();});
document.querySelector('[data-page="create"]').addEventListener("change",event=>{if(event.target.type!=="file")scheduleSceneDraft();});
window.addEventListener("pagehide",()=>{if(sceneDraftDirty)rememberSceneDraft();});
if(preferences.lastSceneId&&sceneById(preferences.lastSceneId))showPreview(sceneById(preferences.lastSceneId));
