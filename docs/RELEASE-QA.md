# SmartEase Cart Lights 2.0 — release verification

This release preserves the supplied branch's inline SP608E packet implementation, reconnect backoff, legacy local storage keys, RGB channel permutation and per-color matches. The new interface calls that transport through adapters. No device firmware has been modified.

## Automated checks

Run `npm ci --ignore-scripts` then `npm test` on Node 24 or later. Runtime delivery is buildless: Node and npm are development-only, and the app requires no account, API key, subscription, remote script, web font, or paid service.

Tests exercise the actual retained serial BLE queue, packet vectors, stale-session cancellation, fragmented notifications, mapping migration, color calibration, full-app startup, unique DOM IDs, scene save/reload, emergency reconnect, unknown-device refusal, Lotus model/characteristic gating, cancellation and preview-mode isolation. Simulated hardware cannot certify physical wiring, color appearance, radio stability or an iPhone's multi-device capacity.

The expanded 22-test pass also covers front/rear view switching without radio writes, whole-cart accessory metadata surviving save/reload/edit, and custom NOKINS accent transmission without any write to an unsupported TRINKA display. Browser usability QA exercised a 390-pixel iPhone layout, a 320-pixel narrow layout and a 1280-pixel desktop layout. No horizontal page/header overflow was observed; the smallest header uses two rows. Real iPhone Bluefy/radio testing remains outstanding.

## Whole-cart designer

The user selected a 2008 Club Car Precedent with white body and black trim. The app contains matching front and rear product renders, five SP608E zone overlays, NOKINS bumper/tail accents and an animated windshield Devil Eyes mockup. One scene object stores all supported light settings and optional accessory appearance. Saved scenes can be reopened for editing without duplication. Existing five-zone scenes and calibrations keep their original keys and migration path.

NOKINS front/rear accents share one color because separate front/rear protocol addresses have not been established. The RGB preview is decorative; independent brake/turn/hazard circuits are not commanded. Devil Eyes expressions/colors are saved locally as design metadata and are not uploaded to the unknown TRINKA firmware. Sending a whole-cart design reports that supported lighting was sent while the eyes remain a preview.

## On-cart acceptance pass

1. Park. Back up the old setup where possible. Open this release in Bluefy. If the previous app also used `https://rawcdn.githack.com`, browser storage shares that origin and existing keys are retained; a different host/browser needs an import.
2. Close BanlanX and LotusLamp X. Apply the first fog-switch position. Connect SP608E. In Advanced, verify the existing five-zone map rather than assuming CH1–CH5 is the wiring. Check saved RGB tuning.
3. Play SmartEase glow at moderate brightness. Verify front bumper, left/right undercarriage and rear bumper. The canopy remains limited by the physical relay; switch to position two to include it.
4. Play Haunted Surge from Favorites for three-color twinkles. Use the featured Haunted Surge card for live front-to-rear flow. Confirm the parked/map checkbox. Allow several seconds for serialized setup: SP608E retains the original 240 ms write spacing. Motion is coordinated at zone level, not a pixel upload or frame-locked render.
5. Move brightness, turn mapped lighting off while a scene is still applying, and confirm no canceled scene resumes. Unmapped outputs must remain unchanged.
6. Switch lighting power off, then on. Observe per-device status and bounded automatic retries. Use the floating Reconnect button to force fresh links, including links that look connected but have stopped responding. Reconnection does not replay a scene automatically.
7. If NOKINS advertises a supported LotusLamp model, connect it separately under Devices. No write occurs on connection. Enable the decorative scene-color matching switch, play a scene and verify color/brightness. It follows one front-zone accent color; it does not acquire the SP608E's five-zone animation or diagnostic readback. Unknown Lotus models remain setup-only. Check that independent brake/turn/hazard behavior remains correct.
8. Identify TRINKA to record its name. Its native app/protocol and persistence remain unresolved, so no animation upload, scene recall or paywall capability is claimed.
9. Save a custom gradient, reload, recall it, export a full backup, and restore on a separate browser/origin. Full backups include mapping, scenes, calibration, preferences and device IDs. Restoration is confirmed and rolls back storage if a write fails.
10. Background Bluefy during live flow: browser-driven motion stops and does not resume automatically. Controller-native effects may continue while powered. Test a power cycle separately; firmware scene storage is not claimed.

## Hosting and cache behavior

GitHub Pages was absent on inspection (public Pages endpoint returned 404). The release can be served through a commit-pinned rawcdn.githack.com HTTPS URL. Validate GET responses, not only HEAD: the old pinned build returned 200 to GET while HEAD returned 403. All runtime assets are relative to the immutable release directory.

The service worker caches a complete release atomically, limits interception to same-origin GETs, and does not force an update across an active session. Close all tabs to activate a waiting update. Bluefy/iOS service-worker installation and home-screen launch remain device-dependent and need on-device verification. The app still works online when service workers are unavailable.

## Outstanding hardware evidence

See [HARDWARE.md](HARDWARE.md) for the capability matrix, sources, Lotus profile variants and blockers. The exact installed NOKINS advertised name/model and TRINKA app/controller identity still require observation on this cart. Do not describe the entire three-device system as hardware-verified.
