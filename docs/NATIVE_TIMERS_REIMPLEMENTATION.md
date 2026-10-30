# LotusLamp X Timing reconstruction

Reimplemented, not recovered identical code. Original Android v5.21.01 structure comes from `TimingFragment.java`, `LEDTiming.java`, and decoded `res/CqA.xml` (`fragment_timing`). Hashes and default English resource values are in NATIVE_TIMERS_PROVENANCE.json.

The screen has Schedule On and Schedule Off sections, enable switches, Time and Repeat rows. Header spacing is 16dp horizontal/25dp vertical; rows 16dp horizontal/20dp vertical. Source `handleTime` lines816–826 and `handleWeek`829–852 update the chosen slot; `showWeek`910–958 renders selected days, Every Day, or Single Time. `applyTimer`996–1040 preserves the ordinary-device paired write semantics.

Browser adaptations explicitly disclosed: standard time input instead of Android scrolling wheel; seven checkbox dialog instead of Compose picker; separate explicit parked/read/Apply consent instead of immediate write on change. No automatic queries, clock synchronization, power or writes. Confirm edits local drafts only; Cancel never submits a constrained form.

Read provenance belongs to this view and identity/generation, not a shared cache. Both current slot revisions and their full values must still match the view's read before Apply. Apply writes the selected slot through existing paired-write adapter, preserving the other returned controller slot (not its unsent draft), then explicitly reads back. Both local drafts and selected slot survive own submission; only confirmed selected-slot draft is cleared. A changed cache blocks Apply. Reconnection/identity change clears view provenance and drafts rather than transferring them.

Back, route exit, hidden/pagehide and identity changes invalidate pending guards synchronously. Late resolution cannot reopen dialogs, restore consent or update the view. No new timer storage or metadata migrations. Timer firing/retention and iOS visual fidelity remain unvalidated.
