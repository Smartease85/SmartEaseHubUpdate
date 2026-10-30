# Dynamic Text shared GIF generation + wire — explicit corrected stage v2

**Supersedes the blocked direct-raster wire artifact, not a silent edit.** `../dynamic-wire-implementation` remains frozen historical evidence. `../dynamic-text-implementation`32-test editor/model package also remains unchanged, but its original pre-GIF preview is not the authoritative generated-GIF preview: use this stage's shared renderer. Independent review correctly identified omitted GIF quantization and integer-centisecond delay conversion. No main or device changes.

## Pipeline/API

`SmartEaseUXDynamicGeneration.create({effects,masks,loaders}).generate(draft,{isCurrent,signal})`: immutable semantic snapshot → existing original binary-font/emoji preparation → new alpha-corrected effects → in-memory GIF89a (quality1 NeuQuant per frame, original variable-delay overload) → source-Glide-behavior decoder → decoded RGB/delays. No local files, picker, export, catalog or transport. No persisted image path, cache key or prepared raster is consumed.

`SmartEaseUXDynamicGeneration.renderer({effects,masks,isCurrent,signal})`: renderer interface for unchanged cleared editor (`tokenize`, async `render(draft,loaders)`). Its required `isCurrent(capturedDraft)` must check active owner/route/revision or compare the captured draft with the active editor snapshot; it is checked at original resource boundaries. The editor also retains its own epoch/revision result checks. Returned pixels and cadence are **post-GIF**, same as wire; no stale prepared cache is emitted. Semantic Save/reopen remains unchanged.

`SmartEaseUXDynamicWire.create({effects,masks,loaders}).compile(record,{isCurrent,signal})`: immutable decode → shared generation → source animation03 layer0 plus optional original frame04 layer1. Mandatory guard before/after every async resource await, preparation, generation, encode/decode and final return. Host rechecks before transport. All input records/unknown metadata stay untouched. Injected effects/masks/loaders are trusted pinned application dependencies, never project content. Immutable mask and loader-result copies prevent later caller mutation.

The return has format smartease-dynamic-wire, **version2**, bytes/contents/frameCount/delays, hardwareVerified:false and explicit fidelity. Bytes are a raw one-program body; existing reviewed selected-Send planner owns playlist order/repeat/count, compression/CRC/chunk/envelope and owner authorization. No outer framing is invented here.

## Exact source closure

- `clock-contract/DptLoadImage.java:1133–1170`: prepares source centered pages, builds effects, calls variable-delay GifUtils overload, previews the generated file through Glide.
- `animation-media-contract/source/GifUtils.java:156–180`: setSize, repeat0, quality1, loop setDelay(list[i]) then addFrame, finish.
- `AnimatedGifEncoder.java:34–36`: delay integer division by10; :227–253 extracts **straight** RGB from Bitmap.getPixels, ignores alpha. Matching96×16 skips RGB565 mismatch conversion.
- `clock-contract/DptLoadImage.java:870–888,975–1001`: wire reopens generated GIF, iterates all source frames, uses max(decodedDelay,20).
- `GifHeaderParser.java` readGraphicControlExt: centiseconds<2 become10, then×10 milliseconds. Valid Dynamic author speed50–1000 means this special minimum does not affect normal effects. Default requested203 becomes decoded200;2000 stay stays2000. Speed999 becomes990. Native draft still stores203; never rewrite semantic speed to200.
- `program-send-plan-animation03-implementation/source/CoolledUXUtils.java:5089–5110`: dynamic foreground is decoded03 animation; source showHeight14 maps16; preserves decoded variable delays; original frame appended last.
- SourceProgram and TextWire reuse reviewed rectangle, RGB transfer, inclusiveBE32 content length, BE16 count/delays and all20 frame tables. Whole-program count is1/2, not arbitrary persisted contentCount.

## Adaptations to reviewed media ports

Local copies only, original files unchanged. `gif-encoder.js` changes uniform delayMs to required matching delays array, uses delays[i] per frame (the exact source overload), and raises existing browser-only40frame cap to52. Quantize/NeuQuant quality1, LZW and all GIF header/local-table logic otherwise unchanged. Decoder changes only retained-frame limit40→52 and global name; it throws on unexpected truncation in this pipeline. Native source has no40frame cap here.52 is floor of the160000 raw body allocation bound, **not a native/device maximum**. Exact SourceProgram check includes frame overlay overhead; oversize rejects before any returned send bytes. GIF has separate existing8MiB/16Mpixel work bounds.

`dynamic-effects.js` copies the frozen source-math effects and changes Zoom0/Flip3 transparent-canvas output to straightRGB. Rotate1/FlyIn2/Bounce7 explicitly draw black; retain black compositing. Original mask source-over arithmetic remains valid for all28 exact black-alpha resources. See ALPHA.md for source addresses and counterexample rationale. Do not restore blanket premultiplied preview RGB before the encoder.

**Remaining platform distinction:** this closes GIF palette/delay and alpha-boundary semantics in the source port, not executed Android pixel identity. Intermediate ARGB8888 premultiplication/rounding, Skia resampling/antialiasing/trig remain source-math approximations explicitly labeled. No physical/iOS equivalence claimed. Backgrounds still unsupported; verified firmware≥10 and target resampling remain separate gates. Unsupported Android shaping rejects without changing the saved record. Imported explicit14px rectangles remain outside the cleared96×16 model; auto-frame14px glyphs correctly become16px pages.

## Validation

`node --test tests.cjs`:27 tests including36 all-nine-mode combinations, all20 frame palettes, stale forged-cache immunity, source frame geometry, immutable async snapshot, font/emoji cancellation, oversize and background/shaping gates, variable delays,52frame nontruncation, shared preview/wire equality, browser UMD path, alpha correction, and the reviewer's old Zoom fixture (16RGB changes /9finalRGB444 changes after palette roundtrip; default203→200).

`node generate-fixtures.cjs && python reference.py`:36 local GIF files. Python Pillow independently decodes each actual GIF and compares every RGB pixel and duration to the port decoder; independent Python protocol composition hashes match every output. Fixture frames are **post-GIF decoded**. This is an independent decoder/composition oracle, not an independent Android effect rasterizer or APK execution oracle.

## Main integration prerequisites (not applied)

1. Keep cleared model/editor/preparation/assets and schema validation. Add this stage's new effects, GIF encoder/decoder and generation; do not load the blocked v1 direct-raster compiler or old preview renderer as authoritative.
2. Load order: original Text model/renderer → Dynamic model/preparation → corrected effects → DynamicGifEncoder/Decoder → DynamicGeneration. SourceCodec→SourceProgram and reviewed TextWire precede DynamicWire. Effects global remains SmartEaseUXDynamicEffects; host must load only the corrected file.
3. Inject shared generation renderer into editor with required active owner/route/draft guard; use original lifecycle cancellation and guarded atomic Save. Known-kind schema preserves opaque unknown records; no migration of arbitrary old14px structures.
4. Selected-Send builds fresh immutable selected-record plan using this compiler. Reject whole plan on unsupported/oversize; recheck selection/profile/session at each asynchronous stage and before transport. Fixed-owner orientation remains unchanged. No prepared or compiled output imported from persistence may bypass fresh generation.
5. Retest actual host-linked CSS/viewport/focus, Save/reload/cancel and mixed-program wire ordering before main clearance. Physical actions remain separately owner-controlled.
