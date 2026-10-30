# Authored Frame / Colorful picker previews

This bounded slice replaces **51 images only**: 28 Colorful GIFs (198×153), 21 frame-choice PNGs (none plus20, each96×96), the Colorful control illustration `ic_auto_color.png`, and the72×72 Frame settings icon `ic_frame_32.png`. URLs, IDs, selector counts/order, labels, modes, speeds and commands remain unchanged. `ic_frame_32` is a settings icon, not an extra frame choice.

## Independent source and preserved behavior

`tools/generate-frame-color-previews.py` creates new geometric A/B letters, color fields, borders, no-frame grid and frame-edit symbol. It reads no original artwork or font. The generator calls existing read-only runtime APIs:

* Frame previews use `SmartEaseUXTextFrame.patterns` (also loaded alongside `state`), presenting the same functional color sequences around a square thumbnail. Existing96×16 runtime edge traversal/state and all20 pattern arrays remain unchanged.
* Colorful previews get existing palette and control descriptors through `SmartEaseUXTextWire.autoContent`. RGB444 palette values are interpreted for illustration; **no palette or control byte is edited**. Newly authored mathematical fields distinguish horizontal forward/reverse, static spatial, vertical forward/reverse, symmetric vertical, solid steps, sequential two-color hard-edge wipe (right→left for9/23, left→right for10/24) and two diagonal families. Their geometry/direction presentation is an illustration, not a newly verified device-animation implementation.

The distinction matters: the current local text editor intentionally retains token colors when Colorful is selected; it does not animate Colorful text. The new GIFs are picker examples only and do not change that behavior or claim hardware parity. Four relevant runtime files (wire/frame/model/renderer) remain byte-identical and hash-locked. The editor has only the separately reviewed label change from original-font to bitmap-font preview; its complete updated hash is also locked. Existing documented frame-renderer versus wire-palette differences are preserved, not silently reconciled.

Original dimensions, alpha bounding boxes, GIF loop values and total timeline durations are retained. Static control-family2 remains static (choices3 and17); identical frames may coalesce without changing total duration. Every one of the28 GIF payloads is distinct. Basic colors, factual protocol constants, effect IDs, control sequences and wire palettes were not perturbed to make numbers different.

## Consumers

`native-coolled-text-editor.js` displays28 `ic_auto_colorN.gif` choices in Color→Colorful; Frame displays0=`ic_no_frame.png`,1=`ic_coolledu_frame_0.png`,2–20=`ic_frame_1.png`–`ic_frame_19.png`. `ic_frame_32.png` is the Frame settings row. `ic_auto_color.png` remains a packaged/cache compatibility illustration and is not a separate selectable choice. Existing `sw.js` cache URLs remain valid. No handler, layout, CSS, storage, network, BLE, credentials, consent or security code changes.

## Evidence and limits

`authored-frame-color-provenance.json` beside the assets records authored output hashes and meanings. `tools/frame-color-contracts.json` contains only geometry/timing contracts, four unchanged-runtime hashes and the explicit wording-only editor hash. The original pixel artwork was inspected for semantics, not copied or traced; new output contact sheet was inspected separately.

`python tools/test-frame-color-previews.py` checks all51 hashes/dimensions/bounds,28 distinct GIF payloads, animation/static-family behavior, complete timeline durations, exact functional edge sample colors and unchanged runtime hashes. Existing frame/editor/model/CSS tests remain unchanged and pass46/46. Selected-send/planning tests also pass33/33. A second full generation reproduced all51 payloads byte-identically.

This is a preview-art provenance replacement, not a licensing assertion over existing source-derived runtime data/code, not original-pixel parity, and not browser/mobile or hardware acceptance. The public checkout contains the selected final resources and reproducible source; private isolated overlay lists and historical evidence are not prerequisites and must not be published.

## Reviewed family6 correction

Choices9/10 and23/24 now switch sequential solid palette colors through one moving boundary, rather than displaying many palette bands at once. The opposite wipe directions preserve their distinct choice meanings. Added regression checks limit every sampled foreground stage to two adjacent palette colors, verify one boundary and both directions, and inspect actual encoded GIF interiors. Runtime control/palette data remains unchanged.
