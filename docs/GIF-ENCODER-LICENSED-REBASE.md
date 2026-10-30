# GIF encoder licensed-source rebase — isolated candidate

Prepared 2026-10-30; integrated after independent isolated review. Original private v47 remains a historical reference. Public source inputs and deterministic generator are under `tools/licensed-gif-encoder/`. Running its `build.py` generates the two modules in that directory; compare them to the root production modules before adopting any regeneration. No APK input is used.

## New source basis, not retroactive attribution

The former small implementations were authored from decompiled APK classes. This candidate **replaces their quantizer and compressor bodies** with auditable, pinned public source, rather than adding license headers to those old bodies. `build.py` reads only the checked/hash-verified public upstream files and the newly authored API adapter. It never reads the APK, decompiled files or former JS implementation. The former authored implementation is used solely as a private regression oracle in the test harness.

New derivation:

- gif.js `92d27a02841339e202c75150dcf6fe5f4fa42ec5`: [NeuQuant.js](https://github.com/jnordberg/gif.js/blob/92d27a02841339e202c75150dcf6fe5f4fa42ec5/src/NeuQuant.js), [LZWEncoder.js](https://github.com/jnordberg/gif.js/blob/92d27a02841339e202c75150dcf6fe5f4fa42ec5/src/LZWEncoder.js), [MIT license](https://github.com/jnordberg/gif.js/blob/92d27a02841339e202c75150dcf6fe5f4fa42ec5/LICENSE).
- Glide `51725a9b86dda94fd988e4bffb461ad97e34fedc`: [NeuQuant.java](https://github.com/bumptech/glide/blob/51725a9b86dda94fd988e4bffb461ad97e34fedc/third_party/gif_encoder/src/main/java/com/bumptech/glide/gifencoder/NeuQuant.java) for Java integer semantics and neighbor lower bound; [exact class-specific notices](https://github.com/bumptech/glide/blob/51725a9b86dda94fd988e4bffb461ad97e34fedc/third_party/gif_encoder/LICENSE).

`upstream/source-manifest.json` records the actual archived inputs, pinned URLs and SHA-256. Both generated browser files contain the entire MIT notice, complete preserved NeuQuant/Dekker source header, upstream LZW author acknowledgements, and the complete Glide class-notice file. The latter retains its original combined format even though only its NeuQuant source is adapted here. This is evidence of this candidate's actual source basis, not a claim that those notices cover unrelated APK code, artwork, fonts or the original translation. No legal opinion or general release approval is offered.

## Exhaustive transformations of public algorithm sources

`build.py` is the reproducible executable transformation specification. The privately retained `NeuQuant-public-source.patch` and `LZWEncoder-public-source.patch` show all textual changes from the pinned public sources, including wrapping.

NeuQuant retains upstream initialization, contest, selection-sort indexing, lookup tie order, color map and training structure. Changes:

1. Replace `~~v` in `toInt` with `Math.trunc(v)`: explicit Java division truncation for the bounded integer range used here.
2. `alterneigh` lower bound becomes `Math.max(i - radius, -1)` instead of upstream JS `Math.abs(i - radius)`; directly corresponds to Java lines 410–414.
3. Truncate division before subtraction in all three `altersingle` channels and all six `alterneigh` channel statements. Java `int / int` is truncated before the compound assignment.
4. Both `radpower` statements truncate the inner quotient **before** multiplying by alpha, matching Java lines 254–255 and 298–299.
5. Truncate alpha/alphadec and radius/radiusdec before subtraction, matching Java lines 293–294.
6. Replace CommonJS export with return inside a local IIFE, preserving file-level constants privately. Original comments remain; the adapter intentionally supplies BGR despite upstream generic RGB-facing documentation, then reverses palette channels to RGB.

LZW retains upstream 5003-slot hash/collision probing, code assignment, code width growth, clears, bit packing, 254-byte blocks and output sequence. Changes:

1. Initialize `cur_accum` to zero and explicitly declare `n_bits`, `remaining`, `curPixel` within the instance. These were implicit globals in the pinned JS source; the candidate uses strict mode and cannot leak state between instances.
2. Replace CommonJS export with return inside a local IIFE.

No former Map-based LZW or compact APK-derived quantization function remains in the generated files. Both generated modules embed identical algorithm bodies, allowing the existing script load order to remain unchanged and adding no separate dependency or network request.

## Authored API/framing adapter

`adapter.js.in` is newly written glue from the existing public-facing module contract. It validates/copies 96×16 integer RGB/ARGB pixels, strips alpha, packs BGR, calls sample-factor-1 NeuQuant, reverses palette bytes, and writes fixed GIF89a framing with loop zero, no transparency/disposal flags, global first palette, local later palettes, and floor(ms/10) centisecond delays.

Animation retains `SmartEaseUXGifEncoder`, 40 frames, `encode(frames,{delayMs})`; dynamic retains `SmartEaseUXDynamicGifEncoder`, 52 frames, `encode(frames,{delays})`. Both retain CommonJS, frozen exports, `quantize`, `lzw`, WIDTH/HEIGHT/MAX_FRAMES and copied Uint8Array output. Error strings for existing frame bounds and explicit delays remain compatible. No DOM, file, sharing, BLE or network behavior is introduced. The Glide GIF wrapper was not adopted: its rounding and transparency behavior would violate this API.

## Verification and output differences

Current public reproducibility commands, from repository root:

```sh
python3 tools/licensed-gif-encoder/build.py
cmp tools/licensed-gif-encoder/native-coolled-animation-gif-encoder.js native-coolled-animation-gif-encoder.js
cmp tools/licensed-gif-encoder/native-coolled-dynamic-gif-encoder.js native-coolled-dynamic-gif-encoder.js
node --test tests/licensed-gif-encoder.test.cjs
npm test
```

The portable public test uses its own GIF/LZW parser and covers framing, notices,
alpha, bounds and VM isolation. It requires only Node, not private reference code
or Pillow. The generator needs Python's standard library only. Generated comparison
files under `tools/` are build outputs, not extra browser dependencies.

### Historical private isolated validation (not public test prerequisites)

The following results were obtained before integration using separately preserved
private staging harnesses. Their paths are evidence references, not files required
by this public checkout.

Six focused tests pass (`evidence/tests.tap`):
- 31 fixed/gradient/checkerboard/seeded-random frames: byte-identical palettes and indices against the former authored JS; all 155 single-frame GIF comparisons (five delay values each) and one 31-frame variable-delay GIF are byte-identical.
- An independently authored GIF/LZW parser decodes long random streams of 61,440 and 79,872 indices, verifies widths 9,10,11,12 and multiple dictionary clears; literal/repeated/tiny streams also pass.
- Independent framing checks verify palette selection/order, block size ≤254, dimensions, timing floor, loop zero and no transparency/disposal flags.
- Existing Pillow 13.0.0 independently decodes five distinct frames and checks every RGB byte against quantized palette/index expansion, delays, dimensions, loop and opaque alpha (`evidence/output.gif`, `pillow.txt`).
- Bounds, malformed inputs, alpha stripping, nonmutation, maximum 40/52-frame containers, and both browser UMD globals in isolated VM contexts, including no leaked LZW globals.

The private isolated harness redirected the two CommonJS encoder paths to the
staged replacements while the historical baseline remained unchanged. It ran the
Animation export/media and Dynamic wire integration suites.

57/57 pass (`evidence/integration.tap`). Initial integration exposed a dynamic frame-bound error-message regression; the adapter now preserves that string, and all tests were rerun. Some existing integration tests inspect/read browser scripts directly from main rather than using CommonJS; those portions are not evidence of a fully integrated browser build. The focused UMD checks exercise candidate scripts directly.

Observed encoding output differences: **none within the stated corpus**. This does not prove equivalence for every RGB sequence. No Java binary, APK runtime or APK-produced fixture was executed, and no native-device parity claim is made. File size increases to about 24KB each because readable upstream bodies and notices are embedded. No new runtime dependency is needed.

## Integration checklist / exact scope

Production runtime replacements: only `native-coolled-animation-gif-encoder.js` and `native-coolled-dynamic-gif-encoder.js`. Include this provenance document and retained upstream notices with the reviewed source inventory. The generator, source snapshots and focused tests are reproducibility/review material; they need not be served to browser clients.

Before public source publication, review the two upstream diffs and generated candidate hashes, update the former `docs/ANIMATION-GIF-ENCODER-PROVENANCE.md` to mark it historical/superseded for these two modules, preserve the private backup, then run the assembled app's normal final tests. No unrelated asset provenance is closed by this change. This staging report does not authorize upload or publication.
