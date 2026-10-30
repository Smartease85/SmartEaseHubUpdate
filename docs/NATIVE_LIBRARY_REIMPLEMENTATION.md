# Source-backed local DIY library reconstruction

Source paths/hashes are in NATIVE_LIBRARY_PROVENANCE.json. This is reconstructed code, not a byte-identical restoration of the lost checkpoint. Original Android resources/behavior are evidence; iOS rendered parity and hardware acceptance remain untested.

## Original structure and behavior
SYDIYFragment 105–107, 435–507 establishes three square columns, 10dp grid divider, 12sp centered three-line labels, Add icon60dp, selected border2dp/radius8.5dp. GradientBorderDrawable angle3 goes top-left to bottom-right; DarkTheme selectStartColor/EndColor resolves #742324/#354c7b. CSS ARGB values are converted to RGBA rather than copied in the wrong channel order. Original add PNG bytes are retained. Android40 raw-pixel padding depends on device density; browser uses12 CSSpx as a disclosed adaptation, not verified iOS pixel parity. Old-small-phone40dp icon condition is not guessed from browser width.

Ordinary OF21 first tile tap applies the pattern; second already-selected tap opens Edit. Long-press Edit is OD31-only. Here first tap selects locally and explicit Replay opens the guarded editor; Preview requires returned geometry and explicit parked/send consent. Navigation never sends. Source Save persists locally then uploads/broadcasts, possibly replaying after refresh. Browser Save copy/Update/Rename are local-only and no duplicate refresh send is reproduced. This safety separation is explicit, not original combined-Save equivalence.

## Library lifecycle and compatibility
Stable IDs preserve update/rename/delete identity. Deletion is local and never erases controller firmware. Native lists exact granted-device scopes and a distinct unassigned legacy section; the shared whole-cart library still shows all records. New copies bind only on explicit action. Legacy updates stay unassigned. Unknown/orphan scopes, unknown fields and optional brightness absence are preserved; no background migration or guessed group mapping.

Schema is optional sceneScopes:{version:1,records:{recordId:{type:'device',id:grantedDeviceId}}}. IDs avoid existing scene IDs and orphan scope keys with eight bounded allocation attempts. Canonical storage comparison, original object/content/scope anchors, validated atomic storage-before-memory assignment and quota rollback protect edits. Record confirmation re-finds the object after reorder. A foreign or deleted-original draft remains detached until explicit Save copy; both UI and actual Preview closure enforce this. Dirty Back offers Cancel/Keep/Discard. Back/hide/generation/identity changes invalidate consent and pending confirmation; navigation/restoration never restarts upload.

## Integration tests
The old editor tests now explicitly open an editor through the real library instead of assuming the DIY route is always an editor. Save-dialog assertions use the new lifecycle dialog; the identity assertion now checks the documented retained foreign-draft contract. No tests are skipped or hooks disabled. Existing raw-RGB, optional-default, backup and transport guards continue to run.
