# Integrated ordinary OF21 Rhythm rebuild

New independently written code, not recovered original implementation. Integrated from the isolated stage into the unpublished Native worktree. No actual audio capture or hardware operation occurred; tests mock browser media and adapters.

## Integration record

- Copy `native-lotus-rhythm-data.js`, `native-lotus-rhythm-dsp.js`, `native-lotus-rhythm.js`, `native-lotus-rhythm.css` into app root.
- Copy parent `assets/` to `assets/native-lotus/rhythm/`. These are original16GIFs(two themes),6tabPNGs,8musicplayerPNGs; retain parent asset-provenance.json/tab-assets.json/music-assets.json as provenance. Dark8GIFs used by currentdarktheme; unusedlightvariants may be retained for futuretheme mapping.
- Link CSS; load data and DSP then UI after router/OF21 dependencies. Router already knows SmartEaseNativeRhythm enter/leave; verify it retains same valid screen on routine refresh rather than cancel/reenter accidentally.
- Add files/assets to SW precache and increment internalcache. Add both tests to package test. Stage tests use NATIVE_APP_ROOT and NATIVE_RHYTHM_STAGE; copied tests resolve approot normally. PureDSPtest expects DSP one directory above tests.
- Review actualrouter Back/Forward, pendingBeeBack and sourcechange; fullsuite + independentreview before claiming checkpoint ready. No publication or physical/media acceptance implied.

## Source-backed behaviors

Original Device MIC / Phone MIC / Music labels,6tabicons; exact8DeviceMIC labels+GIFs. Original Music playerart and list/control ordering. ModeRow is horizontal scrollable original component, not fabricated8Phonechoices. DeviceMIC Apply sends only verified mic-rhythm128..135 or controller sensitivity; no automaticpower/query. Phone sensitivity local, omits unverified rawLampAS55A7 vendorcallback. Phone has GIF0/waveform/sensitivity, no8modechooser forOF21.

Phone explicitgetUserMedia mono request; actualAudioContextsampleRate streamingresampled to22050;2205framewindows, first2discarded. Source threshold/Parsevalgate, sharedsevenMusicColors advancement, blackPhonewheregatefails. SingleinflightBLEcall; stale windows dropped, never queued. Music onlyowner-selectedlocalfiles, loop/single/shuffle, seek, prev/playpause/next, localplaylist edit/reorder/remove, URLrelease. OrdinaryOF21Music cyclesseven colors even silence. No generic FFT-silenceblack copied fromPhone.

WaveLineView was recovered rather than replacing it with invented bars:4paths multipliers[.6,.35,.1,-.1],64segments,amplitudeheight/3,source sin(xπ-phaseπ)*4/(x^4+4),movement divisor200,sensibility9*.35 smoothing,sourcecyan#00ddff and6/2strokewidth/255vs100alpha. SourcevoicedB fromIdealRecorder is10log10(meanPCM²); SYPhonevoiceVolume maps(db-40)*4. Browser rendering usesSVG/requestAnimationFrame rather than AndroidSurfaceView. It omits nativepreparationfade and clamps negativevisualvolume0 explicitly for browser safety. Physicalaudio/DSPtiming and Androidpixelparity not validated.

## Deliberate browser differences and gates

- Explicitparked/consent gates replace automaticnativewrites/capture. DeviceMIC preview does not secretlyrequestPhoneMIC for itswaveform; noaudioautostart onenter/tabchange/resume.
- BrowserMusic100ms cadence is NOT AndroidVisualizer(maxCaptureRate/2); selectedlocalfiles are NOT wholeAndroidmusiclibrary/backgroundservice.
- Phone linearresampling,Float32->PCM16 trunc/clamp, Parsevalequivalence are documentedDSP adaptations; no bitexactnativeFloatFFTclaim nearroundboundaries. BrowserScriptProcessor4096 batching means dispatchlatency not source100mshardwarecadence.
- Media exits release logicalbusy immediately. Latepermissionstreams stoptracks; stalecontext/play/writecallbacks cannot touchnewsession. Hidden/pagehide/route/ID/generation closesresources and neverauto-resumes. One sourceexclusive;Stopdoesnotclaimundoinglastcontrollerstate.
- Files session-only, max32/100MiBeach, no persistentAndroidlibrarymigration. Removing/reordering during playback stops stream and requires renewedexplicitstart; no file is deleted from disk.
- Narrowlandscape cardinsets use min(256px,20vw) for containment instead of nativefixed256dp; sourceportrait54dp preserved. OwneriOSrecordings/browserrender/hardwarevalidation stillneeded; do notcallfull1:1.

PureDSP15tests cover6rates8k/16k/22.05k/44.1k/48k/96k wholevs137blocks,7referencefixtures/windowdiscard/threshold/colorcycle. UI tests cover3sourcegating, originalartstructure, permissionslatearrival, identity/generation/route/hide, transportbusy/drop, playerrejection/ended/seek/order/reorder/remove/resourcecleanup, stalewrite/play callbacks. Integrated focused suite:37/37 including actual Native tabs, browser Back/Forward, deferred Beehive Back, routine refresh, and source exclusivity. Full suite result is recorded separately after completion.
