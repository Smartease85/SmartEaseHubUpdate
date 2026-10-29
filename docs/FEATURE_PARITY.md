# SmartEase Cart Lights — Original Functions + Whole-Cart Feature Parity

Status: 2026-10-28 • `smartease-cart-lights` branch

**Goal:** A single SmartEase® interface with individual-device original functions and SmartEase whole-cart groups/scenes, without copying proprietary vendor UI/assets. Preserve the verified baseline, color calibration, saved scenes, independent turn/brake/hazard wiring, and power-cycle behavior.

## Matrix (hardware support and application support are distinct)

**Native workspace update:** direct SP608E controls, independent Lotus solid controls and the
Devil Eyes local picture/text/animation/program studio now exist. Offline CoolLEDX candidate
encoding is tested; live upload remains gated. The detailed current status, acceptance steps
and smallest missing captures are in [NATIVE_ACCEPTANCE.md](NATIVE_ACCEPTANCE.md).
Owner identification now establishes CoolLEDUX. Its separate adapter, offline program
compiler and zero-write preparation workflow are documented in [COOLLEDUX.md](COOLLEDUX.md).
Exact MELK-OF21 now has source-derived native controls, timer readback and explicit
configuration/DIY workflows. [LOTUS_OF21.md](LOTUS_OF21.md) documents their gates.
Owner confirmed all three connections on pinned `2b12451e` (2026-10-29); command
behavior and custom-upload persistence remain separate acceptance work.

| Feature | SP608E / BanlanX | NOKINS / LotusLamp X | TRINKA Devil Eyes / CoolLED1248 |
|---|---|---|---|
| Connection | Owner confirmed connected on `2b12451e` | Exact MELK-OF21 connected on `2b12451e`; separate legacy adapters retained | Exact CoolLEDUX connected on `2b12451e`; UX upload remains gated |
| Power, solid color, brightness | Existing advanced and scenes controls | OF21 source-derived ALL power/RGB/brightness; parked controls, hardware acceptance pending | Separate UX offline codec; live commands not enabled |
| Native animations | Existing advanced list of 41; speed, direction and supported pixel-length controls | OF21 234 effects / 33 scenes, speed and brightness; OA10 retains distinct 213-mode catalog | Owner CoolLEDUX 96 columns x16 rows identified; offline UX compilation/editor, upload gated by transport capacity |
| Music reactive | SP608E microphone-sensitive factory effects exposed | OF21 mic enable, eight rhythm IDs `0x80–0x87`, sensitivity0–100; no phone FFT streaming | Not enabled |
| Local scene library | Existing saved scenes (Bluefy localStorage) | Native-shaped static/dynamic patterns, local save/load/delete, preview and explicit guarded send; opted-in SmartEase accessory color retained | Pixel/text/picture/frame/program studio with local persistence and import/export; no hardware transfer |
| Controller onboard scenes | Existing nine scene recall buttons; writing scene slots unverified | Controller persistence unverified | Image/animation upload and persistence unverified |
| Whole-cart scenes | Working mapped SP608E five-zone scenes, gradients and calibration; optional NOKINS color-follow | One color-follow only for now; native effect synchronization not validated | Preview only |
| Timers / triggers | Not implemented; firmware persistence and semantics need tests | OF21 two-slot query/read-modify-write, Monday–Sunday mask, explicit local clock sync; firing/retention unverified | Not implemented |
| Backup / restore | Existing SmartEase browser-settings backup | OF21 local library/last requests included; restore never applies configuration | Projects, preset, assignments and read-only protocol report included where stored |

### Test sequence
1. **Create a backup** of the working SmartEase configuration before experimenting.
2. Verify SP608E original effects, eight output masks, per-channel chip order, direction and brightness without changing the stored scene slot.
3. If NOKINS really advertises `MELK-OA10`, park and independently test native modes 0, 143 and 138 using the new Device panel. The mode list/packet protocol is sourced from a reverse-engineering test on **MELK-OA10 5F**, not universally from LotusLamp X.
4. For `ELK-BLEDOB`, retain basic color controls until its distinct effect mapping is independently verified. Do not send MELK commands to ELK.
5. Identify Devil Eyes BLE name and pixel dimensions in CoolLED1248; perform the read-only SmartEase inspection. No write/pixel upload until family-specific commands, GATT characteristic and safe recovery path are confirmed.
6. Validate on-cart save/reload and disconnected behavior. Browser-saved scenes are not necessarily controller-onboard scenes.

### Safety, provenance, and terminology
- Decorative outputs only. **Do not put safety-critical headlights, turn signals, brake lights or hazards behind SmartEase scene or BLE controls.**
- Never infer a controller protocol from its app name or matching FFF0 UUID alone.
- Long-running live effects need an active foreground Bluefy connection; native onboard effects may continue when disconnected if proven on hardware.
- Labels: **Implemented** = software code and automated tests exist. **On-cart verified** = operator tested physical hardware. **Unsupported** = no transmitted commands.
- Do not claim **1:1 parity** until every function passes an acceptance matrix for the exact model/firmware.

### Independent references
- MELK-OA10 LotusLamp X reverse engineering (213 modes, E1 packets, documented category ranges): https://github.com/wporter82/lotus-lamp-python/blob/main/docs/PROTOCOL.md
- ELK-BLEDOB distinct mode range: https://github.com/8none1/elk-bledob
- CoolLED interop browser tool: https://klier.us/apps/coolled/
