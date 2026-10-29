# MELK-OF21 1D: native E1 controls, not OA10

The exact owner controller is SYMPHONY device type 30, plain E1 (not encrypted,
broadcast, E2/COLORFUL_CAR, or OA10-equivalent). Implementation is independent
JavaScript from the researcher's protocol specification. No APK, decompiled
classes, vendor artwork, fonts or UI labels are distributed in this repository.

## Provenance and confidence

The parent researcher statically analyzed the official publisher-linked Android
artifact [LotusLamp X 5.21.01](https://apkhistory.easytrack.net.cn/download_pro/APP/LotusLampX_V5.21.01.apk),
package `com.szelk.ledlamppro`, SHA-256
`54a23e832b2ac8c4946bdd5f0ccf14de87104d866a46e43e85c03b2fbf79c3b0`.
That hash/provenance was supplied by the researcher; this implementing agent
does not claim to have independently downloaded, run or inspected the APK.
Owner confirmed all three connections on commit `2b12451e` (2026-10-29).
The command behavior below remains **source-derived, not hardware-tested**.

Identity evidence: `DeviceName:224,243`, error-free simple-control-flow
`LPHelper.deviceTypeWithName:453–473`, `AppConstant:239` and
`BlePackagingDevice` constructor `442–496`. The normal decompiler's inverted
WCT branch was resolved by the simple-control-flow output in the research.

## Standard frames and ordinary controls

Every standard frame is nine bytes: `7E L C p0 p1 p2 p3 p4 EF`. Length byte is
`04` for brightness, `06` for clock, `07` otherwise. Defaults are four `FF`
bytes and final parameter `00`; there is no standard-frame checksum.

| Function | Source evidence | Implemented scope |
|---|---|---|
| Main ALL power | SymphonyActivity 204/219 → BleTDManager.open default → open | Live guarded ordinary control; RGB-only power is a distinct encoder command |
| RGB / phone-audio RGB | sendRGBColor 2794 / sendRGBColorForAudio 3055 | Ordinary solid RGB uses tail `10`; audio sample tail `20` is encoded, no phone FFT streaming claimed |
| Brightness | brightness 3413 / setRGBBrightness 3437; palette 160–180; effects 1015–1027 | 0–100 unscaled. Palette targets RGB `01`; effects target ALL `00` |
| Speed | speed 3067 | 0–100 unscaled |
| Factory effects | setSymphonyMode 3005; SYModeFragment 188–199 and integer arrays | Exactly 234 IDs, 0–233. Generic SmartEase labels, no vendor assets |
| Factory scenes | setSymphonyScene 3019; SYInternalSceneFragment 337–350/505–516 | Exactly 33 IDs: 1–28,150,152,154,155,156. Excludes enum100 and unlisted gaps |
| Microphone | setMicOpen 2444; symphonyMicRhythmMode 3272 | On/off and rhythm IDs `0x80–0x87` (128–135 decimal), subtype `0x04` |
| Sensitivity | SYMicFragment151/854/868–869 -> BleTDManager2699–2720 -> sens3357 | Source-established 0–100, unscaled; explicit Apply, no readback |
| Clock | syncData 3659 | Offline encoder; Sunday0–Saturday6; no automatic clock write |
| Timer / collapse / wire order / point count | Independent source supplement below | Guarded explicit actions, validated codecs and partial readback where supported; persistence remains unverified |

Ordinary controls use the exact OF21 path after family and actual writable FFF3
discovery. They are serialized with 100 ms spacing and stop on disconnect,
cancellation or failed caller guard. Queue submission is not physical-state
acknowledgement. Connecting alone sends no OF21 lighting command. Optional
SmartEase scene matching remains explicit opt-in and uses this distinct RGB path.

## Transport and bounded geometry readback

`AppConstant:127–135` and `MyApp.bleInit:213–225` establish FFF0 service,
FFF3 write and FFF3 read. `BleRequestImpl.displayGattServices:1357–1395`
discovers notify/indicate characteristics by properties, not a fixed FFF4.
Subscriptions are serialized. The writer prefers discovered write-without-response
when both property and method exist; otherwise it uses supported response writing.
This follows the reported app/default Android behavior rather than an OA10 assumption.

An explicit Read LED count action sends `7E0737FFFFFF00FFEF` at most three times.
Parser `parsingSceneDIYDataE1ForLightStrip:2573` requires cmd37, markers byte6=`00`,
byte7=`88`, and reads total nodes little-endian from bytes3–4. Independent parser accepts exactly one nine-byte E1 frame and validates its header/footer.
Transport notifications are separately capped at 1,024 bytes. This is **partial geometry readback**, not full color, program or
power state. It does not prove a physical LED maximum; a matching current-connection
reply is a prerequisite for the separate explicit DIY send action.

## DIY encoder and gates

The source path is `setSceneDIY:2239–2285`, `E1DIYAchieve`,
`ExtKt.intToByteArray2:297`; geometry UI is `SYDIYFragment:536–566`.
Native pattern length is10–30; total node count must be supplied, sections are
`ceil(totalNodes/patternLength)` and section-byte overflow is rejected. This is
a repeated/sectioned pattern, not an arbitrary full-strip pixel framebuffer.
Static mode0 has exactly patternLength colors; dynamic modes1–6 have2–8 palette
colors. Gradient0/1/2 applies to modes3–6; speed is0–100. Enhanced modes7–10 and
the newer OD31 RGB565 path are not used. No generic50-total-node cap is applied.

Packets are cmd37 preamble, cmd32 start, cmd33 RGB888 pairs (odd final padding FF),
cmd34 end. Length is little-endian; SUM16 includes start with zero checksum fields,
color packets and end, and excludes the geometry preamble. Checksum is stored
big-endian in start bytes4–5. Arrays larger than pattern length are rejected.
Golden tests match native-shaped ten-node static SUM16=`1605` and two-color
breathing SUM16=`0B24` fixtures supplied independently by the researcher.

DIY brightness replaces HSV value (1–100), preserving hue/saturation rather
than multiplying RGB repeatedly. It is baked into RGB, not a separate packet
field. Black becomes gray/white when V is raised. The local editor preserves
base colors and recomputes the rendered result on each brightness change.

The synthetic example is offline only. Real DIY sending requires exact OF21,
actual writable FFF3, a current-connection reported count matching the draft,
native total 10–1000, pattern 10–30, a parked foreground session and explicit
per-send acknowledgement. Every packet is nine bytes (within default 20-byte
ATT payload); this does not resolve the separate UX envelope/MTU blocker.
The whole OF21 transfer owns one queue at 75 ms reference spacing, so ordinary
commands cannot interleave. It submits once with no ACK or automatic retry.
Cancellation can leave a partial pattern. An in-flight command cannot be recalled;
uncertain completion blocks further OF21 commands until reconnect. Neither write
completion nor the source protocol proves visual correctness or durable storage.

## Native timer, order and count supplement

Evidence is the same SHA-identified LotusLamp X artifact, interpreted independently
from the parent's static specification. No decompiled implementation or vendor
resources are shipped. Relevant call chains:

- `TimingFragment.handleWeek829–842`, symbolic weekday resource references,
  `BleExtKt.modeFromTiming7118–7150`, `LEDTiming.isSingle364–365`: timer bits0–6
  are **Monday–Sunday**, bit7 enabled. No days means once; all days means daily.
  This differs from the clock's Sunday-zero weekday. ON/OFF wire slots are0/1,
  not native model enum1/2.
- `setTimingArray3601–3650`: `7E0782 HH MM 00 kind mask EF`.
  ON07:30 Mon–Fri enabled=`7E0782071E00009FEF`;
  OFF22:15 Sat/Sun enabled=`7E0782160F0001E0EF`.
- `getTimingArray1386–1451`, `LPBleHelper80–82`, `sendCombinationCMD1562–1605`:
  ON query=`7E0782FFFFFF0000EF`, OFF query=`7E0782FFFFFF0100EF`.
  Queries at0/600ms, optional discovered-readable FFF3 reads at300/900ms.
  Notify/indicate replies also work. Independent timer parsing requires a valid
  nine-byte E1 frame, hour0–23, minute0–59, reserved byte5=0 and kind0/1.
  Query echoes, malformed packets and unknown values are rejected.
- `parsingData1934–1950`, `parsingTimingDataE1/TimingData2483–2504`: returned
  slots are accepted only within a matching current-connection read window after
  that slot's query. Both slots from the same read must be known before Apply.
  Editing one serializes the pair while preserving the other exactly. Writes
  invalidate prior returned state, then the UI reads again and compares both slots.
  This proves only a matching returned configuration, not an ACK, timer firing,
  offline operation, RTC survival, DST handling or nonvolatile retention.
- `LineSequenceActivity141–159`, `ExtKt.lineSequence1065–1079`,
  `BlePackagingDevice.lineOrder3079–3130`: six RGB permutations; channel IDs
  R=1/G=2/B=3. GRB=`7E0781020103FF00EF`. This uses ordinary OF lineOrder,
  not the two-in-one lineOrder2 or LampAS numeric enum. No order readback exists
  in this evidence; the UI shows local last request only.
- `LampWithDetailActivity2532–2592/2901–2913`, `pointSetting3141–3151`:
  native-app input10–1000 inclusive; `7E0721 lo hi 00 FF 00 EF`.
  Count300=`7E07212C0100FF00EF`. Apply invalidates old geometry, then issues
  the bounded count query and compares requested/returned counts. The input
  range is native UI policy, not measured controller capacity. Outside-range
  returned counts are displayed and cannot enable DIY sending.
- `CollapseDialog64–79`, `symphonyCollapseMode3280–3282`: enabled is wire1,
  disabled0 (`7E072201FFFFFF00EF` / `7E072200FFFFFF00EF`). Native menu index0
  means enabled; the UI uses a boolean instead. No readback or precise physical
  fold/orientation effect is established.

Configuration requires explicit acknowledgement and Apply. Connect, reload,
local pattern load and backup restore never apply geometry, wire order, collapse
or clock. `smartease-of21-native-v1` stores a local pattern library plus per-device
last requests; neither is presented as returned device state. Save/replay/delete
are local workflows: replay explicitly reuploads, delete sends no controller
command. The standard Settings backup includes this key. No save-to-flash slot,
name, scene UUID or controller-delete command has been established.

Tests cover all256 timer masks, six wire orders, count endpoints, all20,811
native total/pattern combinations, query-echo rejection, slot preservation,
local reload, explicit configuration, serialization, cancellation and uncertain
transport lockout. These are deterministic code/mocked-transport tests, not
hardware or native visual acceptance.

See [CONNECTIONS.md](CONNECTIONS.md) for pairing, memory and the owner acceptance checklist.
