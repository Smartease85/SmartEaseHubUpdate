# Authored Clock artwork — version 1

All 18 clock selections remain, in the same order and with the same numeric geometry, protocol IDs, frame counts (152 total), frame delays, seven colors and hour-mode behavior. Their backgrounds, preview illustrations and number/AM-PM bitmaps are independently authored geometric drawings. They deliberately differ from the original app's pixels; they are not original-app resources or a pixel-parity claim.

Themes remain meaningful: chasing border, space explorer, tropical shore, winter village, arcade, Halloween town, music bars, mountain sky, thunderstorm, snow friends, twin clocks, ticking dials, hearts, ducks, cats, truck, plain clock, ghosts/candle. Previews are generated from these exact background frames and authored numeric glyphs. The original choice IDs are retained for saved-record compatibility, not as an assertion that their art is unchanged.

`tools/authored-clock/generate.py` is independently authored Python/Pillow geometry. It reads only the adjacent factual layout/timing JSON, no original image, glyph or decompiled code. It generates the resource JSON, the synchronized wire tables, 18 previews and two semantic Exit/Save icons. `resources.json` pins the resulting public bytes. Numeric glyphs are ten 7-column cells with two MSB-first bytes/column. Separator glyphs are two columns/two bytes. Style7's AM-PM table is **two** separate 11-column/one-byte-per-column seven-high words, AM then PM; independent decoding establishes this layout. Generated previews use AM and do not claim actual live device time.

## Existing saved programs

No migration runs on startup, open, color/hour edit, backup, import or ordinary Save. Unknown fields and existing background pixels remain unchanged. Unversioned or unknown-version Clock records cannot be sent using newly authored glyphs while pretending to preserve their former display. Send rejects them with an actionable instruction. The editor explicitly offers **Make a copy with updated artwork**. That changes only the working draft; Save allocates a new ID and leaves the original record and selection untouched. Explicitly selecting a different style in such a record likewise creates a new copy when saved. Back discards the draft. New/current-version records use ordinary existing save semantics. Optimistic concurrency and session cancellation still apply.

New records carry `clock.artworkVersion: "smartease-authored-clock-1"`. The serializer still validates every background pixel, count, speed and source-known field against the synchronized authored tables; merely adding a version marker does not bypass this validation. The marker is compatibility metadata, not permission or device acceptance. The loader refuses stale unversioned bundled resources rather than combining old cached backgrounds with new glyphs.

## Validation limits

Node tests cover all18 serializers, all54 table bounds, independently decoded glyphs, matching embedded/JSON frames, immutable legacy records, explicit copy/Back/unknown versions, metadata preservation and stale-session guards. Existing editor, selected-send, one-off-send and whole-cart tests are run separately. No hardware write or original-app executable was run. No claim of tested physical orientation, firmware display quality, exact native pixels or live time sync.

Private old pixel comparisons and historical APK assets are excluded from the public overlay. Source evidence remains a private provenance reference; it is not a redistribution license.
