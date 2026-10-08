# Personal text update and layout review

Updated all 45 user annotations exactly. Mapping: `personal-text-changes.json`.

## Changes

- Shared birthday title and wishes feed the 3D card, accessible birthday content and ending title.
- Thai canvas text wraps at word boundaries with grapheme fallback; activity titles support two lines. Fonts are loaded before the final texture is regenerated.
- Letter paragraphs and all nine photo titles/captions use the supplied wording. No captions are shortened or ellipsized.
- Long reading content scrolls within the paper/panel; body font remains 20px for tablet letters and 18px for tablet photo captions.
- Replaced the five activity card messages and puzzle completion copy.
- Removed the final scene credit overlay; attribution remains in `ASSET-CREDITS.md` and the distributed `public/asset-credits.txt`.

## Verification

- Production build and TypeScript: passed. Existing bundle size warning remains.
- Browser: 96 checks; all 45 annotation values verified; no page errors or failed HTTP responses.
- Viewports: 834×1194, 1194×834, 1440×900, 768×1024, 390×844, 320×740.
- All nine memory panels opened; full caption text verified; return control remains reachable after scrolling.
- Letter signature reachable by scrolling, all five cards selectable, puzzle completion and final rating/ending buttons work.
- Actual canvas text draw measurements: 172 texture canvases checked, zero clipped text bounds.
- Browser report: `personal-text-layout-qa.json`.
- Final activity label refinement: balanced Thai line breaks retested on tablet portrait/landscape, desktop and phone; `personal-text-card-qa.json`.
- Screenshots: `real-photos-text-*.png` (personal images excluded from Git).

The speech bubble audit checks visible text rectangles, excluding its intentionally protruding tail and screen-reader text. The final universe screenshots clear the capture framebuffer before rendering to avoid stale frames after viewport changes.
