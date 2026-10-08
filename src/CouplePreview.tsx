import { Suspense,useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EndingCouple } from './EndingCouple';

export default function CouplePreview(){
  const [paused,setPaused]=useState(false),[blink,setBlink]=useState<number|undefined>(undefined);
  return <main className="couple-preview">
    <header><a href={import.meta.env.BASE_URL}>กลับไปเรื่องราว</a><h1>Monchhichi คู่ของเรา</h1><p>ผิว 3D นูนจากภาพต้นฉบับ พร้อมจังหวะหายใจและกระพริบตา</p></header>
    <section className="couple-preview-comparison">
      <figure><div className="couple-reference-crop"><img src={`${import.meta.env.BASE_URL}assets/models/monchhichi-couple-reference.png`} alt="ภาพต้นฉบับ Monchhichi สองตัวนั่งถือหัวใจ"/></div><figcaption>ภาพต้นฉบับ</figcaption></figure>
      <div className="couple-preview-canvas"><Canvas dpr={[1,1.4]} camera={{position:[0,0,10],fov:35}} gl={{alpha:true,antialias:true,preserveDrawingBuffer:true}}>
        <ambientLight intensity={.95}/><hemisphereLight args={['#fffaf3','#af7b93',.8]}/><directionalLight position={[-3,5,8]} intensity={1.5}/><directionalLight position={[4,2,-3]} intensity={1.2} color="#ffd7e8"/>
        <Suspense fallback={null}><EndingCouple reduced={paused} blinkPreview={blink} debug/></Suspense>
        <OrbitControls enablePan={false} minDistance={7} maxDistance={13} minAzimuthAngle={-.55} maxAzimuthAngle={.55} minPolarAngle={1.35} maxPolarAngle={1.8} enableDamping/>
      </Canvas></div>
    </section>
    <nav aria-label="ตรวจโมเดลคู่"><button onClick={()=>setPaused(v=>!v)}>{paused?'เปิดการเคลื่อนไหว':'พักการเคลื่อนไหว'}</button><button onClick={()=>setBlink(undefined)}>กระพริบตามธรรมชาติ</button><button onClick={()=>setBlink(0)}>ลืมตา</button><button onClick={()=>setBlink(1)}>หลับตา</button><a href={`${import.meta.env.BASE_URL}assets/models/monchhichi-couple.glb`} download>ดาวน์โหลด GLB</a></nav>
  </main>;
}
