# Effect → GIF alpha boundary correction

New adaptation only: `dynamic-effects.js` copies frozen `../dynamic-text-implementation/effects/dynamic-effects.js` (SHA256559b4c1f6901533054b6c15ee1976fd573d6d2551ffa108ca03bd5c294a07ae3). Original package/freeze remains unchanged. Only Zoom0 and Flip3 select new straightRGB conversion; other effect arithmetic, masks, timings, projection and API unchanged.

## Source boundary

`clock-contract/DptLoadImage.java:1204–1227` initializes each source ARGB bitmap transparent0; nonzero RGB becomes opaque Color.rgb. `animation-media-contract/source/AnimatedGifEncoder.java:227–253` calls getPixels then extracts B,G,R without alpha multiplication. The RGB_565 draw branch applies only when frame dimensions differ; target frames match96×16, so it does not introduce a black background.

Android [`Bitmap.getPixels`](https://developer.android.com/reference/android/graphics/Bitmap) returns non-premultiplied ARGB channels. Consequently transparent-canvas effect results must expose straight RGB before the original encoder discards alpha. This is different from compositing all effects against black.

| Mode | Actual source canvas/composition | Required pre-GIF RGB |
|---|---|---|
|0 Zoom|DptLoadImage1233–1254 filtered scale; TextEmojiManagerCoolLEDUX566–572 centers onto explicitly CLEAR bitmap|Straight RGB, zero for fully transparent pixels. New correction removes erroneous additional alpha multiplication at filtered edges. Final source-copy frame unchanged.|
|1 Rotate|DptLoadImage1365–1388 fills canvas with0xff000000, then filtered transformed draw|RGB after source-over opaque black. Existing premultiplied-on-black arithmetic retained.|
|2 Fly In|DptLoadImage1434–1467 explicitly fills each canvas black, applies Paint alpha during entering frames|RGB after alpha modulation and source-over black; existing arithmetic retained.|
|3 Flip|DptLoadImage1469–1494 draws into new transparent ARGB canvas, no black fill|Straight RGB. With current nearest sampling and binary-alpha glyph input this usually equals prior output; semantic correction still required.|
|4 Closing|DptLoadImage1496–1502 overlayBitmaps draws glyph then symmetric black-alpha mask on transparent output|Straight source-over result. Existing mask equation remains valid for these exact assets and opaque-or-transparent source glyphs.|
|5 Light Up,6 Lines,8 Fan|Same overlayBitmaps, scaled original masks; dispatch helpers1600ff/1680ff/1780ff|Same as4; no blanket output alpha multiplication added.|
|7 Bounce|DptLoadImage1743–1778 fills black before translated source draw|Composite-on-black RGB; unchanged.|

## Mask arithmetic evidence

Checked all28 RGBA resources in frozen effects/assets/masks.json: every pixel with alpha>0 has RGB=(0,0,0). Some alpha0 pixels contain hidden white RGB, which must not contribute. Current resampling uses premultiplied interpolation, so hidden transparent white is suppressed.

For opaque glyph color C and mask alpha a, source-over gives output alpha1 and straight RGB C*(1−a). Off-glyph source alpha0, a black mask yields straight RGB0 regardless of resulting alpha. Thus existing overlay equation is valid for the verified masks, despite transparent output canvases. This would not generalize to arbitrary translucent/nonblack masks or partially transparent source glyphs.

## Exact remaining limitation

The portable core interpolates in floating point and does not reproduce every Android ARGB8888 intermediate premultiply/round/store/unpremultiply operation. Newly added straightRGB emits rounded straight channels for positive alpha and0 at alpha0; it does not claim original Skia byte identity. Platform edge coverage/trig/sampling remain disclosed limitations. GIF quantization/delay behavior must be closed separately by the original encoder/decode roundtrip, not confused with this alpha correction. No tests or shared GIF files changed in this bounded adaptation; syntax check passed. Parent owns combined regression tests and freeze.
