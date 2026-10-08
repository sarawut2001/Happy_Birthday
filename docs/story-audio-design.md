# Story audio — implementation and cues

## Design

Romantic, soft and playful. Short rounded taps/plucks distinguish ribbon, lid, paper-lift and door actions; the existing short page-turn recording marks page interactions. Soft music-box and glass-tone motifs connect scene transitions. The universe uses the main music and event cues; the sustained cosmic ambience loop is disabled because it sounded like a stuck effect. The guide uses a very quiet cue for introductory instructions; text-linked mouth animation remains silent.

### Cosmic loop removal — 2026-10-06

The hook now sends `ambience: false` through every mix update, including video return and visibility recovery. The engine retains its ambience support, but the story never enables it. Verified on the actual local app: normal hold-to-open and warp complete; zero looping buffer sources in the settled universe and rating scene; main music remains playing; photo selection and panel-close cues still fire; mute stops all effect sources. `npm run build` passes. Earlier engine QA includes ambience capability checks and describes the previous configuration.

## Runtime

- `src/audio-cues.ts`: semantic cues, assets, levels, cooldowns and music ducking.
- `src/audio-engine.ts`: one lazily activated AudioContext, streaming music, decoded sample cache, independent effect sources, separate music/effects/ambience buses, master compressor, gain ramps and restrained stereo pan.
- `src/audio.ts`: journey mixer, visibility/video policy and event bridge.
- `src/Scene.tsx`: sounds called from GSAP timelines that animate the matching action.
- `src/App.tsx`: input feedback, hold progress/cancellation, puzzle events, promise transition completion, rating and ending heading completion.
- `scripts/generate-story-audio.mjs`: 13 deterministic original sound files; invoked before dev/build. No additional dependencies.

An explicit click on the sound icon creates/resumes the AudioContext. No soundtrack starts before that click. Muting cancels all voices and hold oscillators. Music continues its playback position across ordinary scene changes. Reading and ending music gain is 0.095; normal is 0.24; important effects duck it to 0.14. Ambience bus is 0.075. These are starting mix values, not perceptual loudness measurements.

## Event map

Times are seconds relative to each owning animation. All timeline cues are cancelled with the animation; no independent scene timeout schedules sound playback.

| Scene/event | Cues and trigger |
| --- | --- |
| Sound on | `welcome`; music/master fade in |
| PIN typing/paste | `tap` once per input change, not six sounds for a paste |
| Locked gift tapped | `nudge`, 0.8 s cooldown |
| Wrong PIN | `pin-wrong` with shake; `pin-reset` at 0.66 with disappearing digits |
| Correct PIN | `unlock` immediately |
| Gift teasing | `gift-tease` on a shake cycle, minimum 7.5 s between sounds |
| Gift opening | `gift-lid` 1.1, `gift-light` 1.4; `cake-arrive` on completed bridge |
| Cake blow | `breath` 0.25, panned from the guide toward center; `wick-out` 1.55 and 1.73; `wish-made` on candles-out |
| 22 formation | `number-form` at start of cake-celebration bridge |
| Birthday card | paper cue on cover rotation 0.45; `celebrate` when confetti scene arrives |
| Card to envelope | `card-close` 0, `card-turn` 0.55 |
| Envelope open | `seal-release` 0, `envelope-flap` 0.6, `paper-rise` 2.45; `paper-ready` on completion |
| Paper to reading | `paper-pull` 0, `paper-settle` 2.95 |
| Reading | no per-letter sounds; `signature` when all graphemes are visible; read-all has a soft tap |
| Paper to door | `paper-fold` 0, `door-appear` 1 |
| Hold lock | sine charge follows 0–1 progress over 1.5 s; releasing/cancelling stops oscillator; incomplete intentional release has `hold-release` |
| Door/warp | `door-unlock` 0, `door-open` 0.35, `suction` 2.1, `warp` 2.95, `arrival` 4.95 |
| Galaxy to heart | `heart-form` 6.15; no sustained cosmic ambience loop |
| Heart to objects | `assets-emerge` 9.15; three `asset-cluster` cues at 9.15, 9.8, 10.45; `world-ready` on actual final asset completion |
| Orbit/hover | silent; reset-camera has `navigate` |
| Photo/card selected | `photo-change` or `panel-open`; pan for photos follows their orbit position |
| Promise | `promise-flip` on select; `promise-reveal` on actual CSS transform completion (immediate for reduced motion) |
| Puzzle | `tile-select`, `tile-swap`; `puzzle-complete` once, including full-image shortcut |
| Activity close | `panel-close`; main music continues |
| Video | all web channels paused for the whole video panel, including play/pause/end/error; closing restores preferred mix |
| Universe gathered | `gather` 0; `gather-complete` on gathered event at approximately 4.65 |
| Rating | `rating-shy` 1–2, `rating-three`, `rating-four`, `rating-five`; latest reaction fades previous rating sound |
| Offer hearts | `heart-offer` 0, `heart-seal` 1.7 |
| Ending | `ending` once when birthday heading finishes appearing; quiet music, no per-line sounds |
| Replay/chapter visit | clear old voices then soft `navigate`; sound preference retained |

## Continuity and cancellation

- Opening, suction, warp, arriving, forming and revealing share an action scope. Phase updates do not recreate the AudioContext. Cosmic ambience is disabled throughout the story, including gathering and rating.
- Important timeline sounds are deduplicated within an action; normal interaction sounds use cooldowns. At most three non-fading one-shot voices play at once.
- Pending asynchronous decodes cannot play after a reset, mute, action change, hidden tab or video opening. Samples arriving more than 400 ms late are skipped.
- Hidden tabs stop transient effects and hold charge and pause music. Returning resumes the preferred music, never a backlog of cues.
- Video panel stays silent even when paused or ended. The video's native controls retain control of its own audio.
- Reduced motion skips cinematic timelines, uses short confirmation motifs for significant cues and cancels active cinematic sound when enabled.

## Evidence

### Transition sound revision — 2026-10-06

The filtered-noise swells in `whoosh.wav`, `warp.wav` and `gather.wav` sounded like waves. Their cue slots now use `magic-transition.wav`, `starlight-travel.wav` and `memory-return.wav`: noise-free tonal phrases with 55 ms attacks, rounded decays and tapered ends. Travel notes rise; memory-return notes descend. Corresponding cue gains are reduced. Asset filenames change to avoid reusing previously cached audio buffers after a reload. Original durations and scene cue timing stay intact; cake breath and paper/hinge effects stay intact.

`story-audio-transition-qa.json` records WAV duration, rate, peak, quiet edges, unchanged-file hashes and browser decode/playback for this revision. The following reports describe the original audio engine/flow validation.

- `story-audio-engine-qa.json`: actual AudioContext signal, activation, buffering, concurrency, deduplication, ambience identity, video, visibility, mute, reduced motion and disposal checks.
- `story-audio-assets-qa.json`: duration, sample rate, peak, RMS and loop seam for all 12 original files.
- `story-audio-qa.json`: normal seven-part journey and interaction cue trace plus tablet reduced-motion flow; browser error and failed HTTP checks.
- Desktop, tablet and baseline phone screenshots verify that sound wiring preserves the scene layout.

Automated checks verify signal and event behavior. Final sound balance can be tuned in `audio-cues.ts` after listening on the intended tablet/desktop speakers or headphones.


## Regression: cached feedback and same-click navigation

A decoded sample was still started through a resolved Promise. When the click also changed the journey scope, the async stale-action guard could discard legitimate feedback before playback. A focused test calls `play('photo-change')` and `setScope('memory')` in the same event; it failed deterministically before the fix.

`StoryAudio` now stores decoded AudioBuffers separately and starts a cached source synchronously in the originating event. Pending decodes retain the scope/epoch/latency guards, so the cancellation policy is preserved. The original same-event regression now passes as part of 17 engine checks. This case was missing from the first isolated engine pass, which exercised scope changes and playback separately.
