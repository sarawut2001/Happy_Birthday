# Thai text on the birthday card: iOS compatibility review

## Report and evidence

The user supplied a screenshot of chapter 03/07 where Thai birthday wishes start
at the card's horizontal center and run beyond its right edge. The card border,
speech bubble and navigation remain intact. The user reports the issue in Chrome
on both iPhone and iPad with the latest OS; an exact version number is unavailable.

Baseline: commit `2a45f136cade2d7df605acb218b3fd320c2622b3`, GitHub Pages
deployment run `37745214582`.

## Experiment ledger

1. Compared dev and the deployed baseline with the actual PIN → gift → cake →
   birthday flow at 440×756, DPR 2, reduced motion. Chromium and Playwright WebKit
   on macOS both render all four Thai lines correctly in both environments.
   This does not support deployment/minification as the cause. It also does not
   reproduce the native iOS failure.
2. Recorded the actual card canvas draw calls and loaded font status. Both
   environments use the same text, font sizes, line breaks and centered x=600.
   The final line widths fit within the card's 1,060px text area. Missing font
   files or overly long copy are not supported by this comparison.
3. Checked upstream reports. [WebKit bug 316186](https://bugs.webkit.org/show_bug.cgi?id=316186)
   describes Thai center/right-aligned Canvas text being truncated on iOS 26.5
   and 26.6 beta, with left alignment unaffected. It is a duplicate of
   [316235](https://bugs.webkit.org/show_bug.cgi?id=316235), concerning complex
   text positioned incorrectly by `fillText` with center alignment.
   This closely matches the screenshot; the diagnosis remains an inference
   until verified on the user's affected device.
4. Changed every centered Canvas text surface to draw with `textAlign='left'`
   at `centerX - measureText(text).width / 2`. Explicit LTR direction is scoped
   to the draw, and the caller's canvas state is restored. Thai wrapping,
   font size, card geometry and DOM layout are unchanged.
5. Verified the real birthday flow in Chromium and WebKit at 440×756 and
   820×1180, DPR 2. All card draws use left alignment, are mathematically
   centered and stay inside the border. No page errors or horizontal overflow.
6. In both engines, injected a regression that draws center-aligned Thai as
   left-aligned at the original center anchor. The legacy positioning clips
   a long birthday line; the new helper remains centered. This is a modeled
   regression, not a native iOS reproduction.
7. Scanned actual rendered pixels for the four birthday lines, two activity
   labels and Latin text in both engines. Text remains inside the canvas and
   its painted center is within 7px of the requested center. The helper restores
   both alignment and direction. All six browser cases pass.
8. `npm run build` and `git diff --check` pass. Vite retains its existing
   large Three.js bundle warning.

## Scope and remaining confirmation

The workaround covers the birthday card, activity labels, photo dates and
orbit phrases. It applies to all browsers without OS sniffing.

Local WebKit testing runs on macOS and cannot certify a particular iOS release.
After deployment, reopen the live page on the affected iPhone and iPad, enter
`180926`, open the gift, blow out the candle and inspect chapter 03/07. Confirm
that the entire title and both wishes are centered inside the card. If it still
fails, capture the exact OS/browser version and a new screenshot.
