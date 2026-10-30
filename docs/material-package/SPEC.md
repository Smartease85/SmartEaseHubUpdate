# SMUXPKG1 v1 — bounded private material package

One `.smartease-scenes` file, no ZIP or manual unpacking. Generic container only: no implicit program restore, persistent write, network request, renderer or BLE command. Original provider bytes belong only in the private owner package; public source/tests contain no vendor art.

## Framing and limits
8ASCII bytes `SMUXPKG1`;4-byte unsigned big-endian manifest UTF8 byte length; strict UTF8 JSON; contiguous raw assets. Asset offsets start at raw-payload byte0. Require exact end: no overlap, gaps, trailing package bytes or compression. Raw asset may legitimately contain bytes after its internal GIF terminator if reviewed codec accepts them; container hashes/preserves the entire original asset.

File≤256MiB, JSON≤4MiB, individual asset≤8MiB,1–4096items/assets,1–256categories. JSON parse≤16nested levels/100000nodes. All offsets/lengths safe integers. Category/item/asset arrays nonempty. Unknown fields rejected, not discarded. Duplicate JSON keys and unsafe prototype keys rejected. Source labels are plain text, not HTML; consumers must use textContent.

## Exact schema
Root `{format:'SMUXPKG1',version:1,categories,items,assets,provenance?}`.
- Category `{id,label,domain,itemIds}`. domain `program96x16` or `pattern16x16`. Ordered itemIds; categories preserve source order.
- Item `{id,label,categoryId,assetId}`. Items flattened in category/item order. Every item occurs exactly once in its declared category. Equal labels allowed; immutable IDs remain distinct.
- Asset `{id,sha256,offset,length,domain,mediaType,width,height}`. id===sha256,64lowercasehex. domain matches every referring category; width96 or16 respectively,height16. mediaType `image/gif` or `application/x-coolled-dpt`. Every asset referenced. Asset order defines contiguous offsets. Equal hashes deduplicate raw content, not logical items. Conflicting geometry/domain/mediaType for one hash rejected.
- Optional provenance exact `{provider,sourceModel,retrievedAt,sourceCatalogHashes}`: nonempty strings≤128UTF16units,1–256unique canonical SHA256 strings. Informational only, never used to fetch URLs or authorize access.

IDs≤256ASCII `[A-Za-z0-9][A-Za-z0-9_.:-]*`, no`..`, slash/backslash or reserved prototype words. Names/labels≤256UTF16units, no controls/lone surrogates. Categories and item IDs unique within type. No file paths or provider URLs in package schema. Python input source descriptors contain explicit caller-local paths, but those are never serialized into package.

## Stable identity
Canonical manifest is recursive lexicographic object-key order, arrays unchanged, no whitespace, JSON string escaping with raw valid Unicode. Schema numbers are integers. `packId=SHA256(UTF8(canonicalManifest))`; binds all ordered metadata and asset hashes independent of incoming JSON whitespace/key order. Python writer emits these canonical bytes. Original input JSON may have different formatting; browser exports canonicalized equivalent metadata. No unknown field roundtrip: reject unknown fields. Original binary asset bytes retained exactly.

## Browser API (`material-package.js`)
`open(file,{hash,validateAsset,isCancelled})` returns `{manifest,canonicalManifest,packId,assets}`. File must be actual Blob/File; intrinsic size/slice/arrayBuffer used. Required hash callback returns canonical SHA256. Required asynchronous validateAsset(bytes,asset) must decode/validate the media/domain/dimensions and return exactlytrue; no validation implied by filename. `isCancelled()` optional, defaultsfalse.

`for await (const {asset,bytes} of opened.assets())` reads one bounded slice at a time, hashes, validates, rehashes to reject codec mutation, then yields. Immutable metadata. Checks cancellation before/after asynchronous boundaries and after yields. Iterator single-consumption. Full structure/total file length validated before asset yield; later bad hash/codec/cancel can still fail. **Consumer must stage transactionally and commit only after full iterator completion**, aborting on failure. Container performs no persistence or quota calls.

`exportPackage(manifest,{getAsset,hash,validateAsset,isCancelled})` returns `{manifest,canonicalManifest,packId,size,chunks}`. getAsset(id,asset) returns an individual Blob from private storage. `chunks()` single-consumption async iterator yields12-byte header,canonicalmanifest bytes,then each verified asset. The generator never accumulates the whole file. Phone download integration can assemble a Blob where supported or stream; that UI memory/retention policy is separate and must respect the256MiB ceiling. No Program snapshots in phase1.

Both callbacks are explicit caller-owned services; they must not fetch remote assets or issue device writes. Module itself does neither. Cancellation remains independent of IDB quota/commit logic.

## Python writer
`write_package(destination,categories,items,sources,provenance=None)`.
`sources` maps a logical source key to exact `{path,domain,mediaType,width,height}`. Item.assetId initially references that source key. Writer hashes/caps each local source, deduplicates hashes and remaps output items. It validates schema, creates temporary output in destination directory, streams sources in1MiB chunks, rehashes while writing to catch changed sources, flushes, then atomically replaces destination. Failure removes temporary file and preserves prior destination. It does not decode assets: caller's reviewed codec checks must precede packaging.

CLI: `python material_package.py local-descriptor.json destination.smartease-scenes`, where descriptor exact `{categories,items,sources,provenance?}`. Explicit destination separate from manifest. Synthetic tests only, no private source paths in public fixtures.

## Validation status
46/46 focused tests passed (`focused-final.log`), including Python→JS canonical cross-language output/dedupe, JS streaming export roundtrip, strict malformed/duplicate/prototype/UTF8/offset/overflow/geometry/order checks, hash/codec failures, codec mutation, cancellation, slice-only reads, source-change rollback and preservation of destination on rejected input. Not integrated into app, not browser-rendered or phone memory tested; independent review pending.
