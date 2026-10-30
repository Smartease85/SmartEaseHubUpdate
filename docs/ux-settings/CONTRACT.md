# Original CoolLEDUX16×96 Settings: implementable screen contract

Read-only static closure from existing official Android2.7.6 APK; no main edits, network catalogs, device calls or runtime install. Reuses existing Settings/DeviceManager/Utils proof. One narrowly extracted missing class: RotateShowActivity. This ordinary UX target uses SettingsCoolleduxFragment; the separate fitness branch is not this target. No owner identity re-verification is needed for static authoring.

## Screen ownership and exact rows

`DeviceUX16XColumnLessAndEqual96Fragment.java:293–310,432–444` chooses SettingsCoolleduxFragment unless isILedFitness; Settings hides the entire parent contentLayout (including its power control) and shows setLayout. Therefore **power is not a row or top-bar control on the original Settings screen**. It belongs to the ordinary Program/Material/Discover parent header. `parent-layout.xml.txt:2–20` shows cb/power_selector inside contentLayout. Do not leave the generic Program header visible above a rebuilt Settings screen.

Original settings XML is pinned in assets. Root is ic_settings_page_bg; centered Settings title16sp, top margin44dp and vertical10dp padding. Scroll area begins with154dp banner slot, then16dp gap. Ordinary rows have #212121 backgrounds,15dp all-side padding,16sp white labels,16dp icon-to-label padding, and inset15dp #303137 dividers1dp. Brightness group is separated by10dp, label and ': N', slider margin-top8dp, track4dp. Following menu group separated by10dp. These are original Android dimensions—not proof of owner iOS/browser screenshot identity; use safe-area/viewport containment when adapting.

|Order|Exact default-locale label / resource|Behavior and target visibility|
|---|---|---|
|Banner|ic_banner_default,1125×462; banner slot154dp|Local original fallback artwork. Native may replace it from configured banner catalog. Keep bundled fallback offline; no guessed links or catalog fetch.|
|1|Screen flip / ic_rotate_show|Always visible ordinary UX. Opens original four-choice Screen flip page. No firmware/remote gate in this class.|
|2|Show power-on ID / ic_show_device_id|Always visible toggle. This means whether ID appears at power-on, **not** the actual ID string.|
|3|Remote Control / ic_remote|Always visible toggle. Subtitle12sp #828282: “If the model does not include a remote control, please turn off this function”. Source does not auto-detect/disable this row for missing remote hardware.|
|4|Brightness|Slider0..250 maps device value5..255. Native displayed read value can be<5; slider thumb clamps to0 while label retains raw read value. Initial XML progress125 is only a visual default, not measured130.|
|hidden|Join our Telegram / ic_telegram_32|Hidden unconditionally: both language branches setGONE. Do not show it merely because a resource exists.|
|5|Email us / ic_email_32|Calls inherited sendEmail(); recipient/composer contents not closed in this scope. Never invent mailto or send anything.|
|6|Help center / ic_help_32|Opens HelpActivity. This proves route, not that its content is offline. No reconstructed help URL here.|
|7|About us / ic_about_us_32|Opens AboutUsActivity; content destination not closed here.|
|8|Check for updates / ic_version_32|Visible. Version text is 'v: '+VersionUtil app version, **not firmware**. Calls UpdateAppManager.checkUpdate and checking-update toast. Not a browser update equivalent.|
|9|Hardware upgrade / ic_hard_update_32|Visible, not firmware-gated out of the list. Click requires connection; then native needUpgrade true opens HardwareUpdateDialog(forceUpgrade flag), otherwise newest-version toast. This is OTA, not ordinary settings.|
|10|Language / ic_language_32|Opens LanguageActivity; right side current native app language. Exact preference/localization route is a separate local stage, not a BLE setting.|
|conditional|关于 / ic_app_info|Resource key privacy has default text关于. Calls AppInfoActivity. Visible **only BaseActivity.mLanguageDefault==9**. Do not relabel it Privacy Policy or assume index9’s language without its mapping.|

`SettingsCoolleduxFragment.java:93–139,295–301,381–431`. No Settings row in this class is hidden based on measured width/height, firmware version, remote-capability flag or device count. Hardware-notice red marker is separate: initially hidden, shown only when connected + hardwareUpgradeSupported + needUpgrade; false needUpgrade hides it. Source updateHardwareNotice does nothing when disconnected/unsupported, so an earlier badge can remain stale. Browser should not turn that stale badge into proof of available firmware.

Assets inspected as actual pixels in contact-sheet.png: colored circular icons, purple checked toggle/gray unchecked toggle, white chevron/back, purple selection check. Source fallback banner is promotional artwork, not a statement of this known16×96 device model. Settings page bitmap1125×2436, toggle bitmaps120×72, ordinary icons72×72, rotation-page selection check60×60. Exact files/IDs/configurations/APK paths/dimensions/SHA are in assets/MANIFEST.json. All configuration variants are kept without overwrites. STRINGS.json retains original resource configurations; COLORS.json retains exact referenced colors.

## Rotation page, not a generic dialog

`source/RotateShowActivity.java:28–58`: header Screen flip18sp and back icon, source root#151515. Four separate list rows, in order **No flip0, XY-Flip1, X-Flip2, Y-Flip3**. List side margins15dp, top15dp,bottom40dp, transparent divider16dp. Row#212121; label16sp, vertical9dp margins/horizontal8dp; selected ic_language_selected on right. Tap immediately changes selected indicator and posts RotateCoolLEDUXSetEvent(index); screen stays open. Back/Exit only finishes. There is **no Apply/Confirm/Cancel-revert** in native source. Initial selection uses global mRotate, which is not inherently measured in a new browser session.

## Wire actions and readback semantics

All commands below use source getSendDataWithInfo:01 + escaped(BE16 payloadLength + payload) +03. No small-control CRC. Full concrete frames are in COMMAND-VECTORS.json. Important examples:

|Action|Source payload|Exact examples|
|---|---|---|
|Explicit information read|1f|01 00 02 05 1f 03|
|Brightness|04,value5..255|value5:01 00 02 06 04 05 03; value255:01 00 02 06 04 ff 03|
|Power, parent header only|05,boolean|off:01 00 02 06 05 00 03; on:01 00 02 06 05 02 05 03|
|Screen flip|0c,mode0..3|mode0:01 00 02 06 0c 00 03; mode3:01 00 02 06 0c 02 07 03|
|Show power-on ID|1e,01,boolean|on:01 00 02 07 1e 02 05 02 05 03|
|Remote Control|1e,02,boolean|off:01 00 02 07 1e 02 06 00 03; on:01 00 02 07 1e 02 06 02 05 03|

Source addresses: CoolledUXUtils5351–5373,5650–5673; wrapper2792–2821; LightUtils155–176 confirms bool/mode integer lists are single byte for these ranges. setDeviceInfo also contains action3, but **no corresponding Settings row/action is established here**; do not add it.

- **Brightness:** Settings183–187 updates label and posts on every onProgressChanged; source ignores the fromUser boolean and has empty start/stop callbacks. No debounce or confirmation. DeviceManager7129–7143 clears its global queue; disconnected→ResponseEvent2, otherwise enables all devices and queues04. Echo `[04,value]` writes mBrightNess, no per-setting UI-success event here. No automatic1f readback after slider writes is shown.
- **Flip:** RotateShow49–50 posts immediately; DeviceManager6941–6954 writes global mRotate optimistically before queuing0c. Response0c byte1 is later assigned mRotate; the same handler also updates old isMirror only for0/1. Do not interpret byte1 as generic success code0. No source rollback or per-setting confirmation UI.
- **Remote/ID:** Settings170–178 posts SetDeviceInfoEvent(2/1,bool). DeviceManager7048–7062 clears queue, checks connection, enables all devices and queues1e. **1e reply is not a closed boolean echo/ACK:** authoritative fallback11750–11823 maps it into mDriveState/DriveStateResponseEvent using byte1, not remote/showID booleans. Do not treat a1e payload byte as verified new toggle state. Fresh1f offsets7/9 are the closed observation path.
- **Power:** DeviceUX16XColumnLessAndEqual96Fragment234–250 posts05 from parent checkbox. DeviceManager6700–6714 additionally stops local music, sets isMusicfalse, clears queue and enables all devices. Response05 byte1 zero/one updates switch global and emits CoolLEDUXSwitchInfo; other values retain old global yet still emit an event. Browser should only call recognized0/1 an observation. No confirmation dialog is present in native source.

Readback handler proof uses existing **fallback** DeviceManager11492–11575 and11750–11835 (labelsL1418–L14b7,L1690–L1744), not corrupted normal decompiler conditionals around3333. All these short replies lack request IDs and native minimum-length checks. They are state values/branch events, not a universal success/ack-status schema.

## Explicit Read integration facts and prohibited native coupling

Settings.onResume→updateView141–145 and BleDeviceConnectEvent278–281 automatically post1f if connected. Settings251–274 consumes CoolLEDUXDeviceInfoEvent: updates flip label, detaches toggle/slider listeners while writing observed values, then reattaches. **Read-result rendering must not emit new writes.** Parent header also detaches checkbox listener for1f/05 events.

For browser, use the separately reviewed isolated device-info parser under an explicit owner Read action, not on route entry, resume, reconnection, or arbitrary settings render. Keep unknown states visibly unknown (source XML checkedtrue and global defaults are not measurements). Capacity default9 vs reported1..99, package fallback1024 vs reported1..4096 remain provenance-labelled; neither1f nor these short-setting replies establish firmware capability version or pixel geometry. Do not unlock Dynamic backgrounds or infer config names.

Native1f handling posts time synchronization and delayedfd/OTA query; native control event handlers clear shared queues and broadcast send enable. These are **excluded** from future browser integration. Use the existing owner context/generation/shared exclusive lease, cancellation and pending-read window instead. No hidden music stop, multi-device fanout, queue clearing, clock writes, or OTA fetch.

The existing selected-program transport has a fixed verified orientation profile. A future Settings flip writer must not silently modify that profile or claim newly calibrated pixel orientation. Its interaction with selected Send’s fixed-mode policy needs an explicit audited rule; source UI choice alone is not such a rule.

## Local versus external/device side effects

Pure/local: render original bundled assets/labels; open/close Settings and Screen flip routes; inspect values and provenance already observed; select native-language navigation only after its original local preference contract is ported. No setting intent is a device observation.

Device-changing:04/05/0c/1e. Source controls emit immediately, but physical writes require a future explicitly owner-controlled, current-session transaction. If browser introduces consent/staging for safety, disclose that adaptation; never pretend local toggling changed hardware or that Back undoes already transmitted bytes.

External/network: banner fetch + external redirect click, email composer, app update, OTA, and possibly Help/About content. Leave destinations/actions unimplemented until exact helpers are closed; no invented URLs/accounts/update version. Hardware upgrade is separately stateful/high-risk and is excluded from the ordinary settings stage.

## Next coherent scoped UI stage

1. Port the **actual Settings shell and Screen flip subpage** with pinned original icons/layout/labels, correct source row visibility and no Program header/power duplicate. Read-only values stay unknown until explicit Read1f. Offline default banner stays local; no cloud/account prerequisite.
2. Bind explicit Read through the reviewed1f session helper and current owner/source/generation/shared-lease controller, with timeout/cancel and listener-suppressed rendering. Test split/coalesced/malformed/stale replies and no read-on-resume. This stage can show meaningful real observations without inventing measurements.
3. Add bounded per-action intent/controller tests for brightness5..255, flip0..3, remote/ID booleans, and parent power only, keeping native UI semantics separate from pending/reported state. Require source-specific reply validation and an explicit1f refresh action for toggle truth; do not equate1e with successful readback. Preserve existing source Send orientation/shared lease. This needs independent review before main integration or physical owner use.
4. Close Language/Help/About exact local routes separately; do not substitute generic information panels. OTA/email/app-update remain isolated future workflows. No additional proof of the already-known ordinary16×96 model is needed for these source-supported screens.
