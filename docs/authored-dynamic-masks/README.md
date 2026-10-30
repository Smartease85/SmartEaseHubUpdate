# Authored Dynamic reveal artwork

These 28 RGBA resources are independently generated geometric artwork for SmartEase, replacing original-app mask images for the public candidate. They are not copied, traced, recolored or resized original pixels. `tools/authored-dynamic-masks/generate.py` reads only mathematical constants and writes the resource plus a SHA-256 manifest; no external package, font, image, APK or decompiled input is read. Original reference pixels were viewed privately to identify the four functional visual themes, not used as generation inputs.

## Preserved behavior

The nine modes remain available, including five unchanged mathematical modes. The four artwork modes preserve their existing key identities, seven-stage order, 100×100 RGBA representation, source-over compositing, source sampling, repeat and timing. Closing uses the existing bilinear scaling and left-half reflection. Light Up, Lines and Fan-shaped retain the existing nearest 16×16 reduction followed by filtered 96×16 sampling. User page pixels, saved record schemas, speed/stay settings and device transport are unchanged. No saved content is rewritten.

Every family begins with an opaque dark cover and ends fully transparent, making the final frame equal to the user's input content. The five intermediate frames in each family are distinct, with progressively decreasing coverage. Black pigment is intentional: it reveals the user's artwork rather than inserting unrelated colored pictures. Alpha and RGB are still interpreted as RGBA source-over, not converted into Boolean masks.

## Approved visual differences

* **Closing:** symmetric shrinking central dark cover, revealing the outer edges first and moving inward, with smooth narrow boundaries; evenly spaced progression replaces the former irregular shutter widths.
* **Light Up:** horizontal illumination sweep moving from left to right, with independently selected sweep positions and edge softness.
* **Lines:** eight horizontal blinds progressively retract and fade. Stripe frequency and fading differ from the original thin-line artwork.
* **Fan-shaped:** symmetric radial opening from twelve o'clock about the image center; fan edge geometry/softness are newly authored.

These are meaningful distinct reveals, not identical placeholder masks. They intentionally differ from original-app pixels. Existing sampling may make transitions nonuniform on the 96×16 LED matrix; rendered review and eventual physical acceptance remain separate from offline tests. UI/runtime provenance now accurately identifies the artwork as authored rather than original resources.

## Validation

`node --test tests/authored-dynamic-masks.test.cjs` checks all 28 keys, exact dimensions/bounds/hash, 20 unique intermediate stages, decreasing opacity, exact final content, cadence, source-over colored-pigment semantics, resource copy isolation, mirror/sweep/fan direction and all nine mode counts. A private contact sheet was visually inspected showing all 28 output stages over cyan test glyphs. Private reference contact sheets are excluded from public output.

The application's 36 post-GIF composition fixtures also depend on bitmap fonts and Frame palettes. They must be regenerated only after all approved replacement inputs are frozen, then independently verified by the existing Pillow decoder and Python protocol composer. Do not accept those changed golden hashes merely because the production encoder produced them. This slice does not waive that combined integration gate.
