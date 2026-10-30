# Authored BanlanX UI artwork — bounded replacement

This slice replaces 17 raster assets and one font. `assets/native-banlanx/authored-provenance.json` is the authoritative output hash/geometry manifest. `tools/generate-banlanx-art.py` contains the complete independent geometric source. It reads no original bitmap, font, or APK. Source-like filenames and six private codepoints are retained for URL/layout compatibility; the font is **SmartEase Authored UI**, not Material Icons. No third-party artwork or third-party font outlines are embedded in the replacements.

## Preserved contracts

* Existing raster dimensions, transparent outer bounds, filenames and consumers.
* Four mode-state icons: palette and effects sparkle, blue selected/white unselected.
* Five distinct music-note masks; existing CSS tints, positions, sizes, 300ms transition and reduced-motion behavior remain unchanged.
* Two effect-selector chevrons and four translucent wave decorations.
* Mathematical hue/saturation disks: red east, magenta southeast, blue southwest, cyan west, green northwest and yellow northeast, white center. These match the existing painter's equal hue intervals, not the separately quantized gesture interpolation.
* Six authored CFF glyphs: minus E516, plus E047, right arrow E09B, vertical more E404, copy E190, loop E0C1. The 512-unit advance/ascent and zero descent are compatible with existing CSS. No layout/control logic changed.

This is a faithful functional art rework, not an original-pixel or APK-byte-parity claim. Independent curves, note outlines and wave phases differ intentionally. No BLE, network, credentials, security, storage, device or transport behavior changes.

## Review and tests

`contact-sheet.png` shows all replacement rasters and glyphs on a contrasting background, inspected after generation. `python tools/test-banlanx-art.py` verifies hashes, dimensions/alpha bounds, cardinal hue semantics, codepoint coverage/metrics and byte-identical regeneration. The existing BanlanX unit/DOM suite passed **413/413**; meaningful assertions remain, and note-mask fixture hashes/test descriptions now explicitly refer to authored art. These are offline tests, not rendered app, iOS, physical-controller or public-deployment acceptance.

## Combined replacement status

The original 17-raster/font slice described above has now been combined with
[the separately authored timer illustration](../authored-banlanx-timer/README.md)
and the Lotus artwork: [controls/rhythm/palettes](../authored-lotus-controls/README.md),
[39 hardware choices](../authored-lotus-hardware/README.md), and
[33 scene illustrations](../authored-lotus-scenes/README.md).
The prior isolated-stage statement that timer and Lotus were unchanged is superseded.
Each generator and per-family manifest documents its actual source, meaningful
visual distinctions, and intentional appearance differences. Existing control
logic and layout contracts remain unchanged. This does not clear unrelated
CoolLED output artwork, fonts or other resources.

Private planning inventories, original-image comparison sheets and isolated
`overlay-files.txt`/`changed-files.json` lists are not public prerequisites and
are not included here. The public checkout contains only the selected final
replacement resources, their generators/manifests and relevant regression checks;
never publish the original private checkout or its Git history as an overlay.
