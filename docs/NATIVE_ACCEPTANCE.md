# Native app parity: implementation and exact-hardware acceptance

## Current OF21 checkpoint, 2026-10-29

Owner reported **all three connected** on pinned `2b12451e`, build
`cart-connect-20261028-02`. This confirms connection success only. New timer,
configuration and DIY workflows are independently implemented from static protocol
facts and covered by codec/mocked-GATT tests; they are not physically validated.
See [LOTUS_OF21.md](LOTUS_OF21.md) for current details, superseding older OF21
gates in the historical inventory below. Owned display identity is CoolLEDUX,
96 columns x16 rows; UX upload remains disabled due to the separate envelope/ATT
capacity problem, not unknown identity or dimensions.

For parked acceptance of this OF21 checkpoint:

1. Keep a full Settings backup. Verify each connection and existing SP calibration.
2. Read both OF21 timer slots first. If either is unknown, Apply refuses to write.
   Edit one, then compare both returned slots; verify the other remains unchanged.
   Once/daily/day labels are source-established; firing, clock survival and durable
   timer persistence still need physical checks.
3. Wire order, LED count and collapse require their explicit configuration
   acknowledgement and Apply. Do not use these as connectivity tests. Count Apply
   queries and compares the reported count. Order/collapse have no proven readback.
4. Author and save a local OF21 pattern. Load/delete/reload must send no command.
   A send requires current returned geometry matching the draft, native bounds and
   per-send acknowledgement. It submits once at75ms spacing, with no device ACK
   or automatic retry. Check the actual result separately. Cancel may leave partial
   changes; an uncertain in-flight outcome requires reconnect before further writes.
5. Reconnect requires a fresh geometry read before another pattern send. A local
   saved pattern or last request must never be presented as device readback or
   proof that the custom program survives complete cart power loss.

Updated 2026-10-28. This release is a software milestone, **not 1:1 hardware parity**.
The subsequent [CoolLEDUX checkpoint](COOLLEDUX.md) adds a separate UX adapter,
offline encoder, transfer preparation and captured-reply decoding after owner family identification.
The current [connection/memory checkpoint](CONNECTIONS.md) adds three independent
real GATT routes and [OF21 source-derived ordinary controls](LOTUS_OF21.md).
Jack confirms all three native configurations survive complete cart power removal.
That is owner-confirmed native persistence, not proof of future SmartEase custom-upload persistence.
No live BLE writes were performed during implementation. No website settings, sharing,
firmware, passwords or trigger wiring were changed.

## Feature inventory

| Device / function | Software status | Acceptance on Jack's hardware |
|---|---|---|
| SP608E connection, state, 8-channel power | Existing transport retained; main Device controls added | Existing owner baseline; new workflow requires parked acceptance |
| SP608E 41 factory effects, per-output color, brightness, supported speed/length/direction | Implemented in Device panel using existing calibration and serialized queue | New workflow hardware-unverified; built-in effects retain factory palette semantics |
| SP608E music sensitivity | Implemented for music effects; 1–16 | Exact mic/AUX behavior unverified; no invented input selector |
| SP608E nine onboard scene recalls and scene auto | Implemented; global actions explicitly identify all-eight-output scope | Owner confirms saved persistence; new workflow unverified |
| SP608E arbitrary onboard scene writing | Unsupported: no evidenced write definition | Need native save-slot capture; recall and persistence do not establish its bytes |
| SP608E five timers, four triggers, mic/AUX input selection | Unsupported: no evidenced write definitions | Do not alter safety wiring to test these; packet evidence and semantics required |
| LotusLamp X basic color/brightness and off | Implemented for exact ELK-BLEDOB / MELK-OA10 profiles; direct Device workflow added | Jack's reported **MELK-OF21 1D remains unsupported** |
| LotusLamp X native modes, speed | Existing OA10-only 213-ID catalog retained | OA10 references disagree in some details; OF21 must not inherit these commands |
| Lotus music, custom patterns, multi-segment functions, timer/schedule, onboard save | Unsupported for exact OF21 | Need native screen inventory and exact-controller packet evidence |
| Devil Eyes pictures / pixel drawing | Implemented local authoring: paint/erase, keyboard coordinates, fill/clear, mirror/flip/shift, resize, PNG/JPEG/WebP fit | No hardware transfer or color-depth acceptance |
| Devil Eyes text | Implemented local raster text and scrolling-frame generation, system font | Text rasterization may vary by browser; hardware font repertoire is not claimed |
| Devil Eyes frame animation | Implemented local add/duplicate/delete/reorder, per-frame duration, undo/redo and preview | Hardware upload is unavailable; GIF import deliberately excluded |
| Devil Eyes original eyes templates | Gaze, blink and sleep templates generated by SmartEase | Original artwork; no vendor template library copied |
| Devil Eyes program playlists | Implemented local program naming, ordering, still hold, repeat counts and preview | Controller multi-program storage and playback unverified |
| Devil Eyes project persistence | Local save, project import/export, full backup/restore | Validated bounded data model; no controller persistence claim |
| Devil Eyes protocol / transport | Read-only inspection; separate offline UX and X encoders. Owned family identified as UX; UX-only adapter prepares plans without BLE writes | No family registered for live upload; dimensions/orientation and transport acceptance remain distinct from name identification |
| Devil Eyes brightness/power/speed/native playback/timers/music/clock | Candidate X command encoder for first four only; no live controls | Exact TRINKA family, dimensions, firmware and command evidence required |
| SmartEase grouped scenes, calibration and cart mapping | Existing behavior retained | Existing baseline; regression tests cover calibration and scene persistence |

The editor's starting 48 × 12 size is a **draft canvas**, not a detected panel size.
The offline X encoder refuses heights not divisible by eight. This is deliberate:
editor documents are device-independent; changing dimensions never grants upload support.
X encoding reduces RGB to one bit per channel at threshold 128, so its seven-color output
does not preserve all editor colors. It is not a UX RGB444 encoder.

## Parked acceptance steps

1. Export Settings backup before testing. Close the other vendor apps.
2. Connect only SP608E. In Devices select one known decorative output and acknowledge parked.
   Test solid red, green, blue and orange against saved calibration. Check a supported effect's
   speed, direction and length. Verify unselected outputs, mapping and saved scenes are intact.
3. Test music sensitivity only with a music effect. Read status afterward. Verify scene recall
   and scene auto separately: these are global SP608E operations and can change all outputs.
4. Create a Devil Eyes picture and a two-frame animation, export, reload and reimport.
   Check program order, still hold and animation repeat in local preview. No BLE upload occurs.
5. Do not attempt OF21 or Devil Eyes writes until the capture evidence below establishes a profile.

## Smallest required owner evidence

- **Lotus OF21:** connected-device name and all native feature screens. An owner-provided
  Android Bluetooth HCI snoop / ATT-write capture from this exact controller, annotated with:
  power on/off, solid red/green/blue, brightness 25/75, mode selections and speed changes.
  Capture one action at a time, with app version, firmware if shown, characteristic UUID and
  before/after result. Native timers/music/custom patterns each need separate examples.
- **TRINKA:** connected device name from CoolLED1248, panel dimensions, app/firmware version,
  and SmartEase's read-only inspection report. Then a known-good native **still picture**
  upload capture (one red top-left pixel on black is useful), brightness and power actions.
  For animation/program parity, capture a native two-frame sequence and two-program playlist.
  A controller that imports pictures but rejects GIFs must not be assumed UX merely by app name.
- **SP608E missing functions:** native slot-save capture with slot index and before/after,
  one enabled/disabled timer and a trigger configuration report/capture from a safe bench
  setup. Saved scene survival alone does not reveal slot-write commands. No change to the
  cart's existing safety circuits is requested.

The Device identification report export includes names, profile candidates, inspected GATT
metadata and draft size; it sends no writes and cannot capture traffic from other apps.
Share only the relevant capture excerpt, not unrelated Bluetooth traffic or private media.

## Protocol evidence and licensing

- SP608E uses UniLED **BanlanX60X**, not BanlanX6xx:
  https://github.com/monty68/uniled/blob/main/custom_components/uniled/lib/ble/banlanx_60x.py
  Existing command bytes and calibration were retained. Upstream scene-save is empty;
  timer/trigger parsing is not evidence of a working writer.
- OA10 references remain model-specific:
  https://github.com/wporter82/lotus-lamp-python/blob/main/docs/PROTOCOL.md
  https://github.com/dave-code-ruiz/elkbledom/blob/main/custom_components/elkbledom/models.json
  OF21 is not established by those sources. Do not probe uncertain opcode families.
- X candidate wire reference, pinned at `55d008237c2bcc96bd9c5d34b7c221b3325e71fa`:
  https://github.com/jean-santos/coolled1248-rs/blob/55d008237c2bcc96bd9c5d34b7c221b3325e71fa/src/packets.rs
  Independent corroboration at `ba24137a4fb63b44896143adbd5862ef74de9fff`:
  https://github.com/UpDryTwist/coolledx-driver/blob/ba24137a4fb63b44896143adbd5862ef74de9fff/src/coolledx/commands.py
  and `render.py`. Implementation here is original JavaScript from packet layouts; no
  source code or font assets were imported. Tests assert Rust's published power/mode/brightness
  vectors, planar pixel orientation, chunk sizes, escaping, length and XOR integrity.
- UX is a separate protocol; offline implementation now exists, live upload remains disabled:
  https://github.com/CharlesLennon/coolledux-ble/blob/master/PROTOCOL.md
  Its proprietary-app-derived font assets were not used. Device-specific UX quirks and
  confidence labels prevent treating this reference as universal TRINKA support.

## Verification limits

`npm test` exercises simulated transport, document import validation, authoring persistence,
playlist timing, native controls, cancellation and candidate encoder vectors. Canvas pixel
rendering, actual picture decoding, mobile touch ergonomics and Bluefy behavior still need
browser visual acceptance. No denied browser JavaScript operation was retried. Hardware
acceptance remains owner-driven. A successful software test does not establish 1:1 parity.
