# Monchhichi foreground guide — 2026-10-04

## Visual and content contract

The guide is one persistent Monchhichi in a separate transparent Canvas, followed by one manga speech bubble in the foreground band after the header. Separate actor/bubble columns prevent overlap. The main scene retains its full gift/cake/letter/universe presentation below the reserved band; activity dialogs encompass the guide and their content.

The guide provides instructions and short interaction feedback. The birthday letter, signature, photo dates/captions, revealed promises, birthday card and final wishes retain their original content surfaces. No PIN hint is introduced. These are written speech cues; the guide does not synthesize an audio voice.

The model keeps the corrected source geometry, projected artwork, materials and 16-joint rig. Eleven clips are available: Idle, Walk, Wave, Celebrate, Shy, Float, Hug, Present, Invite, Blow, Thanks. The four additions animate the existing skeleton; there is no face/mouth expression rig or individually rigged fingers.

## Scene to cue and pose mapping

| Part / state | Guide text or behavior | Pose |
| --- | --- | --- |
| 1 · locked gift | ใส่รหัส 6 หลัก แล้วไปเปิดของขวัญกัน ♡ | Wave |
| 1 · tap gift before unlocking | ต้องปลดล็อกก่อนน้า ใส่รหัสได้เลย ♡ | Present |
| 1 · rejected six digits | อ๊ะ ยังไม่ใช่น้า ลองอีกที ♡ | Shy |
| 1 · unlocked spotlight | ปลดล็อกแล้ว! แตะกล่องเพื่อเปิดเลย ♡ | Present |
| 2 · candles lit | อธิษฐานก่อนนะ แล้วแตะเค้กเพื่อเป่า ♡ | Present |
| 2 · airflow/candle blowing | ฟู่… ขอให้คำอธิษฐานเป็นจริงนะ ♡ | Blow |
| 2 · candles out without an active bridge | เทียนดับแล้ว ไปฉลองกันเลย ♡ | Celebrate |
| 3 · birthday 22 | สุขสันต์ 22 ปีน้า! มีจดหมายรออยู่ด้วย ♡ | Celebrate |
| 4 · envelope closed | แตะซองนี้ได้เลย มีข้อความถึงเธอ ♡ | Present |
| 4 · paper ready | กระดาษออกมาแล้ว แตะเพื่ออ่านได้เลย ♡ | Present |
| 5 · reading letter | ค่อย ๆ อ่านได้เลย เค้าเขียนถึงเธอไว้นะ ♡; speech fades, actor pauses | Idle |
| 5 · typewriter complete | Cache เมื่ออ่านพร้อมแล้ว ไปดูโลกของเรากัน ♡ for an intentional repeat tap | Idle |
| 6 · heart door | กดหัวใจค้าง แล้วตามมาเลย ♡ | Invite |
| 6 · released hold early | อีกนิดนึง กดหัวใจค้างไว้จนเต็มนะ ♡ | Invite |
| 6 · exploration first arrival | ลากดูรอบ ๆ แล้วแตะรูปหรือการ์ดที่ชอบได้เลย ♡ | Invite |
| 6 · return from an activity | No automatic exploration speech; repeat can retrieve the hint | Idle |
| 6 · photo dialog | รูปนี้มีเรื่องน่ารัก ๆ อยู่ด้วยนะ ♡; quiet reading, photo/date/caption remain primary | Idle |
| 6 · promise dialog | เลือกการ์ดหนึ่งใบได้เลย ♡ | Present |
| 6 · promise chosen | ใบนี้ตั้งใจให้เธอเลยนะ ♡; revealed promise stays on its content surface | Thanks |
| 6 · puzzle dialog | แตะภาพสองชิ้นเพื่อสลับกันนะ ♡ | Present |
| 6 · first tile selected | เลือกอีกชิ้นเพื่อสลับกันได้เลย ♡ | Present |
| 6 · two tiles swapped | สลับแล้ว เลือกอีกสองชิ้นต่อได้เลย ♡ | Present |
| 6 · puzzle complete | ครบแล้ว! เก่งมากเลย ♡ | Celebrate |
| 6 · video dialog before playing | มีข้อความที่อยากบอกเธอด้วยตัวเองด้วยนะ ♡ | Idle |
| 6 · video playing | No speech; actor paused | Idle |
| 6 · video ended | กลับไปดูรูปอื่น ๆ ต่อได้เลย ♡ | Thanks |
| 6 · video error | คลิปยังเปิดไม่ได้ กลับไปดูความทรงจำต่อได้นะ ♡; direct error remains in video content | Idle |
| 7 · rating ready | เลือกหัวใจให้เซอร์ไพรส์นี้ได้เลย ♡ | Thanks |
| 7 · committed score 1–4 | ได้ {n} หัวใจแล้ว ขอบคุณน้า ♡; no request to increase the score | Shy |
| 7 · committed score 5 | เย้! ห้าหัวใจเต็มเลย ขอบคุณน้า ♡ | Celebrate |
| 7 · ending | After final wishes begin, ขอให้วันนี้เป็นวันที่น่ารักที่สุดเลยนะ ♡ | Thanks |
| Any story bridge / gathering / sealing | Speech muted; actor can float within the guide band | Float |
| Warp, arrival, heart forming/revealing | Guide hidden until exploration; not part of orbit or gathering assets | Paused |

Ending speech is delayed 6.2 seconds in normal motion so the final wishes have room to appear first. Quiet base messages fade after 5.6 seconds. Interaction feedback replaces the current direction for about 4.6 seconds, or 5.2 seconds for celebration feedback. These timings belong to speech presentation and do not advance the journey.

## Frontend architecture

| File | Responsibility |
| --- | --- |
| `journey.ts` | Owns the seven-part journey, transitions and valid story actions |
| `App.tsx` | Connects input/activity events to the guide and retains controls, dialog focus, content and media state |
| `guide-controller.ts` | `useGuide(journey, {ready, videoPlaying, reduced})` returns `{cue, say, repeat}`; state-scoped messages, reaction priority, quiet timers and first-hub memory |
| `Guide.tsx` | Separate Canvas, fixed front orthographic camera, actor loading/fallback, Thai grapheme reveal, one accessible status, repeat button, projected head/mouth anchors |
| `guide.css` | Foreground band, separate actor/bubble columns, responsive type/wrapping and quiet-reading variant |
| `Monchhichi.tsx` | Loads the shared GLB, clones skeletons/materials and blends clips per actor |
| `monchhichi-model.ts` | Offline source reconstruction and eleven authored skeletal clips |
| `Scene.tsx` | Main world animation and airflow, with viewport mouth coordinates supplied from the guide |

### Event contract

`say(event: GuideEvent)` accepts `pin-nudge`, `pin-wrong`, `hold-cancel`, `letter-complete`, `puzzle-selected`, `puzzle-swapped`, `puzzle-complete`, `promise-picked`, `video-ended`, `video-error`. The controller ignores events that do not belong to the current part/activity, and scopes reactions so they do not leak into the next scene. Letter/puzzle completion is handled once per entry.

`letter-complete` stores its direction for `repeat()` and does not interrupt reading. A repeat tap can restore a faded cue, including the exploration direction after returning from a dialog. Replay resets the first-hub memory. `video-ended` and `video-error` can queue their feedback before the parent playing flag clears; speech stays muted until playback is inactive.

### Projection and performance

The guide Canvas has its own camera, lighting and model instance. Head-bone projection with a face offset sets the bubble tail height; mouth-bone projection publishes `{x, y}` in viewport pixels through `onMouthAnchor`. Positions are forwarded only after movement exceeds one pixel, using refs/CSS updates rather than per-frame React state. These offsets locate painted facial artwork and do not animate a facial rig.

Cake publishes the wick center into a second viewport ref. A short SVG wind bridge shares those two anchors across the full viewport, including the reserved guide band above the main Canvas. Four fine ribbons and eight sparks arrive around 1.15–1.3 seconds and fade by 1.82 seconds. Existing 3D airflow, wick impact and flame extinguishing remain owned by Cake's timeline. The bridge is one shot, ignores pointer events, pauses when the document is hidden, and cleans up its animation frame.

The Canvas uses demand rendering while reading is paused, video plays, reduced motion is active, or warp hides the guide. Normal cues and transition floating can animate continuously. Full text is announced once in a polite atomic status; animated graphemes are hidden from assistive technology. Text/controls remain usable when a fallback icon replaces WebGL.

## Verification

The staging TypeScript check passed during integration. Final visual, interaction, responsive, asset and installed-project evidence is recorded in `QA.md` after the final candidate is checked. This design document does not claim a browser pass.
