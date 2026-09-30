const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;
export const content = {
  nickname: 'คนโปรด', pin: '180926',
  hint: 'จำวันแรกที่เราเริ่มเป็นแฟนกันได้ไหม? ใส่เป็น วันเดือนปี',
  letter: [
    'สุขสันต์วันเกิดนะเธอ ♡',
    'ปีนี้เราอยากให้ของขวัญที่เก็บความรู้สึกของเราไว้ได้ เลยทำพื้นที่เล็ก ๆ นี้ให้เธอ ค่อย ๆ เปิดไปด้วยกันนะ',
    'ขอบคุณที่เข้ามาเป็นความสบายใจของเรา ขอบคุณทุกวันที่ได้หัวเราะ ได้คุยเรื่องเล็ก ๆ และได้อยู่ข้างกัน ถึงบางวันจะเหนื่อย แค่มีเธอมันก็เบาลงเยอะเลย',
    'ขอให้ปีนี้เธอได้ทำสิ่งที่อยากทำ ได้กินของอร่อย ๆ ได้นอนเต็มอิ่ม แล้วก็ยิ้มเยอะ ๆ ถ้าวันไหนไม่ไหว ยังมีเราอยู่ตรงนี้เสมอนะ',
    'อยากมีวันธรรมดาที่มีเธออยู่ด้วยไปอีกนาน ๆ เลย รักเธอนะ',
  ],
  signature: 'จากเรา คนที่ชอบเธอทุกวัน',
  final: 'ขอให้ทุกปีของเธอ มีเราอยู่ข้าง ๆ นะ',
  // Replace these paths and captions when your photos are ready.
  memories: [
    { image: asset('photos/01.svg'), title: 'วันแรกของเรา', date: '18 · 09 · 26', caption: 'จุดเริ่มต้นเล็ก ๆ ที่ทำให้วันธรรมดาของเราไม่เหมือนเดิมอีกเลย', alt: 'ภาพตัวอย่างวิวท้องฟ้าสีชมพู', sample: true },
    { image: asset('photos/02.svg'), title: 'มื้อโปรดกับคนโปรด', date: 'a little happy day', caption: 'ร้านเดิม อาหารเดิม แต่พอมีเธอนั่งอยู่ตรงข้าม มันพิเศษทุกครั้ง', alt: 'ภาพตัวอย่างโต๊ะกาแฟ', sample: true },
    { image: asset('photos/03.svg'), title: 'ไปไหนก็ได้ ถ้าไปด้วยกัน', date: 'our little adventure', caption: 'บางทริปจำทางไม่ค่อยได้ แต่จำได้ว่าเราหัวเราะด้วยกันเยอะมาก', alt: 'ภาพตัวอย่างภูเขา', sample: true },
    { image: asset('photos/04.svg'), title: 'เย็นวันนั้นที่ไม่อยากให้จบ', date: 'golden hour, with you', caption: 'แสงตอนเย็นสวยนะ แต่คนที่ยืนข้าง ๆ สวยกว่าอีก', alt: 'ภาพตัวอย่างพระอาทิตย์ตกริมทะเล', sample: true },
    { image: asset('photos/05.svg'), title: 'ความสุขเล็ก ๆ ของเรา', date: 'the ordinary, made special', caption: 'ชอบเวลาได้อยู่ด้วยกันเฉย ๆ ไม่ต้องมีอะไรพิเศษก็มีความสุขแล้ว', alt: 'ภาพตัวอย่างดอกไม้', sample: true },
    { image: asset('photos/06.svg'), title: 'และอีกหลายวันต่อจากนี้', date: 'to be continued…', caption: 'ยังมีอีกหลายที่ที่อยากไป อีกหลายเรื่องที่อยากทำกับเธอ มาสร้างความทรงจำเพิ่มกันนะ', alt: 'ภาพตัวอย่างท้องฟ้าดวงดาว', sample: true },
  ],
  // Set to asset('personal/birthday.mp4') after adding your recording.
  video: '', videoPoster: '',
  music: asset('audio/classical-4.mp3'),
  sounds: { gift: asset('audio/sparkle.wav'), letter: asset('audio/page.wav'), photo: asset('audio/camera.wav') },
};
export const chapters = ['ความลับของเรา', 'ของขวัญเล็ก ๆ', 'จดหมายถึงเธอ', 'ความทรงจำ', 'ทุกช่วงเวลาของเรา', 'จากใจเรา'];
