# Native BanlanX output groups — unpublished integration

The source-backed Groups tab contains local groups of the SP608E's eight outputs, not groups of Bluetooth devices. It retains the original vertical wave cards, separate ON/OFF actions, maximum ten records, channel selection, naming, and context actions Rename group / Channels / Remove. Remove deletes only the local matching group record; it sends no device reset or group-definition packet.

## Source and storage

Source contract: `native-recovery/next-banlanx/groups-screen/FINDINGS.md` and its hashed AOT excerpts (private engineering evidence, outside this repository). The independently reviewed isolated component is preserved in `groups-implementation` with its original manifest; this integrated copy adds the app adapter and scoped revision tracking without rewriting that frozen artifact.

Native SQLite `sp_channel_group` is represented by the versioned local key `smartease-native-banlanx-groups-v1`. Exact browser BLE identity and group ID0–9 scope records; whole-cart `settings.groups` is neither migrated nor modified. Unknown JSON metadata is retained. Invalid/future/oversized stores remain unchanged and unavailable. The browser imposes a 1MiB UTF-8 limit and atomic single-key writes; backup import validates all entries before applying them and uses the existing rollback mechanism.

The later shared-name trace supersedes the isolated component's earlier trim/nonempty adaptation: create forwards raw dialog text at11d3748→11d3770 and stores it at11d37f0; rename trims via603448 at11d3e14, then stores atc831ec without a second empty check. Integrated storage therefore accepts previously persisted empty names and raw spaces, with no migration. The original frozen25-test isolated artifact remains historical, not the current integrated implementation.

## Routing and command guards

The explicit route `native/sp608e/group-control/<group ID>/<encoded exact device identity>` resolves the current stored membership and name. Single-channel and ALL routes remain unchanged. A group card opens only after an explicit current-session read proves every member ON; nonmembers do not affect admission. Deep links select no output unless the identity and current record resolve; the control view still requires fresh readback and parked consent before commands.

Group ON/OFF emits opcode82 with the current subset mask and boolean; it needs no prior ON proof and never changes displayed readback optimistically. Control uses the existing Solid/Effects implementation, current first-selected brightness, explicit authored versus reported-wire domains, and per-output calibration exactly once. Mode and Effects controls retain their existing source opcode behavior.

Every dispatch rechecks identity, transport generation, route, consent, membership/name and local record revision. Queued work is canceled by route changes, observed malformed storage, reconnect, or local record edits/removal/recreation. An in-memory per-record revision catches local remove/recreate and edit/revert cycles. Storage-event payloads are also validated: an observed changed, cleared or malformed snapshot revokes affected authority even when current storage was restored before event delivery. Unrelated-device event changes leave queued controller authority for this record valid. Any relevant library storage event cancels idle local edit/context dialogs and long-press gestures as a conservative browser adaptation, even if another device was edited. This is not cross-tab transactional storage and cannot detect arbitrary unobserved external ABA edits. Unrelated-device edits do not invalidate the current group's command.

## Fidelity limits

This is not a rendered/iOS or physical acceptance result. Browser consent/readback safety controls, JSON storage, exact BLE-ID scoping, focus/keyboard support and quotas are adaptations. Exact original popup geometry, all text/button offsets, tablet branching and Flutter grapheme/IME formatting remain unresolved. Source name flow now preserves raw1–15-unit input on create and trims accepted rename input once, allowing persisted empty names; existing stored names are not rewritten. UTF-16 limits remain a browser approximation of unresolved Flutter grapheme/IME formatting, and centered modal layout is not exact pixel proof. Timers and Triggers remain separate unfinished bodies. No automatic BLE action or actual agent device operation is performed by these tests.
