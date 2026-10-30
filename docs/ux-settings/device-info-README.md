# CoolLEDUX1f read-only response foundation — isolated v1

No main edits, device/network operations, asynchronous I/O, timers, automatic reads, synchronization, OTA, config lookup, broadcasts or persistence. This package cannot send bytes. Source contract SHA256 `d3aa92a744d1a126ef80cd4f1b6dbb6c4aeebd317419492139bd34c89e293f1a`; official Android2.7.6 source. Synthetic fixtures are not owner-device captures.

## API

`REQUEST`: immutable exact source request **01 00 02 05 1f 03**. Frame is01 + escaped(lengthBE16 + payload1f) +03; no CRC. Escapes map interior01/02/03→02,byteXOR04. The packet has no request ID or status field.

`parsePayload(bytes)`: pure strict bounded decoded-payload model, command at offset0. Only dense byte arrays/Uint8Array; no accessors, sparse holes, coercion or oversized allocations. Returns a frozen copy. It does not accept framed bytes; pending-session helper performs framing.

`createSession({deviceId,generation,source})`: in-memory bookkeeping for a **future explicit owner read**, scoped to exact device ID, nonnegative safe-integer connection generation, and notification-source object identity (e.g. the specific characteristic object, not just common UUID). Caller must provide actual adapter context, not imported project data. No field here authorizes hardware access.

1. `begin({current,ownerConfirmed:true})` returns `{ticket,request,identity}`. Intent is an attestation from a future owner UI, not permission granted by this library. Only one pending read. No write is performed.
2. `arm(ticket,current)` makes response acceptance possible at the future host's explicit request-dispatch boundary. Before this, notifications are unarmed/unsolicited and cannot produce measurements. Host owns transport, subscription, exclusive lease, request handoff and timeout.
3. `receive({ticket,current,bytes})` incrementally parses bounded notification chunks. Exact connection/source/current ticket required. It returns snapshots; never calls external handlers. Matching1f is accepted once. Other decoded commands are ignored without invoking their native side effects. A complete candidate followed by a partial coalesced tail is held until the tail validates; malformed tail/duplicate1f in that pending buffer discards the whole candidate.
4. `finish(ticket,current)` ends the caller-defined receive window with explicit missing/truncated failure. `cancel(ticket)` drops buffered/candidate data. Neither creates a timer. Late replies cannot revive a cancelled/completed read. New explicit same-session read gets a new ticket. Identity/generation/source mismatch during a pending read permanently invalidates that helper and clears its retained observations; a reconnect needs a new helper.

The protocol has **no wire transaction identifier/authentication**. An old same-source1f arriving after a later request has been armed cannot be distinguished from that request's reply by packet contents alone. Local tickets reject late host callbacks; they do not authenticate device packets. Future host must serialize reads, route actual notification origin correctly, and use a bounded explicit receive window. Do not claim cryptographic/causal correlation, or treat a UUID alone as device identity.

## Known fields versus defaults

Every ordinary field reports `known`, `value`, `raw`, `provenance` and reason. Valid booleans are only0/1; other bytes are **unknown**, not truthy. Brightness/rotation/micMode are raw unsigned reported values (e.g. rotation255 is observed but has no established UI mode). Do not clamp or call it mode3. Settings authoring range5..255 is separate from a reported brightness0.

Unknown/absent source-retained settings can inherit only the helper's own prior accepted same-source/session observations. Such values say `same-session-previous` and retain `observedTicket`; they are not claimed freshly reported. External previous metadata is not accepted. Missing micMode remains unknown despite native event default0. Auxiliary warmup/volume can retain same-session evidence, but this does not establish fitness-feature availability.

- `capacity`: offset8.1..99 is reported (`known/measured:true`); absent/0/>99 yields value9 with `known/measured:false`, provenance `source-fallback`. This is maximum-program capacity, **not the installed-program count**. “Measured” means observed in a validated reply, not physically verified capacity.
- `logicalPacketMax`: only an accepted newer extension candidate suppliesBE16.1..4096 is reported; invalid/missing→1024 source fallback with knownfalse. **Not ATT MTU or negotiated BLE write size.** This stage does not raise the current transport planner's tested package-size bound or change fragmentation.
- timerMax/devType/developerFlag/startup are diagnostics only, as in the source handler. Opaque bytes remain available in the immutable full payload, never labeled MAC/version/geometry without evidence.
- `notEstablished`: capabilityVersion, pixelDimensions, installedProgramCount, configDeviceName, OTA version, ATT MTU.1f cannot unlock Dynamic backgrounds. Context `identity.deviceId` is the caller's association ID, not a panel ID read from1f.

Short source replies, including command-only1f, are accepted as bounded command frames with missing fields unknown and explicit fallbacks. A `complete` transaction means the frame completed; **not** that all settings/capabilities were reported or success status existed. Future UI must inspect field knowledge/provenance, not display invented measured defaults. Native code itself has no minimum-success schema/status byte.

## Exact source offset/cursor evidence

`device-info-contract/source/DeviceManager-fallback.java:11835–12298`, labelsL1768–L1b6d; original DeviceManager3365–3509:

|Offset|Meaning|
|---|---|
|1|switch boolean|
|2|brightness rawbyte|
|3|rotation rawbyte|
|4,5,6|mic supported/on/mode|
|7|show-device-ID boolean, not the actual ID|
|8|maximum program capacity|
|9|remote enabled boolean|
|10,11|timerMax/devType diagnostics|
|12..17|opaque/skipped|
|18 when present|developerFlag diagnostic|

Fallback11948–12170 labelsL1885–L1a7e closes the optional extension. With n bytes: a=16 if n>15 else n; b=a+2 if n>a+1 else n; p=b+1. Newer candidate if n>b+9: L=byte[b+9], tail=b+10+L; acceptL≤20 and n>tail+3, packetBE16[b+1,b+2], p=tail. Otherwise legacy candidate if n>p+6: L=byte[p+6], tail=p+7+L; acceptsame length/tail conditions, p=tail; no packet max. Then optional startup1byte, warmup only when2bytes remain, then optional volume. Source quirk retained: if only one byte remains after startup, warmup is absent and that byte is volume, not guessed partial warmup. Invalid candidate falls through to direct p; raw bytes remain preserved. No variant identity invented from devType/name.

Capacity normalization1049–1100 and packet fallback12100–12115 distinguish source defaults. Byteorder is big-endian for payload warmup/packet values. Skipped extension length byte is unsigned; source negative check is redundant.

## Stricter browser safety, not falsely attributed to native

Uses the existing reviewed `ux-source-codec.js` streamParser/decodeFrame, copied unchanged and pinned. Maintains split-frame buffer, processes coalesced frames, validates declaredBE16 length and allowed escapes, refuses garbage/nested framing, and never scans each notification independently. Adds dense-byte validation around the codec (its internal byte helper is not public). Explicit browser limits:256 payload bytes,518 worst-case escaped frame bytes,8192 bytes per supplied chunk,64 unrelated commands in one pending read. These are bounded implementation limits, **not device/native maxima**. Oversize/truncated/malformed input fails the pending read with no partially committed settings. No resynchronization by silently discarding garbage.

Native `LightUtils341–405` does per-notification unsafe scanning, ignores declared length, and drops incomplete frames. Native1f completion automatically posts clock sync then schedulesfd OTA query; native event handler can clear queues/enable all devices. None of those behaviors is copied.

## Offline tests

`node --test tests.cjs` —23 tests: exact request, fields/defaults, short prefixes, all valid extension lengths/bounds, split at every byte, bytewise escapes/coalesced frames, malformed/truncated/oversize/accessor input, duplicate reply, unarmed/unsolicited, stale identity/generation/source/ticket, cancel, previous observation provenance, immutable results, browser UMD/no side-effect APIs.

`python reference.py` regenerates264 independent synthetic offset/cursor vectors. Tests compare model outputs and pass each payload through the framed pending parser. These are static arithmetic fixtures; no Android execution or owner-device response claim.

## Independent review correction

Previous8file manifest c67420ac… superseded after a JS API bounds defect: Array.from(Uint8Array) could execute a caller iterator and exceed the already-checked length. Byte-view copies now use captured intrinsic TypedArray length/type getters plus bounded indexed reads. Caller Symbol.iterator and shadow length are never evaluated; Uint8Array proxies, DataView and non-byte views reject. Regression covers oversized/shadowed/iterator-altered views in pure model and framed receiver. This is API hardening, not a device-wire code-execution claim.
