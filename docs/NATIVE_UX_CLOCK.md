# Native UX16×96 Clock integration

Original source Clock editor now participates in Program Add/Edit/Save/reopen, copy, selection, repeat1–10, ordering, delete, Native export/import and full backup validation. Same library key/version and shared UX16×96 grouping; no per-MAC migration. Text, Graffiti, Animation and unknown future records remain intact. Unsupported records remain preserved rather than interpreted as Clock.

## Source behavior
18 styles in exact order18,1…17; seven colors;24H/12H; source Exit/Save icons. Original previews are single-frame GIFs showing resource time/art, not a live browser clock. Background program content separately preserves original96×16 decoded frames and first original delay. Save yields composite type7 with background2 then clock7. Selected color/hour mode affect saved content, not original static preview pixels. Missing selection opens source Tips/Confirm notice. Source grid helper is permanently single-row: no invented40px vertical row spacing.

Same-style edits preserve existing background snapshot and unknown pixel fields. Changed style rebuilds source pixels and overrides known rendering fields while retaining unrelated combine/item/content metadata. Original input remains immutable. Source erroneous restore by ID−1 is intentionally corrected by actual style ID. Browser long-press threshold500ms/18px and accessibility/layout adaptations are not claimed exact iOS geometry.

## Safety and lifecycle
No automatic SyncTimeEvent: original Android onCreate can clear queues and broadcast to all connected devices. Clock program content can now use the explicit one-off owner admission and shared selected-program uploader; controller time synchronization remains unimplemented. There is no automatic or global SyncTime command. The separate fixed orientation experiment is unchanged. Opening, saving, list edits, backup and navigation send nothing.

Guarded session and schema validation precede atomic local persistence. Back/route/visibility/identity changes invalidate old asynchronous resource/save callbacks. Direct or Forward Clock routes without a new pending session display an inactive-draft notice, never revive stale drafts. Quota/resource/stale-record failures retain unsaved editor state. Existing4MiB/128-record bounds remain; source frame data is not silently truncated.

## Verification and remaining gates
Portable focused tests cover original frame RGBA hashes, model metadata preservation, editor lifecycle, real Program flow, mixed list operations, malformed startup/import/full backup, late background cancellation, route/visibility/reconnect and all cache paths. Linked CSS is tested against actual app CSS, not actual rendered mobile pixels. Original source/asset hashes are in NATIVE_UX_CLOCK_PROVENANCE.json. Independent isolated36-test review preceded integration; main review remains separate.

Still pending: actual mobile visual acceptance and complete type7 wire serialization/physical upload, time synchronization and autonomous retention. No hardware or full1:1 claim. Final usable candidate must be approved HTTPS Bluefy, not localhost. This checkpoint is unpublished.
