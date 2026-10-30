# Authored Lotus hardware icons

All **39** selectable hardware PNGs (indices 0–38) now use independent geometric drawings, not original APK bytes. The initial task count of 38 was corrected against the live catalog and retained 39-icon integration assertion. No selector choice was removed or reordered.

`tools/generate-lotus-hardware.py` contains the complete geometric source. `tools/lotus-hardware-spec.json` supplies only compatible IDs, order, dimensions and alpha bounds; the generator never reads original bitmap pixels, a source APK, or fonts. Numbers, TV lettering, and all paths are drawn primitives. `assets/native-lotus/icons/provenance.json` and `native-lotus-icon-data.js` contain the current bytes, hashes and distinct per-item meanings, with legacy APK paths/byte claims removed. Resource IDs remain compatibility identifiers only.

## Actual consumers

* `native-lotus-icon.js`: enumerates every record into the 39-choice picker. Selection still saves the same key locally and sends no controller command.
* `native-lotus-setup.js`: displays the selected record, defaulting to `ic_symphony3_s`.
* `native-lotus-groups.js`: `iconFor` resolves the selected record, defaulting to `ic_symphony3_s`, then `lotus-groups-view.js` displays it. No group behavior changed.
* `sw.js`: retains existing compatibility URLs in the cache list.

The only UI code change is explanatory text that now correctly identifies the artwork as authored. Selection, aliases, unknown-state handling, persistence, errors, focus, dimensions, grid layout and device guards are unchanged.

## Visual contract and differences

Each original was visually inspected in a source contact sheet before authoring. Replacements preserve raster dimensions, transparent outer bounds, the broad red-to-blue/rainbow palette, and hardware meaning: plain/addressable strips with distinct 3/4/5 markings; spirals, reels, bars, bulb/string/curtain lights, roof-eave lighting, radial lamps, stair/rail lighting, vehicle/TV groups, a motor, wave rows and a star-topped Christmas light tree. Related strip variants intentionally share family geometry but retain distinct channel numerals and color treatment. All 39 output hashes are unique.

These are flat geometric redraws, not original pixel parity: curves, coil treatment, glows and internal details differ intentionally. No fallback placeholder or missing choice is used. A new contact sheet was inspected after generation. This is not full browser-rendered or iOS parity certification.

## Verification

* `python tools/test-lotus-hardware.py`: all 39 unique PNG hashes, byte counts, selector order, exact dimensions, exact alpha bounds and deterministic regeneration pass.
* `node --test tests/native-icon.integration.cjs tests/native-settings.integration.cjs tests/native-lotus-groups.integration.cjs`: 41/41 pass, including 12 Icon tests. Existing storage/lifecycle/route/BLE guards remain; only the artwork-origin wording of the provenance test changed.

The replacement manifest lists only this hardware slice. No unrelated assets, private source contact sheets or reference history belong in its overlay.
