# Authored Lotus effect illustrations

These local geometric visuals are **representative illustrations, not OEM GIFs, verified firmware sequences or physical-output previews**. Every existing command, label, category and order remains unchanged.209 entries use literal color/movement name cues;25 ambiguous entries remain static diagrams. Duplicate labels intentionally share art while retaining separate commands.

## Integration API

Load `native-lotus-illustration-data.js` before `native-lotus-illustrations.js`. Global `SmartEaseLotusIllustrations` provides:

* `describe(command)` → `{command,label,evidence,caption,animated,family,exactFirmwareSequence:false}`. Evidence is `label_informed_illustration` or `category_or_label_only`; concise external captions are “Illustration” / “Sequence unknown”.
* `createSession({document?,window?})` → `mount(container,command)`, `pause()`, `resume()`, `dispose()`.
* `mount` APPENDS its SVG, preserving any existing badge or accessible label. Returns per-tile `dispose/pause/resume/setVisible(boolean)`. Mounting again in the same container removes only the prior owned SVG. The SVG is decorative/aria-hidden; host keeps the real effect name and puts the illustration status in accessible description/external caption.
* `frame(command,phase)`, `geometry(command)`, `ornament(command)` and `renderSvg(command,phase)` are deterministic pure helpers. Phase is an authored cycle fraction, unrelated to device speed. No hardware, network or storage API exists here.

One shared RAF per session updates at most12fps on an authored six-second cycle; only observed visible, connected, non-static tiles animate. IntersectionObserver is shared. Without it, the safe automatic fallback is **stills**; an integration may explicitly call `setVisible` only if it independently owns visibility. Without RAF, still SVG remains. Reduced-motion preference always wins over resume. Document-hidden, user pause and disposal cancel RAF; stale RAF/observer callbacks cannot revive it. Dispose removes media/visibility listeners and disconnects the observer. Host must dispose on grid replacement/leave and resume or recreate on genuine reentry. An explicit host Pause/Play control is recommended alongside one visible legend.

## Meaning and deliberate limitations

Palette RGB values, seven-color order/membership, strip sample count, trail lengths, easing and timing are authored design choices. Purple means purple, Cyan means cyan, repeated Flow tokens such as W-R-W remain repeated. A named dot uses that foreground on the named background. Six-color-to-target illustrations use six other authored colors against the named target; this membership and moving-band behavior are an **interpretation of the label**, not a recovered device algorithm. Static Basic loop/arrow glyphs express only literal Auto/Forward/Back names; Energy stays a palette diagram. Ambiguous Other names remain static swatches/stacks, not guessed motion.

Strobe labels deliberately use a slow, uniform-panel soft pulse and smooth palette blend, not rapid flashing. All visuals are isolated from protocol selection and never serialized as DIY pixels. Exact direction relative to real wiring and speed-to-time mapping are unknown.

## Verification and provenance

16 focused tests compare all234 entries against the unchanged public catalog; check209/25 split, duplicate-label equality, explicit palettes/backgrounds, static ambiguity, slow uniform pulse, mounted badge preservation, shared RAF, reduced motion, visibility, disconnected nodes, remount/disposal and no network/device APIs. Synthetic DOM tests require existing jsdom. Run `node --test tests/lotus-illustrations.test.cjs` from the integrated source root.

All SVG shapes and motion equations are independently authored; no original image pixels, vendor renderer, cloud URL, credential or runtime download is used. The small procedural mapping is public factual label metadata plus authored illustration parameters. Private visual-review contact sheets and planning sources are not runtime dependencies and are not part of this overlay. This module does not claim original preview recovery, verified hardware behavior or a broader artwork license.

Static swatch/stack geometry samples palette-bin centers, with enough bars to represent every declared color. SVG output and mounted-fill regressions guard against rounding that silently drops colors.

Foreground geometry ends at or above y66 in the96-unit viewBox, reserving the bottom30 units for the host external status badge on narrow phone tiles. No badge text is embedded in authored SVG.
