# Lotus ordinary OF21 catalog recovery

This is fresh static evidence reconstruction from the retained original LotusLamp X5.21.01 APK, not recovery of the lost implementation. No APK code executed and no BLE operations performed. No app files changed.

## Ready to implement

- `catalogs.json`:234 unique Effects commands exactly0–233, source order and English default-resource labels,9 categories: Basic47, Curtain20, Trans20, Water18, Flow24, Tail16, Run34, RunBack34, Other21. Category label `Curtain` is the original English translation for ordinary opening/closing effects, not evidence that this is a curtain-controller-only category.
-33 Built-in Scenes exact order, names, command IDs1–28,150,152,154,155,156. Names preserve source spelling (e.g. Hallowmas, Soft).
- `scene-assets/`: all33 PNGs extracted byte-for-byte from the APK; per-image resource ID/path/SHA256/size in catalog. Contact sheet was actually inspected: distinct original photos/art correspond to scene names. Original artwork for requested private remake; no license/public-domain claim.
- `resource-configurations.json` retains all resource-array/name/image records used; `extract_catalogs.py` reproducibly rebuilds and asserts exact counts, bijection and IDs.
- Both source fragments use2columns portrait/4landscape without any width threshold. Current ordinary scene path uses NewModeListComponent, source36dp labelarea,5dp horizontal/bottominset,8dp corner, centered12sp AutoSizeText label. It defaults to one line with ellipsis and reduces font*.95 only on height overflow. No source minimum-font limit; a browser floor would be an explicitly documented safety adaptation.
- Source Effects uses ModeListWithTabRowComponent and controls for speed/brightness; source model-selection calls setSymphonyMode. Scene tap calls setSymphonyScene. Source source-provenance hashes and numbered excerpts retained in `SOURCE-EXCERPTS.txt`.

## Commands and conditions

Ordinary non-LampAS setSymphonyMode sends MODE payload[mode,6]; setSymphonyScene sends SET_SCENE payload[sceneID,7]. Existing verified OF21 codec remains authoritative for wrapper bytes; do not substitute LampAS commands. Source UI sends on selection; browser explicit parked/apply safety is a deliberate adaptation, not original behavior. Speed callback setSpeed(i), updateCurrentSpeed(i); non-Thunder brightness setBrightness(i), viewmodel only stores i>=1. No entry/autosend should be copied into browser without existing ownership guards.

Other category is conditional isSupportedOtherSpecialMode. LPHelper derives true for ordinary MELK-OF21 because first two numeric digits21 meet>=21 and none of explicit exclusions (OA31, JSY_BT5V, exactOC23) apply. OC23 removes opening/closing and six basicitems; OA21H adds command234; curtain and LampAS have other branches. Do not expose these extras on OF21. Source isSend gates only SymphonyThunder by RGBpower; ordinary OF21 unaffected. Built-in scene alternate FL/CL/two-in-one/curtain/all branches are not silently treated as ordinary OF21.

## Remaining bounded gaps

Effects GIF/thumb imagery is NOT the bundled33 scene-art set. Source initializes R.mipmap.empty_gif and uses cloud category/subcategory + serialNo to load images; actual URLs/assets still require targeted CloudHelper/coroutine trace or approved app recording. Do not invent previews or claim exact thumbnails. Current extract establishes labels/order/commands but not a complete rendered iOS pixelmatch. ModeStyle wheel, Default/GIF/Text behavior and detailed live selection need their own bounded source reconstruction, not just catalog data. Source structure and spacing are Android-derived; owner iOS recordings still needed for exact iOS appearance acceptance. No rendered browser or hardware validation performed here.

## Reviewed source corrections

Effects Brightness calls native setBrightness(i), hence E1 all-target byte0, not Color-tab RGB target1. Regression checks31% frame `7e 04 01 1f 00 ff 02 01 ef`.

Source ModeListComponentKt351 uses26dp ScrollableTabRow and25dp corner. Browser now scopes both row/button heights26px, removes inherited generic button minimum/padding, and retains an inset focus-visible indicator. Native horizontal pager is represented by guarded local horizontal grid swipes. **48px travel,1.25axis dominance and8px click-slop are browser adaptations**, not claimed Android thresholds. Vertical scrolling remains native (`touch-action:pan-y`); completeddrag/cancel/lostcapture suppresses compatibility pointerclick, keyboardactivation remains available. Navigation/reconnect/hide invalidates the gesture, and explicit command Apply is disabled during gesture. Swiping never sends or queries BLE.
