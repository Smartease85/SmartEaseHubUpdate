# Three independent connections and remembered assignments

This checkpoint fixes the SP608E row calling the cart-wide reconnect routine
and the CoolLED row performing identification without a real GATT connection.

- SP608E underglow: name-prefixed chooser, exact family validation, FFE0/FFE1.
  Existing readback and calibrated chip-order synchronization are retained.
- NOKINS: main chooser accepts exact MELK-OF21 family only, FFF0/FFF3. Actual
  properties select write mode; notify/indicate channels are discovered under
  FFF0. Ordinary source-derived controls are separate from legacy OA10/ELK paths.
- Devil Eyes: main chooser accepts CoolLEDUX only, establishes actual FFF0 GATT
  metadata connection and reports FFF1 capabilities. Upload remains gated.

Wrong-family choices are rejected before adoption or GATT connection. Repeated
clicks reuse the in-flight operation. Cancellation tokens reject late chooser/GATT
results, and a cancelled attempt cannot close a newer connection to the same
object. Errors are per-device; one failed or cancelled connection does not close
the other devices. A valid GATT connection is reported separately from whether
its lighting commands or upload are enabled. No stored flag means Connected.

## Connect All and memory

Connect All is guided: SP608E, NOKINS, Devil Eyes, one browser choice per explicit
step. A failed/cancelled step leaves successful links intact; remaining devices can
be paired or retried independently. It never opens a second chooser after awaiting
the first. Remembered-object reconnect can run without a new picker; a missing
grant requires a new tap. This follows the Web Bluetooth user-gesture and filter
requirements in the [browser vendor documentation](https://developer.chrome.com/docs/capabilities/bluetooth).

`smartease-device-assignments-v1` stores separate route→opaque ID/name assignments.
Only a completed family-validated connection saves a new assignment. Recovery
uses supported `navigator.bluetooth.getDevices()` and an exact saved ID plus
family validation. It never selects a nearby name match or substitutes another
granted device. Revoked/missing grants and unsupported Bluefy APIs produce explicit
tap-to-connect guidance. Storage failures leave the connection usable but report
that remembering did not succeed. The key is included in full backup/restore.

Saved favorites, scenes, SP color order/balance, zone assignments and display
projects retain their original storage keys and values. The owner 96-column ×
16-row preset only fills fields; Apply is explicit and undoable. It never migrates
or overwrites existing projects. NOKINS scene-following preference is also retained.

## Safe owner acceptance (still physically unverified)

1. Back up Settings. Close BanlanX, LotusLamp X and CoolLED1248 so they release
   their BLE links. Power the decorative lighting.
2. Open the new pinned app URL in Bluefy. Each Connect chooser should show only
   its respective family. Connect one device at a time or follow Connect All.
3. Confirm each actual connection and its own control/readiness message. Cancel
   one pairing and confirm the other links remain. Retry that row independently.
4. For NOKINS, while parked, test red/green/blue at modest brightness, a native
   effect and native scene. These bytes are source-derived, not on-cart verified.
   Read LED count is bounded and partial; it does not authorize DIY upload.
5. CoolLEDUX connection currently supports inspection and local/offline authoring;
   upload, device memory fit and visual equivalence still require acceptance.
6. Close/reopen. If Bluefy exposes granted-device recovery, verify exact assignments
   return. Otherwise follow the explicit reconnect taps. Confirm saved scenes,
   calibration, map and display project remain intact. A stable HTTPS origin/browser
   profile is needed for browser storage; export before changing origins/profiles.

Tests simulate all three choosers/GATT links, mismatches, partial failures,
cancellation and late completion, repeated clicks, reconnect, memory/reload,
wrong/revoked grants, no-getDevices fallback, write-property choice, serialization,
catalog bounds and bounded readback. No physical BLE command or denied browser
JavaScript operation was performed during implementation. Software and HTTP tests
are not physical Bluefy/lighting acceptance or proof of full native parity.
