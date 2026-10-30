# CoolLED decorative-control artwork — isolated review slice

## Status and scope
190 newly authored replacements, 84 semantic drawing roles, exact original filenames and dimensions. No app code or main checkout asset has been edited. No font, output-emoji/category-tab, frame/AutoColor/clock output, Dynamic mask, device operation or public upload is part of this stage. The GIF encoder stage remains frozen separately.

Production payload is **only `replacements/`**. `replacement-manifest.json` enumerates every proposed file, semantic role, dimensions, original alpha range and new SHA-256. Original APK-derived pixels appear only in the private `original-contact-sheet.png` comparison evidence; **do not publish or copy that original sheet into the app**.

Counts:
- `assets/native-coolled`: 38 generic program/navigation/action icons.
- `native-coolled-draw-assets/icons`: 65 drawing tools, navigation and simple backgrounds; no fonts.
- `native-coolled-settings/assets`: 16 controls/background, excluding the photographic banner.
- `native-coolled-template/assets`: 27 controls/empty-state glyphs, including the decorative emoji entry button.
- `native-coolled-text/assets`: 25 simple controls, including the decorative emoji entry button; excluding auto-color category graphic, frame-zero output and no-frame category tile.
- `native-ux-animation-assets`: 17 editing controls, empty-state symbol and backgrounds.
- `native-ux-animation-media-assets`: 2 crop/back controls.

## Independent creation and visual choices
`generate.py` draws all production assets from independently authored geometric coordinates using existing Pillow primitives. It reads only the path/dimension/alpha inventory. It does **not** load original pixels, trace masks, recolor extracted images, use image-to-image input, load fonts, download stock icons or call unknown glyph fallbacks. Icons are semantic primitives (pencil, trash, copy/paste, compass, clapperboard, clock, Bluetooth, document, sliders, palette, selection, directional arrows, upload, globe, etc.), not one repeated placeholder. Shared symbols across multiple original paths are intentional where their actions match.

The source contact sheet was inspected to identify icon meanings, color-state distinctions and opacity/layout roles. Consumer inspection covered:
- `native-coolled.js`: program type actions, selected/unselected program radio indicators, row edit/copy/delete/reorder/repeat actions.
- `native-coolled-settings-ui.js`: background/banner, per-row semantics and separate observed on/off toggle resources.
- Draw, Template, Text and Animation resource families plus `sw.js` original path listings: tool selection pairs, crop controls, fonts-vs-control boundary, slider thumbs and stretched container backgrounds.

New style: soft-corner geometric outline symbols, white/near-white foreground, violet selected states, dark drawing-tool tiles, low-chroma round category accents, and restrained dark container backgrounds. Artwork is intentionally new, not a faithful pixel copy. Selection, undo/redo, mirror axes, left/right, plus/minus, on/off and check/cancel remain distinguishable. Typography-like T/B/A symbols are drawn from lines and polygons, not font glyphs. Empty-program, empty-animation and empty-drawing affordances have purpose-specific tray, clapperboard and pencil symbols instead of copying the original illustrations.

Rasterization uses 4× supersampling then Lanczos reduction. Original dimensions and PNG/JPEG formats are preserved, along with the exact alpha extrema (including original partial-alpha overlay/background resources), but original alpha silhouettes are not reused. The clock *program icon* remains a 144×144 opaque JPEG; actual clock preview/output assets are excluded. The settings page remains an opaque 1125×2436 independently authored dark gradient. Filename stability means no consumer, service-worker resource path, layout CSS or live-link change is needed for this slice.

These are newly authored assets/source, not imported third-party artwork. No third-party image/font license is asserted or needed as provenance for the geometry input; this is not a legal conclusion about the full app or any excluded material. Pillow is a rendering tool, not a source of production icon art. Default Pillow lettering appears only on the private contact sheets, never in the replacement icons.

## Original isolated-slice exclusions
`excluded.json` enumerates four omitted inventory entries:
1. Settings `ic_banner_default__410b8bad.png`, 1125×462: a photographic promotional car banner. The combined checkout now uses separately generated artwork documented in `docs/AUTHORED-SETTINGS-BANNER.json`; the original advertisement is not retained.
2. Text `ic_auto_color.png`.
3. Text `ic_coolledu_frame_0.png`.
4. Text `ic_no_frame.png`.

The two `ic_emoji` smiley toolbar resources are included under parent authorization: `native-coolled-text-editor.js:11–12` and Template `region-text-editor.js:13–14` use the named Emoji button only to toggle a panel. Actual output emoji are independently addressed under `emoji/pixels`, `emoji/thumbnails` and `emoji/tabs` token catalogs. The Template `drawable__ic_emoji.png` copy is cached by `sw.js`; no direct runtime consumer beyond that cached alias was found, and it is not an output-token path. The authored smiley does not alter output emoji data.

Emoji/category directories, actual numbered frame files, AutoColor GIFs, clock resources, fonts and Dynamic masks were never included in this proposed replacement inventory. Generic app tab icons (Discover/Material/Text/Settings) are included; they are not emoji category tabs.

## Public reproduction and historical private validation

From repository root, run `python3 tools/authored-ux-controls/generate.py` to
produce `replacements/` beneath this tool directory. It requires Pillow. Compare
the 190 generated paths/hashes with `replacement-manifest.json` and the current
root runtime files before adopting them. No original artwork is read.

The private isolated stage passed four comparison tests: bounds/formats/alpha,
190 hashes, original-versus-authored difference, distinct state/direction pairs,
and independent generator inputs. Those comparison tests and original contact
sheets are intentionally not public test prerequisites. Independent review
regenerated all190 outputs and visually inspected original/new semantics.

This is asset-level validation, not full app screenshot/click acceptance. The
assembled application's optical weights and backgrounds still need browser QA.
Visual differences are intentional; no universal original-pixel equivalence is
claimed. This document closes only the190 control resources, not every output
resource, and does not by itself authorize publication.
