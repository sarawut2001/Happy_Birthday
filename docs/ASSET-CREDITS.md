# Asset credits

## Present — J-Toastie

- Model: https://poly.pizza/m/uio7lWWJo3
- Author: https://poly.pizza/u/J-Toastie
- License: Creative Commons Attribution 3.0 https://creativecommons.org/licenses/by/3.0/
- Original GLB: https://static.poly.pizza/3f77ae8e-28e1-4c20-a49b-9efe10ab0e09.glb.br
- Local file: `public/assets/models/present.glb`
- Modifications: pink materials; original mesh triangles separated into body and lid at runtime for rotation, teasing and opening animations. Attribution is retained in this document and in the distributed `public/asset-credits.txt`; it is not displayed over the final scene.

## Audio — Mixkit

| File | Track | Source |
| --- | --- | --- |
| `classical-4.mp3` | Classical 4 — Jonny S. | https://mixkit.co/free-stock-music/film-score/ |
| `camera.wav` | Camera shutter click (1133) | https://mixkit.co/free-sound-effects/camera/ |
| `page.wav` | Page turn single (1104) | https://mixkit.co/free-sound-effects/page/ |
| `sparkle.wav` | Fairy magic sparkle (871) | https://mixkit.co/free-sound-effects/magic/ |

Music license: https://mixkit.co/license/modal/musicFree/

SFX license: https://mixkit.co/license/modal/sfxFree/

Downloaded for this website. Serve them as part of the completed web end product; do not offer standalone redistribution, public asset packs, or templates containing these audio files. Audio binaries are excluded from Git. `scripts/prepare-licensed-audio.mjs` retrieves the two currently used recordings (music and page turn) with hash verification before dev/build. Other Mixkit recordings are historical local assets and are no longer required by the app.

Download URLs:

- https://assets.mixkit.co/music/711/711.mp3
- https://assets.mixkit.co/active_storage/sfx/1133/1133.wav
- https://assets.mixkit.co/active_storage/sfx/1104/1104.wav
- https://assets.mixkit.co/active_storage/sfx/871/871.wav

## Placeholder images

Six original SVG illustrations created for this project. They represent placeholder moments, not the couple's actual memories. Replace images and draft captions in `src/content.ts` when real photos arrive.

## Procedural objects and effects

Cake, cream, number candles, flames, smoke, balloon numbers, envelope pocket and flap, paper, double doors, heart lock, floating activity cards, hearts, galaxy, orbit text, confetti and soft shadow textures are created in the project source. No additional third-party model or remote texture is required.

## Universe activity props — original project models

- `public/assets/models/date-capsule-machine.glb`: pink capsule machine with separate crank, thirteen stock capsules, chute, dispensing capsule and opening hemispheres.
- `public/assets/models/memory-puzzle.glb`: three thick beveled puzzle pieces, with the user's puzzle photograph applied at runtime to the first two front surfaces.
- Source and exporter: `scripts/build-activity-models.mjs` (Three.js geometry and GLTFExporter). These are original meshes authored for this project, not downloaded Sketchfab models. No external model license or new service is required.
- The user's photograph is not part of the GLB and keeps its existing personal-media handling.

## Fonts

Noto Sans Thai and Cormorant Garamond, distributed through Fontsource under SIL Open Font License. Fontsource packages include license notices.

## Monchhichi — supplied Meshy model and reconstruction

Original model supplied by the user: `Meshy_AI_Monchhichi_Monkey_1003091923_texture.glb` (5,119,420 bytes). The original remains unchanged in the project root. An unchanged preview copy is served as `public/assets/models/monchhichi-meshy-source.glb`.

The current `public/assets/models/monchhichi.glb` is a derivative authored in `src/monchhichi-model.ts`: front artwork reprojected from the supplied GLB into a new atlas, nine independently capped anatomical silhouettes with restrained front curvature and rear volume, a rigid head, a 16-bone skeleton, skin weights, seven animation clips, and a modeled pink heart. Arms and hands follow the supplied contour rather than generic capsule primitives; separate rigid hands retain their artwork while wrists rotate. Original thin side geometry and plaque normal/metallic maps are replaced with fresh closed shells, smooth wall normals, and matte materials. Side/back anatomy is an authored interpretation. This replaces both the earlier PNG-based procedural model and the rejected inflated reconstruction.

The reference character/artwork remains attributable to its original rights holders. This derivative is not labeled CC0 or an official Monchhichi model. No new third-party asset or service was used to generate it.


## Original story sound effects

Thirteen original procedural stereo effects are generated from `scripts/generate-story-audio.mjs`: `ribbon-pluck.wav`, `gift-open-tonal.wav`, `breath.wav`, `paper-lift-tonal.wav`, `door-open-tonal.wav`, `gentle-twinkle.wav`, `magic-transition.wav`, `starlight-travel.wav`, `cosmic.wav`, `sparkle-rise.wav`, `memory-return.wav`, `celebrate.wav`, `resolve.wav`.

These use deterministic noise, oscillators, envelopes and periodic ambience layers authored for this project. Transition, travel, memory-return, ribbon, lid, paper-lift, door and twinkle effects use only soft tonal layers, without noise. They do not incorporate third-party sound recordings. Each file is 24 kHz / 16-bit stereo, normalized to peak 0.65 with tapered one-shot edges. The cosmic loop uses periodic frequencies and stereo modulation to avoid a loop boundary discontinuity. Short UI, unlock and rating motifs are synthesized at runtime. The original Mixkit `sparkle.wav` is retained locally but is no longer used by the app; both cake arrival and five-heart rating use `gentle-twinkle.wav`.

Existing Mixkit recordings retain their original license. The original generator source is included in Git; generated WAV files follow the existing binary ignore policy and are recreated automatically before dev/build.

## Ending Monchhichi couple — user supplied reference

- Reference: user-supplied `_ (2) Background Removed.png`, copied unchanged to `public/assets/models/monchhichi-couple-reference.png`.
- Local model: `public/assets/models/monchhichi-couple.glb`.
- Authoring source: `src/couple-model.ts`; export page: `scripts/build-couple.html`.
- Original project geometry and motion: closed curved relief volumes, separate body/head/bow/tail pivots, four blink morphs, shared heart/hand rig and four clips. Front artwork and Monchhichi character likeness derive from the supplied reference. No third-party 3D model, generation service or newly downloaded image was used for this pair; it is not an official Monchhichi asset.

## Presentation film — user supplied media

- Original: `image/Presentaion.MOV`, supplied by the user alongside the personal photographs.
- Web copy: `public/assets/personal/presentation/our-story.mp4`, rewrapped from the original H.264/AAC streams with native AVFoundation passthrough and fast-start metadata.
- Poster: `public/assets/personal/presentation/our-story-poster.jpg`, extracted from the same film at approximately 10 seconds.
- Preparation source: `scripts/prepare-presentation.swift`. The original MOV is unchanged. No third-party recording, generated photograph or additional media service was added.
- The user approved including prepared photos and the presentation MP4/poster in the public Git repository for deployment on 2026-10-08. Raw originals and browser screenshots remain excluded.
