# Integrated DIY editor reconstruction candidate

Integrated after reviewed catalog checkpoint424897d; independent DIY review pending. Original staging instructions below retained as provenance, not current status.

After authorization: copy native-lotus-diy.js to app root, append native-lotus-diy.css to native-apps.css or link separately and cache it; load JS after native-lotus-color.js/native-apps.js; add JS/CSS to service worker. Router already supports SmartEaseNativeDIY.enter/leave on Scenes/DIY. Copy tests to app tests folder and change their root to path.resolve(__dirname,".."); remove staged duplicate injection once JS is in index. Add test path to package scripts. No shared schema or protocol change needed.

Run staged tests using NODE_PATH=/workspace/scratch/af49e8e79772/native-rebuild-worktree/node_modules node --test native-recovery/next-diy/implementation/tests/native-diy.integration.cjs. Tests inject staged code into current app; not an aggregate integrated suite.

## Source and adaptations
Original SymphonyScenesActivity, CircleView, LGT XML and default-English resource labels preserved in PROVENANCE.json. Mode tabs Static/Breathe/Strobe/Positive Flow/Reverse Flow/Closing Flow/Opening Flow; dynamic2–8 exclusive nodes, static10–30 serpentine5columns, dynamic10columns landscape, static radius12 landscape/16portrait, original saturation bitmap (800px half-scale400dp responsive max-width). Original palette pixels personally inspected. Static initial random nodes unselected; dynamic defaults two with last selected; initial no-device source count15, source speed100. Random colors follow LPBleHelper twelve-color array, not arbitrary RGB. Non-enhanced OF21 fixed swatches red/green/blue/white only.

Source hue/sample replaces color V with selected brightness; multi-selected brightness paints the SAME last-selected hue/saturation to all selected nodes. Source HSV marker position uses cos(H)*S/2, -sin(H)*S/2; no bitmapcolor guessed when sampling unavailable. Selection/load/mode/add/remove all synchronize color and V.

Browser geometry details are explicit adaptations because native device/group configuration is not reconstructed; initial total15 is an offline draft value only, not device readback. Preview stays blocked until current-generation returned total equals draft total. Read LED count in existing device controls, then Use returned LED count copies locally. No auto-read/power/upload. Immutable captured project plus identity/generation/device/ownerEpoch/route/visibility/consent guard; cancel before asynchronous history traversal. Submitted upload is not ACK/retention proof.

New source name row hidden until load; Save copy opens source-style Scene Name dialog for new draft. Existing record load copies isolated draft; Save copy appends {name,project} to unscoped legacy library. No update/delete or device/group inference in this bounded stage. Canonical disk/memory comparison and quota rollback retain prior records/unknown fields.

Unedited loaded projects preserve explicit numeric brightness and ABSENT brightness exactly. The display applies legacy numeric brightness to colors without changing stored project; first explicit palette/mode/geometry edit bakes rendered per-node colors and removes scalar brightness to avoid double application. Existing raw per-node colors remain untouched without an edit. No blank→0/100 coercion and no startup/import rewrite. Full scoped library lifecycle remains separate.

Not original iOS pixels, native Android runtime, physical preview or full DIY-library parity. No browser-rendered claim.

Static existing-data load has NO selected nodes (`staticData` creates false entries; `CircleView.setData` does not select). Dynamic existing-data load selects its first node (`setNoLineCustomData`). Regression explicitly distinguishes them; prior recovery summary's blanket “load selects first” was too broad.

## Shared-editor compatibility dependency

The prior whole-cart editor loaded missing `project.brightness` as100 and required a numeric field. That would silently brighten raw-RGB Native copies when opened outside Native. The narrow of21-native.js correction makes blank mean absent (the draft omits the property), previews raw node colors unchanged, and loads absent brightness as blank. Explicit1–100 retains the previous HSV-value behavior; zero/fractions remain invalid. Default newly authored whole-cart brightness remains100. No stored data is migrated or rewritten on load; export/full-backup restore preserves unknown metadata and per-node values. Regression exercises Native save→whole-cart load/preview/save/export→full backup restore plus numeric legacy semantics.

Source gradient selection is retained while its controls are hidden in modes0–2 (Activity353–365; curGradientIndex assignments239,246,972). Browser draft remembers it separately, serializes0 for modes0–2 to satisfy the existing legacy codec, and restores selected value on modes3–6. This avoids erasing the owner's flow gradient on tab switches without broadening the codec.

Accepted external/legacy projects may omit mode/gradient/speed, for which the existing codec defines0/0/50. On load the isolated working draft fills those effective defaults before choosing static/dynamic layout. No source record or storage is rewritten, unknown project fields and absent brightness remain intact; Save copy may explicitly materialize those semantically identical defaults in the new record. Invalid null/default fields remain rejected by the codec.
