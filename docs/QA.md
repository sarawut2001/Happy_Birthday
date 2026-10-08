# Pink 3D redesign verification — 2026-10-01

## Build and browser checks

- `npm run build` passes TypeScript and production bundling.
- Headless Chromium with WebGL renders the complete seven-part journey at 1440 × 1000 and 375 × 812. Both normal animation and system reduced motion reach the ending with no JavaScript or console errors.
- Gift: tapping while locked focuses and shakes the PIN; incorrect six digits reset; 180926 opens the spotlight; opening advances once.
- Cake: tap extinguishes flames and advances. Celebration, envelope opening, second paper tap, gradual Thai text and read-all work.
- World: keyboard hold and tap alternative both enter. Previous/next memory updates the image, title, date and caption. Promise cards reveal a message. The 3×3 puzzle was solved by swapping tiles; its completed state and video navigation work.
- Missing personal video has a usable placeholder. Rating, ending, revisit and replay work.
- Screenshots inspected for gift, cake, envelope, paper, particle heart, memory world and finale on desktop and phone.
- All seven parts checked at 320, 375, 414, 768, 1024, 1280 and 1440 CSS-pixel widths with no horizontal overflow.
- A valid local WebM fixture verifies video play pauses music and video pause resumes it, including immediately starting video after enabling sound. No fixture is shipped as personal content.
- Arrow-key heart rating, returning to the memory world, replay PIN reset and the complete WebGL-unavailable fallback pass. Final browser checks report zero JavaScript or console errors.

## Animation investigation ledger

1. A JSX fragment error prevented the first build. Closed the affected stage fragments and rebuilt successfully.
2. Cake lights and the contact-shadow render produced washed-out shapes and a background rectangle. Balanced lighting, replaced contact shadows with a procedural soft shadow, and adjusted Bloom/tone mapping. Screenshots now show the cream and pink materials clearly.
3. Heart particles stayed in the initial cloud. GSAP updated memoized uniforms while Three rendered a separate material uniform object. Frame updates now copy the animated values into the actual shader material; screenshots confirm the heart silhouette.
4. Reduced-motion envelope transitions stalled because zero-duration GSAP timelines did not reliably complete the journey event. Reduced motion now sets the final transforms and explicitly dispatches completion for each transition. The complete reduced-motion journey passes.
5. Floating the entire paper made the read-all target move continuously. Motion is now applied to the paper fold while text and controls remain stable.
6. Revisiting the gift or envelope retained a transition phase. Completion events now clean up those phases; chapter revisits work without repeating or blocking a transition.
7. Starting a video immediately after enabling music aborted the pending music play promise. The generic rejection handler incorrectly turned sound off. Intentional AbortError and obsolete requests while muted, hidden or playing video now preserve the sound preference, allowing music to resume after the video pauses.

## Audio fix record

**Summary.** Quickly starting video after enabling music disabled sound, so pausing video did not resume music. The working-tree fix on `main` is in `src/audio.ts`, `useSurpriseAudio.playMusic`.

**Root cause.** `music.play()` sets `paused` false before its promise necessarily resolves. Video `onPlay` calls `setVideoActive(true)` and pauses music, aborting that pending promise. The unconditional rejection handler set `enabledRef.current` and `enabled` false. Later `setVideoActive(false)` consequently skipped `playMusic()`.

**Fix.** Ignore intentional `AbortError` and rejection from requests that became obsolete while muted, playing video or hidden. Actual playback failures still show the retry message. The listener's enabled preference survives an intentional pause.

**Discovery and coverage gap.** Browser state tracing showed valid video playback, music paused without a media-file error, and the UI retry message. Earlier journey verification only exercised the pending-video placeholder and did not test this timing overlap.

**Validation.** Reproduce by entering part 6 with a valid video, enabling music, immediately playing the video, then pausing it. Before the fix both music elements stayed paused and the retry message appeared. After the fix the active music element resumes and the message remains empty. Verified in headless Chromium at 375 × 812 with reduced motion; production build passes. Real-device playback is pending the personal-video check below.

## Personal media and device checks

The six illustrations and draft text remain placeholders. Check final photo crops, captions, recording volume, video encoding and loading once the user supplies the media. Real-device iOS Safari and Android playback remain to be checked; current automated browser verification uses Chromium.

Audio is stored locally and excluded from Git. The downloaded music and sound files are present in this checkout. Rating stays in memory for the current page session.


## Immersive revision — 2026-10-01

- Canvas fills the viewport; floating UI keeps one small header line. PIN hints and the gift's dashed focus outline are removed; sound is at the lower left.
- Complete journeys passed at 1440 × 1000 with normal motion and 375 × 812 with system reduced motion. Incorrect PIN reset, gift, cake, envelope, letter, interrupted/full keyboard hold, all activities and finale work with no JavaScript or console errors.
- All seven parts fit 320, 375, 414, 768, 1024, 1280 and 1440px viewports. Canvas width/height match the viewport; document has no horizontal or vertical overflow. Long letter/dialog content scrolls internally.
- Real canvas raycasts open all three activity cards and a memory on desktop. Dragging rotates the camera without accidentally opening a card. Touch taps open the same objects in a mobile context.
- Photos and activities have no required sequence. Dialog close and Escape return to the universe. Keyboard object selection and heart rating remain available.
- Screenshot evidence: immersive-desktop.png, immersive-mobile.png and immersive-envelope.png.

### Envelope fix record

**Summary.** The open flap still covered the raised sheet in the first revision. The working-tree fix is in Scene.tsx, Envelope.

**Root cause.** Reversing the flap rotation alone left its hinge at z=0.24, in front of the paper at z=0. The resulting open triangle remained visibly across the sheet.

**Fix.** Separate the back at z=-0.15, sheet at z=0 and front pocket at z=0.19. Rotate the flap open, then move its hinge to z=-0.22 before the paper rises. During reading, raise the sheet center to y=2.35 so its lower edge clears the 1.09-high pocket before moving forward.

**Validation.** Normal-motion and reduced-motion open-envelope screenshots show the sheet above the front pocket and the flap behind the sheet. The second tap extracts the sheet and reaches the readable letter. Build passes. The initial front-view screenshot exposed the incomplete rotation-only fix before delivery.

### Composition check

The initial promise card overlapped a foreground memory. Photo elevations and card positions now separate the activity cards from the memory ring. Mobile uses a narrower initial camera view and larger two-line card labels; drag and zoom still expose depth around the central heart.

## Cinematic revision — 2026-10-01

### Changes and verification

- Cake shares one GSAP clock for airflow, impact, flame lean/extinguish, smoke and completion. Browser samples confirm lit flames while all wind leaders approach, then impact only after wind reaches the wick. Duration ~3.85s.
- Celebration uses beveled solid 22 geometry with clearcoat and a folded birthday card. The cover opens behind the face so the complete Thai greeting is visible; the face is enlarged for phones.
- Door intro uses one camera timeline: opening, suction, warp, galaxy arrival, particle-heart formation and object revelation (~12.1s after activation). All interactive objects stay hidden before revelation. Warp streaks and a partially formed particle heart were captured mid-sequence.
- The same UniverseSequence remains mounted across parts 6–7. UUID comparisons after a camera orbit verify that all 17 foreground objects persist: six photos, three activity cards, three phrases and five small hearts. All converge on the heart and become hidden at zero scale. Galaxy dust also spirals into the heart.
- Rating contains only its heading, five radios and submit button. One-heart and five-heart paths reach full wishes. Revisiting restores the objects; starting another finale resets the score. Score remains in page memory.
- Full journeys passed at 1440×1000 with normal motion and 375×812 with system reduced motion. Real raycast clicks, touch, drag, zoom, parallax and seven-part viewport checks pass at 320, 375, 414, 768, 1024, 1280 and 1440 widths.
- Normal-motion cinematic checks report zero JavaScript/console errors and zero failed HTTP responses. Production build passes. Existing Three engine chunk-size warning remains; no dependencies added.
- Shared visual-runtime scripts are not present in this skill installation; browser screenshots, rectangle/overflow checks and console/request capture were performed with local Playwright Chromium.
- Evidence: cinematic-22.png, cinematic-warp.png, cinematic-ending.png, cinematic-mobile.png and cinematic-results.json.

### Shader fix record

**Summary.** Galaxy dust continued to render in place after the foreground objects gathered, and opacity transitions did not reach the actual material. The working-tree fix is in `src/Scene.tsx`, `ParticleField`.

**Root cause.** GSAP changed memoized `uniforms.uOpacity.value` and `uniforms.uCollapse.value`. The shader material rendered separate uniform objects, while `useFrame` copied only `uTime` and `uForm`. Consequently the GPU retained opacity 0.8 and collapse 0 even after the rating state was reached. This repeats the earlier heart-formation mechanism recorded above.

**Fix.** Copy all animated uniform values into `material.current.uniforms` on each rendered frame. Galaxy points now spiral inward to the heart's position; after gathering, their actual opacity reaches zero. Heart opacity also correctly fades as the solid ending heart appears.

**Validation.** A reduced-motion journey reproduced actual material values `{opacity:0.8,collapse:0}` at rating. The same journey after the change returns `{opacity:0,collapse:1}`. The normal-motion cinematic check then confirms collapse 1 and opacity 0 after gathering, retaining all original foreground object UUIDs. The final scene screenshot no longer contains the full galaxy disc. No real-device Safari/Android validation was performed.

**Coverage gap.** The first cinematic checks covered photo/card identities and visibility but omitted the galaxy material values. Both values are now checked after gathering; rendered screenshots exposed the missing GPU update before delivery.

### Verification ledger

1. Temporary preview fonts returned 403 because a symlinked node_modules path was outside Vite's file allow list. The temporary preview config allowed the exact dependency/public paths; original project config is unchanged. Full journeys subsequently had zero console errors.
2. An async wait predicate returned before the requested intro phase, incorrectly reporting hidden warp streaks. Phase polling now reads and awaits the actual scene state. Direct warp capture confirms visible streaks during warp with all memory assets hidden. No application change was needed for that finding.
3. Greeting-card cover initially masked the text. It now folds backward and its face is larger. Normal/reduced screenshots show the whole greeting.
4. Galaxy uniform probe exposed the missing GPU updates above. Reproduced before the fix and verified afterward in reduced and normal motion.

Personal photo/video and real-device audio checks from the earlier section remain pending user media. Current previews use the existing six sample illustrations and video placeholder.

### Final project smoke check — 2026-10-02

The installed project at localhost:5173 completes the mobile journey with zero JavaScript/console errors and zero failed HTTP responses. A 320px final-screen check has no document overflow, an in-bounds heading and >=44px action target. Revisiting the cake retains zero flame scale and zero candle-light intensity. Updated mobile screenshot: cinematic-mobile.png.


## Continuous universe and feedback — 2026-10-02

### Summary

The `revealing → exploring` handoff rotated the camera by 180° for a frame and then attempted to reframe the scene. The same OrbitControls instance now survives the whole journey, remains disabled during cinematic camera work, and receives the existing camera look target at the handoff. Wrong PINs and committed heart ratings also have playful, cancellable feedback.

### Root cause and fix

`CameraRig` previously mounted Drei's OrbitControls only on entry to the hub. `three-stdlib` invokes `update()` in the controls constructor and starts with `target = (0,0,0)`. The intro camera was at approximately `(0,3.4,-11.22)` and looking at `(0,0.35,-24)`. Constructor initialization immediately turned it toward the origin. `CameraRig` then captured that reversed direction and tweened it back over 2.2 seconds. This explains the visible cut even though object UUIDs and positions did not change.

The controls are now mounted once, disabled while cinematic timelines own the camera, and enabled with the intro's actual look target, position, quaternion and FOV. No second camera framing runs on this handoff. Pointer parallax ramps in over 0.8 seconds. `FloatingObject` travel roots own their transforms; no declarative position/visibility prop or exploration setup resets a finished reveal. Every actual emission reports completion; the final object completion starts a 0.75-second settle before exploration. The old fixed 12.1-second deadline is removed.

### Debug ledger and validation

1. Baseline: scripted journey, toggle motion on before the portal, record every animation frame. At the phase boundary camera angle jumped by π radians (180°); position and FOV remained unchanged. `memory-0` retained UUID and position. This ruled out a scene remount or object teleport as the source of the 180° cut.
2. Differential: keep the same controls instance, leaving object code and the old intro deadline unchanged. The angle discontinuity disappeared (0 radians). This isolated controls construction rather than particle formation or the deadline as the camera flip cause.
3. Complete fix: repeat the original journey and record the boundary. Maximum angle delta around handoff: 0 radians; position delta: approximately 2.51e-15 world units; FOV remains 38°. Target is `(0,0.35,-24)`.
4. Slow-object case: pause the final staggered 1.95-second reveal tween for 3.5 seconds in the browser. Phase stays `revealing` beyond the old deadline. Resuming the tween eventually enters exploration with the same continuous camera measurements.
5. PIN feedback: successive wrong PINs, gift taps during a reaction, read-only guard, additive gift shake while slow spin continues, six-digit reset on actual completion, focus restored, correct PIN accepted afterward. Reduced motion resets immediately.
6. Rating feedback: scores 1–5, hover preview without committed reaction, rapid changes, keyboard End and focus, repeated same-score touch, confirmation during an unfinished low-score reaction, full final wishes, revisit and camera reset, reduced motion.
7. Responsive rating checks at 320, 375, 414, 768, 1024, 1280 and 1440 pixels: no horizontal overflow and radio targets ≥44px. Desktop and mobile screenshots inspected. Mobile touch is emulated Chromium; physical iOS/Android devices have not been tested.

Earlier browser checks asserted the settled camera position, asset presence and scene progress. They did not sample the camera quaternion at the exact handoff, so a temporary orientation reversal escaped. The new regression probe samples both sides of the phase boundary and delays a real emission to exercise completion ownership.

### Feedback implementation notes

PIN digit and control animations share one GSAP timeline with actual completion, no independent reset timer. The gift reaction uses a parent transform so it does not compete with the slow spin. Rating emotions use a separate parent transform and procedural point face; the particle density behind the face fades temporarily for readability. Each committed click, touch or key selection increments a reaction trigger, so repeated same-score selection works. Hover does not increment it. A new selection cancels the previous timeline and animates from the current pose. Sealing resets the reaction and continues for any score.

Evidence: `continuity-results.json`, `continuous-universe.png`, `wrong-pin-desktop.png`, `wrong-pin-mobile.png`, `rating-4-desktop.png`, `rating-mobile.png`. Local Playwright probes are under `/private/tmp/hbd-continuity`; no browser-testing dependency was added to the app.


Final verification on `/Users/bic-sarawut/Project/HBD` at port 5173: `npm run build` and `git diff --check` pass. The normal intro has the same 0-radian camera handoff; all 17 assets are visible at scale 1. Drag, wheel zoom, a real raycast click on the promise card, modal return, camera reset and a low-score full ending pass. Mobile touch and repeated same-score reactions pass on the installed project. No JavaScript/console errors or failed HTTP responses were observed. The existing approximately 1.21 MB Three engine chunk warning remains. These changes are local and have not been committed or pushed.
## Story continuity revision — 2026-10-02

### Implementation

- `journey.transition` holds the source and destination chapters until their shared GSAP timeline completes. Repeated actions and chapter navigation are blocked during a bridge.
- Gift/cake/card/envelope holders coexist during their respective bridges. The envelope's `letter-sheet` UUID survives the move into the reading chapter. It clears the envelope mouth before moving forward. Its top and bottom panels physically fold before the door appears.
- The same `door-holder` survives the paper-to-door bridge and portal entry. Hold energy decays smoothly after an incomplete hold. Existing suction/warp/galaxy/heart/object emission continues into the same explorable scene.
- A heart light and sampled particle trails connect the early chapters. Actual universe assets keep their identities while gathering along curved paths. Lighting and the pink/purple background ease between moods.
- Rating hearts arrive before the solid ending heart grows. Particle opacity fades during this overlap; `sealed` is emitted after the solid heart reaches full size. Ending wishes appear in sequence on the warming pink background.
- Music eases to 0.10 while reading and on the video page, and restores to 0.24 after leaving. Playback still pauses for a playing video or hidden tab.

### Browser evidence

Chromium with SwiftShader, desktop 1440×1000 and a touch-enabled mobile browser at 375×812. These are browser/emulation checks, not physical iPhone/Safari or device frame-rate measurements. The skill's shared visual runtime was unavailable; Playwright supplied screenshots, runtime checks, geometry inspection and layout checks.

- `story-results.json`: normal-motion full journey through all seven parts; gift and cake coexist; the paper and door retain their UUIDs; a one-heart score reaches the complete ending; no page/console or HTTP errors.
- `story-mobile-results.json`: wrong PIN resets and restores focus; actual touch hold opens the door; an incomplete touch hold leaves it locked and fades energy; keyboard opens a promise card and Escape returns; rating arrow/Home/End semantics and replay work.
- All seven chapters were revisited at 320, 375, 414, 768, 1024, 1280 and 1440 pixels: 49 layout checks with no horizontal overflow or clipped primary buttons.
- Normal and reduced motion ending checks confirm the solid heart reaches scale 1. The final heart is grown before transitioning to the end state, so its appearance no longer depends on a second entrance animation completing after the ending text starts.
- `story-handoff.json`: revealing → exploring camera rotation changes by 0 radians; maximum sampled position change is 2.52×10⁻¹⁵ units. All 17 assets finish emission. Drag/zoom, actual raycast selection and modal return pass. Music reaches 0.10 in the letter and 0.24 after leaving. No runtime or HTTP errors in this regression run.
- `npm run build` and TypeScript pass. Vite retains its existing large 3D chunk warning; no dependency was added for this revision.

Screenshots: `story-gift-cake.png`, `story-22.png`, `story-envelope-open.png`, `story-paper-clearing.png`, `story-continuous-universe.png`, `story-ending.png`, `story-mobile-paper-fold.png`, `story-mobile-letter.png`, `story-mobile-universe.png`, `story-mobile-ending.png`.

### Inspection ledger

The first desktop screenshot captured an empty space above the ending wishes. A reduced-motion run inspected a visible solid mesh at scale 1 with its projected center inside the viewport; moving the camera kept it visible. The sealing sequence was changed to grow the solid heart while particles fade, then emit completion. Subsequent normal-motion and reduced-motion desktop/mobile runs show the solid heart. The exact reason for the first capture was not established, so this is an observation and the validated sequencing change, not a claimed root-cause report.

The first audio probe used a fixed two-second wait and observed volume 0.142 while easing was still active under software rendering. The final probe waits for the actual active audio instance to reach the target rather than assuming wall-clock duration. React StrictMode also creates an abandoned initial audio instance; the probe selects the most recent looping instance.

Personal images and the real greeting video are still placeholders. Retest the video's audio handoff and media dimensions after they are supplied. Mobile performance and Safari need a physical device check.

## Monchhichi implementation — 2026-10-03

### Model and export

- The shipped `public/assets/models/monchhichi.glb` is an actual binary glTF 2.0 model, 1,204,400 bytes, 38,436 triangles and 31 rigid meshes. It embeds seven clips (Idle, Walk, Wave, Celebrate, Shy, Float, Hug), modeled facial details and the heart prop used by Hug. No original PNG is used as a billboard or runtime texture.
- `npm run check:model` loads the actual GLB through GLTFLoader and checks clip names/validation, loop endpoints, moving leg rotation, raised waving arm and ground contact over 161 Walk samples. Lowest foot contact: 0.001954; highest: 0.002078 model units. Maximum loop endpoint difference: below 1e-5.
- The body is an articulated rigid model. Unseen back/depth are authored interpretations of the front/profile illustrations; this is a stylized prototype, not a photogrammetric reconstruction or smooth skinned character.

### Browser behavior

- Chromium, 1440×1000: all seven parts, wrong PIN clearing and correct unlock, cake, birthday card, envelope, letter, door, universe, promises modal, rating and replay complete without JavaScript/console/HTTP errors.
- Preview Walk changes actual leg transforms. Pause preserves the current joint quaternion exactly; resume changes it. Wave raises ArmR above 1.5 radians. Hug shows the modeled heart. Orbit views and GLB download work.
- The main companion UUID survives gift → cake and the complete story. The clip becomes Walk while its parent traverses the route, then blends into the destination gesture.
- Full portal animation emits all 18 actual FloatingObjects. The new companion has the same UUID, position and unit scale immediately before/after revealing → exploring; measured camera orientation jump is 0 radians. Clicking its rendered head by raycast triggers Wave.
- All 18 objects, including the companion, reach scale 0 and become hidden during gathering. Scores 4 and 5 select Shy and Celebrate respectively; both reach the same Hug ending. Existing low-score behavior does not block completion.
- Reduced-motion story layout: 49 checks across seven parts at 320, 375, 414, 768, 1024, 1280 and 1440 pixels; no horizontal overflow or clipped visible buttons. Preview passes the same seven widths. Desktop and 375×812 screenshots inspected.
- Full-motion checks use software-rendered Chromium. In two runs, a screenshot immediately after exploration became available captured a blank transparent canvas, while the scene, raycast and camera were already valid; an additional two seconds produced the complete image without a state/camera change. Reduced-motion and the separate full-motion diagnostic also rendered the complete universe. Screenshot evidence uses the settled frame. This capture transient has not been reproduced on a physical GPU/browser; physical Safari/iPhone performance remains unverified.

### Development findings

- Initial domed-face geometry bent only vertices on an extruded outline. Large interior triangles passed through the head and exposed brown geometry at the forehead. Interior radial tessellation produces a continuous facial dome; face/eye/mouth depth was adjusted and inspected from front and profile.
- The replacement dome initially lacked a UV attribute. `mergeGeometries` rejected it when batching with sphere geometry (`Unable to merge Head`). The node reproducer isolated the attribute mismatch; adding matching UVs let the same creation/export/browser paths pass. Material batching and vertex welding reduced the initial 6.2 MB export to the shipped 1.2 MB model.
- An early universe placement sat behind the lower-left photo. Moving the companion into the gap above the lower-right activity card leaves its head visible in the presentation view.

Evidence: `monchhichi-model-results.json`, `monchhichi-preview-results.json`, `monchhichi-story-results.json`, `monchhichi-motion-results.json`; screenshots `monchhichi-preview-wave.png`, `monchhichi-preview-mobile.png`, `monchhichi-gift.png`, `monchhichi-cake.png`, `monchhichi-universe.png`, `monchhichi-continuous-universe-settled.png`, `monchhichi-ending-mobile.png`.

## Meshy reconstruction — superseded v2, 2026-10-03

Historical v2 results. The user rejected its likeness; the current model is documented in Reference likeness correction below. Passing its motion tests did not establish likeness or watertightness.

### Asset and motion

- Current GLB: 2,398,052 bytes, 38,305 triangles; 16 skeleton joints; one smooth skinned head/body/leg/tail mesh plus closed round arm/hand meshes attached to the arm bones. Original UV and a 2048×2048 base-color atlas are preserved. Source plaque normal/metallic textures are not reused on the rebuilt volume.
- Bind height 2.8, depth 1.356633 (48.45% of height, versus 7.74% in the original source). +Z forward, feet at Y=0 in the canonical geometry. Side and rear volume are authored interpretations; facial details are painted in the atlas rather than individually modeled or facially rigged. Fur/ear boundary detail from the source remains visible at close range; this is a character prototype, not a scan or an exact likeness from all directions.
- `npm run check:model` inspects the actual binary GLB: embedded image, UV, JOINTS/WEIGHTS attributes, normalized skin weights/quaternions, valid bone indices, round volume bounds, seven named animations and identical loop endpoints.
- Browser GLTFLoader + AnimationMixer validation of the exported file: foot contact during Walk ranges from 0.001919 to 0.002069; no sampled feet below floor in all seven clips. Celebrate lifts to 0.182, Float to 0.142. Walk changes LegL rotation over 0.72 radians and an actual FootL-weighted vertex moves 0.1351 in Z. SkeletonUtils clones have separate bone objects and animations do not affect another character instance.

### Browser workflow

- Preview: actual Walk changes bones, pause freezes the current quaternion, choosing a different pose while paused updates its first frame, Hug shows the heart, source comparison loads the unchanged Meshy model, and the downloaded bytes exactly match the displayed shipped GLB.
- Preview checked at 320, 375, 414, 768, 1024, 1280, 1440 px: no horizontal overflow or clipped controls. Reduced motion keeps joints stationary. Desktop and mobile screenshots inspected.
- Complete reduced-motion story: seven parts, PIN rejection/unlock, all 18 universe objects, activities, gathering, low rating, ending and replay passed. 49 chapter/width combinations show no horizontal overflow or clipped visible controls; no JavaScript or HTTP errors.
- Production build passes; existing Three engine chunk size warning remains. No package dependency added. Software Chromium was used, not physical iPhone/Safari testing.

### Authoring inspection ledger

- The first spatial skin assignment grouped part of the raised hand with the head. Lowering the arm stretched source triangles across that fixed/moving boundary into a visible sheet. Reclassifying markers alone did not resolve the fused contact geometry. The final version removes source arm triangles and authors closed capsule sections and hands on the same skeleton; screenshots confirm the sheet is gone. Head, face, bib and body keep the source artwork.
- Bone motion and GLB animation channels were valid while a paused pose switch retained the old image. The paused useFrame path did not evaluate the new action. Pose changes while paused now stop the prior actions and evaluate frame zero; pausing/resuming the same pose still preserves the current frame.
- The initial foot-motion assertion sampled an arbitrary low vertex and included a pelvis-weighted point. The final probe selects a vertex actually weighted to FootL and verifies visible skin displacement independently of joint rotation.
- The staging server initially denied fonts through a symlinked node_modules path (HTTP 403). Allowing both temporary and project paths in staging Vite resolved it. This staging-only config is not installed into the project.

- Normal-motion regression: the same actor enters Walk during gift→cake, all 18 objects emerge from the heart, the companion UUID/position/scale survive revealing→exploring, camera orientation jump is 0 radians, gathering hides all objects, and scores 4/5 reach the same holding-heart ending. The first run did not sample the expected phase boundary; a trace-enabled repeat recorded locked→opening→suction→warp→arriving→forming→revealing→exploring and passed without an app source change. The cause of that first sampling miss was not established; no scene fix is claimed from it.

Evidence: `volume-story-motion.json`, `volume-inspect.json`, `volume-rig-results.json`, `volume-preview-qa.json`, `volume-story-story-results.json`, `volume-front.png`, `volume-quarter.png`, `volume-side.png`, `volume-back.png`, `volume-mobile.png`, and the `volume-story-*` chapter screenshots.

## Reference likeness correction — v3, 2026-10-03

### Summary and root cause

The rejected v2 inflated the source's thin side geometry using a whole-character silhouette distance field. XY threshold segmentation removed any triangle touching an arm region, including neighboring head/body faces, without capping those cuts. Capsule arms also replaced the reference hand/limb outlines. The new position-welded checker reproduces 227 open boundary edges in the previous exported body. Motion and depth tests had passed because they did not check closed surfaces or compare likeness under matched cameras.

### Fix

- `src/monchhichi-model.ts` now projects the original GLB's front artwork into a new embedded 2048×2048 atlas and traces separately authored anatomical masks. Nine front/back caps and connected walls replace the original side geometry; cut arms never remove head triangles.
- Face landmarks keep their reference XY positions. Front curvature is restrained, most volume is behind the face, and the complete head follows one rigid bone. Closed shoulders and hips overlap with neighboring volumes.
- Arm/hand contours follow the source artwork, with smooth skin weights at arm joints. Hands are separate closed volumes weighted entirely to their wrist bones, preserving fingers and palms during rotation. Stable anatomical wall colors and smooth wall normals reduce the raster-step rim stripes. Hug counter-rotates wrists so palm artwork stays visible while the arms wrap around the heart.
- The preview uses a level camera, starts with Wave, and provides a reference-pose reset that returns to Wave frame zero even when Wave was already playing. The source toggle and download still use the unchanged source and actual shipped GLB respectively.
- No dependency was added and no story sequence was changed.

### Asset inspection

- Export: 4,667,520 bytes, 48,724 triangles including the heart; 16 joints, seven looping clips, two skinned material primitives, one embedded front atlas. Source root GLB remains unchanged.
- Main geometry height 2.800589, depth 0.465914 (16.64% of geometry height). Model-level bounds can also include bone transforms and the hidden heart. Depth is reported as geometry data, not a likeness score.
- Position-welded output has zero boundary edges, non-manifold edges, or winding conflicts. The checker examines both material primitives together. It reports 108 float-position-collapsed sliver triangles diagnostically; these do not introduce open edges in the welded surface check.
- The checker also verifies the front material and its 11,999 referenced vertex colors stay white, preventing the earlier glTF texture-darkening regression.
- Side/back anatomy is an authored interpretation of a thin illustrated source. Facial features remain painted artwork, with no facial expression rig.

### Validation

- Matched-camera comparison: reference / rejected v2 / repaired v3, identical normalized height, bind pose and neutral light, front orthographic/albedo, front perspective, both three-quarter directions, side, back and face crop. Visual review confirms intact cheek/chin/right ear and the restored hand silhouettes. Rim striping is substantially reduced.
- Preview: Walk bones move, pause freezes, paused pose switching evaluates frame zero, reference reset works, all seven pose views captured, source comparison loads, downloaded bytes equal the final candidate, reduced motion stays still.
- Preview checked at 320, 375, 414, 768, 1024, 1280 and 1440 px: no horizontal overflow or clipped controls.
- Exported GLB loaded through GLTFLoader and sampled with AnimationMixer at 49 times per clip. Animated positions stay finite; non-jumping poses keep their lowest foot approximately 0.002 above the floor. Walk leg rotation spans 0.46 radians, Wave arm rotation spans 0.09 radians. SkeletonUtils clones have independent bones; the loaded atlas is 2048×2048.
- Story regression: all seven parts, rejected/correct PIN, 18 universe objects, a promise card, gathering, low rating, ending and replay pass. Desktop/mobile chapter screenshots reviewed; 14 stage/width combinations show no overflow or clipped controls. No JavaScript or HTTP errors.
- Production build passes. Existing Three engine chunk warning remains. Verification uses software Chromium; physical iPhone/Safari was not tested.
- After installation in `/Users/bic-sarawut/Project/HBD`, the actual application on port 5173 loads version 3 (4,667,520 bytes) in both preview and gift scene. Reference reset returns Wave/ArmR to frame zero, Hug displays its heart, source switching works, downloaded GLB bytes match the installed asset, and the 375px preview has no horizontal overflow. No JavaScript or HTTP errors occurred in this installation smoke check.

### Authoring experiment ledger

1. The first closed-cap export passed closure but had 24 winding conflicts. A CDP breakpoint in `cap()` showed zero meaningful negative-area triangles; tiny numerical areas down to −2.1e−18 triggered the per-triangle sign flip. Keeping Earcut/conforming-subdivision winding instead of flipping individual near-collinear triangles removed all conflicts.
2. Assigning shell colors to shared front vertices made the exported face dark, even with Three's front `vertexColors=false`: glTF `COLOR_0` still multiplies the base-color texture. Separate wall seam vertices preserve white front colors and independent wall colors.
3. Single boundary-pixel color samples and raster hair normals left horizontal rim stripes. Stable fur/skin wall colors and smooth anatomical wall normals reduce them while retaining the front outline.
4. Inherited arm IK rotated Hug palms away from the viewer, exposing broad side walls. Counter-rotating wrist bones preserves the reference palm silhouette. Initial partial elbow/hand weights then folded the palm artwork; separating fully wrist-weighted closed hands removes that fold.

Evidence: `likeness-compare-front.png`, `likeness-compare-quarter.png`, `likeness-compare-left-quarter.png`, `likeness-compare-side.png`, `likeness-compare-face.png`, `likeness-preview-front.png`, `likeness-preview-quarter.png`, `likeness-mobile.png`, `likeness-rig-results.json`, `likeness-preview-qa.json`, `likeness-story-story-results.json`, `likeness-story-*` screenshots, `likeness-real-smoke.json`, and `likeness-real-*` screenshots.

## Monchhichi foreground guide — 2026-10-04

### Implementation

- A persistent transparent foreground Canvas presents one guide mascot across all seven parts. The story Canvas owns gifts, cake, letter, universe assets, camera travel and gathering; the guide has its own fixed front camera and reserved layout band. Its manga bubble and model occupy separate grid columns.
- The guide reuses the corrected v3 geometry, original projected front atlas/materials and 16-joint skeleton. Four authored skeletal clips (`Present`, `Invite`, `Blow`, `Thanks`) extend the existing seven clips to eleven. This change adds no face or separate finger rig.
- `guide-controller.ts` scopes directions and interaction feedback to the current journey state. One cue is visible at a time; feedback takes priority. PIN nudges/rejection, short door holds, promise selection, puzzle steps/completion and video completion/errors feed the same guide.
- Reading remains quiet: initial reading directions fade, the typewriter-complete event only caches the next direction for repeat, and playing video mutes speech/pauses the mascot. Returning to the universe does not restart the exploration introduction. Any committed score from 1–5 can proceed to the same complete ending.
- Transitions, tunnel travel, gathering and sealing mute guide speech. The actor remains outside the universe asset collection; warp hides it. Reduced/paused reading/video/hidden-warp frames use demand rendering. Head projection positions the bubble tail; mouth projection publishes viewport coordinates for the cake airflow.
- Text reveal uses Thai graphemes, with a single complete accessible status. The model is a labeled repeat button; controls and validation semantics remain in the main UI. Both main readiness and guide model readiness gate the first visible speech. A heart icon is used if WebGL/model loading fails.
- Source/directions/poses and frontend wiring are documented in `guide-design.md`. The controller filename avoids the macOS case-insensitive conflict between `guide.ts` and `Guide.tsx` imports.

### Verification status at documentation preparation

- Staging `tsc -b` passed after the controller, guide presentation and App imports were integrated.
- Final browser screenshots, responsive interaction evidence, exported eleven-clip checks and installed-project smoke results are pending at this point. No browser pass is claimed by this documentation draft; append the observed evidence below when the final candidate is checked.

### Final candidate verification — 2026-10-05

- Production build passed after the final wind bridge and puzzle feedback integration. The existing large JavaScript chunk warning remains; this is not a measured performance benchmark.
- Binary comparison against the pre-guide runtime GLB passed: geometry attribute/index bytes, materials, embedded images, textures/samplers and all 18 tracks of each of the seven original clips are identical. Four clips were added; runtime GLB is 4,849,476 bytes. Source Meshy files were not edited. Evidence: `guide-model-comparison.json`.
- Model checker passed with 48,724 triangles, 16 joints, eleven clips, preserved white front artwork colors and closed topology. Motion validation evaluated every skinned vertex at 49 frames for each of eleven clips (539 sampled frames): finite positions, grounded feet for non-jump clips, independent cloned skeletons, bounded head/spine pitch for Blow/Thanks, and loop endpoints. Evidence: `guide-model-check.json`, `guide-motion-qa.json`, `guide-pose-*`.
- Browser journey passed all seven parts: locked-gift nudge, incorrect PIN reset, unlock/repeat, cake, 22 celebration, opening envelope/paper, quiet letter reading and intentional repeat, partial and completed keyboard hold, activities, genuine pairwise puzzle swaps, promise selection, ratings 1–5, completion with three hearts, and replay.
- A generated short WebM fixture was used only in the browser test: speech was absent while it played and returned on ended. Personal photos/video remain placeholders. No test media was installed in product content.
- The same guide object UUID persisted across the reduced-motion journey. The universe has seventeen scenery objects (six photos, three activity cards, three phrases, five small hearts). Those object UUIDs survived reveal → exploration → gathering, and all were hidden/stored after gathering. Normal-motion warp hid the guide, returned to the same scene, and mouse dragging changed the orbit camera.
- Eighty-four responsive checks covered 320×568, 375×812, 414×812, 768×1000, 1024×1000, 1280×1000 and 1440×1000 across story and activity screens. No horizontal overflow, horizontally clipped buttons or guide-bubble/control overlap was detected. Screenshots inspected include mobile gift, cake, letter, universe, promise/photo dialogs, normal airflow and ending. Browser page/console errors and HTTP errors: zero. Evidence: `guide-story-qa.json`, `guide-story-*`.
- Focused settled ending inspection confirmed the heart fully visible at 320×568, 375×812 and 1440×1000. Projection corners stay inside the frustum; camera framing did not need modification. Evidence: `guide-ending-framing.json`, `guide-ending-framing-*`.

### QA experiment notes

1. The first PIN assertion ran before React's reset effect committed; waiting for the empty input confirmed the existing reduced-motion reset. No product change was needed.
2. Switching a loaded reduced-motion test page to normal motion left Motion's initial reduced-motion hook value cached, so the transient blowing cue was skipped. A fresh normal-motion page reproduced the cue correctly; the normal journey now starts in its own fresh page. Evidence: `guide-debug-ledger.json`.
3. The guide mouth is above the main Canvas's reserved viewport. An off-frustum unprojected wind origin was correct mathematically but its first visible segment was clipped. Added a viewport SVG bridge between mouth and projected wick, preserving the existing 3D wind/impact timeline.
4. A 100ms resize screenshot captured an empty ending frame at 320px. The focused fresh 320px journey after a settled render showed the complete heart, with projection Y 0.39944–0.94679. This ruled out a camera defect.

Installed-project build and smoke verification are recorded below after installation.

### Installed project

- Updated `/Users/bic-sarawut/Project/HBD` after checking the original file hashes; preserved the user's other files and existing Vite configuration. Pre-change files were backed up under `/private/tmp/hbd-guide/backup`.
- `npm run build` passed in the actual project. Its existing Three engine chunk configuration remains in effect.
- Fresh-browser smoke on `http://127.0.0.1:5173` passed: one foreground guide, eleven runtime clips, GLB response exactly 4,849,476 bytes, visible mobile layout at 375×812, unlock/repeat and gift → cake direction. Page/console and HTTP errors: zero. Evidence: `guide-actual-qa.json`, `guide-story-actual-gift-mobile.png`.
- No synthetic test video or staging Vite/node_modules configuration was installed. Personal photo/video placeholders remain ready for the user's assets.


## Monchhichi volume and fullscreen guide — 2026-10-05

- Staging production build passed (existing Three chunk warning remains).
- Exported v4 GLB: 4,916,684 bytes, 48,724 triangles, 16 bones, 11 clips, embedded artwork + normal textures. Closed mesh check: zero boundary/non-manifold/inconsistent winding edges.
- 539 sampled frames across all 11 clips: finite skinned vertices, floor contact for grounded motions, independent skeleton clones.
- Interrupted blend, all pose changes and landing interruption: normalized angular pop under 0.001 degrees; outgoing weights sum to 1. Reading/video settles then freezes.
- Seven-part journey passed: invalid PIN reset, guide repeat, partial/full hold, genuine puzzle solution, promises, video playback silence, 1–5 ratings, ending and replay.
- 84 responsive checks over 320/375/414/768/1024/1280/1440 widths passed: no horizontal overflow, clipped controls or speech over controls. Normal-motion run passed cake blowing, portal concealment, universe reveal continuity (17 persistent assets), orbit and reset. Persistent guide instance across all chapters. Zero page/console/HTTP errors on final run.
- Fullscreen ending heart verified in settled fresh browser captures at 320×568, 375×812 and 1440×1000.
- `volume-guide-design.md` records implementation decisions and reproducible debugging findings. Evidence uses headless Chromium/SwiftShader; real-device GPU FPS was not measured.

- Installed project production build and localhost:5173 smoke passed after installation: correct v4 asset bytes, guide, 11 clips and mobile gift→cake flow.
- Final foreground route stays along scene edges/top; speech is hidden during repositioning and follows the actor on arrival.
- Simulated keyboard VisualViewport 375×812→500 px: PIN bottom 414 px, no horizontal overflow; dismiss and unlock passed. Native keyboard was not available in headless Chromium.
- Model inspector pause keeps the selected pose frozen; guide pause uses a separate gentle settling mode.

## Couple replaces final heart — 2026-10-07

- Generated GLB passes `node scripts/check-couple.mjs`: 18 closed volumes, 94,208 triangles, four blinking eyes, eight embedded textures and four seam-free clips. Shared heart/hand rig and portable greeting origin verified.
- Actual animated preview: 312 samples; both independent eye-closing peaks reached 1; heart lift remained in its seated range and returned. Frontal, closed-eye and quarter-view captures inspected.
- Actual story route passed normal two-heart sealing, rotation during sealing, final guide farewell, six iPad/desktop layouts, reduced-motion freeze/open eyes, return to universe, five-heart completion and replay. No page errors or final model/heading overlap. Evidence: `couple-preview-qa.json`, `couple-ending-qa.json`, `couple-model-check.json`.
- Model is intended for a frontal or gently angled view. Browser capture used Chromium/SwiftShader; geometry captures bypassed postprocessing for reliable framebuffer inspection. Real-device GPU performance was not measured.
- Full implementation and debugging notes: `couple-ending-design.md`.

## Universe capsule machine and puzzle props — 2026-10-08

- Two original articulated GLBs load in the real universe: `date-capsule-machine.glb` (1,404,976 bytes) and `memory-puzzle.glb` (508,396 bytes). The puzzle front surfaces use the user's real puzzle photo. No external model download or new dependency was installed.
- Five draws produced the five original messages exactly once each. Save stamps, collection count, starting a new round while retaining saved tickets, Escape and focus restoration passed. Closing/reopening retains the same model object.
- Normal motion verified crank rotation, capsule landing and hemisphere separation. Closing mid-spin pauses progress; reopening finishes one draw. Repeated taps while busy did not create extra results.
- Actual story UI navigation passed from PIN through the portal and the ending. Clicking the visible GLB opens the activity. All 19 orbit wrappers emerged and gathered; the existing final couple and video/closing flow kept their persistent instances. Zero page errors in the completed activity and story runs; no HTTP failures in the activity run.
- Final settled checks cover iPad portrait 834×1194, landscape 1024×768 and desktop 1440×900: no guide/content collision, horizontal overflow or blocked/out-of-view active activity controls. Additional ticket layout captures cover 768×1024 and 1194×834. At 320×568 the panel scrolls vertically; heading, save, collection and return remain usable, with a reserved guide dock and clipped obstacle measurements for offscreen content.
- Fixed two renderer/asset issues during QA: multi-material GLB puzzle pieces load as Groups, so photo mapping now traverses their Mesh children; focused mipmap Bloom produced an empty frame, so the focused machine view uses ACES without that Bloom pass. Final captures use the normal app renderer, not a diagnostic manual render.
- `npm run build` passed. The existing Three engine chunk size warning remains. Browser evidence uses headless Chromium with software WebGL and emulated viewports; physical iPad/Safari GPU performance was not measured.
- Evidence: `universe-activities-qa.json`, `universe-activities-*.png`; implementation details in `universe-activities-design.md`.

## Presentation cinema finale — 2026-10-08

- Prepared the actual `image/Presentaion.MOV` as a fast-start MP4 without re-encoding; verified H.264/AAC playback in Chromium, 1920×1080, 21.333 seconds. A poster was extracted from the actual film. Original MOV preserved.
- Eleven actual media/layout checks passed: invitation and focused viewing, full 16:9 composition, native play/pause/seek/ended, paused web music and SFX suppression, visibility pause, last-frame hold, final wishes, rewatch from the start, keyboard exit and failed-media continuation. Viewports: 834×1194, 1024×768, 1440×900 and 320×740. No horizontal overflow, measured guide/content collisions or blocked/offscreen custom controls.
- Five real story checks passed: normal portal reveals all 19 orbit objects; gathering stores all 19; the same couple instance persists across the invitation and closing; the cinema frame expands through intermediate sizes; five existing cinematic event cues each occur once. Both completed runs had zero page errors.
- Chromium native video controls consumed Escape while focused. CDP tracing showed no DOM Escape or reducer close event; the custom close button worked. The keyboard harness now focuses the web close button before Escape. This was a test focus issue, not a production transition fix.
- Production build passes; the existing Three engine chunk warning remains. Browser evidence uses headless Chromium/software WebGL; physical iPad/Safari, native fullscreen transitions and hardware smoothness were not measured.
- Evidence: `presentation-cinema-qa.json`; private screenshots `presentation-cinema-*.png` are ignored by Git. Details: `presentation-cinema-design.md`.

## Git deployment preparation — 2026-10-08

- User explicitly approved publishing the prepared photos and presentation in the public repository. Nine memory photos, a puzzle photo, the MP4/poster and runtime GLBs are staged; raw originals, nested old checkouts and new browser screenshots are excluded.
- Built a clean checkout from the staged Git tree with `npm ci` and `npm run build`. The two licensed audio recordings downloaded from their original URLs and matched the existing SHA-256 hashes; original effects generated automatically. This does not depend on ignored local media or the macOS conversion tools.
- Production preview at port 4173: initial scene, music activation and 1024×768 layout passed. All 34 runtime personal/model/audio assets returned HTTP 200 with matching hashes. Presentation range request returned HTTP 206 and the requested 1024 bytes. Zero page/HTTP errors in this smoke check.
- Installation reported a build dependency advisory for `source-map-js`; lockfile updated from 1.2.1 to 1.2.2, the patch identified by [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). npm reports zero vulnerabilities after the update.
- Build settings and audio network requirements are documented in `DEPLOY.md`. The pre-existing Three engine size warning remains.
