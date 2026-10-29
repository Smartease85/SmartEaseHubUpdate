# Scene saving and the whole-cart builder

Build stamp: `cart-scenes-20261029-02`. Connection foundation: owner confirmed
all three connected on `2b12451e`. OF21 native additions were preserved in local
checkpoint `065ae53`; this workflow builds on that work.

## Save changes means update this scene

Built-in scenes remain immutable factory defaults in code, but a browser-saved
override now retains the same scene ID. Custom scenes update their existing ID.
Each successful save increments a revision. Home, favorites, library tiles, the
Halloween shortcut and power-on playback resolve the current saved revision.
There is one visible library entry per ID. **Save a copy** is a separate action
that creates a new ID. Deleting an override exposes the original built-in again.

Save success requires a successful scene-store write. On failure, the previous
saved library is restored in memory; current edits remain open. A persistent
message beside the save controls explains the failure. A separate recoverable
draft is attempted during editing and on page hide. If storage is full, export
the current draft before closing. Export works from the in-memory draft and
does not require browser storage. Draft recovery/import never sends commands.

The saved-scene sanitizer preserves richer scene metadata and accessory fields
instead of reducing every scene to five rows and a generic eye expression.
Old five-zone scenes continue to load. Wiring and calibration retain their
existing keys; no scene load replaces those global values.

## One discoverable editing path

Devices has **Edit SP608E**, **Edit NOKINS**, and **Edit Devil Eyes** independently
of connection state. Each opens the named editor in Create. The scene name,
Save changes, Save a copy, draft recovery and export controls are at the top.

- SP608E: use mapped cart-zone colors, or select individual outputs with their
  own effect, color, brightness, speed, LED length, direction, sensitivity and
  on/off drafts. Existing native scene/auto/status controls remain available.
- NOKINS: choose solid color, effect, native scene, microphone, custom pattern
  or off as the scene action. Native timers and wiring configuration remain
  separate explicit operations; a scene never changes them automatically.
- Devil Eyes: author pictures, text, frames and program playlists in the real
  local display editor. A scene embeds the complete project. Editing a scene's
  display draft does not overwrite the standalone display-project storage key.
  Home shows the saved project's first-frame preview; playlist preview opens
  the display editor. Neither preview is a hardware upload.

Every saved complete build includes lighting drafts, the display project, and
a reference snapshot of current zone mapping and calibration. Apply uses current
global wiring/calibration; loading a snapshot never silently restores topology
or color correction. Complete-build export and exported-draft import are bounded,
validated and local. Imported builds receive a fresh scene identity when saved.
Slow imports cannot overwrite a newer edit or import.

## Applying honestly

Explicit per-device Apply and whole-cart Apply require parked foreground use.
Drafts are captured at the tap and sent through the existing device queues.
SP power precedes its calibrated RGB reapplication. OF21 uses its exact profile
and native codecs; custom-pattern sending additionally requires matching geometry
returned on the current connection. Neither path promises physical acknowledgement.
The operations are coordinated, not atomic or frame-synchronized.

Results list each device as submitted, failed, disconnected, cancelled, excluded,
or unsupported. A partly submitted scene is never labeled complete. Stop prevents
further guarded commands; it cannot recall an in-flight write or undo earlier
changes. OF21 uncertain in-flight completion requires reconnect.

**CoolLEDUX upload remains unavailable.** Complete escaped program envelopes can
exceed ATT payload capacity, and the browser exposes no negotiated MTU here. An
exact-device verified fragmentation/delivery path is still required. Including
the display therefore leaves whole-cart Apply incomplete, even if both lighting
controllers accepted submission. Excluding it is explicit and reported as excluded.
Exporting JSON is a backup, not native display control or proof of retention.

## Acceptance and rollback

1. Keep a full Settings backup and any still-visible unsaved owner draft. Do not
   close an older tab with unsaved changes merely to install this build.
2. Edit each built-in and a custom scene. Save changes, reopen, reload, and play
   through Home/favorites. Confirm ID and chosen values remain; Save a copy must
   create a separate entry. Check visible storage errors and draft export/recovery.
3. From Devices, edit all three offline. Save one complete build, switch scenes,
   reopen it and confirm all output settings, NOKINS action and display frames.
4. While parked, verify each supported individual Apply and inspect per-device
   whole-cart results. Devil Eyes must remain unsupported, with no fake success.
5. Verify calibration, zone mapping and the standalone project remain unchanged.

Automated checks are codec and mocked-GATT/DOM tests. No lights were operated and
no denied browser JavaScript operation was retried. iPhone rendering, control
isolation, scene appearance, reconnect behavior and custom-program retention still
need owner acceptance. The previous pinned `2b12451e` build and local `065ae53`
checkpoint remain rollback evidence; no main merge or live-site change is included.
