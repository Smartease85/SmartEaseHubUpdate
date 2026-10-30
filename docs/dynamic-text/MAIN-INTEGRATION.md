# Main integration on durable v37 base

Base54f2f6cb02a8622f7c60f6998ff58b02875ab309. Source-stage README/ALPHA/freeze/patch files here are archived evidence; this file describes the live integration.

- Native Program Add → Dynamic Text enables exact type14 authoring, nine source effects, original palette/emoji/frame/speed/stay menus. Save/reopen uses strict type14 validation, stable IDs and unknown metadata preservation. Existing future kinds remain opaque, never migrated.
- `native-coolled-dynamic-editor.js` requires injected shared post-GIF renderer. `native-coolled.js` uses new generation for editor and library thumbnail. No old pre-GIF renderer loaded; no stale prepared cache used by transport.
- Route is `#native/coolled/dynamic-text`. Back/history/visibility/owner changes cancel renderer state; route-only Forward cannot resurrect an editor session. Full backup and Native import leave the Dynamic editor before asynchronous reads. Save uses both host epoch and editor revision plus store optimistic consistency.
- `ux-dynamic14-wire.js` is the guarded registry adapter. Selected-program preflight validates all chosen records before any resources, including the unsupported-background gate. Original masks are loaded from one same-origin pinned asset, then original fonts/emoji and corrected GIF generation run fresh. Every external loader completion is checked against selection/session revision. `ux-program-send-plan.js` preserves full selected order/repeats/count and the reviewed source compression/framing. No controller/shared-lease changes.
- Source field203ms remains203 in saved records; generated GIF preview/wire cadence is200ms. The palette roundtrip and straight-alpha boundary corrections are shared by both paths. Target remains96×16; frame-auto14px glyphs get16px composition, plus original frame layer1.
- Firmware remains unknown (`null`), not inferred from name/profile. Background selection and unsupported background wire paths remain explicit. Android shaping and remaining Skia/ARGB8888 sampling/physical/iOS equivalence are not claimed. Per-editor one-off Send is intentionally not implemented; Program selection Send is the working separate lifecycle.
- No device actions, network catalog, automatic reads/sync, picker invocation or publication were used in implementation/testing. Host radio tests use pure mocks and never request an actual device.

## Portable checks

`npm test` includes Dynamic shared-wire27 tests, actual-index host15 tests, and registry/schema/resource18 tests (60 additions). The registry runs36 postGIF hash fixtures. `python tests/dynamic-gif-reference.py` independently checks all36 actual GIFs with Pillow, then composes protocol bytes in Python. Fixture inputs are decoded GIF pixels, not pre-GIF rasters. Runtime/assets are pinned by RUNTIME-PROVENANCE.json; all new runtime resources are in the atomic service worker cache.

The existing Text stylesheet is reused byte-for-byte because the cleared Dynamic source stylesheet is identical. Actual index-linked CSS under#app is tested at390×844 and844×390:18px regular title, source icon-only buttons, viewport-bounded scrolling dialogs, focus restoration. No claim of painted owner-device screenshot parity follows from jsdom.
