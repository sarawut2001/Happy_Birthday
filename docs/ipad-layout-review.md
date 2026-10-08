# iPad-first story composition

Implemented 7 October 2026 in `/Users/bic-sarawut/Project/HBD`.

## Changes

- `src/story-layout.ts` defines shared screen-space composition for the camera, controls and guide. Portrait iPad is the primary composition, with a separate landscape arrangement. The 3D canvas remains full-screen.
- `src/ipad-layout.css` applies consistent action sizing: 18 px labels and at least 60 px height on tablets/desktops. The reading letter fills the available reader area with 20 px body text; photo captions use 18 px. Photos preserve their aspect ratio; landscape photo panels put captions beside the image. Puzzle, promise and video surfaces use the available reader height and can scroll.
- The gift, cake, 22, envelope and door camera framing uses a reserved hero rectangle. Model hit areas follow projected 3D bounds, including the raised letter sheet and heart lock.
- Monchhichi is 108 px wide while exploring the universe, 124–128 px on tablet reading surfaces and up to 160 px in other tablet scenes. Its render surface remains 200×296 px with a fixed camera zoom; CSS transforms animate position and scale together. Reading activities share one guide route, so changing activities does not repeatedly move the character. Speech bubbles reserve their full text dimensions before typing and use 18 px tablet text. The guide may overlap decoration and empty paper edges, but fades while crossing protected content. The universe chooses its dock once using the projected positions of the actual objects.
- Universe photos use an irregular constellation with varied depth and individual tilts, plus different portrait/landscape positions. Activity cards share the same placement system. Opening a panel dims the objects without pulling an enlarged selected card in front of the modal.
- Rating and ending copy occupy their own region below the heart. The ending canvas no longer uses the old CSS translation.
- Resizing no longer restarts the portal, gathering or story transition timelines. Returning from a rotated reader preserves the orbit heading and fits the new screen aspect.
- Gift opening completes before its transition starts: the lid rises and tilts about its own pivot, with a contained glow, while the box stays in place. Gift and cake fade out in place during their handoffs. The cake is removed from the scene after the birthday transition.

## Validation

`ipad-layout-qa.json` contains 15 story states × 10 viewport sizes (150 records). Sizes: 834×1194, 1194×834, 768×1024, 1024×768, 1024×1366, 1366×1024, 1440×900, 320×740, 375×812 and 414×896. No JavaScript errors or horizontal overflow were recorded. Primary and close button centers were reachable; primary buttons and the guide stayed inside the viewport. Action font and target-size assertions pass.

`ipad-motion-qa.json` records the full journey with normal animations, 12 scene checks and six rotations, including mid-transition gift opening, candle blowing, letter pulling, warp, panel viewing and gathering. It verifies wrong-code reset, a real 3D photo tap, return from a rotated panel, rating feedback and the ending. Door unlock, warp and gather cues each ran once.

`npm run build` passes. The existing large Three.js bundle warning remains. No dependencies were added. Run `node scripts/verify-ipad-layout.mjs` to validate the saved geometry and motion evidence.

## Scope and limitations

Tests use Chromium with simulated viewports and software WebGL, not a physical iPad or Safari. Personal photos/video are still placeholders; their actual media needs a final content check when supplied. The capture environment reports GPU ReadPixels stalls. Normal animation checks supplement the responsive matrix, which uses reduced motion to isolate settled layout geometry.

Representative screenshots: `ipad-gift-portrait.png`, `ipad-letter-landscape.png`, `ipad-universe-portrait.png`, `ipad-memory-landscape.png` and `ipad-ending-portrait.png`.
