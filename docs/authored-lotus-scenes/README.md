# Authored Lotus scene illustrations

All 33 built-in scene choices have independently authored geometric illustrations. These deliberately change the photographic/abstract source artwork to a coherent flat-illustration aesthetic. They are not original artwork or pixel-parity reproductions. Each retains the original URL, opaque 456×588 canvas, selector position, label and command. The existing grid/cropping behavior is unchanged.

`tools/generate-lotus-scenes.py` is the complete reproducible source. It uses only its own geometric primitives, colors, deterministic star locations and gradients; it does not read original images, trace outlines, download content or embed third-party art. `assets/native-lotus/scenes/authored-manifest.json` lists per-image purpose, hash and geometry. `contact-sheet.png` was visually inspected at generation.

Meaningful distinctions include dawn versus dusk, one meteor versus meteor shower, sparkler versus city fireworks, dating couple versus party group, wedding bands versus Valentine hearts, quiet bedroom versus moonlit ocean, forest path versus flowing stream, and reading book versus work laptop. Time Machine variants use distinct rainy-city clock and amber-lit passage/time-dial compositions. Hallowmas uses a haunted house. Warning uses an explicit warning triangle rather than an ambiguous landscape.

The scene provenance and browser catalog retain source-derived command/name facts, but scene image records now contain authored hashes, sizes, paths and origin—not original APK paths. The user-facing source note also names independently authored illustrations. No command handlers, BLE, consent, credentials, network, storage or control code changed.

Validation: `python tools/test-lotus-scenes.py` checks all33 unique hashes, opaque bounds/dimensions, provenance/catalog agreement, exact command order and deterministic generation. Existing `tests/native-catalogs.integration.cjs` remains unchanged and is run separately. No rendered browser, iOS pixel parity, physical hardware or public deployment is claimed. All33 scenes are completed; no item is silently omitted or represented by a repeated generic placeholder.
