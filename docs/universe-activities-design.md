# Universe activities — 2026-10-08

## Props and continuity

The two former matching activity cards are replaced by distinct original GLBs: a pink capsule machine for the date draw, and three curved, thick puzzle pieces for the memory game. The first two puzzle fronts use the real puzzle photograph; the third has a lavender finish. Labels remain legible, facing the camera, while the props retain perspective and gentle independent motion.

The selected capsule machine is the same object in the universe and in its activity. A measured DOM anchor drives its world position and apparent size with damping. Opening the activity saves the universe camera, moves to a clear presentation angle, and restores the saved angle on return. Other orbit objects dim; they are not remounted. The original emission and gathering wrappers and their names remain intact.

The scene uses ACES tone mapping throughout. The focused capsule view omits mipmap Bloom: on the tested renderer that pass produced an empty composition despite visible geometry and valid camera projection. A direct-render diagnostic and a controlled Bloom removal isolated the failure to the postprocessing path. The universe keeps its existing Bloom. Final browser verification must use the normal render path, not a manual renderer call.

## Date draw

1. **Ready:** Monchhichi invites the user to turn the crank. The machine or “หมุนเลย ♡” starts one draw.
2. **Spinning, 3.4 seconds:** the crank makes one eased revolution, stock capsules stir lightly, one capsule descends and settles on the tray. Busy controls reject repeated taps.
3. **Capsule:** the user taps the capsule or “เปิดแคปซูล”.
4. **Opening, 1.65 seconds:** the capsule lifts, the halves separate, and its contents become a paper date ticket.
5. **Revealed:** the original message, a matching icon and ticket number appear. A save action stamps the ticket. The collection includes opened tickets and marks saved ones.
6. **All five:** a new round resets the draw pool while retaining saved tickets. Each round samples only unopened indices.

`src/date-machine.ts` owns guarded state and the animation progress outside the panel, so closing the panel pauses a draw and reopening resumes it. Hidden tabs pause timers. Reduced motion reaches each user-controlled step immediately. The original five messages remain unchanged in `src/content.ts`. Reloading or story replay clears the in-memory collection.

## Guide and sound

Instructions and reactions come from Monchhichi. Guide masks protect the model, heading, ticket, actions and collection. The activity uses a smaller guide size on tablet/desktop to keep the controls clear.

Six short cues cover crank, tumble, landing, capsule opening, paper and save. They use existing synthesis and the existing tonal paper asset, with per-draw deduplication. No sustained ambience or wind cue is added.

## Responsive and keyboard behavior

The layout prioritizes iPad portrait/landscape and desktop. The result ticket stays central, while the machine moves into a smaller side position. Narrow layouts keep the same actions with wrapping and vertical panel scroll. The collection makes the underlying activity inert; Escape closes the collection first and returns focus to its opener. Existing world-dialog dismissal and keyboard object selection remain available.

## Asset provenance

The researched downloadable Sketchfab alternatives required account authentication for the download API. The implementation therefore uses the plan's original-model fallback. Both production meshes were authored locally and exported as GLB; they are not presented as downloaded third-party assets. Run `node scripts/build-activity-models.mjs` to reproduce them. There are no new package dependencies.
