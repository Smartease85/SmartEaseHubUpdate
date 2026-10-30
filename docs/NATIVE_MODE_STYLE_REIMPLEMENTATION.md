# Source-backed Mode Style and cyclic text wheel

This is rebuilt code, not a byte-identical recovery. Provenance hashes and exact original APK image entries are in NATIVE_MODE_STYLE_PROVENANCE.json. All three PNGs were inspected. Exact iOS appearance and physical controller acceptance remain unverified.

## Closed source evidence
ModeStyleDialog selects Default/GIF/Text from ProTheme drawables and writes updateCurrentModeType locally before dismissal. ThemeKt fourth ProDrawables argument maps menuDefault to ic_mode_style_default, not a guessed menu icon. Default-locale labels are Default, GIF, Text and Mode Style.

Fresh installed-JADX read-only extraction of LampWithDetailScreenKt closes chooser structure: SelectDialogView14431+ is a vertical column with8dp vertical padding,15dp rounded corners; DialogItem11714+ uses Material3 ListItem,14sp text and24dp leading image. Extracted ListTokens64–73 proves one-line row56dp. The earlier incomplete horizontal72px icon staging was discarded. Browser adds an explicit Cancel/status disclosure; no invented original footer equivalence.

SYModeFragment475–490 maps0/1 to the same grid and2 to Text. Missing source effect GIFs remain labeled unavailable; selecting GIF does not fabricate preview imagery. TextModeComponentKt200–225 prefixes1-based names separately for every category, with real PickersBean.showId command IDs (not ordinal). ViewPage2TextAdapter binds each category and initially selects index0 without an automatic browser send.

Decoded original res/il5.xml item_common_fragment_mode_text_list sets textColorGradient=true. PickerScrollView draws only the selected center with a horizontal gradient across measured text width; DarkTheme resolves #742324→#354c7b. LPBleHelper.normalColor() is RGB215,222,232 (#d7dee8), used for other rows. CSS clips this gradient to the centered text span rather than the full row.

PickerScrollView uses height/11.2 maximum font, maximum/2.2 minimum, minimum*2.8 row spacing, parabolic size/opacity with alpha100–255, cyclic data and60px/30ms settling. Browser keeps stable command identity and uses DOM text rather than Android Canvas; browser font baselines/rasterization are not identical. Wheel container360px capped55vh/min180px and10px axis locking/48px horizontal pager thresholds are disclosed browser adaptations, not Android measurement constants. The wheel uses touch-action:none because both vertical selection and horizontal category paging are custom pointer gestures; browser page scrolling remains available outside it. Keyboard arrows/Home/End and visible focus are accessibility additions.

## Safety corrections and lifecycle
Original zero-residual vertical drag can miss its selection callback. Here any completed vertical drag commits the visible center even with zero residual; taps remain no-ops. Effect Apply is disabled in UI and its actual closed-over function while pointer/settling is active. Pointer cancel restores committed center. Speed/brightness are independent explicit commands and remain usable during wheel motion; Effects brightness retains ALL target. No automatic command is emitted on wheel selection, style choice, category change or refresh.

Hide/route/identity/generation/history transitions stop settling, clear consent and invalidate pending command epochs; Back→Forward cannot revive an old command. Returning from settings rebuilds grid/wheel as necessary without a write. Mode Style dialog has synchronous dismissal, pending-Back guards and explicit-only reopen after lifecycle dismissal.

Optional modeStyles:{version:1,devices:{grantedId:0|1|2}} is browser-local, never a guessed native group binding. Preferences preserve unknown metadata and unrelated devices, reject malformed startup/backup data, compare canonical disk state, and mutate memory only after successful localStorage. Unassigned style is ephemeral and never binds when an identity appears. No legacy migration occurs. These preferences are included in existing whole-cart backups.

## Verification limits
Offline JSDOM tests cover source data/layout contracts, closed-over transport gating, exact-row drag, pending motion, cancellation, metadata rollback and backup validation. No real BLE, microphone capture, APK execution, emulator installation, browser rendering or iOS screenshot comparison was performed in this stage.
