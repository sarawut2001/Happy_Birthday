# Presentation cinema — 2026-10-08

## Story and interaction

Universe → gather all 19 objects → heart rating → seal → cinema invitation → presentation → couple and final wishes. The seven chapters, original photos, activities and final birthday messages remain intact.

The invitation uses a cream frame, pink rim and a real frame from the film as its poster. The title is **เรื่องของเราสองคน**; the cover button is **ดูเรื่องของเรา ♡**. The guide says **เค้ารวมช่วงเวลาของเราไว้ในคลิปนี้แล้ว มาดูด้วยกันนะ ♡**.

The same frame expands over 1.6 seconds. The guide fades and the background dims. The real film plays inline with native controls, seeking, volume and fullscreen. Its full 16:9 picture is preserved with `object-fit: contain`, including the English credits at the right of the photographs.

At the native `ended` event, the last frame stays visible for at least 800 ms of foreground time, then the frame fades out over 1.5 seconds. Reduced motion skips the hold and transitions immediately. Final wishes return with the couple and the guide's **ยังอยากมีที่รักอยู่ในเรื่องของเค้าไปอีกนาน ๆ เลย ♡**.

**ไปหน้าสุดท้าย** and the close button allow skipping. **ดูเรื่องของเราอีกครั้ง** opens a fresh player at the start without repeating the rating or seal. Failed playback offers an explicit play button; missing media offers continuation. Switching away pauses the film; returning does not automatically resume it.

## Actual media

- Source supplied by the user: `image/Presentaion.MOV`, 24,222,968 bytes, 1920×1080, 30 fps, 21.333 seconds, H.264 video and AAC audio.
- Served film: `public/assets/personal/presentation/our-story.mp4`.
- Real poster from approximately 10 seconds: `public/assets/personal/presentation/our-story-poster.jpg`.
- Configuration: `src/content.ts`.
- Preparation on macOS: `npm run video:prepare` uses `scripts/prepare-presentation.swift` and built-in AVFoundation/AppKit. No new package or media service is required.

Preparation rewraps the original streams as MP4 using passthrough, preserving the encoded picture and audio. Fast-start is enabled: `moov` is before `mdat`. The original MOV is unchanged. The user approved committing the prepared public media for deployment on 2026-10-08. Raw originals and screenshots remain excluded from Git; Vite includes prepared media in the production build. See `DEPLOY.md`.

## Audio, focus and layout

Web music and SFX stay muted throughout watching and closing, including pauses and the final-frame hold. The native video audio remains independent. Leaving the cinema restores the existing web audio preference.

The frame is constrained by both viewport width and height. iPad portrait uses a centered invitation below the couple; landscape and desktop use a wider player. Focused viewing supports a frame up to 1200 px. Close targets are at least 44 px; the footer wraps on narrow screens. The existing focus trap and background inert state remain active.

Escape closes the web dialog when received by it. Native fullscreen and native video controls can consume Escape first. A QA investigation confirmed that Chromium's video controls did so: no DOM Escape or reducer close event occurred, while the custom close button worked. The keyboard test now focuses the web close button before Escape. No production behavior was changed to intercept native controls.

## Verification

`presentation-cinema-qa.json` records the actual media and story runs:

- Real MP4 decoding, 1920×1080 metadata and 21.333-second duration.
- Viewports 834×1194, 1024×768, 1440×900 and 320×740: no horizontal overflow, guide/content overlap, blocked custom controls or clipped custom controls; full 16:9 media.
- Paused viewing keeps web music and SFX muted; simulated visibility changes pause the film.
- Native completion, final-frame hold, closing wishes, replay from zero, keyboard exit and a missing-media continuation.
- Real UI journey from the PIN through gift, cake, letter, portal and universe; all 19 wrappers emerge and gather; the same couple instance persists across the cinema; intermediate frame sizes confirm expansion.
- No page errors in completed runs. Production build passes with the pre-existing Three engine chunk warning.

Browser evidence uses headless Chromium with software WebGL and emulated dimensions. Physical iPad/Safari, native fullscreen transitions and hardware animation performance were not measured. Screenshot evidence contains personal media and is ignored by Git.
