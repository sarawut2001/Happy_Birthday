# Our memory box — Pink 3D birthday surprise

เว็บออนไลน์: [เปิดเซอร์ไพรส์วันเกิด](https://sarawut2001.github.io/Happy_Birthday/) · deploy อัตโนมัติเมื่อ push เข้า `main` ผ่าน GitHub Actions

เว็บ static เซอร์ไพรส์วันเกิดอายุ 22 ปี ใช้ React, TypeScript, Vite, Three.js, React Three Fiber, Drei, GSAP, Motion และ Bloom จาก React Postprocessing

## เปิดในเครื่อง

```sh
npm install
npm run dev
```

เปิด URL ที่ Vite แสดงใน terminal (ปกติ `http://127.0.0.1:5173/`)

```sh
npm run typecheck
npm run build
npm run preview
```

ไฟล์พร้อมโฮสต์อยู่ใน `dist/` ใช้ static hosting ได้ มี `base: './'` รองรับการวางใน subdirectory

สำหรับ deploy จาก Git ใช้ Node 22.12 ขึ้นไป, `npm ci`, build ด้วย `npm run build` และตั้ง output directory เป็น `dist` รายละเอียดอยู่ใน [docs/DEPLOY.md](docs/DEPLOY.md)

## เรื่องราว 7 part

1. กล่องหมุนช้า ๆ + รหัส 180926: ตรวจอัตโนมัติครบ 6 หลัก รหัสผิดเขย่าแล้วล้าง รหัสถูกขยายกล่องเป็น spotlight ให้แตะเปิด
2. เค้กครีมชมพู + เทียน 22: แตะเพื่อเป่า เปลวไฟดับ มีควัน แล้วไปฉลอง
3. อวยพรอายุ 22 ปี: ตัวเลขลูกโป่งและ confetti พร้อมทางไปจดหมาย
4. ซองจดหมาย: แตะเปิดตราและฝาซอง กระดาษเลื่อนขึ้น แล้วแตะอีกครั้งเพื่ออ่าน
5. กระดาษข้อความ: ค่อย ๆ เผยข้อความไทยตาม grapheme มีปุ่มอ่านข้อความทั้งหมด
6. ประตูล็อกหัวใจ + จักรวาล 3D: กดค้าง 1.5 วินาทีเพื่อเปิดประตู กล้องผ่านเข้าไปยังรูปที่เลือกดูได้อิสระ พร้อมเครื่องสุ่มแคปซูลตั๋วเดตและโมเดลจิ๊กซอว์ต่อภาพ 3×3 ลากหมุน ล้อเมาส์/สองนิ้วซูม และคืนมุมกล้องได้
7. ฉากจบ: ของในจักรวาลรวมเข้าหัวใจ เลือกคะแนนหัวใจ 1–5 ดวง แล้วพบคู่ Monchhichi วิดีโอ presentation เรื่องของเรา และข้อความสุดท้าย

คะแนนหัวใจใช้เฉพาะใน session ของหน้าเว็บ ไม่ส่งข้อมูลเข้าเซิร์ฟเวอร์ เล่นใหม่จะรีเซ็ตเรื่องราวทั้งหมด

Canvas อยู่เต็มหน้าจอ ข้อความและปุ่มเป็นชั้นลอยด้านหน้า ไอคอนเสียง/ลดการเคลื่อนไหวอยู่ซ้ายล่าง ตัวบอกลำดับฉากด้านล่างเปิดเมนูกลับไปส่วนที่เปิดแล้วได้ ช่องรหัสไม่มีคำใบ้ เว็บไซต์รองรับ `prefers-reduced-motion` และมีเส้นทางข้อความสำรองเมื่อเครื่องแสดง WebGL ไม่ได้

## เปลี่ยนเนื้อหา

แก้ `src/content.ts`:

- `nickname`, `age`, `pin`, `hint`: คนรับ อายุ และรหัส (ค่า hint เดิมไม่ได้แสดงใน UI)
- `letter`, `signature`, `final`: จดหมาย ลายเซ็น และคำอวยพรสุดท้าย
- `promises`: ข้อความตั๋วเดตห้าแบบ สุ่มโดยไม่ซ้ำจนหมดรอบ
- `memories`: รูป ชื่อ วันที่ คำบรรยาย และข้อความอธิบายภาพ
- `puzzle`: ภาพจิ๊กซอแยกจากรูปความทรงจำ พร้อมคำบรรยายและตำแหน่งโฟกัส
- `video`, `videoPoster`: วิดีโอ presentation และภาพปก
- `music`: เพลงพื้นหลัง; เอฟเฟกต์และระดับเสียงแก้ใน `src/audio-cues.ts`

ใส่รูปและวิดีโอใน `public/assets/personal/` รูปและวิดีโอที่เตรียมสำหรับเว็บนี้รวมใน Git แล้วตามที่เจ้าของอนุญาตเมื่อ 8 ต.ค. 2026 ส่วนต้นฉบับใน `image/` ยังถูก ignore เช่น:

```ts
{
  id: '2026-08-08-01',
  image: asset('personal/01.webp'),
  title: 'วันแรกที่ไปทะเลด้วยกัน',
  date: 'วันที่ของรูปนี้',
  photoDate: '08 · 08 · 2026', // วันที่แบบสั้นที่พิมพ์บนการ์ด 3D
  caption: 'เล่าเรื่องสั้น ๆ ว่าตอนนั้นเกิดอะไรขึ้น และทำไมเราถึงชอบรูปนี้',
  alt: 'เราสองคนยืนริมทะเลตอนพระอาทิตย์ตก',
  sample: false,
}
// ใน content:
video: asset('personal/birthday.mp4'),
videoPoster: asset('personal/video-cover.webp'),
```

ตอนนี้ใช้ภาพจริง 9 ใบ ตั้งแต่ 18 เม.ย. ถึง 2 ก.ย. 2026 และภาพจิ๊กซอแยกอีก 1 ใบ การ์ด 3D เป็นแนวตั้ง 3:4 แตะรูปใดก่อนก็ได้ วันที่จากชื่อไฟล์อยู่บนการ์ดและหน้าดูภาพเต็ม

ไฟล์ต้นฉบับอยู่ใน `image/` รัน `npm run photos:prepare` เพื่อคัดลอกไป `public/assets/personal/` ด้วยชื่อที่ใช้ใน `src/content.ts` คำสั่งนี้ไม่แก้ไขต้นฉบับ เมื่อ build แล้ว Vite จะนำรูปไปไว้ใน `dist/assets/personal/` ด้วย

จิ๊กซอใช้ `content.puzzle.image` โดยครอปเฉพาะการแสดงผลให้โฟกัสตัวคนและโทรศัพท์ หลังต่อครบหรือกดดูภาพเต็มจะแสดงต้นฉบับแนวตั้ง ไม่ใช้วันที่ของรูปเดทแทนวันที่ของจิ๊กซอ วิดีโอใช้ controls และ playsInline เพลงและเสียงเว็บพักตลอดเวลาที่เปิดหน้าวิดีโอ

## วิดีโอ presentation ในฉากสุดท้าย

ใช้ต้นฉบับ `image/Presentaion.MOV` (1920×1080, H.264/AAC, 21.3 วินาที) เตรียมไฟล์สำหรับเว็บบน macOS ด้วย:

```sh
npm run video:prepare
```

คำสั่งนี้ใช้ AVFoundation ที่มีใน macOS เพื่อจัดวิดีโอเป็น MP4 แบบ passthrough พร้อม fast start และดึงภาพปกจากวินาทีที่ 10 ไฟล์ต้นฉบับคงเดิม ผลลัพธ์อยู่ใน `public/assets/personal/presentation/` และรวมใน Git สำหรับ deploy แล้ว เมื่อ build จะรวมใน `dist/` ด้วย ไม่ต้องรันคำสั่งนี้บนเครื่อง deploy

ฉาก “เรื่องของเราสองคน” เปิดจากปกภาพคู่ ขยายเป็นจอ 16:9 มี native controls และ fullscreen เพลง/เสียงเว็บหยุดตลอดช่วงดูและพักวิดีโอ ดูจบพักเฟรมท้ายประมาณ 0.8 วินาทีก่อนกลับไปคำอวยพร สามารถข้ามและดูซ้ำจากต้นคลิปได้ ดูรายละเอียดใน `docs/presentation-cinema-design.md`

รหัสในเว็บ static มีไว้เพิ่มความสนุกในการเปิดของขวัญ

## กิจกรรมในจักรวาล

เครื่องแคปซูลและจิ๊กซอว์เป็น GLB คนละโมเดล สร้างจาก `scripts/build-activity-models.mjs` รัน `node scripts/build-activity-models.mjs` เพื่อสร้างไฟล์ใหม่ โดยไม่ต้องใช้บัญชีบริการโมเดล

เครื่องสุ่มมีมือหมุน แคปซูลตกลงถาด และแยกฝาเมื่อแตะเปิด ก่อนเผยตั๋วเดตที่เก็บและกลับไปดูได้ สุ่มครบห้าแบบแล้วเริ่มรอบใหม่ได้ ตั๋วที่เก็บยังอยู่ในรอบใหม่ ออกจากกิจกรรมระหว่างแอนิเมชันแล้วกลับเข้ามาจะเล่นต่อจากเดิม ข้อมูลอยู่เฉพาะการเปิดหน้าเว็บครั้งนั้น รีโหลดหรือเล่นเรื่องราวใหม่จะรีเซ็ต ดูรายละเอียดใน `docs/universe-activities-design.md`

## เสียงและเครดิต

ไฟล์ Mixkit ไม่ถูก commit เข้า Git `predev` และ `prebuild` ดาวน์โหลดเพลงกับเสียงพลิกกระดาษที่ใช้อยู่จากแหล่งเดิมเมื่อไฟล์ยังไม่มี พร้อมตรวจ SHA-256 และสร้างเอฟเฟกต์ของโปรเจคอัตโนมัติ เครื่อง deploy ต้องเข้าถึง `assets.mixkit.co` ได้ ดูแหล่งที่มาใน `docs/ASSET-CREDITS.md`

กล่อง Present โดย J-Toastie จาก Poly Pizza ใช้ CC BY 3.0 มีเครดิตใน `docs/ASSET-CREDITS.md` และไฟล์ `asset-credits.txt` ที่แจกพร้อมเว็บ เค้ก เทียน ตัวเลข ซอง ประตูล็อกหัวใจ การ์ด หัวใจ วงแสง และ confetti สร้างในโค้ด

## โครงสร้าง

- `src/journey.ts`: สถานะและเงื่อนไขการเปลี่ยนฉาก ป้องกันแตะซ้ำและข้ามลำดับ
- `src/App.tsx`: UI รหัส จดหมาย การ์ด ต่อภาพ วิดีโอ และคะแนน
- `src/Scene.tsx`: วัตถุ 3D กล้อง OrbitControls, shader จุดแสง ประตู การ์ดแบบ raycast และลำดับ GSAP
- `src/styles.css`: layout กลาง สี วัสดุ UI และ responsive
- `src/audio.ts`: เพลงและเสียงประกอบ
- `docs/VIDEO-SCRIPT.md`: สคริปต์วิดีโออวยพร
- `docs/QA.md`: ผลตรวจและข้อจำกัดที่ยังต้องตรวจเมื่อมีสื่อจริง

## การสำรวจจักรวาล

รูปไม่มีลำดับก่อน/ถัดไปและกิจกรรมไม่บังคับเล่นต่อกัน คลิกหรือแตะวัตถุเพื่อเปิด ปิดด้วยปุ่ม × หรือ Escape แล้วกลับไปมุมเดิม ลากเกิน 8px จะไม่เปิดวัตถุเมื่อปล่อยเมาส์ ผู้ใช้คีย์บอร์ดเลือกวัตถุผ่านปุ่มที่ปรากฏเมื่อโฟกัสได้ โหมดลดการเคลื่อนไหวยังหมุน/ซูมกล้องตามการควบคุมได้

ภาพ design ล่าสุด: `docs/immersive-desktop.png`, `docs/immersive-mobile.png`, `docs/immersive-envelope.png`.

## Cinematic revision

ลมเป่าเค้กเดินทางถึงไส้เทียนก่อนเปลวไฟเอนและดับ ฉาก 22 ใช้เลขทรงหนาเคลือบเงาและการ์ดอวยพรที่คลี่เปิด โมเดลทำในโค้ด ไม่ต้องดาวน์โหลด asset เพิ่ม

หลังเปิดประตู ลำดับประมาณ 12 วินาทีคือ เปิด → ดูดเข้า → วาร์ป → ถึงกาแล็กซีหมุนช้า → จุดแสงก่อรูปหัวใจ → รูปและการ์ดออกจากหัวใจ ก่อนเปิดการลากหมุนและซูม ในโหมดลดการเคลื่อนไหวจะเข้าสู่จักรวาลที่พร้อมสำรวจทันที

ก่อนให้คะแนน รูปทุกใบ การ์ดทั้งสาม ข้อความตกแต่ง หัวใจเล็ก และฝุ่นกาแล็กซี รวมกลับเข้าหัวใจ วัตถุชุดเดียวกันอยู่ต่อระหว่างการเปลี่ยน part หน้าให้คะแนนมีหัวข้อและหัวใจ 5 ดวง คำอวยพรอยู่ที่ฉากสุดท้าย การให้คะแนนเก็บเฉพาะในหน้านี้และไม่เปลี่ยนคำอวยพร

ภาพล่าสุด: `docs/cinematic-22.png`, `docs/cinematic-warp.png`, `docs/cinematic-ending.png`, `docs/cinematic-mobile.png`.


### Continuous universe and playful feedback (2026-10-02)

The portal intro hands its camera pose to the same OrbitControls instance. Every photo and card finishes its emergence before exploration starts; the explore hint fades in over 0.85 seconds. A wrong six-digit PIN makes the gift sway, sweeps light across the slots and removes the digits in sequence before focusing the cleared input. Committed heart ratings trigger a brief particle face: shy at 1–2, hopeful at 3, a wink at 4 and a happy pulse at 5. Any score can be confirmed immediately and receives the complete ending. Reduced motion skips these reactions. See `docs/QA.md` for the handoff measurements and interaction checks.

### แอนิเมชั่นต่อเนื่องทุก part (2026-10-02)

`StorySequence` เก็บโมเดลฉากเดิมและฉากถัดไปไว้พร้อมกันขณะเปลี่ยน part ใช้ timeline ส่งต่อโมเดล หัวใจแสง และกล้อง ปุ่มฉากถัดไปจะแสดงหลัง timeline จบ จึงไม่ต้องปิดหน้าจอด้วยสีชมพูทุกครั้ง

| ช่วง | การส่งต่อ | เวลาโดยประมาณ |
| --- | --- | --- |
| กล่อง → เค้ก | ฝาเปิด เค้กออกจากกล่อง กล่องค่อย ๆ เลื่อนลง | 4.1 วินาที |
| เค้ก → 22 | ลมถึงเทียนก่อนดับ ควันและจุดแสงวาดเลข 22 เค้กย่อเป็นของตกแต่ง | เป่า 3.3 + ส่งต่อ 2.85 วินาที |
| การ์ด → ซอง | การ์ดปิดและหมุน ซองค่อย ๆ แทนที่ หัวใจแสงไปที่ตราซอง | 3.05 วินาที |
| ซอง → กระดาษ | กระดาษชิ้นเดิมออกพ้นปากซองก่อนเลื่อนมาด้านหน้า ซองเลื่อนลง | 3.1 วินาที |
| กระดาษ → ประตู | ข้อความจาง กระดาษพับสองด้าน หัวใจแสงเดินทางไปล็อก | 3.35 วินาที |
| ประตู → จักรวาล | พลังตอนกดค้างค่อย ๆ ลดเมื่อปล่อย ประตูชิ้นเดิมเปิดเข้าสู่กาแล็กซี | ตามลำดับ cinematic เดิม |
| จักรวาล → ฉากจบ | วัตถุเดินทางตามเส้นโค้งพร้อมหางแสง คะแนนรวมเข้าหัวใจ จุดแสงค่อย ๆ เปลี่ยนเป็นหัวใจทึบ | รวมวัตถุ 4.65 + ปิดหัวใจ 3.3 วินาที |

แสงฉากและพื้นหลังเปลี่ยนอย่างค่อยเป็นค่อยไป ขณะเปิดรูปหรือการ์ด วัตถุอื่นจะลดความเด่นและกลับสู่ตำแหน่งเดิมเมื่อปิด เพลงลดระดับจาก 0.24 เป็น 0.10 ช่วงอ่านจดหมายและเปิดหน้าวิดีโอ แล้วคืนระดับอย่างนุ่มนวล เพลงยังพักเมื่อวิดีโอเล่นจริง โหมดลดการเคลื่อนไหวข้ามการส่งต่อและคงลำดับเรื่องเดิม

ภาพผลตรวจล่าสุด: `docs/story-gift-cake.png`, `docs/story-22.png`, `docs/story-continuous-universe.png`, `docs/story-ending.png`, `docs/story-mobile-paper-fold.png`, `docs/story-mobile-ending.png`.

## Monchhichi — reference likeness correction (2026-10-03)

ตัวละครใช้ GLB Meshy ที่ผู้ใช้ให้มาเป็นฐาน ฉายภาพผิวด้านหน้าเป็น texture atlas ใหม่ แล้วสร้างผิวปิดแยกตามขอบรูปหัว ลำตัว แขน ขา และหาง รักษาใบหน้าและผ้ากันเปื้อน เพิ่มความโค้งด้านหน้าเล็กน้อยและปริมาตรด้านหลัง หัวติดตามกระดูกชิ้นเดียวเพื่อไม่ให้แก้ม/คางบิด แขนและมือใช้ทรงจาก ref พร้อม skin weights แทนแขนแคปซูลของรุ่นก่อน มีโครงกระดูก 16 ข้อและ 11 ท่า ด้านข้าง/หลังเป็นรูปทรงที่ออกแบบเพิ่มจาก ref ซึ่งเดิมมีลักษณะเป็นแผ่นบาง

- `public/assets/models/monchhichi.glb`: ไฟล์ที่เว็บโหลดจริง มี texture สีฝังในไฟล์และ 11 clips: Idle, Walk, Wave, Celebrate, Shy, Float, Hug, Present, Invite, Blow, Thanks
- `public/assets/models/monchhichi-meshy-source.glb`: สำเนาต้นฉบับสำหรับปุ่มเปรียบเทียบ โหลดเฉพาะเมื่อเปิดดูต้นฉบับ
- `src/monchhichi-model.ts`: source สำหรับขึ้นรูป rig และ animation; ไม่ประมวลผลการสร้างโมเดลในเกม
- `src/Monchhichi.tsx`: clone โครงกระดูกของแต่ละตัวด้วย SkeletonUtils, แยกวัสดุ และ blend ท่า 0.45 วินาที

เปิด `/?preview=monchhichi` เพื่อเทียบกับ Meshy ต้นฉบับ หมุน/ซูม เลือก 11 ท่า และดาวน์โหลด GLB ที่ตรงกับไฟล์ที่กำลังใช้งาน ปุ่มหยุดคงเฟรมปัจจุบัน; เลือกท่าใหม่ขณะหยุดจะเปลี่ยนเป็นเฟรมแรกของท่านั้น ปุ่ม “เทียบท่าอ้างอิง” คืนท่าโบกมือที่เฟรมแรกและมุมด้านหน้าให้เทียบได้ แม้กดซ้ำขณะท่าเดิมกำลังเล่น

ตัวละครนำทางทั้ง 7 part: ต้อนรับหน้าใส่รหัส, ร่วมเป่าเค้ก, ฉลอง 22, ชวนเปิดซอง, รอขณะอ่านจดหมาย, ชวนเข้าจักรวาลและอธิบายกิจกรรม, ขอบคุณคะแนนและส่งท้าย ตัวละครอยู่ในแถบด้านหน้า รูปและการ์ดในจักรวาลยังเป็นวัตถุชุดเดิมระหว่างโผล่/สำรวจ/รวมกลับเข้าหัวใจ

### สร้างโมเดลซ้ำ

เปิด dev server แล้วเข้า `/scripts/build-monchhichi.html` กดสร้างเพื่อดาวน์โหลด GLB ใหม่จาก source Meshy ที่เก็บไว้ นำไฟล์ที่ได้แทน `public/assets/models/monchhichi.glb` แล้วเปิดพรีวิวตรวจทุกมุมและท่าทางก่อนใช้งาน เครื่องมือนี้สำหรับพัฒนาเท่านั้นและไม่เป็นส่วนหนึ่งของ production entry

```sh
npm run check:model
npm run build
```

รายละเอียดการทดสอบและข้อจำกัด: `docs/QA.md` ส่วน Reference likeness correction; เครดิต asset: `docs/ASSET-CREDITS.md`.

## Monchhichi ผู้นำทาง — 2026-10-04

Monchhichi เป็นผู้นำทางต่อเนื่องทั้ง 7 part ในแถบด้านหน้าหลัง header ใช้ Canvas โปร่งใสแยกจากโลกหลัก จึงมองเห็นชัดขณะเปิดรูปหรือกิจกรรม และไม่เป็นวัตถุที่โคจรหรือรวมกลับเข้าหัวใจ กล่องข้อความแบบมังงะอยู่ข้างตัวละครในพื้นที่คนละช่อง ส่วนหางกล่องติดตามตำแหน่งหัวที่ฉายจากกล้องของ guide

คำแนะนำและข้อความตอบสนองจากการแตะมาจาก guide เพียงชุดเดียว: เปิดของขวัญและรหัสผิด → อธิษฐาน/เป่าเค้ก → ฉลอง 22 ปี → เปิดซอง/อ่านกระดาษ → อ่านจดหมายแบบสงบ → เปิดประตู/สำรวจจักรวาลและกิจกรรม → ให้คะแนนและส่งท้าย ข้อความจดหมาย รูปพร้อมวันที่/คำบรรยาย คำสัญญา และคำอวยพรยังอยู่บนพื้นที่อ่านของแต่ละฉาก

- แตะตัวละครเพื่ออ่านข้อความคำแนะนำอีกครั้ง ไม่มีคำใบ้รหัส
- Guide เงียบระหว่างการเปลี่ยนฉาก วาร์ป รวมวัตถุ และปิดหัวใจ; การกลับจากกิจกรรมสู่จักรวาลไม่เริ่มคำแนะนำสำรวจซ้ำ
- ระหว่างอ่านจดหมายหรือรูป ตัวละครพักการเคลื่อนไหวและใช้แถบขนาดเล็ก ข้อความครบจาก typewriter จะเก็บคำแนะนำถัดไปไว้ให้แตะ repeat โดยไม่พูดแทรก ขณะวิดีโอเล่นจะซ่อนคำพูดและพักตัวละคร
- คำพูดค่อย ๆ แสดงตาม grapheme ภาษาไทย ส่วน screen reader ได้ข้อความเต็มผ่านสถานะเดียว โหมดลดการเคลื่อนไหวแสดงข้อความทันที มีไอคอนสำรองเมื่อ WebGL หรือโมเดลเปิดไม่ได้

GLB ใช้ geometry, front atlas, วัสดุ และกระดูก 16 ข้อจากรุ่นที่แก้ likeness แล้ว เพิ่มสี่ท่า `Present`, `Invite`, `Blow`, `Thanks` รวมเป็น 11 clips พร้อมท่าเดิม `Idle`, `Walk`, `Wave`, `Celebrate`, `Shy`, `Float`, `Hug` การขยับยังใช้กระดูกลำตัว/แขน/มือ โดยไม่ได้เพิ่ม rig ใบหน้าหรือนิ้วแยก

ไฟล์เพิ่มเติม: `src/guide-controller.ts` เลือก cue และ feedback, `src/Guide.tsx` แสดงตัวละคร/ข้อความและส่งตำแหน่งปากสำหรับลมเป่าเค้ก, `src/guide.css` จัดแถบ guide และ responsive ดูตารางแต่ละฉากและสัญญาการเชื่อม UI ที่ `docs/guide-design.md` ผลตรวจจริงบันทึกเพิ่มใน `docs/QA.md`.


### Monchhichi foreground guide v4 (2026-10-05)

The supplied frontal texture now wraps rounded anatomical volumes, with shaped cheeks/nose and separate fur, skin, cloth and nose materials. The guide moves between scene edges on top of a full viewport Canvas. Placement protects projected props, reading/media panels, PIN and actions; world card bounds are evaluated after orbit motion settles. Long moves float and short steps follow distance.

Interrupted gestures preserve their current action weights and phase. A bow/wave finishes independently of bubble expiry; reading/video settle into a quiet pose. See `docs/volume-guide-design.md` and the `volume-guide-*` screenshots/QA reports. Original Meshy input remains unchanged. Side/back form is interpreted from frontal reference; facial/finger animation is not rigged.


### Expressive guide — tablet and desktop (2026-10-05)

The guide keeps one screen anchor per scene. PIN feedback, rating changes and orbit movement update its expression/text without rerouting it. Scene travel follows one arc with distance-based 2.4–5 second timing; ordinary gestures run at 0.65 speed with 1.15 second blending. Cake blowing retains its shared wind/candle timing.

The universe dock is 96–108 px wide on tablet/desktop, yields while orbiting or when a projected card overlaps it, and stays compact in photo/activity panels. The main scene remains full viewport. Speech width follows the full Thai message, starts after travel, and expires after delivery plus reading time.

`src/monchhichi-face.ts` adds three curved, head-attached facial surfaces using the existing atlas: blinking eyes, gentle/shy/excited expressions and animated/puckered mouth. Small mouth morph targets supplement the artwork. A shared Thai grapheme timeline in `src/guide-speech.ts` drives both visible text and silent mouth motion, with punctuation pauses. This is text-linked visual speech; no generated voice or phoneme-aligned audio has been added. The original GLB and downloadable GLB remain unchanged; facial animation is a runtime website layer.

See `docs/expressive-guide-design.md`, `docs/expressive-guide-face-qa.json`, and `docs/expressive-guide-story-qa.json` for behavior, validation and screenshots.


## เสียงตามอีเวนต์ทั้ง 7 ฉาก

ใช้ Web Audio API แยกเพลง บรรยากาศ และเอฟเฟกต์ พร้อม fade, ducking, stereo pan และจำกัดเอฟเฟกต์เด่นพร้อมกัน 3 เสียง เสียงถูกเรียกจาก timeline ที่ขยับวัตถุ ไม่ได้หน่วงด้วย timer แยกฉาก

- เอฟเฟกต์ต้นฉบับ 12 ไฟล์สร้างอัตโนมัติด้วย Node.js เมื่อ `npm run dev` หรือ `npm run build`; สร้างเองได้ด้วย `npm run audio:generate`
- เพลง `classical-4.mp3` และเสียง Mixkit `page.wav`, `sparkle.wav` ยังต้องเตรียมตามเครดิตเดิม
- กดไอคอนเสียงเพื่อเริ่ม เพลงและเสียงเอฟเฟกต์เปิด/ปิดด้วยไอคอนเดียว
- จักรวาลใช้ ambience ตัวเดิมต่อเนื่องระหว่าง forming, revealing และ exploring
- หน้าวิดีโอพักทุกช่องเสียงจนปิดหน้า แม้ pause หรือวิดีโอจบแล้ว
- ปิดแท็บ ปิดเสียง ย้อนฉาก และ replay จะล้างเสียงค้าง; เปิดกลับไม่เล่นอีเวนต์เก่าชดเชย
- โหมดลดการเคลื่อนไหวข้ามเสียงเดินทางยาวและยังมีเสียงยืนยันสั้น

รายละเอียด cue และผลตรวจ: `docs/story-audio-design.md`, `docs/story-audio-qa.json`, `docs/story-audio-engine-qa.json`, `docs/story-audio-assets-qa.json`.

## โมเดลคู่ในฉากจบ

ฉากจบใช้ Monchhichi สองตัวถือหัวใจจากภาพที่ให้มา เป็นโมเดลผิวนูน 3D สำหรับมุมด้านหน้าและเฉียงเล็กน้อย มีท่าหายใจ กระพริบตาคนละจังหวะ ขยับหัว/โบว์/หาง และยกหัวใจเบา ๆ มือจับหัวใจขยับด้วยกัน

- ดูเทียบกับภาพต้นฉบับ: `http://127.0.0.1:5173/?preview=couple`
- ไฟล์: `public/assets/models/monchhichi-couple.glb` — texture และ 4 animation clips อยู่ในไฟล์
- ตรวจโมเดล: `node scripts/check-couple.mjs`
- สร้างใหม่: เปิด `/scripts/build-couple.html` ขณะรัน Vite แล้วดาวน์โหลด GLB มาแทนไฟล์ใน public
- รายละเอียดฉากและผลตรวจ: `docs/couple-ending-design.md`
