# Native OF21 Color — reconstructed implementation

This is a new independent browser implementation after workspace loss, not recovered original application source or a full iOS pixel-parity claim. Original LotusLamp X 5.21.01 artwork is included for the requested faithful remake, without a license/public-domain claim.

## Direct evidence

Research retained at `native-recovery/evidence/color` outside this checkout:
- ColorfulLightFragment ordinary OF21 path, Sob.xml (`fragment_colorful_light`). Six fixed colors red, green, blue, cyan, yellow, white; four custom slots, not OYRGBW extra-white or two-in-one controls.
- Card16dp sides/24dp top/12dp corner; RGB label16top/24left; palette-switch32dp/24right; original palette area50top; custom color area30sides/20bottom,5portrait/10landscape; brightness16sides/50top/40bottom.
- Source custom null-slot coroutine sets selection and arms future changes; populated selection emits its color; RGB confirmation emits temporary RGB and closes. Collector persists selected custom color on user color change. Long-press clears custom color; fixed colors remain immutable.
- RainbowRingPalette/Sob `rrpMode=4,rrpPaletteMode=1`: **image sampling**, not a generated HSV wheel. `ic_palette_bg` res/DjQ.png, circle hit predicate, sampling outside the circle clamps to radius minus6 source pixels. Bitmap is90% of palette view width. Source ring-gradient code is a separate rendering path, not substituted here.
- PaletteRGBComponent uses original `ic_big_solorwheel` res/krA.png, opposite vertical hue orientation. Concrete simple-mode touch branch uses diamond inclusion `abs(x-r)+abs(y-r)<=floor(r)` then radial edge projection outside. Browser implements that unusual source rule rather than quietly replacing it with a circle predicate. Normal extraction had an unsupported nested method; targeted simple extraction supplied this branch. Original image is scaled then sampled, with coordinates clamped to bitmap bounds.
- Switch shows `ic_rgb` res/ksV.png or `ic_ring` res/x9C.png. Assets and source IDs/hashes are in `assets/native-lotus/color/provenance.json`.

## Explicit browser differences / safety

- Palette gestures, swatches, temporary RGB dialog and brightness edits are local drafts. Apply color and Apply RGB brightness are separate explicit operations; no bundled default brightness, no automatic power or controller write. RGB brightness targets `rgb`, not all channels. No center power control.
- Four custom colors are optional `of21Local.colorPalettes={version:1,devices:{grantedId:[null|hex, null|hex, null|hex, null|hex]}}`. This is explicitly browser per-granted-device metadata, not a claim to original device/group DB identities. Unassigned edits stay in a separate session draft and never auto-bind. Unknown metadata preserved,32device/256ID limits; reservedIDs rejected. Startup/backup use same validator.
- Custom persistence is canonical-conflict checked against whole storage and selected palette snapshot. Quota/oversize restores previous map/absence; local color draft remains, failure disclosed. Local custom palette edits are not BLE writes.
- Browser hold threshold600ms and Delete/Backspace keyboard equivalent are accessibility adaptations, not a traced Android timing constant.
- Canvas resizing/interpolation may differ from Android density/filtering. Original source pixels and mapping are used; exact device-density rendered sampling still needs visual/physical validation.
- Shared busy exclusion and guards capture ID, device object, connection generation, ownerEpoch, route, visibility and own operation epoch. Pending hold/drag/dialog invalidated before device switch. Late completion cannot overwrite cancellation. No automatic retry/readback; submitted requests do not establish physical acceptance or power-cycle retention.
- RGB Cancel is `type=button`, independent of invalid256/fraction/blank input. Input never emits before explicit Confirm, and Confirm only changes local color.

## Verification

New focused tests cover original fixed slots, image-source switching/coordinate math and mocked canvas sampling, temporary RGB validation/Cancel, per-device palettes, no-ID separation, cross-editor/storage/quota preservation, pending holds/dialogs, guarded exact independent commands, cancellation and schema startup/backup rejection. These are offline tests, not physical BLE acceptance or a complete screenshot/browser fidelity review.
