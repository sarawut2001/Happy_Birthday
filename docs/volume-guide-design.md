# Monchhichi volume and foreground guide — 2026-10-05

## Model

- Runtime GLB v4 preserves the supplied frontal artwork and contour. Front/back caps inflate from distance to each anatomical boundary; hands and limbs roll into rounded equators.
- Nose/cheeks and chest bib have shaped depth. Fur, skin, bib and nose use separate roughness, with subtle embedded fur normal detail.
- Height 2.8 world units, mesh depth 0.864 world units; 48,724 triangles, 16 named bones, 11 clips, 4,916,684 bytes. The supplied Meshy source remains untouched.
- Side/back appearance is an interpretation of the frontal reference. This is not a scanned plush toy or a facial/finger rig.

## Animation

`CharacterMotion` owns normalized action weights and snapshots effective weights when interrupted. It never restarts Three fade envelopes at weight one. Active clips keep their phase when requested again. Gestures finish/settle independently of speech expiry, and reading/video settle gently before freezing. Long foreground moves use Float; short steps use Walk with phase tied to distance travelled.

## Layout

The main Canvas fills the viewport. The guide is an independently lit transparent foreground Canvas with a controlled pixel size. A placement function scores left/right/corner candidates against projected prop bounds and DOM controls/reading surfaces. Smartphone reading has a compact guide dock. Body and speech positions travel together, and the tail follows the projected head; cake wind uses projected mouth/wick anchors across both cameras.

Scene preferences: gift left, cake right, celebration left, envelope right, quiet letter edge, door left then floating universe right, rating side and ending beside the final heart. Small screens may choose an alternate safe corner.

## Debug record

1. Initial inflated mesh had two four-face welded edges: the left arm front equator and palm rear equator shared the same Z. Separating equatorial offsets (3 mm rather than 4 mm) removed these accidental coincident boundaries; closed topology then passed.
2. Animation actions cached across React StrictMode cleanup failed after `uncacheRoot`. The controller now stops its actions without invalidating reusable cached bindings and resumes stopped actions on remount.
3. Blend measurements normalize Float32-derived quaternions before angular comparison. Unnormalized self-comparison misleadingly reported up to 0.04 degrees; actual immediate normalized changes are below 0.001 degrees.
4. Staging fonts initially returned 403 through a symlink outside Vite's staging root. The temporary server explicitly permits the project dependency directory; production project config is unchanged.
5. Existing scene screenshots taken too soon after a viewport resize can precede the new Canvas render. A separate settled ending capture verifies the heart is visible and inside the viewport.

## Evidence

See volume-guide-model-*.png / volume-guide-gray-*.png, volume-guide-motion.json, volume-guide-rig-qa.json, volume-guide-story-qa.json and volume-guide-ending-framing.json. Browser captures use headless Chromium with SwiftShader; they establish behavior/layout, not hardware mobile GPU frame rates.

## Installed project

Actual production build and localhost:5173 smoke passed. The small-screen PIN follows VisualViewport keyboard lift while preserving its normal resting position. The model studio freezes the pose for inspection; foreground story guides settle before freezing. On long journeys the guide rises along an edge, crosses the top, then descends into its next position; speech fades out during movement and returns after arrival.
