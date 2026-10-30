# Native CoolLED ordinary UX16×96 local workflow

This is a source-backed Android CoolLED1248 2.7.6 implementation, not evidence of iOS2.7.8 pixel parity or physical upload acceptance. Native remains an internal build. Exact owner identity/dimensions were already established; no request to prove them again is necessary.

## Implemented source workflow
- Program / Material / Discover / Settings root, original four tab images,68dp bar. Program contains source local list, selection order, repeat1–10, Edit/Copy/Delete/Top/Bottom/reordering, and original empty illustration.
- Original Add choices/order/model conditions. Graffiti enabled; other source editors explicitly pending. No two-device Eyes workflow or unrelated Drive/Fitness entry for this single target.
- Graffiti has Add/Edit title,96×16 preview,13 exact modes, native speed0–15 (display1–16),stay0–60 default3. Separate Draw entry, local Save, stable record replacement/new insertion. All-black allocated drawing is valid; absent never-created drawing is null and cannot Save.
- Graffiti source Back asks save-and-exit: Confirm saves, Cancel exits without saving. Browser Back keeps draft as an explicit safety adaptation, including the separate uncommitted Draw copy. Graffiti Save refuses to drop an unfinished Draw copy; return to Draw and explicitly Save/discard first. Source list Edit Cancel and Confirm both end editing without rolling back already-persisted local operations.
- No transport/encoder called. Send disabled with packet/capacity/acceptance/retention gate. Local Save/backup is source-model data, NOT a transferable controller packet plan. Existing whole-cart display-project1 remains separate, unchanged and unconverted (including repeat20/rawRGB/black workaround).

## Persistence and safety adaptations
- New key `smartease-native-coolledux-v1`, format `smartease-native-coolledux-library`,version1. Library keyed `coolledux:16x96`, not MAC. Raw pixels and DrawItem.data flags are distinct. Unknown records/libraries/metadata preserved; unknown record types shown without editing.
- Browser limits128 records /4MiB of UTF-8 JSON bytes (save, import, startup and full-backup restoration), visible rejection/no truncation. Source offline selected-send fallback9 is separate; connected minimum capability is not inferred. Imported selection is not silently truncated.
- Drawing palette app-global, Text palette advertised-device-name+dimensions. Actual source DeviceManager.java774 derives DEVICE_NAME from bleDevice.getName. Without a bound runtime name, text palette remains an unassigned in-memory draft; later identity assignment never silently binds it. No screenshot-label fallback, MAC binding or auto migration. Both palette lists bounded1–32, seven defaults; no silent clipping.
- Canonical disk/memory comparison, stable ID/content anchors, eight-attempt collision bound, validate-before-write quota atomicity. Unknown fields retained. Global full-backup import uses independent strict schema before confirmation; no coercion via old display project validator.
- Local data changes do not perform BLE. Route/history/visibility/identity/generation invalidate dialogs and Draw callbacks, preserve parent working draft. Reconnect does not revive a pending confirmation.
- Browser row Edit buttons and keyboard reorder replace source touch swipe/drag; contextmenu exposes editing. Header Device returns Native chooser, not automatic scanning. Source power checkbox default is not readback: disabled unknown state, never source-default ON assumption.
- Source Add selector displayed as accessible dialog, root browser containment/focus. Original source layout/art recorded in provenance; no rendered browser/iOS validation has occurred.

## Explicit pending original workflows
Text/Animation/Material/Template/Dynamic Text/Clock editors; Material/Discover cloud/local flows; full settings/OTA/rotation; sharing/import image flow; actual Send transport/hardware acceptance. The root has honest pending screens, not substitute generic panels. Original effect/type semantics are never guessed.

## Static evidence
Source evidence under `native-recovery/next-coolled`: UI-READINESS.md, UI-SOURCE-HASHES.json, UI-STRINGS-COLORS.json, source Java, decoded XML,83 original resources and additional original Add/selection assets. Source APK SHA256 ae4521f41791e826be57fa2dbba0bd9bb87b378be7c532f6fd2affc1dddcc6f3. No APK execution.

Draw integration creates a fresh inner event host for each entry. Detached controls retain invalidated guards; obsolete delegated listeners are collectible with their old host. The reviewed standalone Draw module bytes are unchanged.
