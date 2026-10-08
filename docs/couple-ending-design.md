# Monchhichi couple ending — 2026-10-07

## Model and reference

The user's `_ (2) Background Removed.png` is copied unchanged to `public/assets/models/monchhichi-couple-reference.png`. Its transparent margins are excluded from the model. `src/couple-model.ts` traces the alpha silhouette within anatomical regions, triangulates and subdivides each cap, and makes closed curved front/back volumes. Original artwork is projected onto the front. This is a reference-faithful relief model with genuine curved geometry, lighting and depth; it is intended for a frontal camera and modest side angles, not a reconstruction of unseen 360-degree anatomy.

`public/assets/models/monchhichi-couple.glb` contains 18 closed volumes, four curved eye meshes with blink morphs, eight embedded artwork textures, 94,208 triangles and four animation clips. Heart and three gripping hands belong to `CoupleHeartRig`, so lifting the heart cannot separate the hands. The boy's free arm, heads, tails, bow and bodies have independent transform pivots.

| Clip | Timing | Behavior |
| --- | --- | --- |
| CoupleIdle | 6.4-second loop | Small breathing, head, bow and tail movement; identical start/end keys |
| CoupleBlinkLeft | 10.8-second loop | Boy closes/opens both eyes over 0.34 seconds, starting at 4 seconds |
| CoupleBlinkRight | 13.2-second loop | Girl closes/opens both eyes over 0.34 seconds, starting at 6 seconds |
| CoupleTogether | 6.5 seconds, once | Heads lean together, free arm moves subtly, held heart lifts 0.05 units and returns |

The GLB stores portable absolute greeting keys. `EndingCouple.tsx` clones and converts the greeting to an additive clip at runtime so it layers over breathing. Pause/reduced motion restores the seated pose and open eyes. Background visibility pauses the main renderer; model time also checks `document.hidden`. No speech audio or mouth animation is added to the ending pair.

## Scene integration

The existing universe gathering and five-heart rating remain. Any chosen rating 1–5 can complete the surprise.

1. After “มอบหัวใจให้เค้า”, rating hearts merge into the particle heart.
2. Across 4.7 seconds, the live particle heart travels to the couple's held heart. Its particles fade as the held heart and hands appear, followed by the pair. Camera framing and vertical offset ease toward the final composition. Resizing does not restart the sealing timeline.
3. The dark background fades into pink. Birthday wishes appear below the model, followed by the signature. Return/replay controls enter after 6.5 seconds; they are absent from the focus order before they appear.
4. The existing guide delivers its last message, remains for reading, then fades and becomes disabled. Returning to the universe restores the guide.

`story-layout.ts` defines the reserved model area and text band for tablet portrait/landscape. `CameraRig` fits the couple's width and height to that area rather than reusing the standalone heart's framing. The main canvas remains full viewport. The model starts preloading during the envelope scene to avoid delaying the portal with a late asset request.

## Inspect and regenerate

- `http://127.0.0.1:5173/?preview=couple`: original comparison, limited orbit, pause, natural/forced blinking and GLB download.
- With Vite running, open `/scripts/build-couple.html` to rebuild and download the GLB from the authoring source. Replace the public model with that download after authoring changes.
- `node scripts/check-couple.mjs`: closed-volume winding, finite vertices, embedded textures, four transparent morph surfaces, shared grip parent, loop seams and standalone greeting origin.

## Debugging record

- Initial forced-open preview showed black eye rectangles. Runtime reveal logic was turning `transparent` off for every fully visible material. A browser material-only toggle removed the rectangles while keeping the same asset, ruling out geometry/UV orientation as the cause. The reveal now preserves each material's original transparency and depth-write setting.
- Forced-closed eyes exposed residual lashes. Skin reconstruction had sampled adjacent hair at some rows. Safe forehead/cheek samples now replace only the original eye ink; the blink glyph collapses into a curved eyelid.
- Small camera turns showed painted hands behind the actual grip meshes. Occluded head/chest/heart textures now remove those copies while retaining the original artwork on the grip volumes.
- One interim Vite transform contained the new `uFade` write but an older uniform declaration, stopping the animation loop. Fresh served-source inspection identified the mismatch; reloading the dev server and repeating the actual route produced zero page errors. The new uniform is declared alongside the existing particle uniforms.
- Generic glTF does not preserve Three's additive blend mode. Exported greeting keys now retain their original position; runtime converts a cloned clip instead of exporting displacement-only translations.

## Validation

- `couple-model-check.json`: 18 closed, consistently wound volumes; four blink surfaces; all eight textures embedded; four clips with matching start/end poses; standalone heart origin valid.
- `couple-preview-qa.json`: frontal, closed-eye and quarter-view captures. 312 live samples observed both blink peaks at 1 and one greeting. Held-heart Y remained between -1.44 and approximately -1.3901. No page errors.
- `couple-ending-qa.json`: actual seven-part route, two-heart normal sealing with a viewport rotation, guide farewell, six settled layouts (834×1194, 768×1024, 1024×1366, 1194×834, 1440×900, 1920×1080), frozen reduced-motion/open-eye pose, return to universe, five-heart completion and replay. No model/heading overlap, horizontal overflow or page errors.
- Headless Chromium/SwiftShader was used. Final-scene geometry captures explicitly render the same live scene/camera without the postprocessing pass to avoid stale headless framebuffer capture. They establish geometry and layout, not hardware GPU frame rate or the exact bloom appearance.

Personal photo/video placeholders and the previous guide model remain available for the user's later assets.
