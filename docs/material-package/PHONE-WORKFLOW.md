# Phone-only private Material catalog

This is a local import feature, not a download from a public artwork mirror. The application code is hosted over HTTPS; the separately supplied scene package is private and must not be committed to the website repository.

## Intended owner flow
1. Open the verified SmartEase HTTPS candidate in Bluefy.
2. Save the supplied `.smartease-scenes` file to Files.
3. Open Native → CoolLED → Material → Import and select that one file. No computer, script or manual archive extraction is needed.
4. Wait for complete validation and local storage activation. Selecting a tile previews it; it does not send to the display.
5. Save or edit a separate local copy, or open the explicit guarded Send flow. Save is not Send.
6. Keep the original package in Files. Export backup prepares a file; tap **Save backup** to request a phone download.

The application cannot select a file on another person's phone or silently install a catalog there. The owner must select the file once. Browser storage can be cleared or evicted; imported content is not guaranteed permanent. A local storage/quota failure must preserve the previously active catalog and report failure rather than silently import a subset.

## Separate storage domains
The imported original catalog uses IndexedDB, with bounded per-asset processing. Existing custom Native programs use the separate versioned program library (4 MiB / 128 records). Only selected copies enter that smaller library. Catalog backup contains imported catalog assets and metadata; use **Export Native library** separately for custom programs. Neither export reads controller contents or proves a device backup.

## Playback distinction
An original GIF preview preserves original GIF animation. The currently supported raster transport fallback uses all decoded frames at the first source-normalized delay. Mixed GIF timing can therefore look different on the display. Original bytes and delay metadata remain intact. Raw GIF opcode0x0c remains unavailable until its device capability is independently established; no checkbox overrides that gate.

## Acceptance boundaries
Synthetic package and fake-IndexedDB tests establish code contracts, not actual Bluefy quota, eviction, file-picker or download behavior. Each release needs actual phone-sized browser checks and an owner-selected file test. Original catalog acquisition must account for every expected item; an incomplete acquisition must never be labelled a complete library.
