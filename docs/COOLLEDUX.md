# CoolLEDUX: separate offline protocol implementation

Owner screenshots identify **CoolLEDUX**, later reported as **CoolLEDUX-31B8**.
This resolves the family to UX, not X. It does not validate a hardware transport.
The original offline CoolLEDX encoder remains separate and is never a UX fallback.

## Implemented and testable without device writes

- Strict family selection: UX, X, U and M are distinct; substrings and ambiguous names fail.
- UX direct command encoder: power `05`, brightness `04`, mirror `0c`, solid fill
  `13 01` with RGB444 transfer, and info-query `1f`. These are prepared bytes only.
- Stored-program encoder: 8-column tiling, Graffiti stills, multi-frame animation,
  per-frame delays, program index/count/show-count fields, custom CRC-32, literal-only
  LZSS, 128-byte data chunks, length fields, XOR and delimiter escaping.
- Bounded, strict offline parsing of captured envelopes and the documented 30-byte
  info reply. Only power and brightness are interpreted. **No dimensions are inferred.**
  Imported info is tagged with the device selected at import, explicitly marked as
  unverified capture provenance, and cleared after every successful new selection.
- Separate `CoolLEDUXAdapter`: actual family-validated metadata GATT connection,
  inspection, offline project/command preparation and captured-report decoding.
  Connected reflects the real link; scene control, firmware saving and pixel upload
  remain disabled. `upload()` always rejects. See [CONNECTIONS.md](CONNECTIONS.md).
- Devices → Devil Eyes → CoolLEDUX preparation: export a plan for the current studio
  document, optionally including proposed brightness/mirror/power, or decode an existing
  device-info capture. Neither action connects, queries or writes to Bluetooth.

## Confidence and constraints

The pinned reference reports hardware tests on **one unrelated 64 × 16 sign**.
Its 8-column tiling workaround, Graffiti `0000` white sentinel and `0004` dim-blue
background are reference observations, not verified characteristics of Jack's sign.
Animation uses true `0000` black; all pixel content uses the documented nonlinear
RGB444 transfer. Prepared plans explicitly flag dimensions, transport MTU, hardware
behavior and playlist timing as unverified. Do not equate program-count/show-count
fields with accepted hold/repeat semantics on the owned firmware.

The 128-byte protocol chunk is an **offline envelope chunk**, not a claim that one
ATT write of its escaped length fits the owner's negotiated MTU. The reference uses
60 ms inter-write pacing and says echoes are not reliable per-chunk acknowledgments.
No delivery/retry policy is enabled until transport evidence establishes safe framing.

The independent review reports a roughly 12–16 KiB per-tile decode budget upstream.
Before any live upload, gate each tile's pixel bytes separately from the global plan
size: `tileColumns × rows × 2 × frameCount`, plus the decoder's framing overhead.
At 8 columns, 16 rows and 32 frames, pixel data is 8 KiB per tile; generic 64-row,
32-frame documents need 32 KiB per tile and exceed that reported budget. Offline
compilation does not certify device memory fit. The exact firmware limit still needs
acceptance before a live transport can admit a program.

Unsupported commands include passwords, firmware updates, rotation with unknown angle
mapping, music/FFT streaming, timer writes and native vendor template/font libraries.
No proprietary font data or artwork is copied. Text already rasterized in the studio
can become ordinary UX pixels, avoiding the reference's extracted glyph assets.

## Owner-device size preset

The parent personally inspected the owner screen and verified **Pixel:16x96** beside
**CoolLEDUX-31B8**. That numeric device specification supplies an explicit landscape
**96-column × 16-row** preset; orientation and physical acceptance remain unverified.
The implementing agent does not claim to have viewed the screenshots.

Selecting the preset only fills the Columns/Rows fields. It does not resize, save,
crop or migrate a project. Apply panel size performs the existing local resize,
which can be undone; manual dimensions remain available. Existing saved projects
load at their own dimensions. No selection or resize enables hardware upload.

No sharing QR was fetched, decoded, committed or activated. The Lotus screen inventory
reported to this task names MELK-OF21 1D and includes Wires Order, Pixel Setting,
Collapse Mode, Customized Functions, grouping and menu/mode styles. Those establish
feature existence, not OF21 command bytes; OA10 compatibility remains blocked while
static LotusLamp X protocol investigation continues.

## Owner-safe acceptance now

1. Back up Settings. Use Connect to select the exact CoolLEDUX display and establish
   its metadata GATT link. Identify-only remains an internal inspection path. Optional
   metadata inspection retains an existing link or closes its own temporary one.
   It sends no lighting command or upload.
2. In the studio, select the owned CoolLEDUX 96-column/16-row preset, then Apply panel
   size when ready. Check orientation against the display/native app. Manual dimensions
   remain available; canvas changes are local and undoable.
3. Create a still and two-frame animation, then prepare the UX transfer file offline.
   Check its summary and local preview. **Do not transmit the file using another tool**
   as part of this checkpoint; physical uploads remain parked for a validated transport.
4. If an existing device-info notification capture is available, paste its hex for local
   decoding. A historical report cannot prove current state or panel dimensions.

Still required before uploads: exact FFF0/FFF1 properties, MTU/fragmentation behavior,
firmware/app version where exposed, orientation confirmation, and a known-good native
still upload plus two-frame transfer comparison and owner-driven physical acceptance.
An app-static investigation may supply packet details; a minimal capture is the fallback
for unresolved behavior. No device writes were performed during this implementation.

## Reference and golden fixture provenance

Primary: https://github.com/CharlesLennon/coolledux-ble/blob/4f5656d9882adb4926c9dff4dc3fa5783b40a7ac/PROTOCOL.md
with `wire.py`, `colors.py` and selected pure content-building functions at the same commit.
The MIT notice is retained in `licenses/coolledux-reference-MIT.txt`.

`tests/fixtures/coolledux-reference.json` was generated by executing reference `wire.py`
and `colors.py` directly, plus only four AST-selected content builders. No package
initializer, glyph loader or font asset was imported. The synthetic canvas is 10 × 16,
not an assumed owner size, and exercises 8+2-column tiling, dark and white pixels,
two programs and a two-frame animation with 150/350 ms delays. Tests compare raw-program,
compressed-stream and whole-packet SHA-256 hashes, CRC, announce bytes and packet counts.
Additional tests check family isolation, strict parsing, limits and zero-write UI behavior.
