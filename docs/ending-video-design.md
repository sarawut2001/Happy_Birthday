# Video in the final scene — 2026-10-08

The presentation concept now supersedes the placeholder media design below. Current assets, copy, animation timings and verification are documented in [presentation-cinema-design.md](presentation-cinema-design.md).

## Flow

Universe → gather → heart rating → seal → video invitation → focused viewing → closing wishes.

The seven main chapters remain. The universe has nine photos, two activities, three phrases and five decorative hearts. Its reveal count and stagger offsets derive from these lists; the removed video is absent from both the emission and gathering sequences.

## Finale states

- `invitation`: the existing couple moves into a smaller upper composition through the camera; the cream/pink video frame and Monchhichi invitation appear.
- `watching`: the same frame expands over 1.6 seconds. Native HTML video controls, inline playback and contain sizing preserve the recording's aspect ratio. The guide stays at its previous dock while fading out. Stars calm down.
- `closing`: playback pauses and the frame/backdrop fades out over 1.5 seconds. The camera returns to the couple's larger composition.
- `complete`: original personal wishes appear in sequence. Confetti starts here. Final actions appear when the signature's animation completes, rather than a timer measured from sealing.

`endingRevealed` keeps the wishes mounted during repeat viewing. Returning from a replay restores them without replaying the rating, seal or ending sound. Starting a new surprise or finishing the universe again resets the finale. The 3D Canvas and couple are not replaced between these substates.

## Media configuration

`src/content.ts` now points to the real presentation prepared from `image/Presentaion.MOV`: `personal/presentation/our-story.mp4` and `personal/presentation/our-story-poster.jpg`. Run `npm run video:prepare` on macOS to regenerate them. Missing media and load errors still have an explicit continuation to the wishes. Existing personal-media Git rules apply.

## Audio and controls

Web music and SFX are muted for the entire watching/closing state, even when the visitor pauses the video. Native video volume is independent. Leaving focus restores the previous web audio preference with the existing fade. Visibility changes pause the video. Watching again starts only on an intentional action.

Escape closes focused viewing; native fullscreen has priority when active. Tab remains inside the dialog, and background scene controls/footer/utilities are inert during focus. The closing wishes receive focus when viewing ends.

## Layout

Tablet portrait uses a smaller upper couple and centered frame, with a 112px guide below and beside the frame. Landscape and desktop now use a frame up to 1200px in focus, constrained by viewport height. All video content uses `object-fit: contain`. The guide layout protects the frame, wishes and actions; hidden wishes are excluded from its obstacle measurements.

## Previous placeholder verification

Evidence: `ending-video-qa.json` and the three `ending-video-*.png` screenshots.

- Build/typecheck passed; the existing Three.js chunk size warning remains.
- 11 flow/layout checks: real UI navigation, universe removal, invitation, empty media, Escape, skip, replay, return and reset; widths 320, 390, 768, 834, 1194 and 1440.
- 13 native media/audio checks using a temporary 270×480 WebM fixture: play, pause, seek, ended, replay, error continuation, aspect ratio, controls, inline playback, web audio suppression, keyboard exit and simulated visibility events.
- 5 normal-motion checks: actual portal completes with all 19 objects; gathering stores all 19; the same couple persists across transitions; the frame expands through intermediate sizes; cinematic sound events occur once.
- 9 final visual checks: current guide/content collisions, click targets, overflow, iPad portrait/landscape, desktop, narrow phone and normal-motion ending.

Browser evidence is from headless Chromium with software WebGL and emulated viewport sizes. It does not establish hardware Safari or physical iPad playback performance. Fullscreen browser behavior was not exercised by these captures.
