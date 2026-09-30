# Browser verification — 2026-09-30

## Checks completed

- TypeScript and production build passed.
- Incorrect PIN displays an inline hint; correct PIN 180926 unlocks the gift.
- Chosen Poly Pizza model opens its original lid and ribbon.
- Letter reveals paragraphs and “อ่านทั้งหมด” displays all text immediately.
- Photo previous/next updates caption and counter; continuous viewing advances and stops at the last photo; manual pause works.
- Memory wall displays six cards in two rows. Thumbnail opens image and caption in a native dialog. Escape dismisses it and restores focus.
- Video placeholder explains that personal video is pending. Final message and replay both work.
- Music starts after explicit user action; mute works. Downloaded local audio files are present.
- Desktop and 375px phone screenshots inspected; further breakpoint checks recorded below.

## Animation investigation ledger

1. Initial photo advance jumped positions; source path was React props → Three group transforms → GSAP effect. React applied new target positions before GSAP could interpolate. Kept mount positions in refs and let GSAP own subsequent transforms. Intermediate screenshot now shows the old and new cards moving between slots.
2. SVG images were visible in HTML thumbnails but blank on Three planes, with no network errors. The image shader reads image.width/height; SVGs with viewBox only had no explicit raster dimensions. Added width/height 640. Fresh browser session confirms all six textures render.
3. The pedestal occluded the bottom of memory cards. Restricted pedestal to gift/letter scenes. Both wall rows now render fully.
4. Stage focus initially targeted the exiting heading during Motion's wait transition. Focus is now assigned by the mounted heading ref, with scroll reset in navigation.
5. A stale effect dependency warning appeared once during Vite hot replacement after changing Camera dependencies; production build and fresh page verification are the delivery checks.

## Pending personal media

Real photo crops, final personal copy, and recorded video playback must be checked when the user's media arrives. The current delivered journey uses clearly marked original illustration placeholders.

## Final delivery checks

- Checked 320, 375, 414, 768, 1024, 1280, and 1440 CSS-pixel viewport widths.
- 320px desktop-style scrollbars reduced the usable viewport to 305px; removed body min-width so scrollWidth now equals clientWidth (305px).
- Chapter navigation targets are all 44 × 44 CSS pixels.
- Tablet layouts up to 900px use the single-column composition so the 3D gift stays away from the PIN controls.
- Fresh production bundle journey reached the final message with no console errors or warnings.
- Actual user video and real-device Safari/Android playback remain pending personal-media integration.
