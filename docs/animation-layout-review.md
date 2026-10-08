# Scene animation and composition corrections

Implemented 7 October 2026 in `/Users/bic-sarawut/Project/HBD`.

## Causes and changes

### Gift opening

Opening previously started the scene handoff at the same time as the lid animation, so the box's exit motion dominated the opening. The `open-gift` event now only starts opening. The gift emits `gift-opened` after its 2.7 second opening timeline finishes, then the 3.1 second cake handoff begins. The lid pivots around its own center, rises and tilts visibly. The gift stays at its original position and scale while opening, then fades in place. The camera gradually gives the raised lid more room; the interior glow stays small enough to preserve the lid silhouette.

### Cake to birthday

The old birthday state retained a small cake holder below the number 22. That holder is now mounted only for the cake scene and its active transition. During the handoff its materials and lights fade out in place, and it is unmounted once the birthday scene becomes active. The cake no longer slides down into the greeting card area.

### Reading letter

The reader now stretches across its available scene region, up to 820 px wide, instead of using a short intrinsic paper panel. The tablet letter uses 20 px body text and a centered text column up to 624 px wide. Its paper can scroll independently while the next button stays accessible. At 834×1194 the measured paper is approximately 779×883 px.

### Universe composition

`memoryHome` and `activityHome` define stable, irregular portrait and landscape constellations. Six photos use different heights and depths, and photo billboards add individual small tilts. Promise, puzzle and video cards occupy gaps around the heart. These same positions are used during emergence and exploration, preserving continuity. The lower landscape photo is raised clear of the next button.

### Monchhichi continuity

Animating the guide's DOM width and height changed its WebGL render surface and camera framing during size transitions. The surface now stays 200×296 px, with constant orthographic zoom; a single CSS transform handles translation and scale. Head and mouth projection uses the actual transformed canvas bounds so speech tails follow the character correctly.

Route changes and viewport changes animate from the currently displayed placement with one eased path and a synchronized scale curve. Movement lasts approximately 2.6–6.2 seconds according to distance; size-only changes take 1.8 seconds. A new cue within the same scene does not send the guide to another dock. The universe waits for actual world object bounds, chooses a dock once, and then avoids chasing moving objects. Letter text, primary actions, close buttons and other protected content take priority over the character; it fades while a movement path crosses these regions.

### Speech bubbles

Bubble dimensions are measured from a clone containing the full reserved text, preserving Thai wrapping before the text begins typing. Measured width and height animate together. Tablet speech uses 18 px text with 1.75 line height. Candidate placements include below the guide as well as beside and above it, allowing shorter or longer lines to fit without covering the essential scene content.

## Verification

- `animation-layout-qa.json`: focused normal-motion checks confirm the gift lid opens before handoff with unchanged holder position/scale; the birthday scene has no cake; the large tablet letter uses 20 px text; all six photo and three activity centers are in view in both iPad orientations; all nine objects open via real pointer taps; 2,859 guide samples retain a 200×296 render surface and constant camera zoom. Gift lid and light cues each ran once.
- `ipad-motion-qa.json`: the latest complete normal-motion journey passes 12 scene checks and six rotations, including rotations during gift opening, candle blowing, letter pulling, portal travel and gathering. It reaches the final scene without JavaScript errors.
- `ipad-layout-qa.json`: settled responsive geometry covers 15 states at ten screen sizes, including primary/close control reachability and absence of horizontal overflow. `node scripts/verify-ipad-layout.mjs` validates this saved evidence.
- `animation-layout-final-qa.json`: six focused checks rerun after the final visual refinements confirm the opening pose, cake removal, letter size, universe positions in both orientations and constant guide camera framing.
- `npm run build` passes. The existing large Three.js chunk warning remains; no dependencies were added.

The focused test was followed by small visual refinements to gift glow/camera framing and one landscape photo position. The complete motion journey and responsive captures were run against those final refinements. Tests use simulated Chromium viewports and software WebGL; physical iPad Safari remains untested. Personal images and video remain placeholders. Some screenshot captures omitted the main WebGL canvas even though geometry checks passed; an isolated gift capture with a preserved drawing buffer, paused timeline and explicit render to the default framebuffer showed the open pose without a lost context. This diagnostic changes only the test browser, not the production renderer.

Representative current screenshots: `animation-gift-open.png`, `animation-birthday-clean.png`, `animation-letter-portrait.png`, `ipad-universe-portrait.png` and `ipad-ending-portrait.png`.
