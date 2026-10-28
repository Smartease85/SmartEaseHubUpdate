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
All behavior here remains **source-derived, not hardware-tested**.

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
| Microphone | setMicOpen 2444; symphonyMicRhythmMode 3272 | On/off and rhythm IDs80–87, subtype `04` |
| Sensitivity | sens 3357 | Known byte serializer/example50; complete native UI range not claimed or exposed as a live arbitrary slider |
| Clock | syncData 3659 | Offline encoder; Sunday0–Saturday6; no automatic clock write |
| Timer / collapse / wire order / point count | setTimingArray3601, collapse3280, lineOrder2 3135, pointSetting3141 | Configuration writers remain gated. Day labels, persistence, channel-ID mapping or physical limits still need acceptance |

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
byte7=`88`, and reads total nodes little-endian from bytes3–4. Replies are bounded
to 1,024 bytes. This is **partial geometry readback**, not full color, program or
power state. It does not enable bulk uploads or prove a physical LED maximum.

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

DIY brightness in the native editor replaces HSV value (minimum1), not naive RGB
multiplication, and is not a separate upload field. This encoder accepts already
prepared RGB colors and does not claim to reproduce the native brightness editor.
Bulk upload remains disabled pending actual geometry, delivery, visual acceptance
and persistence evidence. The offline example uses synthetic totalNodes=10 and
must not be treated as the owner's physical count. There is no established bulk
acknowledgement/retry scheme. A future uploader must serialize the entire transfer
without interleaving and validate every geometry/configuration prerequisite.

See [CONNECTIONS.md](CONNECTIONS.md) for pairing, memory and the owner acceptance checklist.
