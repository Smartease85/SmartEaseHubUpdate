# Identity-preserving licensed-source emoji artwork rebase

## Scope and approval boundary

This is the isolated candidate for the authorized artwork rework, not a claim of original-APK pixel fidelity or whole-app release clearance. All **488 token IDs, order, category membership, sourceIds (including gaps), 1,464 resource names, three geometries, thumbnail filenames and 39 tab-state filenames are retained**. Saved references retain their identity; rendered artwork intentionally changes. No saved records are rewritten or deleted.

Payload contains 1,464 arrays in the existing bundle, 488 100×100 PNG thumbnails and 39 72×72 category tabs. The emoji loader implementation is unchanged except its inaccurate opening artwork-provenance comment. The two updated tests switch their artwork-hash assertions/fixture imports to explicitly identified replacement hashes. The complete1,992-entry runtime manifest gate (catalog+527PNGs+1,464pixel arrays), original XML token-order gate, and all existing concurrency, mutation-copy, security/schema, retry, clear-race and token-case tests remain intact. Both former original-art fixtures are retained, not overwritten. The unchanged catalog.json is included byte-for-byte.

## Source selection and mapping

Sources are pinned to Noto Emoji **v2.047**, commit **22e564626297b4df0a40570ad81d6c05cc7c38bd**. `emoji-semantic-map.json` explicitly records each visible original's reviewed meaning, Unicode sequence where applicable, selected source path/blob, confidence, transformation and reason. The assignments were made by looking at the original images, **not by treating category-local sourceIds or token ordinals as Unicode**. All 13 original and replacement sheets were reviewed, including an independent second-eye semantic pass.

Final source allocation: **409 token uses of explicitly licensed Noto SVGs, 74 token uses of Noto region-flag PNGs, and 5 independently authored geometric images**. Duplicate original thumbs-up choices `06_011` and `06_012` intentionally share semantic artwork but remain distinct identities. No generic replacement fills unmatched slots.

Review corrections made before freeze:
- `01_024` confirmed U+1F619 kissing face with smiling eyes; `01_034` confirmed U+1F629 weary face.
- `13_029` uses the specific woman/man kissing sequence, not the generic kissing-couple asset.
- `05_033` is two men holding hands, not bunny-ear dancers.
- `06_023` is a leftwards hand, not a rightwards hand.
- `02_022` uses the same horizontal traffic-light source with an explicitly recorded horizontal mirror to preserve the original red-left/green-right ordering.
- `02_010` is a red circular X/no-stopping motif with no exact Unicode equivalent; an independently drawn red ring and X retains this distinct choice instead of substituting a slash-prohibition sign.

There are no remaining unassigned or medium-confidence semantic entries after the independent review. This is engineering review, not a claim of infallible interpretation or unchanged microscopic detail at 12 pixels.

## Exact image license boundary

### Non-flag images

The selected non-flag inputs come from [the pinned svg directory](https://github.com/googlefonts/noto-emoji/tree/22e564626297b4df0a40570ad81d6c05cc7c38bd/svg), whose [specific LICENSE](https://github.com/googlefonts/noto-emoji/blob/22e564626297b4df0a40570ad81d6c05cc7c38bd/svg/LICENSE) states Google copyright and Apache License 2.0. The full notice, pinned Noto AUTHORS credits (including SVG cleanup authorship), and full Apache 2.0 text are included in `licenses/noto-emoji/`.

The pinned repository's root `LICENSE` is OFL for font software, despite README wording linking it while describing most image resources as Apache. Therefore this rebase **does not infer a blanket license for the ordinary png directory**: those discovery PNGs are not used in the payload. Instead it renders the explicitly noticed SVG inputs. No Noto font file or external font is used; the selected SVGs contain no text elements. No NOTICE file was present in the pinned repository tree; applicable source notices and authorship files are retained.

### Region flags

74 flag images come from the pinned [`third_party/region-flags/png`](https://github.com/googlefonts/noto-emoji/tree/22e564626297b4df0a40570ad81d6c05cc7c38bd/third_party/region-flags/png) directory, not under an assumed Apache license. Its full [LICENSE](https://github.com/googlefonts/noto-emoji/blob/22e564626297b4df0a40570ad81d6c05cc7c38bd/third_party/region-flags/LICENSE), AUTHORS, README and source-version notice accompany the output. The upstream notice describes public-domain or copyright-exempt sourcing **with qualifications**; it is not an unrestricted worldwide-use warranty. National-symbol/insignia and other non-copyright restrictions may still apply. This work makes no legal conclusion about those restrictions.

The four selected exception flags **Kazakhstan, Mexico, Malaysia and Serbia** are **not imported from those uncertain upstream PNGs**. Each uses newly authored geometric flag/emblem artwork. Malaysia preserves 14 stripes, a crescent and 14-point star; Kazakhstan preserves turquoise field, sun/eagle and left ornament; Mexico preserves the tricolor and a simplified eagle/serpent/cactus/wreath emblem; Serbia preserves the tricolor, crown, double-headed eagle and cross-bearing shield. These are intentionally simplified low-resolution illustrations, not official-specification reproductions. Independent authorship is not a claim that national-symbol use restrictions disappear.

## Rendering and output policy

The offline builder verifies each selected source against the pinned Git tree blob hash and records SHA-256 in `emoji-source-manifest.json`. SVG input is rejected if it contains active script/foreignObject or external/file URLs, then rendered using already-installed Sharp 0.35.5 / librsvg 2.63.2. No new executable/dependency was downloaded or installed. An explicit render manifest binds each intermediate image to its input hash and transformation.

A 256×256 transparent contain-fit intermediate feeds all outputs. Pillow 13 resizes to 100×100 thumbnails and 12/14/16 row-major RGB arrays. Alpha below 128 becomes zero/off. Visible channels are rounded to five-bit steps (clamped at255); otherwise-black visible pixels use 0x010101 to avoid colliding with the zero/off sentinel. Every array has at least one nonzero pixel. Thumbnails preserve full-color transparency and semantic shape rather than showing quantization artifacts; low-resolution review sheets were separately inspected.

The bundle is **1,715,435 characters**, below the existing 2,500,000 limit, with exactly 1,464 bounded integer RGB arrays. The historical wire/loader format string `smartease-original-emoji-pixels`, version1, remains unchanged solely for compatibility; it no longer describes artwork provenance. Zero/off behavior, names and loader API remain unchanged.

All39 category buttons are independently authored line/polygon geometry in the same semantic categories (faces, transport, flags, celebrations, sport, hands, food, animals, plants, signs, objects, weather, miscellaneous). Default/selected/selected_old remain visibly distinct gray/magenta/violet states. No original tab masks/pixels were copied.

## Verification and remaining integration work

- Four asset/source tests pass: exact identity/order/name/geometry preservation, all arrays nonblank/bounded, full thumbnail/tab coverage, state distinctions, and pinned source blob verification.
- All **15 existing emoji-assets/pixel-bundle tests** pass against an isolated overlay using the new bundle and the explicitly updated replacement hash fixture.
- Independent review checked every original/new category sheet, native12/16 spot sheets and all flag/tab sheets. Fine emblem detail necessarily reduces at native resolution; no unintended repeated-placeholder families were found. The only identical native pixel resources across distinct tokens are the two legitimate original thumbs-up choices.
- No APK runtime, physical BLE operation, hardware parity test, publication or main-checkout modification was performed by this stage.

Before integrating: review `emoji-semantic-map.json`, source notices and final hashes; copy only reviewed payload files, run full assembled-app tests and picker/lifecycle/browser review, and refresh the app's cache version as part of the parent release. Original contact sheets, downloaded discovery inputs, private test overlays and review evidence must not be copied into the public app. This change does not establish provenance for any unrelated app assets or source code.
