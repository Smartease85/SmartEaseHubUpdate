# SmartEase Cart Lights — Original Functions + Whole-Cart Feature Parity

Status: 2026-10-28 • `smartease-cart-lights` branch

**Goal:** A single SmartEase® interface with individual-device original functions and SmartEase whole-cart groups/scenes, without copying proprietary vendor UI/assets. Preserve the verified baseline, color calibration, saved scenes, independent turn/brake/hazard wiring, and power-cycle behavior.

## Matrix (hardware support and application support are distinct)

| Feature | SP608E / BanlanX | NOKINS / LotusLamp X | TRINKA Devil Eyes / CoolLED1248 |
|---|---|---|---|
| Connection | Working Bluefy BLE | Verified profiles `ELK-BLEDOB`, `MELK-OA10`; unknown models blocked | Discovery and read-only FFF0 inspection, upload blocked |
| Power, solid color, brightness | Existing advanced and scenes controls | Working color/brightness for verified profiles; power packet limited by profile | Not implemented until exact protocol identified |
| Native animations | Existing advanced list of 41; speed, direction and supported pixel-length controls | **New:** full 0–212 mode catalog, category selector, speed and brightness **only** on `MELK-OA10` | Not implemented; pixel count and BLE family still unknown |
| Music reactive | SP608E microphone-sensitive factory effects exposed | Unknown / profile-specific; do not promise | Unknown |
| Local scene library | Existing saved scenes (Bluefy localStorage) | Follows supported SmartEase accessory color when opt-in | Scene editor preview only |
| Controller onboard scenes | Existing nine scene recall buttons; writing scene slots unverified | Controller persistence unverified | Image/animation upload and persistence unverified |
| Whole-cart scenes | Working mapped SP608E five-zone scenes, gradients and calibration; optional NOKINS color-follow | One color-follow only for now; native effect synchronization not validated | Preview only |
| Timers / triggers | Not implemented; firmware persistence and semantics need tests | Not implemented | Not implemented |
| Backup / restore | Existing SmartEase browser-settings backup | Profiles/settings included where stored | Read-only protocol report included where stored |

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
