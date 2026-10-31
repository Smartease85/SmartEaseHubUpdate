# AI scene studio UI — local editable recipes

Authored DOM/CSS module, no generative backend, API key, network, transport or device writes. Main integration supplies the pure recipe model and the separately reviewed runtime. No mapping/calibration/device preference mutation. Three editable RGB24 colors, cycle/brightness,96×16 sampled iris preview, four-group cart visualization, local saved scene library and runtime progress. Caption distinguishes nominal synchronization and existing native chase speed; Pause stops future live-color work but does not stop autonomous display/native chase.

## Integration API

`SmartEaseAICartStudio.create(root, options)`:
- `recipeModel`: defaults(), validate(recipe) detached copy, timeline(recipe,time), renderIris(recipe,time). Current strict recipe model is pinned in DEPENDENCIES.json.
- `runtime`: start(recipe) → Promise<boolean>, synchronous stop(reason), snapshot(), optional subscribe(fn) → unsubscribe. No context/mapping argument is passed to start: runtime/main captures authority. False result never claims running. Busy/stopping blocks Start; no queued restart.
- `readDefaults()`: optional strict recipe; otherwise model.defaults().
- `readMapping()`: optional display-only `{zones:[{label,channelLabel}],cabinLabel}`; five bounded circuit labels (including both underbody ports and rear). No interpretation or writes to actual mapping. Parent supplies confirmed SP canopy/reverse label. Fallback says cabin not configured/unchanged rather than guessing a circuit.
- `loadStore()`: synchronous serialized dedicated library or null. `saveStore(serialized)`: synchronous atomic dedicated-key write, **must throw on quota/failure**. No legacy state is touched. Missing callbacks make saving session-only and are labeled accordingly. Do not inject asynchronous persistence into these callbacks.
- optional `onChange(recipe)`, `onState(uiSnapshot)`, `onMap()`, `readReport()` (bounded existing transfer diagnostic object).

Returned `enter`, `leave`, `dispose`, `start`, `stop`, `save`, `load(id?)`, `importFile(File)`, `exportText`, `snapshot`, `refresh`, `setTransfer(snapshot)`. Mount is local-only; enter starts only visible preview, not hardware. Parent creates the AI tab adjacent Native and calls enter/leave with routing. `setTransfer` accepts flat counters or actual selected-controller snapshot.diagnostic.current, updates a separate progress paragraph, and never overwrites runtime errors. Packet index remains zero-based. Optional transfer report is a local JSON download, not telemetry upload.

Every recipe edit, load/import, mapping navigation and hidden/leave/dispose invalidates pending UI results and stops runtime before mutation. Name edits also stop. Incomplete hex blocks Start until committed valid. No parked/consent modal. Only replacing a nonempty library or deleting a scene uses confirmation. Runtime owns physical error handling/lease/cancellation; UI does not claim already-written bytes can be undone.

## Storage / backup

`STORE_KEY = smartease-ai-scene-library-v1`.
Schema `{format:'smartease-ai-scene-library',version:1,records:[{id,name,recipe}]}`. Exactly those fields; max32 records/128KiB UTF8, unique bounded IDs, nonempty names1–70 characters, strict model validates every recipe. Name/ID are never added to the recipe itself. Save always creates a new copy. Import validates completely before replacement confirmation/storage commit. Late file reads after edit/leave are discarded. Entry and each save/load/export/delete/import refresh the current validated library without changing the local draft. Each write compares the exact serialized storage revision immediately before the synchronous write; pending imports and confirmation dialogs reject an external replacement instead of overwriting it. Quota failure retains the latest validated library and stored value. This read/check/write guard protects observed full-backup/external changes; localStorage does not offer transactional cross-tab compare-and-swap, so the host must serialize truly simultaneous writers if it needs stronger multi-tab guarantees. Unknown/future/malformed storage is preserved and disables mutation; export of an empty substitute is forbidden. Full backup can preserve original unreadable bytes.

`validateStore(rawOrSerialized, recipeModel)` returns a detached validated library for parent full-backup validation. Parent must add only this dedicated key to its restore allowlist; no UI function accesses legacy storage.

## Preview lifecycle and accessibility

No iris pixel rendering before first entry. One RAF, at most20fps, only entered/connected/on-screen/visible; IntersectionObserver, visibility listeners and reduced-motion override. No observer or no Canvas → safe still preview; Null, throwing or incomplete Canvas API fallback is actual authored iris SVG pixels, not a blank tile. Iris samples match generated recipe frame-start sampling; four groups show nominal timeline colors with brightness applied once. Model iris pixels are already brightness-scaled. User can pause preview separately. All RAF/listeners/subscriptions/export-revoke timers removed on disposal; stale callbacks cannot restart. No auto runtime resume after visibility returns.

Scoped CSS accounts for main #app typography, mobile three-color controls,50px primary action,96×16 aspect ratio and readable status. Genuine headless browser screenshot was attempted but environment denied Chromium's local socket startup; no sandbox disabling or alternate browser bypass attempted. BROWSER.txt retains failure. DOM/computed-style tests pass; no claim of visually rendered mobile/Bluefy acceptance. Main owner/browser visual QA remains useful.

## Tests and bounded delivery

Synthetic33 DOM/schema/runtime/lifecycle tests use real recipe model and installed jsdom. Cover no auto start, edit stop ordering, invalid hex, brightness/tempo, late start/import, busy Stop, reduced motion/offscreen/null canvas, copy/save/load, quota, schema/version/duplicate rejection, replacement cancel, unreadable preservation, mapping navigation, reentrant state callback, transfer counters and actual app CSS. Test defaults resolve main-root files; isolated run sets AI_CART_APP_ROOT to existing app CSS and NODE_PATH to installed modules. No installs/hardware/network. Only overlay manifest-listed authored runtime/CSS/tests/docs are integration payload; dependency copy, browser profile and local preview HTML are not public payloads.
