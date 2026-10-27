# SmartEase cart: verified capabilities and integration blockers

Research date: 2026-10-25. Advanced maintenance reference, not consumer onboarding. Public evidence cannot replace tests on this cart's exact controller revisions.

## Capability matrix

| Device | Evidence and identification | SmartEase control boundary | Persistence / synchronization |
| --- | --- | --- | --- |
| SP608E / BanlanX | Existing project is user-tested on Bluefy. UniLED independently implements this model and its FFE0 service / FFE1 characteristic. | Preserve the working serial transport, eight physical output masks, five mapped cart zones, RGB calibration and notifications. Built-in solid, twinkle, wave, chase and other supported modes; power, brightness and speed. | Saved SmartEase scenes belong to this browser. Public reference exposes scene recall and looping, but its scene-save method is unimplemented. No verified arbitrary pixel-animation upload or firmware scene-write operation. Sequential writes are coordinated, not frame-locked. [Protocol source](https://github.com/monty68/uniled/blob/7b2536984403f0212f8c5959953a6b6492c46e12/custom_components/uniled/lib/ble/banlanx_60x.py). |
| TRINKA Devil Eyes | User supplied the physical manual naming **CoolLED1248**. Public research identified CoolLEDX and CoolLEDUX protocols, and community .JT files. The actual BLE family of this display is still unknown. | Read-only inspection of documented FFF0 service and characteristic permissions; no writes until exact model/protocol is confirmed. The original app still controls the device. | Original animations play in CoolLED1248; custom uploads, onboard retention and app .JT import on iOS are **not verified**. |
| NOKINS RGB Deluxe lighting | User confirms this installation uses LotusLamp X. Manufacturer advertises app-controlled RGB kits, including NKS10026-RGBIC / B0DGD2VFMC. | Treat the RGB control box as a LotusLamp X candidate; require exact supported identity plus GATT validation below before writes. The multifunction stalk is not itself established as a BLE peripheral. | Storage and exact installed protocol variant remain unverified. Ordinary wired brake, turn, hazard, horn and headlight functions stay outside decorative orchestration. [Manufacturer RGB product](https://nokinsgolfcart.com/product/nokins-rgb-light-kit-for-club-car-precedent-electric-gas-2004-up-golf-cart-app-control-rgb-deluxe-led-lights-multi-color-change-mechanical-brake-switchlow-high-beamdrlscanning-turn-taillig/). |
| 10L0L underglow strips | Cart-specific user context: original controller replaced by SP608E. | Treat strips as the SP608E's mapped loads, not an additional BLE device. | No independent scene storage or connection. |

## CoolLED1248 / TRINKA update: 2026-10-27

The installed display's manual identifies the CoolLED1248 mobile app. Device name and pixel dimensions must still be confirmed from the app's connected-device screen. CoolLED1248 is an umbrella app for multiple incompatible BLE families; in particular, CoolLEDX and CoolLEDUX are separate protocols even when both expose service FFF0 / characteristic FFF1.

Sources: [CoolLEDUX reverse-engineered BLE reference (MIT)](https://github.com/CharlesLennon/coolledux-ble/blob/master/PROTOCOL.md), [CoolLEDX driver](https://github.com/UpDryTwist/coolledx-driver), [web controller with GIF import](https://klier.us/apps/coolled/), [JT-Edit data format](https://github.com/auc0le/JT-Edit/blob/main/FileSaver.js). The community .JT import procedure is documented principally for Android; do not promise iOS accepts it.

SmartEase now has an explicit **read-only** FFF0 protocol inspection that connects temporarily, enumerates permitted characteristic UUIDs / properties and disconnects. Inspection never reads characteristic values, writes pixels, erases programs or initiates an OTA. A matching FFF0/FFF1 GATT service is only transport evidence, not a license to send either protocol. Require device family evidence before promoting a write-capable adapter. Preserve the existing Devil Eyes presets.

## Evidence that must not become an integration assumption

A reseller lists TRINKA part 25DQQWQ as a USB-powered, Bluetooth programmable 16×96 display, with text and animations. This is a useful identification lead, not primary protocol evidence and not proof that the installed unit matches. It does not name the app or establish paywall, nonvolatile storage or firmware transfer details. [Reseller lead](https://ibspot.com/products/golf-cart-devil-led-eyes-light-sign-for-windshield-with-app-control).

NOKINS sells both app-controlled RGB and conventional wired Deluxe kits. Its wired Deluxe Plus listing describes a stalk, mechanical brake switch and harness. Do not infer the stalk contains a BLE radio or that another NOKINS product's app/protocol applies. [Manufacturer wired kit](https://nokinsgolfcart.com/product/nokins-deluxe-plus-led-light-kit-for-club-car-tempo-onward-golf-cartmechanical-brake-switch20a-dc-converter-regulatortime-delay-relayusb-chargersnail-hornlow-high-beamdrlscanning-turn-tailligh/).

## Cart power and physical zones

The cart-specific wiring below comes from the user, not public research:

- 48V traction architecture; decorative equipment receives switched, appropriate low-voltage power. Software never changes wiring or supplies power to an unpowered controller.
- Fog switch OFF removes the relevant lighting power. Position one powers underglow and TRINKA; position two additionally enables canopy through a relay. An app cannot override the canopy relay.
- Physical zones are Front bumper, Left undercarriage, Right undercarriage, Rear bumper and Canopy. Preserve existing saved output mappings; default labels are not wiring verification.
- Brake, turn and hazard circuits are independent. No scene writes should target a safety-light circuit.

## Bluefy / Web Bluetooth limits

Bluefy's publisher documents HTTPS Web Bluetooth support on iPhone/iPad. This establishes a suitable browser, not compatibility with every proprietary device. [Publisher listing](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055).

Device selection requires a user gesture and a browser chooser. Grant one device at a time; request only known needed services. A broad device chooser is not unrestricted GATT access. These are BLE GATT connections, not Bluetooth Classic. [Chrome Web Bluetooth guide](https://developer.chrome.com/docs/capabilities/bluetooth).

Feature-detect `getDevices()`; where provided it returns devices already granted to the current origin, including powered-off ones. It does not prove reachability. Reconnection is best effort and must not silently replay a lighting scene. [MDN getDevices](https://developer.mozilla.org/en-US/docs/Web/API/Bluetooth/getDevices).

Keep live browser-driven shows foreground-only. iPhone suspension, browser closure, radio loss or switched power can interrupt them; an offline cache cannot run Bluetooth in the background. No exact multi-controller concurrency limit or background guarantee has been verified for the user's Bluefy/iOS version. Built-in controller effects may continue independently while powered; retain no claim of persistence after a power cycle without testing.

## Required evidence to unlock additional adapters

1. Record installed TRINKA and NOKINS controller model/revision, advertised name and the app name from each unit's own QR/manual. Public product resemblance is insufficient.
2. Record permitted GATT service/characteristic UUIDs and properties, manufacturer/model identifiers where accessible. A service UUID alone rarely proves the product or packet protocol.
3. Capture a minimal known-working native-app session for brightness, color/preset selection and readback. Establish packet framing, checksums, write type, pacing and acknowledgments before enabling writes.
4. Test disconnect/reconnect and a complete power cycle. Separate app-side save, controller RAM state and actual nonvolatile storage.
5. Verify the native app's paid/free actions on this exact version. Do not promise a paywall bypass or require a paid API in SmartEase.
6. Validate independent operation before coordinated scene orchestration; label unsupported targets as unavailable rather than report all devices synchronized.

The web app can present one coherent device/session model now. Complete TRINKA actuation remains blocked on the evidence above. NOKINS/LotusLamp X actuation is conditional on the concrete identity/profile evidence below; discovery alone is not protocol implementation.

## LotusLamp X update: verified public variants

The user's LotusLamp X clarification narrows the family, not the firmware. The following are independent reverse-engineering projects, not NOKINS firmware specifications. Their conflicting encodings must remain separate profiles.

### ELK-BLEDOB profile

[8none1 source pinned at 47ee7c1](https://github.com/8none1/elk-bledob/blob/47ee7c1aea10fd091ce8e52505c7c4fb112a344d/custom_components/elk_bledob/elkbledob.py) identifies `ELK-BLEDOB` by name prefix, writes plain nine-byte frames to FFF3 without response and does not implement readback. Its exact basic frames are:

| Action | Nine-byte frame |
| --- | --- |
| On | `7e 07 04 ff 00 01 02 01 ef` |
| Off | `7e 07 04 00 00 00 02 01 ef` |
| RGB | `7e 07 05 03 RR GG BB 10 ef` |
| Brightness | `7e 04 01 PP 01 ff 02 01 ef` (`PP` = 0–100) |

This is evidence that an `ELK-` prefix does **not** universally require encrypted writes. The implementation's reported state is optimistic, not a controller acknowledgment. Do not broaden its profile to ELK-BLEDOM or every ELK device.

### MELK-OA10 profile

[wporter82 source pinned at c11390b](https://github.com/wporter82/lotus-lamp-python/blob/c11390b614deed22880db6dc978cf2042f607631/lotus_lamp/controller.py) targets MELK-OA10 5F. It defines service FFF0, write FFF3 and notify FFF4. Its RGB frame matches BLEDOB. Brightness differs: `7e 07 01 PP ff ff ff 00 ef`, with `PP` = 0–100. Its power-on code sends `7e 07 04 01 00 ff ff 00 ef` but labels the length as a trial; this is weaker evidence than its RGB/brightness implementations. Do not present its power encoding as confirmed for NOKINS.

### E1 / encryption claims and conflicts

[l0lsec source pinned at ba7294d](https://github.com/l0lsec/LotusLampX/blob/ba7294d9d71555658cf9eb921ce810cb7b94b1a0/cli/protocol.py) describes MELK-OA10 as plain E1 and a separate E2 path for COLORFUL_CAR. It supplies an optional 21-byte encryption wrapper for power/mode/brightness on ELK devices, but disagrees with the sources above on brightness range/framing and power parameters. Its existence is a research lead, not proof that this NOKINS controller needs that wrapper. Do not choose encryption solely from an `ELK-` prefix, auto-try alternate protocols, or silently switch from E1 to E2.

### Concrete implementation recommendation

1. Initial write-capable profile: narrowly match `ELK-BLEDOB` with a boundary/end or documented suffix, then require FFF0 service and FFF3 characteristic with write-without-response. Use the BLEDOB frames above. Report it as a matched LotusLamp controller, not verified NOKINS manufacturer identity.
2. Optional MELK-OA10 profile: narrowly match `MELK-OA10` plus expected suffix boundary and the same GATT profile; enable only the documented plain RGB and percentage-brightness operations until on-cart power verification. Do not use a catch-all `MELK` prefix.
3. Any other name/UUID combination, encrypted candidate, COLORFUL_CAR variant or property mismatch remains identify-only. Persist discovery metadata locally; do not send test packets automatically.
4. Keep a separate serial queue/session token per controller; disconnect invalidates queued writes. Send only after an explicit user action; never replay an old scene merely because the controller reconnects. Close LotusLamp X while using SmartEase if the controller allows only one central connection.
5. A five-zone gradient belongs to SP608E. A supported LotusLamp RGB target can receive one coordinated accent color/brightness; do not claim five-zone mapping, pixel animation upload, exact timing sync, readback or onboard scene save on that target.
6. Test power/color/brightness on this cart before calling the adapter hardware-verified. Successful GATT write completion proves transport acceptance, not the displayed color or independence from brake/turn circuitry.
