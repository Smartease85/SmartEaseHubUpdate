# SmartEase® Cart Lights

A Bluefy-first, buildless lighting PWA for the five physical decorative zones on this golf cart. The `smartease-cart-lights` branch preserves the tested SP608E transport from commit `8f21588b0bccbbebb62ca29b8c246609e4662bca` and adds the SmartEase consumer experience.

- Floating connection status and forced reconnect for supported remembered devices.
- One-tap favorites, holiday/everyday looks, an animated cart visualization, gradient designer, saved local scenes, backup/restore and optional advanced controls.
- SP608E adapter retains output mappings, readback, serial pacing and RGB calibration.
- Optional, narrowly gated LotusLamp X accent-color adapter for documented ELK-BLEDOB / MELK-OA10 profiles. It does not claim installed NOKINS hardware validation.
- TRINKA identification only until its exact app/protocol is verified.

Open `index.html` from HTTPS in Bluefy. There is no runtime installation, account, subscription or API requirement. For development checks: Node 24+, `npm ci --ignore-scripts`, `npm test`.

Read [hardware capabilities and protocol sources](docs/HARDWARE.md) and the [on-cart acceptance checklist](docs/RELEASE-QA.md). SmartEase scenes save in browser storage; arbitrary pixel uploads and firmware scene saves are not implemented.
