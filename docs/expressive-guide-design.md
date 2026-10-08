# Expressive foreground guide — 2026-10-05

## Scope
Tablet and desktop are primary. Existing narrow-screen behavior remains available. Story order, content, source GLB and static deployment are unchanged. No new package is required.

## Placement and motion
- One locked anchor per scene; opening the PIN spotlight, changing cues/ratings, and orbiting do not relocate the actor. Viewport/orientation changes can select a fresh safe anchor.
- Long travel uses a single cubic Bezier with arc-length progress and a single quintic ease, lasting 2.4–5 seconds according to distance. Guide speech waits until arrival.
- Ordinary skeletal clips run at 0.65 speed; blending lasts 1.15 seconds. Cake blowing stays at original synchronized wind/candle speed. Gesture playback occurs once, then rests. Gaze damping and sway are slower and smaller.
- Universe actor width is 96 on tablet, 108 on desktop; tablet prefers the upper edge, desktop prefers a lower edge. Orbit controls publish start/end events to fade the guide while direct exploration is active. Projected card collisions hide it rather than rerouting it. Video hides the entire guide.

## Speech
- Full text is measured with the rendered font; bubble width is intrinsic with a 260/300 px maximum for tablet/desktop and viewport bounds. Its full height is reserved during typing.
- Thai graphemes have a 43–53 ms cadence plus longer punctuation/space pauses. Both the mouth and text use the same elapsed clock, paused during travel, obscuring, hidden tabs and muted scenes.
- Quiet/reaction/hub messages expire only after actual delivery and 3.6–9 seconds of reading time. Feedback clears the prior base cue so it cannot replay on dismissal.

## Facial authoring
- The GLB is never mutated. The web guide creates private materials, small canvases and head-attached curved grids reconstructed from the reference UV surface.
- Eye artwork, eyelashes and glints are preserved; blink and subtle expression scaling animate that artwork. The old painted feature is neutralized below each moving feature, including antialias edges.
- Mouth uses the reference smile for opening/closing and a puckered shape for blowing, plus two small relative geometry morphs. Original facial proportions remain the basis.
- This is silent text-linked animation, not Thai phoneme lip-sync. GLB downloads contain the preexisting body rig; runtime facial surfaces are web code.

## Debug ledger and root causes
1. The first face prototype expected a single SkinnedMesh, but GLTFLoader expands the five material primitives into a Group of SkinnedMeshes. Reproduction and loaded-node inspection confirmed the Group; the authoring code now collects all primitives and samples their combined head surface.
2. Initial patch rectangles rendered black although their canvas pixels were valid skin colors. Material inspection showed inherited vertexColors=true with no COLOR attribute in the new patch geometry. Disabling vertex colors on these private materials restored the reference colors.
3. A faint original mouth outline remained while puckering because antialias pixels escaped the ink threshold. Dilating the feature mask and sampling skin outside the mouth removes the underlying painted outline.
4. The first long story run was interrupted by a deliberate Vite HMR reload during facial refinement; that run is not accepted as validation. Final verification runs on stable source.

## Validation limits
Browser captures use Chromium/SwiftShader and prove state, geometry, positioning and behavior. They are not a hardware GPU FPS benchmark. Facial surfaces are intended for the foreground guide's display size and near-frontal angle.

## Accepted verification
- TypeScript and production build passed.
- Complete seven-part story, reactions, photo/promise/puzzle/video, ratings, replay and persistent model: 60 viewport layouts from 768 to 1920 px, no browser errors or failed HTTP responses.
- Normal animation: text-linked mouth changed across ten samples; PIN feedback did not move the guide; the dock yielded during orbit and kept its position afterward. All 17 universe assets retained identity from reveal to exploration.
- Final activity refinement: 20 panel layouts including 768 portrait, 1024 landscape, 1440, 1920 and a narrow-screen smoke. Guide shrank at the same anchor and its full click rectangle did not overlap the close button.
- Front, quarter, shy, talking, puckering and blinking facial renders were visually inspected.

## Installed project verification
Installed into `/Users/bic-sarawut/Project/HBD` with baseline guards and source backups. Actual production build passed. A fresh localhost:5173 browser verified three facial patches, 0.65 ordinary gesture speed, the original GLB bytes and eleven clips, tablet layout and gift-to-cake flow with no page errors or failed requests. The main dev server is running on port 5173.
