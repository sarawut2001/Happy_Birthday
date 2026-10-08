import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import { ArrowLeft, Download, Pause, Play, RotateCcw } from 'lucide-react';
import gsap from 'gsap';
import { Monchhichi } from './Monchhichi';
import { monchhichiPoses, type MonchhichiPose } from './monchhichi-model';
import type { OrbitControls as Controls } from 'three-stdlib';

const labels: Record<MonchhichiPose, string> = { Idle: 'ยืน', Walk: 'เดิน', Wave: 'โบกมือ', Celebrate: 'ฉลอง', Shy: 'เขิน', Float: 'ลอย', Hug: 'ถือหัวใจ', Present: 'แนะนำ', Invite: 'ชวนไปต่อ', Blow: 'เป่า', Thanks: 'ขอบคุณ' };
function SourceModel() {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}assets/models/monchhichi-meshy-source.glb`);
  const root = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <group scale={2.8 / 1.898819} position={[.002659 * 2.8 / 1.898819, .951554 * 2.8 / 1.898819, 0]} name="original-meshy-model"><primitive object={root} dispose={null} /></group>;
}
class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="preview-error" role="alert">เครื่องนี้ยังแสดงโมเดล 3D ไม่ได้ ลองเปิดด้วยเบราว์เซอร์อื่นนะ</div> : this.props.children; }
}
function Camera({ view, reduced }: { view: number; reduced: boolean }) {
  const { camera, size } = useThree(), controls = useRef<Controls>(null);
  useEffect(() => {
    const angle = [0.42, 0, -Math.PI / 2, Math.PI][view % 4];
    const distance = size.width < 600 ? 6.9 : 6.1;
    const t = gsap.to(camera.position, { x: Math.sin(angle) * distance, y: 1.4, z: Math.cos(angle) * distance, duration: reduced ? 0 : 1, ease: 'sine.inOut', onUpdate: () => { camera.lookAt(0, 1.4, 0); controls.current?.update(); } });
    return () => { t.kill(); };
  }, [view, reduced, camera, size.width]);
  return <OrbitControls ref={controls} makeDefault target={[0, 1.4, 0]} enablePan={false} minDistance={4.5} maxDistance={10} minPolarAngle={Math.PI * 0.15} maxPolarAngle={Math.PI * 0.65} />;
}
function PreviewWorld({ pose, paused, view, reduced, source, referenceVersion }: { pose: MonchhichiPose; paused: boolean; view: number; reduced: boolean; source: boolean; referenceVersion: number }) {
  return <><Camera view={view} reduced={reduced} /><ambientLight intensity={0.8} /><hemisphereLight args={['#fff8eb', '#9b6b80', 1]} /><directionalLight position={[-3, 5, 6]} intensity={2.5} color="#fff4df" /><directionalLight position={[4, 3, -4]} intensity={1.5} color="#ffccde" />{source ? <SourceModel /> : <Monchhichi key={referenceVersion} pose={pose} reduced={reduced} paused={paused} name="preview-monchhichi" />}<ContactShadows key={`${source}-${pose}-${view}-${referenceVersion}`} opacity={0.3} scale={5} blur={2.7} far={4} resolution={256} color="#765249" frames={reduced || paused || source ? 1 : Infinity} /><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><circleGeometry args={[1.45, 64]} /><meshStandardMaterial color="#f4d8df" roughness={0.92} /></mesh></>;
}
export default function ModelPreview() {
  const reduced = !!useReducedMotion();
  const [pose, setPose] = useState<MonchhichiPose>('Wave'), [paused, setPaused] = useState(false), [view, setView] = useState(1), [source, setSource] = useState(false), [exporting, setExporting] = useState(false), [status, setStatus] = useState('');
  const [referenceVersion, setReferenceVersion] = useState(0);
  async function download() {
    setExporting(true); setStatus('กำลังเตรียมโมเดลและท่าทาง…');
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}assets/models/monchhichi.glb`);
      if (!response.ok) throw new Error('GLB download failed');
      const url = URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: 'model/gltf-binary' }));
      const a = document.createElement('a'); a.href = url; a.download = 'monchhichi.glb'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus('ดาวน์โหลดโมเดลพร้อมแอนิเมชั่นทั้ง 11 ท่าแล้ว');
    } catch { setStatus('ยังดาวน์โหลดไม่ได้ ลองอีกครั้งนะ'); }
    finally { setExporting(false); }
  }
  return <main className="model-preview">
    <header className="preview-header"><a className="preview-home" href="./"><ArrowLeft size={17} /> กลับไปเซอร์ไพรส์</a><div><span className="preview-kicker">MONCHHICHI · 3D STUDY</span><h1>เพื่อนตัวเล็กของคนโปรด</h1></div></header>
    <div className="preview-canvas" role="img" aria-label={source ? 'โมเดล Meshy ต้นฉบับ หมุนและซูมดูได้' : `โมเดล Monchhichi 3D ท่า${labels[pose]} หมุนและซูมดูได้`}><PreviewBoundary><Canvas dpr={[1, 1.4]} camera={{ position: [0, 1.4, 6], fov: 34, near: 0.1, far: 40 }} gl={{ alpha: true, antialias: true }}><Suspense fallback={null}><PreviewWorld pose={pose} paused={paused} view={view} reduced={reduced} source={source} referenceVersion={referenceVersion} /></Suspense></Canvas></PreviewBoundary></div>
    <section className="preview-controls" aria-label="ปรับโมเดลตัวอย่าง">
      <div className="preview-model-options" aria-label="เปรียบเทียบโมเดล"><button aria-pressed={!source} onClick={() => setSource(false)}>โมเดลที่แก้ไข + ท่าทาง</button><button aria-pressed={source} onClick={() => setSource(true)}>Meshy ต้นฉบับ</button></div>
      <div className="pose-options" aria-label="เลือกท่าทาง">{monchhichiPoses.map(p => <button key={p} disabled={source} className={pose === p ? 'selected' : ''} aria-pressed={pose === p} onClick={() => setPose(p)}>{labels[p]}</button>)}</div>
      <div className="preview-view-options"><span>มุมมอง</span>{['สามส่วน', 'ด้านหน้า', 'ด้านข้าง', 'ด้านหลัง'].map((label, i) => <button key={label} aria-pressed={view % 4 === i} onClick={() => setView(v => v + ((i - v % 4 + 4) % 4 || 4))}>{label}</button>)}</div>
      <div className="preview-actions"><button className="text-button" aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'เล่นท่าทาง' : 'หยุดท่าทาง'}</button><button className="text-button" onClick={() => { setSource(false); setPose('Wave'); setPaused(true); setReferenceVersion(v => v + 1); setView(v => v + ((1 - v % 4 + 4) % 4 || 4)); }}>เทียบท่าอ้างอิง</button><button className="text-button" onClick={() => setView(v => v + (4 - v % 4))}><RotateCcw size={16} /> คืนมุมกล้อง</button><button className="preview-download" disabled={exporting} onClick={download}><Download size={16} /> ดาวน์โหลด .glb</button></div>
      <p className="preview-hint">ลากหมุน · เลื่อนหรือใช้สองนิ้วซูม{reduced ? ' · ลดการเคลื่อนไหวตามการตั้งค่าเครื่อง' : ''}</p><p className="preview-hint">{source ? 'ไฟล์ที่คุณให้มา · ยังไม่มีโครงกระดูกหรือท่าทาง' : 'รักษาลายหน้าและขอบรูปจาก ref · สร้างผิวด้านข้างและด้านหลังใหม่'}</p><p className="preview-status" role="status">{status}</p>
    </section>
  </main>;
}
