import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Image, RoundedBox, Sparkles, OrbitControls, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { content } from './content';
import { fillCenteredCanvasText, fitCanvasText } from './canvas-text';
import { emitStorySound, type SoundCue, type AudioOptions } from './audio-cues';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { MutableRefObject } from 'react';
import type { Journey, JourneyEvent, WorldView, WorldPhase } from './journey';
import { initialJourney } from './journey';
import { activityHome, memoryHome, storyLayout, universeSpan } from './story-layout';
import { EndingCouple } from './EndingCouple';
import { ActivityModel } from './ActivityModels';
import type { DateMachine } from './date-machine';

type Props = { dateMachine: Pick<DateMachine, 'state' | 'motion'>; journey: Journey; memory: number; reduced: boolean; paused: boolean; onDone: (event: JourneyEvent) => void; onMemory: (index: number) => void; onActivity: (view: WorldView) => void; resetCamera: number; pinRejection: number; pinProgress: number; ratingReaction: number; holdProgress: MutableRefObject<number>; breathOriginRef?: MutableRefObject<{ x: number; y: number } | null>; breathTargetRef?: MutableRefObject<{ x: number; y: number } | null>; onReady: () => void };
const pink = '#cf4e85', paper = '#fff7ef';
const noop = () => {};
const WORLD_Z = -24;
function useCanvasFonts() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([
      document.fonts.load('400 68px "Noto Sans Thai"'),
      document.fonts.load('500 78px "Noto Sans Thai"'),
      document.fonts.load('600 78px "Noto Sans Thai"'),
      document.fonts.load('400 36px "Cormorant Garamond"'),
    ]).then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  return ready;
}
type ObjectPhase = 'hidden' | 'revealing' | 'exploring' | 'gathering' | 'stored';
// The camera and scene cues share this clock; no independent completion timers.
const introCue = { suction: 2.1, warp: 2.95, arriving: 4.95, forming: 6.15, revealing: 9.15 };
function watchTimeline(animation: gsap.core.Animation) {
  const change = () => animation.paused(document.hidden);
  document.addEventListener('visibilitychange', change); change();
  return () => { document.removeEventListener('visibilitychange', change); animation.kill(); };
}
function soundAt(timeline: gsap.core.Timeline, name: SoundCue, at: number, options: AudioOptions = {}) {
  timeline.call(() => emitStorySound(name, { once: true, ...options }), [], at);
}
function worldCamera(width: number, height: number) {
  const span = universeSpan(width, height);
  return new THREE.Vector3(0, 3.4, WORLD_Z + span / (2 * Math.tan(THREE.MathUtils.degToRad(19))));
}
function random(seed: number) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function Heart({ scale = 1, color = pink, position = [0, 0, 0], glow = false }: { scale?: number; color?: string; position?: [number, number, number]; glow?: boolean }) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.2, -0.3, -0.6, 0, -0.6, 0.3); s.bezierCurveTo(-0.6, 0.65, -0.18, 0.7, 0, 0.35); s.bezierCurveTo(0.18, 0.7, 0.6, 0.65, 0.6, 0.3); s.bezierCurveTo(0.6, 0, 0.2, -0.3, 0, -0.5);
    return new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSegments: 4, bevelSize: 0.075, bevelThickness: 0.07, curveSegments: 24 });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} scale={scale} position={position} castShadow><meshStandardMaterial color={color} roughness={0.27} metalness={0.15} emissive={glow ? color : '#000000'} emissiveIntensity={glow ? 2 : 0} toneMapped={!glow} /></mesh>;
}

function Gift({ mode, reduced, onDone, rejection = 0, miniature = false, handingOff = false }: { handingOff?: boolean; rejection?: number; mode: Journey['gift']; reduced: boolean; onDone: Props['onDone']; miniature?: boolean }) {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}assets/models/present.glb`);
  const reaction = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null), lid = useRef<THREE.Group>(null), glow = useRef<THREE.Mesh>(null), elapsed = useRef(0), teaseCycle = useRef(-1);
  const parts = useMemo(() => {
    const body = new THREE.Group(), top = new THREE.Group();
    gltf.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      const positions = geo.getAttribute('position'), normals = geo.getAttribute('normal');
      const arrays = [{ p: [] as number[], n: [] as number[] }, { p: [] as number[], n: [] as number[] }];
      for (let i = 0; i < positions.count; i += 3) {
        const target = arrays[Math.min(positions.getY(i), positions.getY(i + 1), positions.getY(i + 2)) >= 0.505 ? 1 : 0];
        for (let k = 0; k < 3; k++) { target.p.push(positions.getX(i + k), positions.getY(i + k), positions.getZ(i + k)); target.n.push(normals.getX(i + k), normals.getY(i + k), normals.getZ(i + k)); }
      }
      arrays.forEach((a, index) => {
        if (!a.p.length) return;
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(a.n, 3));
        const material = new THREE.MeshStandardMaterial({ color: (object.material as THREE.Material).name === 'Second' ? '#b8346b' : '#efa7c6', roughness: 0.29, metalness: 0.12, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; (index ? top : body).add(mesh);
      }); geo.dispose();
    }); return { body, top };
  }, [gltf.scene]);
  useEffect(() => () => { [parts.body, parts.top].forEach(group => group.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } })); }, [parts]);
  useFrame((_, delta) => {
    if (!root.current || !lid.current || reduced || miniature || mode === 'opening') return;
    elapsed.current += Math.min(delta, 0.05); const t = elapsed.current;
    root.current.position.y = -1.1 + Math.sin(t * 1.05) * 0.065;
    if (mode === 'locked') { root.current.rotation.y += delta * 0.19; lid.current.position.y = .545 + Math.sin(t * 1.4) * 0.002; lid.current.rotation.z = Math.sin(t * 0.8) * 0.002; }
    else {
      const p = t % 3.8;
      if (p < .7 && teaseCycle.current !== Math.floor(t / 3.8)) { teaseCycle.current = Math.floor(t / 3.8); emitStorySound('gift-tease'); }
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, -0.3, 0.045);
      root.current.rotation.z = p < 0.7 ? Math.sin(p * 35) * 0.033 * Math.sin(p / 0.7 * Math.PI) : 0;
      lid.current.position.y = .545 + (p > 0.45 && p < 1.45 ? Math.sin((p - 0.45) * Math.PI) * 0.06 : 0.009);
      if (glow.current) glow.current.scale.setScalar(0.9 + Math.sin(t * 3) * 0.09);
    }
  });
  useEffect(() => {
    if (!root.current || !lid.current || handingOff) return;
    if (mode !== 'opening') {
      lid.current.position.set(0, .545 + (reduced && mode === 'teasing' ? 0.025 : 0), 0); lid.current.rotation.set(0, 0, 0); root.current.rotation.z = 0;
      const tween = gsap.to(root.current.scale, { x: mode === 'teasing' ? 6 : 5.1, y: mode === 'teasing' ? 6 : 5.1, z: mode === 'teasing' ? 6 : 5.1, duration: reduced ? 0 : 1.6, ease: 'power2.inOut' }); return () => { tween.kill(); };
    }
    if (reduced) { lid.current.position.y = .775; onDone({ type: 'gift-opened' }); return; }
    const timeline = gsap.timeline({ onComplete: () => onDone({ type: 'gift-opened' }) });
    soundAt(timeline, 'gift-lid', .65); soundAt(timeline, 'gift-light', 1.1);
    timeline.to(root.current.rotation, { y: -0.3, z: 0, duration: .6, ease: 'sine.inOut' }, 0);
    timeline.to(lid.current.position, { y: .775, z: -.06, duration: 1.35, ease: 'sine.inOut' }, .65);
    timeline.to(lid.current.rotation, { x: -.42, z: -.08, duration: 1.15, ease: 'sine.inOut' }, .85);
    if (glow.current) timeline.to(glow.current.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 1.1, ease: 'sine.inOut' }, 1.1);
    // A visible open pose is held before the cake handoff starts.
    timeline.to({}, { duration: .5 }, 2.2);
    return watchTimeline(timeline);
  }, [mode, reduced, onDone, handingOff]);
  useEffect(() => {
    if (!reaction.current || !rejection || reduced) return;
    const object = reaction.current;
    const t = gsap.timeline();
    t.to(object.rotation, { z: -0.085, duration: 0.18, ease: 'sine.inOut' });
    t.to(object.rotation, { z: 0.085, duration: 0.22, repeat: 2, yoyo: true, ease: 'sine.inOut' });
    t.to(object.rotation, { z: 0, duration: 0.3, ease: 'sine.out' });
    t.to(object.position, { y: 0.055, duration: 0.2, repeat: 3, yoyo: true, ease: 'sine.inOut' }, 0);
    const clean = watchTimeline(t);
    return () => { clean(); object.rotation.set(0, 0, 0); object.position.set(0, 0, 0); };
  }, [rejection, reduced]);
  return <group ref={reaction} name="gift-reaction"><group ref={root} name="gift-model" position={[0, -1.1, 0]} rotation={[0, -0.35, 0]} scale={5.1}>
    <primitive object={parts.body} /><group ref={lid} name="gift-lid" position={[0, .545, 0]}><group position={[0, -.545, 0]}><primitive object={parts.top} /></group></group>
    {mode !== 'locked' && <><mesh ref={glow} position={[0, 0.485, 0]}><sphereGeometry args={[0.1, 24, 16]} /><meshBasicMaterial color={[4, 1.5, 2.5]} transparent opacity={0.55} toneMapped={false} /></mesh><pointLight position={[0, 0.6, 0]} color="#ffadc9" intensity={7} distance={2.2} /></>}
  </group></group>;
}

function Balloon22({ small = false }: { small?: boolean }) {
  const geometry = useMemo(() => {
    if (small) return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, 0.58, 0), new THREE.Vector3(-0.37, 0.96, 0), new THREE.Vector3(0.16, 1, 0), new THREE.Vector3(0.55, 0.7, 0), new THREE.Vector3(0.5, 0.32, 0), new THREE.Vector3(0.12, -0.05, 0), new THREE.Vector3(-0.52, -0.58, 0), new THREE.Vector3(-0.48, -0.82, 0), new THREE.Vector3(0.57, -0.83, 0),
    ]), 70, 0.12, 12, false);
    const shape = new THREE.Shape();
    shape.moveTo(-0.62, 0.46); shape.bezierCurveTo(-0.65, 1.15, 0.62, 1.24, 0.69, 0.55);
    shape.bezierCurveTo(0.75, 0.12, 0.31, -0.17, -0.12, -0.5); shape.lineTo(0.7, -0.5);
    shape.lineTo(0.7, -0.9); shape.lineTo(-0.68, -0.9); shape.lineTo(-0.68, -0.53);
    shape.bezierCurveTo(-0.36, -0.15, 0.27, 0.18, 0.27, 0.52);
    shape.bezierCurveTo(0.28, 0.83, -0.24, 0.87, -0.25, 0.46); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.13, bevelSize: 0.1, bevelSegments: 7, curveSegments: 36 });
    geo.translate(0, 0, -0.14); return geo;
  }, [small]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group name={small ? 'number-candles' : 'birthday-22'} scale={small ? 0.31 : 1.05}>{[-0.85, 0.85].map((x, i) => <mesh key={i} geometry={geometry} position={[x, 0, 0]} rotation={[0, i ? -0.12 : 0.12, i ? -0.025 : 0.025]} castShadow><meshPhysicalMaterial color={small ? '#e997b8' : '#f4a1c5'} metalness={small ? 0.06 : 0.48} roughness={small ? 0.3 : 0.2} clearcoat={1} clearcoatRoughness={0.15} /></mesh>)}</group>;
}

function Flame({ position, reduced, index }: { position: [number, number, number]; reduced: boolean; index: number }) {
  const root = useRef<THREE.Group>(null), flame = useRef<THREE.Group>(null), light = useRef<THREE.PointLight>(null);
  useFrame(state => {
    if (!flame.current || root.current?.userData.impacted || reduced) return;
    const t = state.clock.elapsedTime * 7 + index * 2;
    flame.current.scale.set(1 + Math.sin(t * 1.8) * 0.055, 1 + Math.sin(t) * 0.1, 1);
    flame.current.rotation.z = Math.sin(t * 0.65) * 0.1;
    if (light.current) light.current.intensity = 2.2 + Math.sin(t) * 0.25;
  });
  return <group ref={root} name={`candle-${index}`} position={position}>
    <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.018, 0.018, 0.14, 8]} /><meshStandardMaterial color="#65473c" /></mesh>
    <group ref={flame} name="flame"><mesh scale={[0.1, 0.22, 0.1]} position={[0, 0.13, 0]}><sphereGeometry args={[1, 20, 16]} /><meshBasicMaterial color={[5, 2, 0.35]} toneMapped={false} /></mesh><mesh scale={[0.055, 0.13, 0.06]} position={[0, 0.08, 0.025]}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color={[6, 5, 2.5]} toneMapped={false} /></mesh></group>
    <mesh name="smoke" position={[0, 0.14, 0]} scale={[0.08, 0.18, 0.08]}><sphereGeometry args={[1, 12, 12]} /><meshBasicMaterial color="#e7cadb" transparent opacity={0} depthWrite={false} /></mesh>
    <pointLight ref={light} name="candle-light" color="#ffb678" intensity={2.2} distance={2.8} />
  </group>;
}

function Cake({ mode, reduced, onDone, miniature = false, breathOriginRef, breathTargetRef }: { mode: Journey['cake']; reduced: boolean; onDone: Props['onDone']; miniature?: boolean; breathOriginRef?: Props['breathOriginRef']; breathTargetRef?: Props['breathTargetRef'] }) {
  const root = useRef<THREE.Group>(null), wind = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(state => {
    if (!root.current || miniature) return;
    if (!reduced && mode === 'lit') { root.current.position.y = -0.85 + Math.sin(state.clock.elapsedTime) * 0.04; root.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.12; }
    if (mode === 'blowing' && breathTargetRef) {
      root.current.updateWorldMatrix(true, false);
      target.set(0, 1.95, 0.02); root.current.localToWorld(target); target.project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      breathTargetRef.current = { x: rect.left + (target.x + 1) * rect.width / 2, y: rect.top + (1 - target.y) * rect.height / 2 };
    }
  });
  useEffect(() => {
    if (miniature || !breathTargetRef) return;
    if (mode !== 'blowing') breathTargetRef.current = null;
    return () => { breathTargetRef.current = null; };
  }, [mode, miniature, breathTargetRef]);
  useEffect(() => {
    if (!root.current) return;
    const candles = [0, 1].map(i => root.current!.getObjectByName(`candle-${i}`)).filter(Boolean) as THREE.Group[];
    if (mode === 'lit') { candles.forEach(c => { c.userData.impacted = false; c.getObjectByName('flame')!.scale.setScalar(1); (c.getObjectByName('candle-light') as THREE.PointLight).intensity = 2.2; }); return; }
    if (mode === 'out') { candles.forEach(c => { c.userData.impacted = true; c.getObjectByName('flame')!.scale.setScalar(0); (c.getObjectByName('candle-light') as THREE.PointLight).intensity = 0; }); return; }
    if (mode !== 'blowing') return;
    if (reduced) { onDone({ type: 'candles-out' }); return; }
    const t = gsap.timeline({ onComplete: () => onDone({ type: 'candles-out' }) });
    const origin = new THREE.Vector3(-3.4, 1.65, 0.25), mouth = breathOriginRef?.current;
    soundAt(t, 'breath', .25, { pan: mouth ? (mouth.x / window.innerWidth - .5) * .8 : -.2, panTo: 0 });
    if (mouth && Number.isFinite(mouth.x) && Number.isFinite(mouth.y)) {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        camera.updateMatrixWorld(); root.current.updateWorldMatrix(true, false);
        const wickWorld = root.current.localToWorld(new THREE.Vector3(0, 1.95, 0.02));
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), wickWorld);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2((mouth.x - rect.left) / rect.width * 2 - 1, 1 - (mouth.y - rect.top) / rect.height * 2), camera);
        const point = ray.ray.intersectPlane(plane, new THREE.Vector3());
        if (point) origin.copy(root.current.worldToLocal(point));
      }
    }
    // Each airflow reaches its own wick at this same timeline's impact cue.
    wind.current?.children.forEach((airflow, i) => {
      airflow.visible = true; airflow.position.copy(origin); airflow.position.y += (i % 3 - 1) * 0.025;
      const wick = i < 3 ? -0.25 : 0.25, impact = i < 3 ? 1.3 : 1.48;
      const direction = new THREE.Vector3(wick, 1.95 + (i % 3 - 1) * 0.055, 0.02).sub(airflow.position);
      if (direction.lengthSq() > 1e-8) airflow.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
      t.to(airflow.position, { x: wick, y: 1.95 + (i % 3 - 1) * 0.055, z: 0.02, duration: impact - 0.25, ease: 'power2.in' }, 0.25);
      t.fromTo(airflow.scale, { x: 0.02, y: 0.02, z: 0.02 }, { x: 1, y: 1, z: 1, duration: 0.65 }, 0.25);
      t.to(airflow.position, { x: wick + 0.65, y: 2.12, duration: 0.6, ease: 'power2.out' }, impact);
      t.to(airflow.scale, { x: 0, y: 0, z: 0, duration: 0.65 }, impact + 0.12);
    });
    candles.forEach((c, i) => {
      const impact = 1.3 + i * 0.18, flame = c.getObjectByName('flame')!, smoke = c.getObjectByName('smoke') as THREE.Mesh, light = c.getObjectByName('candle-light') as THREE.PointLight;
      t.call(() => { c.userData.impacted = true; }, [], impact);
      soundAt(t, 'wick-out', impact + .25, { once: false, pan: i ? .08 : -.08 });
      t.to(flame.rotation, { z: -0.9, duration: 0.3, ease: 'power2.out' }, impact);
      t.to(flame.scale, { x: 0.7, y: 1.35, z: 0.7, duration: 0.22 }, impact);
      t.to(flame.scale, { x: 0, y: 0, z: 0, duration: 0.42, ease: 'power2.in' }, impact + 0.25);
      t.to(light, { intensity: 0, duration: 0.42 }, impact + 0.25);
      t.to(smoke.material, { opacity: 0.24, duration: 0.25 }, impact + 0.62);
      t.to(smoke.position, { y: 0.95, x: 0.3, duration: 1.15, ease: 'sine.out' }, impact + 0.62);
      t.to(smoke.scale, { x: 2.4, y: 2.8, z: 2.4, duration: 1.15 }, impact + 0.62);
      t.to(smoke.material, { opacity: 0, duration: 0.7 }, impact + 1.15);
    });

    return watchTimeline(t);
  }, [mode, reduced, onDone, breathOriginRef, camera, gl]);
  return <group ref={root} name="cake-model" position={[0, -0.85, 0]} rotation={[0, -0.15, 0]}>
    <mesh position={[0, -0.14, 0]} receiveShadow><cylinderGeometry args={[1.8, 1.7, 0.13, 64]} /><meshStandardMaterial color="#fff0dd" roughness={0.28} metalness={0.13} /></mesh>
    <mesh position={[0, 0.48, 0]} castShadow receiveShadow><cylinderGeometry args={[1.48, 1.48, 1.02, 64]} /><meshStandardMaterial color="#eda2bd" roughness={0.72} /></mesh>
    <mesh position={[0, 0.84, 0]} castShadow><cylinderGeometry args={[1.5, 1.49, 0.35, 64]} /><meshStandardMaterial color="#fff3e4" roughness={0.8} /></mesh>
    {[0.19, 0.42].map(y => <mesh key={y} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]}><torusGeometry args={[1.47, 0.045, 8, 64]} /><meshStandardMaterial color="#ffe4dc" roughness={0.8} /></mesh>)}
    {Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 1.45, 0.82 - (i % 3) * 0.05, Math.sin(a) * 1.45]} scale={[0.17, 0.22, 0.14]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#fff3e4" roughness={0.8} /></mesh>; })}
    {Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2; return <group key={i} position={[Math.cos(a) * 1.12, 1.05, Math.sin(a) * 1.12]} rotation={[0, -a, 0]}><Heart scale={0.21} color="#d65b82" /></group>; })}
    <group position={[0, 1.5, 0]}><Balloon22 small /></group>
    {!miniature && [-0.25, 0.25].map((x, i) => <Flame key={i} position={[x, 1.83, 0]} reduced={reduced} index={i} />)}
    {mode === 'blowing' && <group ref={wind} name="breath-wind">{Array.from({ length: 6 }, (_, i) => <Airflow key={i} index={i} />)}</group>}
  </group>;
}

function Airflow({ index }: { index: number }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.8, (index % 3 - 1) * 0.08, 0.08), new THREE.Vector3(-0.55, 0.08, 0.07), new THREE.Vector3(-0.22, -0.025, 0), new THREE.Vector3(0, 0, 0),
  ]), 30, 0.009, 6, false), [index]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group visible={false}><mesh geometry={geometry}><meshBasicMaterial color="#fff5ff" transparent opacity={0.65} depthWrite={false} /></mesh><mesh><sphereGeometry args={[0.025, 8, 8]} /><meshBasicMaterial color={[2, 1.4, 1.9]} toneMapped={false} /></mesh></group>;
}

function LetterSheet({ folding, reduced }: { folding: boolean; reduced: boolean }) {
  const top = useRef<THREE.Group>(null), bottom = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!top.current || !bottom.current) return;
    const t = gsap.timeline();
    t.to(top.current.rotation, { x: folding ? -Math.PI * 0.87 : 0, duration: reduced ? 0 : 1.15, ease: 'sine.inOut' }, 0);
    t.to(bottom.current.rotation, { x: folding ? Math.PI * 0.87 : 0, duration: reduced ? 0 : 1.05, ease: 'sine.inOut' }, reduced ? 0 : 0.2);
    return watchTimeline(t);
  }, [folding, reduced]);
  const panel = <RoundedBox args={[2.84, 0.65, 0.028]} radius={0.009}><meshStandardMaterial color={paper} roughness={0.92} /></RoundedBox>;
  const line = (y: number, width = 2) => <mesh position={[-0.1, y, 0.022]}><planeGeometry args={[width, 0.016]} /><meshBasicMaterial color="#ba8a9c" /></mesh>;
  return <>
    {panel}{line(0.25)}{line(0)}{line(-0.25, 1.3)}
    <group ref={top} name="paper-top-fold" position={[0, 0.325, 0]}><group position={[0, 0.325, 0]}>{panel}{line(-0.15)}<Heart scale={0.13} position={[0.9, 0.03, 0.03]} /></group></group>
    <group ref={bottom} name="paper-bottom-fold" position={[0, -0.325, 0]}><group position={[0, -0.325, 0]}>{panel}</group></group>
  </>;
}

function Envelope({ phase, reduced, onDone, externalReading = false, paperOnly = false, folding = false, miniature = false }: { folding?: boolean; externalReading?: boolean; paperOnly?: boolean; phase: Journey['envelope']; reduced: boolean; onDone: Props['onDone']; miniature?: boolean }) {
  const root = useRef<THREE.Group>(null), flap = useRef<THREE.Group>(null), sheet = useRef<THREE.Group>(null), seal = useRef<THREE.Group>(null);
  const fold = useMemo(() => { const shape = new THREE.Shape(); shape.moveTo(-1.6, 0); shape.lineTo(0, -1.1); shape.lineTo(1.6, 0); shape.closePath(); return new THREE.ShapeGeometry(shape); }, []);
  useEffect(() => () => fold.dispose(), [fold]);
  useFrame(state => { if (root.current && !reduced && !miniature && phase !== 'opening' && phase !== 'reading') { root.current.position.y = -0.25 + Math.sin(state.clock.elapsedTime * 0.7) * 0.035; root.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.55) * 0.014; root.current.rotation.y = -0.08 + Math.sin(state.clock.elapsedTime * 0.4) * 0.035; if (seal.current && phase === 'closed') seal.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03); } });
  useEffect(() => {
    if (!flap.current || !sheet.current || !seal.current || !root.current) return;
    if (externalReading || paperOnly) return;
    const reset = () => { sheet.current!.position.set(0, 0, 0); seal.current!.position.set(0, -0.18, 0.3); root.current!.scale.setScalar(1); sheet.current!.rotation.set(0, 0, 0); sheet.current!.scale.setScalar(1); root.current!.getObjectByName('envelope-back')!.position.set(0, 0, 0); root.current!.getObjectByName('envelope-pocket')!.position.set(0, 0, 0); flap.current!.position.set(0, 1.09, 0.24); };
    if (phase === 'closed') { reset(); flap.current.rotation.x = 0; seal.current.scale.setScalar(1); return; }
    if (phase === 'ready') { reset(); flap.current.rotation.x = Math.PI; flap.current.position.z = -0.22; sheet.current.position.y = 1.15; seal.current.scale.setScalar(0); return; }
    if (reduced) { flap.current.rotation.x = Math.PI; flap.current.position.z = -0.22; sheet.current.position.set(0, phase === 'reading' ? 2.35 : 1.15, 0); seal.current.scale.setScalar(0); onDone({ type: phase === 'opening' ? 'envelope-opened' : 'paper-arrived' }); return; }
    const t = gsap.timeline({ onComplete: () => onDone({ type: phase === 'opening' ? 'envelope-opened' : 'paper-arrived' }) });
    if (phase === 'opening') {
      soundAt(t, 'seal-release', 0); soundAt(t, 'envelope-flap', .6); soundAt(t, 'paper-rise', 2.45);
      t.to(seal.current.position, { z: 0.65, duration: 0.6 });
      t.to(seal.current.scale, { x: 0, y: 0, z: 0, duration: 0.5 }, '<');
      // Positive rotation carries the flap behind the pocket, away from the sheet.
      t.to(flap.current.rotation, { x: Math.PI, duration: 1.5, ease: 'power2.inOut' });
      t.to(flap.current.position, { z: -0.22, duration: 0.35, ease: 'power2.inOut' });
      t.to(sheet.current.position, { y: 1.15, duration: 1.45, ease: 'power2.inOut' });
    } else {
      // Sheet bottom clears the 1.09-high pocket before any forward movement.
      t.to(sheet.current.position, { y: 2.35, duration: 1.5, ease: 'power2.inOut' });
      t.to(sheet.current.position, { z: 1.35, duration: 1.1, ease: 'power2.inOut' });
      t.to(sheet.current.rotation, { x: 0.06, y: 0.06, duration: 1.1 }, '<');
    }
    return watchTimeline(t);
  }, [phase, reduced, onDone, externalReading, paperOnly]);
  return <group ref={root} name="envelope-model" position={[0, -0.25, 0]} rotation={[-0.04, -0.08, 0]}>
    <group name="envelope-back"><RoundedBox args={[3.2, 2.18, 0.07]} position={[0, 0, -0.15]} radius={0.025}><meshStandardMaterial color="#d68aa9" roughness={0.8} /></RoundedBox></group>
    <group ref={sheet} name="letter-sheet"><LetterSheet folding={folding} reduced={reduced} /></group>
    <group name="envelope-pocket"><RoundedBox args={[3.23, 1.85, 0.08]} position={[0, -0.165, 0.19]} radius={0.025}><meshStandardMaterial color="#efb4cd" roughness={0.75} /></RoundedBox>
    {[-1, 1].map(side => <RoundedBox key={side} args={[0.07, 2.12, 0.28]} position={[side * 1.57, 0, 0.015]} radius={0.018}><meshStandardMaterial color="#dda0bc" /></RoundedBox>)}
    </group><group ref={flap} name="envelope-flap" position={[0, 1.09, 0.24]}><mesh geometry={fold}><meshStandardMaterial color="#f7cadd" side={THREE.DoubleSide} roughness={0.8} /></mesh></group>
    <group ref={seal} name="envelope-seal" position={[0, -0.18, 0.3]}><Heart scale={0.42} /></group>
  </group>;
}

const pointVertex = `
  uniform float uTime; uniform float uForm; uniform float uSize; uniform float uMode; uniform float uEmission; uniform float uCollapse;
  attribute vec3 aCloud; varying float vTint; varying float vFaceCover;
  void main(){
    vec3 p = position;
    if(uMode < 0.5){
      float delay = fract(aCloud.x * 0.73 + aCloud.z * 0.41) * 0.28;
      float progress = uEmission > 0.5 ? smoothstep(delay, delay + 0.72, uForm) : uForm;
      vec3 source = aCloud;
      float orbit = uTime * 0.065;
      source.xz = mat2(cos(orbit),-sin(orbit),sin(orbit),cos(orbit)) * source.xz;
      p = mix(source, position, progress);
      p.x += sin(progress * 6.283 + aCloud.z) * sin(progress * 3.14159) * 0.7 * uEmission;
      p.z += cos(progress * 6.283 + aCloud.x) * sin(progress * 3.14159) * 0.7 * uEmission;
      p *= 1.0 + sin(uTime * 1.5) * 0.022;
      float a = sin(uTime * 0.22) * 0.2; p.xz = mat2(cos(a),-sin(a),sin(a),cos(a)) * p.xz;
    } else if(uMode < 1.5){
      float a = uTime * 0.065 + uCollapse * 3.5; p.xz = mat2(cos(a),-sin(a),sin(a),cos(a)) * p.xz;
      p = mix(p, vec3(0.323,2.681,0.0),uCollapse);
    } else { p.z = mod(p.z + uTime * 8.0 + 20.0, 20.0) - 13.0; }
    vFaceCover = 1.0 - smoothstep(0.65,1.0,length((p.xy - vec2(0.0,0.12)) / vec2(0.8,0.48)));
    vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize * (8.0 / max(-mv.z,1.0)),1.0,18.0);
    vTint = fract(aCloud.x * 0.77 + aCloud.z * 0.37);
  }`;
const pointFragment = `uniform float uOpacity; uniform float uFade; uniform float uFace; varying float vTint; varying float vFaceCover; void main(){ float d = length(gl_PointCoord - vec2(0.5)); float a = smoothstep(0.5,0.03,d); if(a < 0.025) discard; vec3 c = mix(vec3(2.3,0.34,1.05), vec3(2.6,1.6,2.3),vTint); gl_FragColor = vec4(c,a * 0.83 * uOpacity * uFade * (1.0 - vFaceCover * uFace * 0.88)); }`;

function ParticleField({ kind, reduced, forming = true, count = 2600, opacity = 1, emitFromGalaxy = false, collapse = false, face, fade }: { fade?: MutableRefObject<{ value: number }>; face?: MutableRefObject<{ opacity: number }>; kind: 'heart' | 'galaxy' | 'tunnel'; reduced: boolean; forming?: boolean; count?: number; opacity?: number; emitFromGalaxy?: boolean; collapse?: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3), cloud = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = random(i + 1), b = random(i + 201), c = random(i + 5001), t = r * Math.PI * 2;
      cloud.set([(r - 0.5) * 11, (b - 0.5) * 7, (c - 0.5) * 10], i * 3);
      if (kind === 'heart') {
        const layer = 0.05 + Math.sqrt(b) * 0.95;
        positions.set([16 * Math.pow(Math.sin(t), 3) / 12 * layer, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 12 * layer, (c - 0.5) * 0.65], i * 3);
              if (emitFromGalaxy) {
          const radius = 0.45 + Math.pow(b, 0.8) * 4.6, angle = (i % 3) / 3 * Math.PI * 2 + radius * 1.25 + (r - 0.5) * 0.38;
          const x = Math.cos(angle) * radius; cloud.set([x * Math.cos(0.12), -2.7 + x * Math.sin(0.12), Math.sin(angle) * radius], i * 3);
        }
      } else if (kind === 'galaxy') {
        const radius = 0.6 + Math.pow(b, 0.8) * 4.6, angle = (i % 3) / 3 * Math.PI * 2 + radius * 1.25 + (r - 0.5) * 0.38;
        positions.set([Math.cos(angle) * radius, (c - 0.5) * 0.15, Math.sin(angle) * radius], i * 3);
      } else positions.set([Math.cos(t) * (0.6 + b * 5), Math.sin(t) * (0.6 + b * 5), c * 20 - 13], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geo.setAttribute('aCloud', new THREE.BufferAttribute(cloud, 3)); return geo;
  }, [count, kind, emitFromGalaxy]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uForm: { value: reduced ? 1 : 0 }, uSize: { value: kind === 'tunnel' ? 4 : 2.7 },
    uMode: { value: kind === 'heart' ? 0 : kind === 'galaxy' ? 1 : 2 }, uOpacity: { value: opacity },
    uEmission: { value: emitFromGalaxy ? 1 : 0 }, uCollapse: { value: 0 }, uFace: { value: 0 }, uFade: { value: 1 },
  }), [kind, emitFromGalaxy]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => { const t = gsap.to(uniforms.uForm, { value: forming ? 1 : 0, duration: reduced ? 0 : 3, ease: 'none' }); return watchTimeline(t); }, [forming, reduced, uniforms]);
  useEffect(() => { const tween = gsap.to(uniforms.uOpacity, { value: opacity, duration: reduced ? 0 : 0.8 }); return watchTimeline(tween); }, [opacity, reduced, uniforms]);
  useEffect(() => { const tween = gsap.to(uniforms.uCollapse, { value: collapse ? 1 : 0, duration: reduced ? 0 : 4.1, ease: 'power2.inOut' }); return watchTimeline(tween); }, [collapse, reduced, uniforms]);
  useFrame((_, delta) => {
    if (!material.current) return;
    if (!reduced) uniforms.uTime.value += Math.min(delta, 0.06);
    material.current.uniforms.uTime.value = uniforms.uTime.value;
    material.current.uniforms.uForm.value = uniforms.uForm.value;
    // R3F maintains the material's uniform objects separately from tween targets.
    material.current.uniforms.uOpacity.value = uniforms.uOpacity.value;
    material.current.uniforms.uFade.value = fade?.current.value ?? 1;
    material.current.uniforms.uCollapse.value = uniforms.uCollapse.value;
    material.current.uniforms.uFace.value = face?.current.opacity ?? 0;
  });
  return <points geometry={geometry} frustumCulled={false}><shaderMaterial ref={material} uniforms={uniforms} vertexShader={pointVertex} fragmentShader={pointFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>;
}

function Photo({ index, reduced, onClick, scale = 1 }: { index: number; reduced: boolean; onClick: () => void; scale?: number }) {
  const group = useRef<THREE.Group>(null);
  const memory = content.memories[index];
  const dateTexture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '500 48px "Noto Sans Thai", sans-serif'; ctx.fillStyle = '#9e5577';
    ctx.textBaseline = 'middle'; fillCenteredCanvasText(ctx, memory.photoDate, 320, 48);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, [memory.photoDate]);
  useEffect(() => () => dateTexture.dispose(), [dateTexture]);
  useEffect(() => { if (!group.current) return; const t = gsap.fromTo(group.current.position, { x: reduced ? 0 : 0.5, z: reduced ? 0 : -0.45 }, { x: 0, z: 0, duration: reduced ? 0 : 0.85, ease: 'power3.out' }); return watchTimeline(t); }, [index, reduced]);
  useFrame(state => { if (group.current && !reduced) group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.045; });
  return <group ref={group} scale={scale} onClick={onClick}>
    <RoundedBox name={`photo-frame-${memory.id}`} args={[1.45, 2.06, 0.055]} radius={0.025} castShadow><meshStandardMaterial color={paper} roughness={0.8} /></RoundedBox>
    <Suspense fallback={<mesh position={[0, .12, .033]}><planeGeometry args={[1.27, 1.693]} /><meshBasicMaterial color="#ebc8d9" /></mesh>}><Image name={`photo-image-${memory.id}`} url={memory.image} position={[0, .12, .033]} scale={[1.27, 1.693]} toneMapped={false} /></Suspense>
    <mesh position={[-.045, -.867, .034]}><planeGeometry args={[1.07, .16]} /><meshBasicMaterial map={dateTexture} transparent toneMapped={false} /></mesh>
    <Heart position={[.58, -.86, .04]} scale={.065} />
  </group>;
}

function FloatingObject({ position, children, onSelect, active = false, reduced, name, phase, delay = 0, onRevealed, dimmed = false }: { dimmed?: boolean; onRevealed: (name: string) => void; reduced: boolean; name: string; position: [number, number, number]; children: React.ReactNode; onSelect: () => void; active?: boolean; phase: ObjectPhase; delay?: number }) {
  const root = useRef<THREE.Group>(null), idle = useRef<THREE.Group>(null), hover = useRef(false), down = useRef<[number, number] | null>(null);
  const { camera } = useThree();
  const previousPhase = useRef<ObjectPhase>('hidden'), opacity = useRef({ value: 1 });
  const interactive = phase === 'exploring';
  useEffect(() => {
    if (!root.current) return;
    const object = root.current, home = new THREE.Vector3(...position), center = new THREE.Vector3(0, 1.1, 0);
    const previous = previousPhase.current; previousPhase.current = phase;
    object.userData.phase = phase;
    if (phase === 'hidden' || phase === 'stored') { object.visible = false; object.scale.setScalar(0); return; }
    object.visible = true;
    if (phase === 'exploring') { if (previous === 'hidden' || previous === 'stored' || (previous === 'revealing' && reduced)) { object.position.copy(home); object.scale.setScalar(1); } return; }
    const continuing = phase === 'revealing' && previous === 'revealing';
    const source = phase === 'revealing' && !continuing ? center.clone() : object.position.clone();
    const destination = phase === 'revealing' ? home : center;
    const bend = source.clone().lerp(destination, 0.5); bend.x += (home.x < 0 ? -1 : 1) * 0.75; bend.y += 0.6; bend.z += 0.7;
    const path = new THREE.CatmullRomCurve3([source, bend, destination]);
    const progress = { value: 0 }, initialScale = phase === 'revealing' && !continuing ? 0.01 : object.scale.x;
    object.position.copy(source); object.scale.setScalar(initialScale);
    const t = gsap.to(progress, { value: 1, delay: reduced ? 0 : delay, duration: reduced ? 0 : phase === 'revealing' ? 1.95 : 3.1, ease: 'power2.inOut', onUpdate: () => {
      object.position.copy(path.getPoint(progress.value));
      const scale = phase === 'revealing' ? THREE.MathUtils.smoothstep(progress.value, 0, 0.65) : 1 - THREE.MathUtils.smoothstep(progress.value, 0.52, 1);
      object.scale.setScalar(phase === 'revealing' ? THREE.MathUtils.lerp(initialScale, 1, scale) : initialScale * scale);
    }, onComplete: () => { object.position.copy(destination); object.scale.setScalar(phase === 'revealing' ? 1 : 0); object.visible = phase === 'revealing'; if (phase === 'revealing') onRevealed(name); } });
    return watchTimeline(t);
  }, [phase, reduced, delay, name, onRevealed, position[0], position[1], position[2]]);
  useEffect(() => {
    if (!root.current || !interactive) return;
    const destination = new THREE.Vector3(...position);
    const t = gsap.to(root.current.position, { x: destination.x, y: destination.y, z: destination.z, duration: reduced ? 0 : 1.2, ease: 'power2.inOut' });
    return watchTimeline(t);
  }, [active, interactive, reduced, camera, position[0], position[1], position[2]]);
  useFrame((state, delta) => { if (idle.current) {
    const target = interactive && hover.current ? 1.08 : 1;
    idle.current.scale.setScalar(reduced ? target : THREE.MathUtils.damp(idle.current.scale.x, target, 5, delta));
    const tilt = name.startsWith('memory-') ? Math.sin(Number(name.split('-')[1]) * 2.4 + .7) * .11 : name.startsWith('activity-') ? position[0] * -.012 : 0;
    idle.current.rotation.z = tilt + (reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.35 + position[0]) * 0.02);
    idle.current.position.y = reduced || phase === 'gathering' ? 0 : Math.sin(state.clock.elapsedTime * 0.55 + position[0]) * 0.045;
  } });
  useEffect(() => {
    if (!root.current) return;
    const fade = opacity.current, target = dimmed ? 0.2 : 1;
    const t = gsap.to(fade, { value: target, duration: reduced ? 0 : 0.8, onUpdate: () => root.current?.traverse(o => { if (o instanceof THREE.Mesh) { for (const material of Array.isArray(o.material) ? o.material : [o.material]) { material.userData.storyBaseOpacity ??= material.opacity; material.transparent = true; material.opacity = material.userData.storyBaseOpacity * fade.value; } } }) });
    return watchTimeline(t);
  }, [dimmed, reduced]);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  return <><group ref={root} name={name} onPointerOver={e => { if (!interactive) return; e.stopPropagation(); hover.current = true; document.body.style.cursor = 'pointer'; }} onPointerOut={() => { hover.current = false; document.body.style.cursor = ''; }} onPointerDown={e => { if (!interactive) return; e.stopPropagation(); down.current = [e.nativeEvent.clientX, e.nativeEvent.clientY]; }} onClick={e => { if (!interactive) return; e.stopPropagation(); if (down.current && Math.hypot(e.nativeEvent.clientX - down.current[0], e.nativeEvent.clientY - down.current[1]) < 8) onSelect(); down.current = null; }}><group ref={idle}>{children}</group></group>{!reduced && <TravelTrail target={root} active={phase === 'gathering'} />}</>;
}
// Rendering and reveal completion share the authored objects, so removing an
// activity cannot leave the portal waiting for a card that no longer exists.
const universeActivities = [
  { view: 'promise', title: content.activityTitles.promise, subtitle: 'a little promise', color: '#913563' },
  { view: 'puzzle', title: content.activityTitles.puzzle, subtitle: 'piece by piece, us', color: '#793863' },
] as const;
const universePhrases = ['only you', 'love you the most', 'our little moments'];
const universeHeartCount = 5;
const universeObjectCount = content.memories.length + universeActivities.length + universePhrases.length + universeHeartCount;

function MemoryOrbit({ dateMachine, reduced, onMemory, onActivity, view, memory, phase, onRevealed }: { dateMachine: Props['dateMachine']; onRevealed: (name: string) => void; reduced: boolean; onMemory: Props['onMemory']; onActivity: Props['onActivity']; view: WorldView; memory: number; phase: ObjectPhase }) {
  const { size } = useThree(), small = size.width < 600;
  return <group>{content.memories.map((item, i) => {
    const position = memoryHome(i, content.memories.length, size.width, size.height);
    return <FloatingObject key={item.id} name={`memory-${i}`} phase={phase} onRevealed={onRevealed} delay={i * 0.07} reduced={reduced} position={position} dimmed={view !== 'hub'} onSelect={() => onMemory(i)} active={view === 'memory' && memory === i}><Billboard><group rotation={[0, 0, Math.sin(i * 2.4 + .7) * .11]}><Photo index={i} reduced={reduced} onClick={noop} scale={small ? 0.65 : 0.9} /></group></Billboard></FloatingObject>;
  })}{universeActivities.map((card, i) => <FloatingObject key={card.view} name={`activity-${card.view}`} phase={phase} onRevealed={onRevealed} delay={(content.memories.length + i) * 0.07} reduced={reduced} position={activityHome(card.view, size.width, size.height)} dimmed={view !== 'hub' && view !== card.view} onSelect={() => onActivity(card.view)} active={view === card.view}><ActivityModel kind={card.view} focused={view === 'promise' && card.view === 'promise'} reduced={reduced} state={dateMachine.state} motion={dateMachine.motion} /></FloatingObject>)}
  {universePhrases.map((phrase, i) => <FloatingObject key={phrase} name={`phrase-${i}`} reduced={reduced} phase={phase} onRevealed={onRevealed} delay={(content.memories.length + universeActivities.length + i) * 0.055} dimmed={view !== 'hub'} onSelect={noop} position={[Math.sin(i * 2.1) * (small ? 3 : 4.5), i === 0 ? -.75 : -0.2 + i * 0.5, -3.5]}><Billboard><OrbitPhrase text={phrase} /></Billboard></FloatingObject>)}
  {Array.from({ length: universeHeartCount }, (_, i) => <FloatingObject key={`heart-${i}`} name={`universe-heart-${i}`} reduced={reduced} phase={phase} onRevealed={onRevealed} delay={(content.memories.length + universeActivities.length + universePhrases.length + i) * 0.045} dimmed={view !== 'hub'} onSelect={noop} position={[Math.sin(i * 1.8) * (small ? 2.6 : 4.4), -0.9 + Math.cos(i * 2) * 2.1, Math.cos(i * 1.8) * 3.5]}><Heart scale={0.13 + i * 0.018} color="#f899c6" glow /></FloatingObject>)}
  </group>;
}

function HeartDoor({ opening, reduced, progress, rootRef }: { opening: boolean; reduced: boolean; progress: Props['holdProgress']; rootRef: React.RefObject<THREE.Group | null> }) {
  const energy = useRef(0), border = useRef<THREE.Mesh>(null);
  const lock = useRef<THREE.Group>(null), portal = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    energy.current = reduced ? progress.current : THREE.MathUtils.damp(energy.current, progress.current, 6, delta);
    if (border.current) (border.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + energy.current * 0.6;
    if (lock.current && !opening) {
      const p = energy.current;
      lock.current.scale.setScalar(0.55 + p * 0.16 + (reduced ? 0 : Math.sin(state.clock.elapsedTime * 2) * 0.025));
      lock.current.rotation.z = p * Math.sin(state.clock.elapsedTime * 14) * 0.035;
      if (portal.current) (portal.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + p * 0.35;
    }
  });
  return <group ref={rootRef} name="door-model" position={[0, 0, 1.2]}>
    <mesh ref={border} name="door-energy-frame" position={[0, 0.15, -0.19]}><planeGeometry args={[4.05, 5.05]} /><meshBasicMaterial color={[2.8, 0.7, 1.7]} transparent opacity={0.1} depthWrite={false} toneMapped={false} /></mesh>
    <mesh name="door-portal" ref={portal} position={[0, 0.2, -0.17]}><planeGeometry args={[3.45, 4.45]} /><meshBasicMaterial color={[2.4, 0.4, 1.2]} transparent opacity={0.12} depthWrite={false} toneMapped={false} /></mesh>
    {[-1, 1].map(side => <RoundedBox key={side} args={[0.24, 4.9, 0.4]} radius={0.08} position={[side * 1.86, 0.1, 0]}><meshStandardMaterial color="#f5b7d3" roughness={0.3} metalness={0.2} /></RoundedBox>)}
    <RoundedBox args={[3.95, 0.25, 0.42]} radius={0.09} position={[0, 2.52, 0]}><meshStandardMaterial color="#f5b7d3" /></RoundedBox>
    <RoundedBox args={[4.15, 0.16, 0.9]} radius={0.04} position={[0, -2.4, 0.12]}><meshStandardMaterial color="#b86e9b" /></RoundedBox>
    <group name="door-left" position={[-1.72, 0.1, 0]}><DoorLeaf side={1} /></group><group name="door-right" position={[1.72, 0.1, 0]}><DoorLeaf side={-1} /></group>
    <group name="door-lock" ref={lock} position={[0, 0.18, 0.25]} scale={0.55}><mesh position={[0, 0.39, 0]}><torusGeometry args={[0.36, 0.065, 12, 40, Math.PI]} /><meshStandardMaterial color="#f4c5de" metalness={0.5} roughness={0.2} /></mesh><Heart color="#f078b4" glow /><Heart color="#fff0f9" position={[0, 0.02, 0.25]} scale={0.35} /></group>
  </group>;
}
function DoorLeaf({ side }: { side: number }) {
  return <group position={[side * 0.86, 0, 0]}><RoundedBox args={[1.7, 4.5, 0.2]} radius={0.06}><meshStandardMaterial color="#983b70" roughness={0.4} metalness={0.15} /></RoundedBox>{[-1.02, 1.07].map(y => <RoundedBox key={y} args={[1.38, 1.74, 0.07]} radius={0.08} position={[0, y, 0.13]}><meshStandardMaterial color="#bb5a8d" roughness={0.35} /></RoundedBox>)}<Heart position={[0, 1.07, 0.17]} scale={0.25} color="#df8fbb" /></group>;
}

function OrbitPhrase({ text }: { text: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d')!; ctx.font = 'italic 42px Georgia'; ctx.fillStyle = '#ffc3df'; ctx.textBaseline = 'middle'; fillCenteredCanvasText(ctx, text, 256, 48);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh><planeGeometry args={[2.1, 0.4]} /><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} /></mesh>;
}

function Confetti({ reduced, duration = 5.5, count = 160, clearCenter = false }: { reduced: boolean; duration?: number; count?: number; clearCenter?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null), time = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => { if (!mesh.current) return; for (let i = 0; i < count; i++) mesh.current.setColorAt(i, new THREE.Color(['#ef90ba', '#fff4d9', '#c64b80', '#e8b865'][i % 4])); mesh.current.instanceColor!.needsUpdate = true; }, [count]);
  useFrame((_, delta) => {
    if (!mesh.current || reduced) return; time.current += Math.min(delta, 0.06); const t = time.current; if (t > duration) { mesh.current.visible = false; return; } (mesh.current.material as THREE.MeshStandardMaterial).opacity = Math.min(1, (duration - t) / 0.8);
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1, speed = 1.5 + random(i + 50) * 2;
      dummy.position.set(side * (clearCenter ? 2.6 + random(i + 1) * .8 + t * .08 : 2.3 - t * (0.2 + random(i + 1))), -1 + speed * t - 0.7 * t * t, (random(i + 500) - 0.5) * 4);
      dummy.rotation.set(t * 2 + i, t * 1.4 + i, t + i); dummy.scale.set(0.055, 0.11, 0.035); dummy.updateMatrix(); mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true; mesh.current.visible = t < duration;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.4} metalness={0.15} transparent /></instancedMesh>;
}

function BirthdayCard({ reduced }: { reduced: boolean }) {
  const front = useRef<THREE.Group>(null), root = useRef<THREE.Group>(null);
  const fontsReady = useCanvasFonts();
  const note = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'middle';
    const blocks = [content.birthday.title, ...content.birthday.wishes].map((text, i) => ({
      ...fitCanvasText(ctx, text, { width: 1060, fontSize: i === 0 ? 70 : 68, minFontSize: i === 0 ? 64 : 60, maxLines: 2, weight: i === 0 ? 600 : 400 }),
      weight: i === 0 ? 600 : 400,
      color: i === 0 ? '#a83264' : '#71334f',
    }));
    const gap = 30;
    const height = blocks.reduce((sum, block) => sum + block.lines.length * block.size * 1.4, 0) + gap * (blocks.length - 1);
    let y = (canvas.height - height) / 2;
    blocks.forEach(block => {
      ctx.font = `${block.weight} ${block.size}px "Noto Sans Thai", sans-serif`;
      ctx.fillStyle = block.color;
      const lineHeight = block.size * 1.4;
      block.lines.forEach(line => { fillCenteredCanvasText(ctx, line, 600, y + lineHeight / 2); y += lineHeight; });
      y += gap;
    });
    ctx.strokeStyle = '#d991b0'; ctx.lineWidth = 3; ctx.strokeRect(38, 38, 1124, 644);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }, [fontsReady]);
  useEffect(() => () => note.dispose(), [note]);
  useEffect(() => {
    if (!front.current || !root.current) return;
    const t = gsap.timeline();
    t.fromTo(root.current.position, { y: -1.8 }, { y: -0.12, duration: reduced ? 0 : 1.6, ease: 'power2.out' });
    soundAt(t, 'envelope-flap', reduced ? 0 : .45);
    t.fromTo(front.current.rotation, { y: 0 }, { y: 1.8, duration: reduced ? 0 : 1.7, ease: 'power2.inOut' }, reduced ? 0 : 0.45);
    return watchTimeline(t);
  }, [reduced]);
  return <group ref={root} name="birthday-card-model" position={[0, -0.12, 0]} rotation={[-0.025, 0.04, 0]}>
    <RoundedBox args={[3.2, 2.08, 0.045]} radius={0.035} castShadow><meshStandardMaterial color={paper} roughness={0.85} /></RoundedBox>
    <mesh name="birthday-card-text" position={[0, 0, 0.028]}><planeGeometry args={[3.1, 2]} /><meshBasicMaterial map={note} transparent toneMapped={false} /></mesh>
    <group ref={front} name="birthday-card-cover" position={[-1.6, 0, 0.035]}><RoundedBox args={[3.2, 2.08, 0.045]} position={[1.6, 0, 0]} radius={0.035}><meshStandardMaterial color="#e6a2be" roughness={0.6} metalness={0.12} /></RoundedBox><Heart position={[1.6, 0.1, 0.05]} scale={0.55} color="#c75183" /></group>
    <mesh position={[0, -1.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.4, 1.1]} /><meshBasicMaterial color="#c9759b" transparent opacity={0.13} depthWrite={false} /></mesh>
  </group>;
}
function Celebration({ reduced, arrived = true }: { reduced: boolean; arrived?: boolean }) {
  useEffect(() => { if (arrived) emitStorySound('celebrate', { once: true }); }, [arrived]);
  const root = useRef<THREE.Group>(null);
  useEffect(() => { if (!root.current) return; const t = gsap.fromTo(root.current.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1, y: 1, z: 1, duration: reduced ? 0 : 1.9, ease: 'power3.out' }); return watchTimeline(t); }, [reduced]);
  useFrame(state => { if (root.current && !reduced) { root.current.position.y = 1.95 + Math.sin(state.clock.elapsedTime * 0.7) * 0.035; root.current.rotation.y = -0.06 + Math.sin(state.clock.elapsedTime * 0.35) * 0.055; } });
  return <><group ref={root} position={[0, 1.95, -0.45]}><group scale={0.74}><Balloon22 /></group>{[-1, 1].map((side, i) => <group key={i} position={[side * 2.25, side === -1 ? 0.35 : -0.3, -0.7]} rotation={[0, side * 0.4, side * -0.15]}><Heart scale={0.36} color={i ? '#f6c1d6' : '#cd5c8d'} /><mesh position={[0, -0.65, 0]}><cylinderGeometry args={[0.007, 0.007, 0.65, 6]} /><meshStandardMaterial color="#b66f8c" /></mesh></group>)}</group><BirthdayCard reduced={reduced} />{!reduced && arrived && <Confetti reduced={reduced} count={96} clearCenter />}</>;
}

function GalaxyCore({ gathered }: { gathered: boolean }) {
  const root = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,224,245,.7)'); gradient.addColorStop(.15, 'rgba(255,155,208,.5)'); gradient.addColorStop(.5, 'rgba(223,91,170,.12)'); gradient.addColorStop(1, 'rgba(223,91,170,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => { if (!root.current) return; const t = gsap.to(root.current.scale, { x: gathered ? 0 : 1, y: gathered ? 0 : 1, z: gathered ? 0 : 1, duration: 1.5, ease: 'power2.inOut' }); return watchTimeline(t); }, [gathered]);
  return <Billboard><mesh ref={root}><planeGeometry args={[2, 2]} /><meshBasicMaterial map={texture} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh></Billboard>;
}

function WarpTunnel({ phase, reduced }: { phase: WorldPhase; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null), time = useRef(0);
  const { camera } = useThree(), dummy = useMemo(() => new THREE.Object3D(), []);
  const active = phase === 'suction' || phase === 'warp';
  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.visible = active && !reduced;
    if (!active || reduced) { time.current = 0; return; }
    time.current += Math.min(delta, 0.05);
    mesh.current.position.copy(camera.position);
    for (let i = 0; i < 140; i++) {
      const angle = random(i + 5) * Math.PI * 2 + time.current * 0.08;
      const radius = 0.65 + random(i + 101) * 4.5;
      const z = -((random(i + 203) * 30 - time.current * (phase === 'warp' ? 17 : 6)) % 30 + 30) % 30;
      dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
      dummy.rotation.set(0, 0, angle); dummy.scale.set(0.018, 0.018, phase === 'warp' ? 1.4 + random(i) * 3.4 : 0.25);
      dummy.updateMatrix(); mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh name="warp-streaks" ref={mesh} args={[undefined, undefined, 140]} frustumCulled={false} visible={false}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color={[2.4, 0.8, 1.6]} transparent opacity={0.7} toneMapped={false} depthWrite={false} /></instancedMesh>;
}

function RatingReaction({ rating, trigger, enabled, reduced, children }: { rating: number; trigger: number; enabled: boolean; reduced: boolean; children: (face: MutableRefObject<{ opacity: number }>) => React.ReactNode }) {
  const root = useRef<THREE.Group>(null), face = useRef<THREE.Points>(null), sparkles = useRef<THREE.Points>(null);
  const expression = useRef({ opacity: 0, eye: 1, wink: 1, smile: 0.7, blush: 0, burst: 0 });
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(76 * 3), 3));
    const colors = new Float32Array(76 * 3);
    for (let i = 0; i < 76; i++) new THREE.Color(i < 32 ? '#fff7e6' : i < 52 ? '#ffe8ee' : '#ff679f').toArray(colors, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return g;
  }, []);
  const sparkleGeometry = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3)); return g; }, []);
  const dot = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 32; const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, '#fff'); g.addColorStop(0.6, '#fff'); g.addColorStop(1, '#ffffff00'); ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => { geometry.dispose(); sparkleGeometry.dispose(); dot.dispose(); }, [geometry, sparkleGeometry, dot]);
  useEffect(() => {
    if (!root.current) return;
    const object = root.current, e = expression.current;
    object.userData.rating = enabled ? rating : 0;
    object.userData.reaction = !enabled || !rating ? 'idle' : rating <= 2 ? 'shy' : rating === 3 ? 'hopeful' : rating === 4 ? 'wink' : 'delighted';
    if (!enabled || !rating || reduced) { object.scale.setScalar(1); object.rotation.z = 0; e.opacity = 0; e.burst = 0; return; }
    const low = rating <= 2, t = gsap.timeline();
    t.to(e, { opacity: 1, eye: low ? 0.12 : rating === 3 || rating === 4 ? 0.8 : 0.18, wink: rating === 4 ? 0.06 : 1, smile: low ? -0.35 : 0.8, blush: 1, burst: 0, duration: 0.24, ease: 'sine.out' }, 0);
    t.to(object.scale, { x: low ? 0.92 : rating === 5 ? 1.12 : 1.035, y: low ? 0.92 : rating === 5 ? 1.12 : 1.035, z: 1, duration: 0.35, ease: 'sine.inOut' }, 0);
    t.to(object.rotation, { z: low ? -0.12 : 0.075, duration: 0.32, ease: 'sine.inOut' }, 0);
    t.to(object.rotation, { z: low ? 0.07 : -0.065, duration: 0.35, ease: 'sine.inOut' }, 0.32);
    t.to(object.rotation, { z: 0, duration: 0.5, ease: 'sine.inOut' }, 0.67);
    t.to(object.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'sine.inOut' }, 0.5);
    t.to(e, { smile: 0.8, eye: 0.25, wink: 1, duration: 0.35, ease: 'sine.inOut' }, 0.78);
    if (rating >= 4) t.fromTo(e, { burst: 0 }, { burst: 1, duration: 0.8, ease: 'power2.out' }, 0.2);
    t.to(e, { opacity: 0, duration: 0.4, ease: 'sine.in' }, 1.35);
    return watchTimeline(t);
  }, [rating, trigger, enabled, reduced]);
  useFrame(() => {
    if (!face.current || !sparkles.current) return;
    const e = expression.current, p = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 32; i++) { const side = i < 16 ? -1 : 1, a = i % 16 / 15 * Math.PI * 2; const open = side > 0 ? e.eye * e.wink : e.eye; p.setXYZ(i, side * 0.32 + Math.cos(a) * 0.09, 0.13 + Math.sin(a) * 0.11 * open, 0); }
    for (let i = 0; i < 20; i++) { const x = i / 19 * 0.4 - 0.2; p.setXYZ(32 + i, x, -0.12 - Math.sin(i / 19 * Math.PI) * 0.11 * e.smile, 0); }
    for (let i = 0; i < 24; i++) { const side = i < 12 ? -1 : 1, a = i % 12 / 12 * Math.PI * 2; p.setXYZ(52 + i, side * 0.54 + Math.cos(a) * 0.085, -0.03 + Math.sin(a) * 0.04 * e.blush, 0); }
    p.needsUpdate = true; (face.current.material as THREE.PointsMaterial).opacity = e.opacity;
    const stars = sparkleGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, radius = 1.1 + e.burst * 0.9; stars.setXYZ(i, Math.cos(a) * radius, Math.sin(a) * radius, 0); }
    stars.needsUpdate = true; (sparkles.current.material as THREE.PointsMaterial).opacity = e.opacity * Math.sin(e.burst * Math.PI);
  });
  return <group ref={root} name="rating-reaction">{children(expression)}<Billboard position={[0, 0.12, 0.75]}><points ref={face} name="heart-expression" geometry={geometry} frustumCulled={false}><pointsMaterial map={dot} vertexColors size={0.075} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} /></points><points ref={sparkles} name="reaction-sparkles" geometry={sparkleGeometry} frustumCulled={false}><pointsMaterial map={dot} color={[3, 1.6, 2.4]} size={0.055} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} /></points></Billboard></group>;
}

function UniverseSequence({ dateMachine, journey: j, reduced, memory, onDone, onMemory, onActivity, holdProgress, ratingReaction }: Pick<Props, 'dateMachine' | 'journey' | 'reduced' | 'memory' | 'onDone' | 'onMemory' | 'onActivity' | 'holdProgress' | 'ratingReaction'>) {
  const door = useRef<THREE.Group>(null), heart = useRef<THREE.Group>(null), solid = useRef<THREE.Group>(null), ratingHearts = useRef<THREE.Group>(null);
  const pairReveal = useRef({ value:0 }), particleFade = useRef({ value:1 });
  const { camera, size } = useThree();
  const entering = j.stage === 5 && j.world === 'tunnel', gathering = j.stage === 6 && j.finale === 'gathering';
  const panel = j.stage === 5 && ['memory', 'promise', 'puzzle'].includes(j.world);
  const phase = j.worldPhase;
  const revealed = useRef(new Set<string>()), revealSettling = useRef<gsap.core.Animation | null>(null);
  const emissionActive = useRef(false); emissionActive.current = entering && phase === 'revealing';
  const onRevealed = useCallback((name: string) => {
    if (!emissionActive.current) return;
    revealed.current.add(name);
    if (revealed.current.size !== universeObjectCount || revealSettling.current) return;
    // Finish the real last object, then allow a quiet beat before the controls fade in.
    revealSettling.current = gsap.to({}, { duration: reduced ? 0 : 0.75, onComplete: () => onDone({ type: 'world-arrived' }) });
  }, [onDone, reduced]);
  useEffect(() => {
    if (entering) revealed.current.clear();
    const visibility = () => revealSettling.current?.paused(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('visibilitychange', visibility); revealSettling.current?.kill(); revealSettling.current = null; };
  }, [entering]);
  const objectPhase: ObjectPhase = j.stage === 6 ? (gathering ? 'gathering' : 'stored') : phase === 'revealing' ? 'revealing' : phase === 'exploring' ? 'exploring' : 'hidden';
  const arrived = ['arriving', 'forming', 'revealing', 'exploring'].includes(phase) || j.stage === 6;
  const formed = ['forming', 'revealing', 'exploring'].includes(phase) || j.stage === 6;
  useEffect(() => {
    if (!entering || !door.current) return;
    camera.userData.portalSettled = false;
    if (reduced) { (camera as THREE.PerspectiveCamera).fov = 38; (camera as THREE.PerspectiveCamera).updateProjectionMatrix(); onDone({ type: 'world-arrived' }); return; }
    const left = door.current.getObjectByName('door-left')!, right = door.current.getObjectByName('door-right')!, lock = door.current.getObjectByName('door-lock')!, portal = door.current.getObjectByName('door-portal') as THREE.Mesh;
    const destination = worldCamera(size.width, size.height), look = new THREE.Vector3(0, 0.35, WORLD_Z), perspective = camera as THREE.PerspectiveCamera;
    const phaseCue = (value: WorldPhase) => onDone({ type: 'world-phase', phase: value });
    const t = gsap.timeline();
    soundAt(t, 'door-unlock', 0); soundAt(t, 'door-open', .35);
    soundAt(t, 'suction', introCue.suction); soundAt(t, 'warp', introCue.warp);
    soundAt(t, 'arrival', introCue.arriving); soundAt(t, 'heart-form', introCue.forming);
    soundAt(t, 'assets-emerge', introCue.revealing);
    for (const offset of [0, .65, 1.3]) soundAt(t, 'asset-cluster', introCue.revealing + offset, { once: false, pan: offset === 0 ? -.25 : offset < 1 ? .25 : 0 });
    t.to(lock.position, { z: 0.7, duration: 0.55 }, 0);
    t.to(lock.scale, { x: 0, y: 0, z: 0, duration: 0.55 }, 0.1);
    t.to(left.rotation, { y: -Math.PI * 0.58, duration: 1.75, ease: 'power2.inOut' }, 0.35);
    t.to(right.rotation, { y: Math.PI * 0.58, duration: 1.75, ease: 'power2.inOut' }, 0.35);
    t.to(portal.material, { opacity: 0.55, duration: 1.6 }, 0.35);
    t.call(() => phaseCue('suction'), [], introCue.suction);
    t.to(camera.position, { x: 0, y: 0.55, z: 0.15, duration: 0.85, ease: 'power3.in', onUpdate: () => camera.lookAt(look) }, introCue.suction);
    t.to(portal.material, { opacity: 0, duration: 0.45 }, introCue.suction + 0.4);
    t.call(() => phaseCue('warp'), [], introCue.warp);
    t.to(perspective, { fov: 47, duration: 0.65, ease: 'sine.inOut', onUpdate: () => perspective.updateProjectionMatrix() }, introCue.warp);
    t.to(camera.position, { y: 0.65, z: destination.z + 4.5, duration: 2, ease: 'none', onUpdate: () => camera.lookAt(look) }, introCue.warp);
    t.call(() => phaseCue('arriving'), [], introCue.arriving);
    t.to(camera.position, { x: destination.x, y: destination.y, z: destination.z, duration: 1.2, ease: 'power2.out', onUpdate: () => camera.lookAt(look) }, introCue.arriving);
    t.to(perspective, { fov: 38, duration: 1.2, ease: 'sine.inOut', onUpdate: () => perspective.updateProjectionMatrix() }, introCue.arriving);
    t.call(() => phaseCue('forming'), [], introCue.forming);
    t.call(() => { camera.userData.portalSettled = true; camera.userData.portalViewport = `${size.width}:${size.height}`; phaseCue('revealing'); }, [], introCue.revealing);
    return watchTimeline(t);
  }, [entering, reduced, camera, onDone]);
  useEffect(() => {
    if (!heart.current) return;
    if (!gathering) { heart.current.scale.setScalar(1); return; }
    if (reduced) { onDone({ type: 'gathered' }); return; }
    // Preserve every object and the current orbit camera as gathering starts.
    const target = new THREE.Vector3(0, 1.1, WORLD_Z), direction = camera.getWorldDirection(new THREE.Vector3());
    const look = camera.position.clone().add(direction.multiplyScalar(camera.position.distanceTo(target)));
    const destination = worldCamera(size.width, size.height);
    const t = gsap.timeline({ onComplete: () => onDone({ type: 'gathered' }) });
    soundAt(t, 'gather', 0);
    t.to(look, { x: target.x, y: 0.35, z: target.z, duration: 3.8, ease: 'power2.inOut' }, 0);
    t.to(camera.position, { x: destination.x, y: destination.y, z: destination.z, duration: 3.8, ease: 'power2.inOut', onUpdate: () => camera.lookAt(look) }, 0);
    t.to(heart.current.scale, { x: 1.22, y: 1.22, z: 1.22, duration: 3.8, ease: 'sine.inOut' }, 0.2);
    t.to(heart.current.scale, { x: 1, y: 1, z: 1, duration: 0.65, ease: 'sine.out' }, 4);
    return watchTimeline(t);
  }, [gathering, reduced, camera, onDone]);
  useEffect(() => {
    if (!ratingHearts.current || !solid.current || !heart.current) return;
    if (j.stage !== 6 || j.finale !== 'sealing') {
      pairReveal.current.value=j.stage===6&&j.finale==='end'?1:0;
      particleFade.current.value=j.stage===6&&j.finale==='end'?0:1;
      heart.current.position.set(0,1.1,0);
      ratingHearts.current.position.set(0, -1.3, 1); ratingHearts.current.scale.setScalar(1);
      solid.current.scale.setScalar(1);
      return;
    }
    if (reduced) { pairReveal.current.value=1;particleFade.current.value=0;solid.current.scale.setScalar(1);onDone({type:'sealed'});return; }
    const t = gsap.timeline({ onComplete: () => onDone({ type: 'sealed' }) });
    solid.current.scale.setScalar(1);pairReveal.current.value=0;particleFade.current.value=1;
    soundAt(t, 'heart-offer', 0); soundAt(t, 'heart-seal', 2.6);
    t.to(ratingHearts.current.position, { y: 1.1, z: 0, duration: 1.7, ease: 'power2.inOut' });
    t.to(ratingHearts.current.scale, { x: 0, y: 0, z: 0, duration: 1.3 }, 0.4);
    t.to(heart.current.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.55, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    // Preserve the live particle heart while the held heart and couple appear.
    t.to(heart.current.position,{x:.08,y:-.34,z:.67,duration:2.5,ease:'sine.inOut'},1.1);
    t.to(heart.current.scale,{x:.78,y:.78,z:.78,duration:2.5,ease:'sine.inOut'},1.1);
    t.to(pairReveal.current,{value:1,duration:2.6,ease:'sine.inOut'},1.5);
    t.to(particleFade.current,{value:0,duration:1.8,ease:'sine.inOut'},2.5);
    t.to({}, {duration:.4},4.3);
    return watchTimeline(t);
  }, [j.stage, j.finale, reduced, onDone]);
  return <>
    <group name="universe-root" userData={{ phase: j.stage === 6 ? j.finale : phase }} position={[0, 0, WORLD_Z]}>
      <group name="particle-heart" ref={heart} position={[0, 1.1, 0]} visible={formed}><RatingReaction rating={j.rating} trigger={ratingReaction} enabled={j.stage === 6 && j.finale === 'rating'} reduced={reduced}>{face => <ParticleField face={face} fade={particleFade} kind="heart" reduced={reduced || panel} emitFromGalaxy forming={formed} opacity={j.stage===6&&j.finale==='end'?0:1} count={size.width < 600 ? 2200 : 3800} />}</RatingReaction></group>
      <group name="galaxy-disc" position={[0, -1.6, 0]} rotation={[0, 0, 0.12]} visible={arrived}><ParticleField kind="galaxy" reduced={reduced || panel} count={size.width < 600 ? 1800 : 3200} collapse={j.stage === 6} opacity={j.stage === 6 && !gathering ? 0 : 0.8} /><GalaxyCore gathered={j.stage === 6} /></group>
      <MemoryOrbit dateMachine={dateMachine} phase={objectPhase} reduced={reduced} view={j.world} memory={memory} onMemory={onMemory} onActivity={onActivity} onRevealed={onRevealed} />
      <group ref={solid} name="ending-couple" position={[0, 1.1, 0]}><EndingCouple reduced={reduced} reveal={pairReveal} phase={j.stage===6&&(j.finale==='end'||j.finale==='sealing')?j.finale:'hidden'}/></group>
      <group ref={ratingHearts} name="rating-hearts" position={[0, -1.3, 1]} visible={j.stage === 6 && j.finale === 'sealing'}>{Array.from({ length: j.rating }, (_, i) => <Heart key={i} position={[(i - (j.rating - 1) / 2) * 0.6, 0, 0]} scale={0.3} glow />)}</group>
      {j.stage === 6 && j.finale === 'end' && j.endingRevealed && !reduced && <group visible={j.endingPhase === 'complete'}><Confetti reduced={reduced} duration={8} count={60} /></group>}
      {arrived && <Sparkles count={70} scale={[17, 11, 14]} size={1.4} speed={reduced || j.stage === 6 && j.endingPhase === 'watching' ? 0 : 0.06} color="#ffcae4" opacity={j.stage === 6 ? 0.18 : 0.35} />}
    </group>
    {((j.world === 'entry' || entering) && j.stage === 5 || j.transition?.kind === 'paper-door') && <group name="door-holder"><HeartDoor rootRef={door} opening={entering} reduced={reduced} progress={holdProgress} /></group>}
    <WarpTunnel phase={phase} reduced={reduced} />
  </>;
}

// A path has one owner. The trail samples that path in its parent's coordinates.
function TravelTrail({ target, active, count = 36 }: { target: React.RefObject<THREE.Group | null>; active: boolean; count?: number }) {
  const points = useRef<THREE.Points>(null), history = useRef<THREE.Vector3[]>([]), tick = useRef(0);
  const position = useMemo(() => new THREE.Vector3(), []);
  const geometry = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); return g; }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (!points.current || !target.current) return;
    const material = points.current.material as THREE.PointsMaterial;
    material.opacity = THREE.MathUtils.damp(material.opacity, active ? 0.55 : 0, 5, Math.min(delta, 0.06));
    points.current.visible = material.opacity > 0.008;
    if (!active && material.opacity < 0.008) { history.current = []; return; }
    tick.current += delta;
    if (tick.current > 0.025) {
      tick.current = 0; target.current.getWorldPosition(position); points.current.parent!.worldToLocal(position);
      if (!history.current.length) history.current = Array.from({ length: count }, () => position.clone());
      history.current.unshift(position.clone()); history.current.length = Math.min(count, history.current.length);
    }
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) { const p = history.current[Math.min(i, history.current.length - 1)] ?? position; attribute.setXYZ(i, p.x, p.y, p.z); }
    attribute.needsUpdate = true;
  });
  return <points name="travel-trail" ref={points} geometry={geometry} frustumCulled={false}><pointsMaterial color={[2.7, 0.9, 1.9]} size={0.037} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>;
}

function NumberFormation({ active, reduced }: { active: boolean; reduced: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.55,0.5,0),new THREE.Vector3(-0.4,0.92,0),new THREE.Vector3(0.18,1.02,0),new THREE.Vector3(0.55,0.67,0),new THREE.Vector3(0.48,0.26,0),new THREE.Vector3(-0.45,-0.62,0),new THREE.Vector3(-0.5,-0.83,0),new THREE.Vector3(0.61,-0.83,0)]);
    const target = new Float32Array(240 * 3), source = new Float32Array(240 * 3);
    for (let i=0;i<240;i++) { const side=i<120?-1:1,p=curve.getPoint((i%120)/119); target.set([(p.x+side*.85)*1.05,p.y*1.05+1.05,.25],i*3); const a=i*.37;source.set([side*.25+Math.cos(a)*.12,.98+(i%120)/120*.75,Math.sin(a)*.12+.25],i*3); }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(source.slice(),3));g.setAttribute('aSource',new THREE.BufferAttribute(source,3));g.setAttribute('aTarget',new THREE.BufferAttribute(target,3));return g;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>{
    if(!points.current)return;const object=points.current,material=object.material as THREE.PointsMaterial;
    if(!active||reduced){object.visible=false;return;}object.visible=true;
    const p=geometry.getAttribute('position') as THREE.BufferAttribute,a=geometry.getAttribute('aSource'),b=geometry.getAttribute('aTarget'),progress={value:0};
    const t=gsap.timeline();t.fromTo(material,{opacity:0},{opacity:.75,duration:.45},0);
    t.to(progress,{value:1,duration:1.75,ease:'power2.inOut',onUpdate:()=>{for(let i=0;i<p.count;i++){const v=THREE.MathUtils.smoothstep(progress.value, (i%120)/120*.22,.78+(i%120)/120*.22);p.setXYZ(i,THREE.MathUtils.lerp(a.getX(i),b.getX(i),v),THREE.MathUtils.lerp(a.getY(i),b.getY(i),v),THREE.MathUtils.lerp(a.getZ(i),b.getZ(i),v));}p.needsUpdate=true;}},0);
    t.to(material,{opacity:0,duration:.65},1.7);return watchTimeline(t);
  },[active,reduced,geometry]);
  return <points name="number-formation" ref={points} geometry={geometry} frustumCulled={false}><pointsMaterial color={[3,1.4,2.1]} size={.035} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></points>;
}

function cameraPresentation(stage: number, width: number, height: number) {
  const span = presentationSpan(stage, width, height);
  return new THREE.Vector3(0, stage === 3 ? 1.25 : stage === 1 ? 2.1 : 1.85, span / (2 * Math.tan(THREE.MathUtils.degToRad(19))));
}

function presentationSpan(stage: number, width: number, height: number, gift: Journey['gift'] = 'locked') {
  const aspect = width / Math.max(height, 1);
  const frame = storyLayout({ ...initialJourney, stage: stage as Journey['stage'], gift }, width, height).hero;
  const horizontal = stage === 2 ? 5.9 : stage === 0 ? (gift === 'locked' ? 5.5 : 6.2) : stage === 1 ? 4.8 : stage === 5 ? 4.6 : 3.8;
  const vertical = stage === 0 ? (gift === 'locked' ? 4.3 : gift === 'opening' ? 6.6 : 5.1) : stage === 3 ? 4.2 : stage === 5 ? 5.7 : stage === 2 ? 4.3 : 3.3;
  return Math.max(vertical / (frame.height / height), horizontal / (frame.width / width) / aspect);
}

function StorySequence({ journey: j, reduced, onDone, pinRejection, pinProgress, holdProgress, breathOriginRef, breathTargetRef }: Pick<Props, 'journey' | 'reduced' | 'onDone' | 'pinRejection' | 'pinProgress' | 'holdProgress' | 'breathOriginRef' | 'breathTargetRef'>) {
  const gift = useRef<THREE.Group>(null), cake = useRef<THREE.Group>(null), birthday = useRef<THREE.Group>(null), letter = useRef<THREE.Group>(null), light = useRef<THREE.Group>(null);
  const { camera, size, scene } = useThree(), bridge = j.transition;
  const pinFlight = useRef(false), previousDigits = useRef(0);
  const present = (stage: number) => j.stage === stage || bridge?.from === stage || bridge?.to === stage;
  const letterPresent = present(3) || present(4);
  useEffect(() => {
    if (bridge) return;
    for (const ref of [gift, cake, birthday, letter]) if (ref.current) { ref.current.visible = true; ref.current.position.set(0, 0, 0); ref.current.rotation.set(0, 0, 0); ref.current.scale.setScalar(1); }
    if (letter.current && j.stage === 4) {
      const sheet = letter.current.getObjectByName('letter-sheet')!;
      sheet.position.set(0, 0.65, 0.85); sheet.scale.set(1.04, 1.65, 1); sheet.rotation.set(0.04, 0.08, -0.015);
      for (const name of ['envelope-back', 'envelope-pocket', 'envelope-flap', 'envelope-seal']) letter.current.getObjectByName(name)!.visible = false;
    }
    if (letter.current && j.stage === 3) for (const name of ['envelope-back', 'envelope-pocket', 'envelope-flap', 'envelope-seal']) letter.current.getObjectByName(name)!.visible = true;
  }, [j.stage, bridge]);
  useEffect(() => {
    if (!bridge || !light.current) return;
    const motif = light.current, kind = bridge.kind;
    pinFlight.current = false; motif.visible = true;
    const finish = () => { camera.userData.storyStage = bridge.to; camera.userData.storyViewport = `${size.width}:${size.height}`; onDone({ type: 'transition-complete', kind }); };
    if (reduced) { camera.position.copy(cameraPresentation(bridge.to, size.width, size.height)); camera.lookAt(0, bridge.to === 3 ? -.25 : bridge.to === 5 ? 0.05 : 0.35, 0); finish(); return; }
    const t = gsap.timeline({ onComplete: finish });
    const fadeOut = (object: THREE.Group, at: number, duration: number) => {
      const materials = new Map<THREE.Material, number>(), lights: { light: THREE.Light; intensity: number }[] = [];
      object.traverse(child => {
        if (child instanceof THREE.Mesh) for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.set(material, material.opacity);
        if (child instanceof THREE.Light) lights.push({ light: child, intensity: child.intensity });
      });
      const fade = { value: 1 };
      t.call(() => materials.forEach((_, material) => { material.transparent = true; material.depthWrite = false; material.needsUpdate = true; }), [], at);
      t.to(fade, { value: 0, duration, ease: 'sine.inOut', onUpdate: () => {
        materials.forEach((alpha, material) => { material.opacity = alpha * fade.value; });
        lights.forEach(({ light, intensity }) => { light.intensity = intensity * fade.value; });
      }, onComplete: () => { object.visible = false; } }, at);
    };
    const toCamera = (duration: number) => {
      const start = camera.position.clone(), destination = cameraPresentation(bridge.to, size.width, size.height), bend = start.clone().lerp(destination, 0.5); bend.x += kind === 'card-envelope' ? 0.3 : -0.18; bend.z += 0.3;
      const path = new THREE.CatmullRomCurve3([start, bend, destination]), progress = { value: 0 };
      const target = new THREE.Vector3(0, bridge.to === 3 ? -.25 : bridge.to === 5 ? 0.05 : 0.35, 0);
      const look = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(camera.position.distanceTo(target)).add(camera.position);
      t.to(look, { x: target.x, y: target.y, z: target.z, duration, ease: 'sine.inOut' }, 0);
      t.to(progress, { value: 1, duration, ease: 'sine.inOut', onUpdate: () => { camera.position.copy(path.getPoint(progress.value)); camera.lookAt(look); } }, 0);
    };
    const moveLight = (from: [number, number, number], to: [number, number, number], start: number, duration: number) => {
      motif.position.set(...from); motif.scale.setScalar(0.18);
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), middle = a.clone().lerp(b, 0.5); middle.x += 0.65; middle.y += 0.65;
      const path = new THREE.CatmullRomCurve3([a, middle, b]), progress = { value: 0 };
      t.to(progress, { value: 1, duration, ease: 'sine.inOut', onUpdate: () => motif.position.copy(path.getPoint(progress.value)) }, start);
    };
    if (kind === 'gift-cake' && gift.current && cake.current) {
      cake.current.position.set(0, .2, 0); cake.current.scale.setScalar(0.015);
      fadeOut(gift.current, .1, 1.65);
      t.to(cake.current.scale, { x: 1, y: 1, z: 1, duration: 2.1, ease: 'power2.inOut' }, .65);
      t.to(cake.current.position, { y: 0, duration: 2.1, ease: 'power2.inOut' }, .65);
      moveLight([0, 1.4, 0.6], [0, 1.55, 0.35], .25, 2.65); toCamera(3.1);
    }
    if (kind === 'cake-celebration' && cake.current && birthday.current) {
      soundAt(t, 'number-form', 0);
      birthday.current.position.set(0, 1.15, -0.2); birthday.current.scale.setScalar(0.02);
      fadeOut(cake.current, .2, 1.8);
      t.to(cake.current.scale, { x: .94, y: .94, z: .94, duration: 1.8, ease: 'sine.inOut' }, .2);
      t.to(birthday.current.position, { y: 0, z: 0, duration: 2.35, ease: 'power2.inOut' }, 0.3);
      t.to(birthday.current.scale, { x: 1, y: 1, z: 1, duration: 2.35, ease: 'power2.inOut' }, 0.3);
      moveLight([0, 1.05, 0.25], [0, 1.85, 0.55], 0, 2.3); toCamera(2.85);
    }
    if (kind === 'card-envelope' && birthday.current && letter.current) {
      soundAt(t, 'card-close', 0); soundAt(t, 'card-turn', .55);
      const card = birthday.current.getObjectByName('birthday-card-model')!, cover = birthday.current.getObjectByName('birthday-card-cover')!;
      letter.current.position.set(0, -0.45, -0.85); letter.current.scale.setScalar(0.02);
      t.to(cover.rotation, { y: 0, duration: 0.85, ease: 'sine.inOut' }, 0);
      t.to(card.rotation, { y: Math.PI, duration: 1.55, ease: 'power2.inOut' }, 0.55);
      t.to(birthday.current.position, { y: 1.65, z: -3, duration: 2.2, ease: 'power2.inOut' }, 0.6);
      t.to(birthday.current.scale, { x: 0.02, y: 0.02, z: 0.02, duration: 2.2, ease: 'power2.inOut' }, 0.6);
      t.to(letter.current.position, { y: 0, z: 0, duration: 1.85, ease: 'power2.inOut' }, 0.95);
      t.to(letter.current.scale, { x: 1, y: 1, z: 1, duration: 1.85, ease: 'power2.inOut' }, 0.95);
      moveLight([0, -0.4, 0.4], [0, -0.43, 0.3], 0.5, 2.3); toCamera(3.05);
    }
    if (kind === 'letter-paper' && letter.current) {
      soundAt(t, 'paper-pull', 0); soundAt(t, 'paper-settle', 2.95);
      const sheet = letter.current.getObjectByName('letter-sheet')!;
      motif.visible = false;
      // The bottom must clear the pocket before traveling toward the reader.
      t.to(sheet.position, { y: 2.35, duration: 1.3, ease: 'sine.inOut' }, 0);
      t.to(sheet.position, { z: 0.85, duration: 0.8, ease: 'sine.inOut' }, 1.3);
      t.to(sheet.position, { y: 0.65, duration: 1.1, ease: 'sine.inOut' }, 1.85);
      t.to(sheet.rotation, { x: 0.04, y: 0.08, z: -0.015, duration: 1.2, ease: 'sine.inOut' }, 1.3);
      t.to(sheet.scale, { x: 1.04, y: 1.65, duration: 1.1, ease: 'sine.inOut' }, 1.85);
      const pocket = letter.current.getObjectByName('envelope-pocket')!, back = letter.current.getObjectByName('envelope-back')!, flap = letter.current.getObjectByName('envelope-flap')!;
      for (const item of [pocket, back, flap]) t.to(item.position, { y: item.position.y - 3.4, z: -0.5, duration: 1.35, ease: 'sine.inOut' }, 1.65);
      toCamera(3.1);
    }
    if (kind === 'paper-door' && letter.current) {
      soundAt(t, 'paper-fold', 0); soundAt(t, 'door-appear', 1);
      const sheet = letter.current.getObjectByName('letter-sheet')!, door = scene.getObjectByName('door-holder')!;
      door.scale.setScalar(0.02); door.position.set(0, 0, -1.6);
      t.to(sheet.scale, { x: 0.3, y: 0.3, z: 0.3, duration: 1.45, ease: 'power2.inOut' }, 0);
      t.to(sheet.rotation, { x: 0.55, y: -0.25, z: -0.08, duration: 1.45, ease: 'sine.inOut' }, 0);
      t.to(letter.current.position, { y: -3.5, z: -1.2, duration: 2, ease: 'power2.inOut' }, 1);
      t.to(door.scale, { x: 1, y: 1, z: 1, duration: 2, ease: 'power2.inOut' }, 1);
      t.to(door.position, { z: 0, duration: 2, ease: 'power2.inOut' }, 1);
      moveLight([0.85, 0.7, 0.95], [0, 0.2, 1.57], 0.45, 2.75); toCamera(3.35);
    }
    return watchTimeline(t);
  }, [bridge, reduced, camera, onDone, scene]);
  useEffect(() => {
    const grew = pinProgress > previousDigits.current; previousDigits.current = pinProgress;
    if (!grew || j.stage !== 0 || bridge || reduced || !light.current) return;
    const motif = light.current; pinFlight.current = true; motif.visible = true; motif.position.set((pinProgress - 3.5) * 0.18, -2.15, 1.3); motif.scale.setScalar(0.13);
    const t = gsap.to(motif.position, { x: 0, y: 0.4, z: 0.3, duration: 0.85, ease: 'power2.out', onComplete: () => { pinFlight.current = false; } });
    const clean = watchTimeline(t); return () => { clean(); pinFlight.current = false; };
  }, [pinProgress, j.stage, bridge, reduced]);
  useFrame((state, delta) => {
    if (!light.current || bridge || pinFlight.current) return;
    const motif = light.current, t = state.clock.elapsedTime;
    motif.visible = j.stage < 3 || (j.stage === 5 && j.world !== 'hub' && !['memory', 'promise', 'puzzle'].includes(j.world));
    if (j.stage === 0) motif.position.set(-1.9, 0.5 + (reduced ? 0 : Math.sin(t) * 0.07), 0.3);
    if (j.stage === 1) motif.position.set(0, 1.55, 0.35);
    if (j.stage === 2) motif.position.set(0, 1.85, 0.55);
    let scale = 0.14;
    if (j.stage === 5) {
      if (j.world === 'entry' || j.worldPhase === 'opening') { motif.position.set(0, 0.2, 1.57); scale = 0.15 + holdProgress.current * 0.055; }
      else if (j.worldPhase === 'suction' || j.worldPhase === 'warp') { const destination = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5).add(camera.position); motif.position.lerp(destination, 1 - Math.exp(-5 * delta)); scale = 0.09; }
      else { motif.position.lerp(new THREE.Vector3(0, -1.6, WORLD_Z), 1 - Math.exp(-3 * delta)); scale = j.worldPhase === 'arriving' ? 0.12 : 0; }
    }
    motif.scale.setScalar(scale * (reduced ? 1 : 1 + Math.sin(t * 1.3) * 0.06));
    if (!reduced) motif.rotation.y = Math.sin(t * 0.35) * 0.18;
  });
  return <group name="story-sequence" userData={{ stage: j.stage, transition: bridge?.kind ?? 'idle' }}>
    {present(0) && <group ref={gift} name="gift-holder"><Gift mode={j.gift} rejection={pinRejection} reduced={reduced} handingOff={!!bridge} onDone={onDone} /></group>}
    {present(1) && <group ref={cake} name="cake-holder"><Cake mode={j.cake} reduced={reduced} onDone={onDone} breathOriginRef={breathOriginRef} breathTargetRef={breathTargetRef} /></group>}
    {present(2) && <group ref={birthday} name="celebration-holder"><Celebration reduced={reduced} arrived={!bridge} /></group>}
    {letterPresent && <group ref={letter} name="letter-holder"><Envelope phase={j.envelope} reduced={reduced} onDone={onDone} externalReading={bridge?.kind === 'letter-paper'} paperOnly={j.stage === 4} folding={bridge?.kind === 'paper-door'} /></group>}
    <NumberFormation active={bridge?.kind === 'cake-celebration'} reduced={reduced} />
    <group ref={light} name="story-heart-light" scale={0.14}><Heart glow color="#ffaad2" /><mesh><sphereGeometry args={[0.42, 16, 12]} /><meshBasicMaterial color={[3, 0.7, 1.5]} transparent opacity={0.12} depthWrite={false} toneMapped={false} /></mesh></group>
    {!reduced && <TravelTrail target={light} active={!!bridge || (pinProgress > 0 && j.stage === 0) || (j.stage === 5 && ['suction', 'warp', 'arriving'].includes(j.worldPhase))} count={52} />}
  </group>;
}

function CameraRig({ journey, reduced, resetCamera }: { journey: Journey; reduced: boolean; resetCamera: number }) {
  const { camera, size, gl } = useThree(), controls = useRef<OrbitControlsImpl>(null);
  const saved = useRef<{ position: THREE.Vector3; target: THREE.Vector3; aspect: number } | null>(null), moving = useRef(false), drag = useRef(false);
  const universe = journey.stage === 5 && journey.world !== 'entry' && journey.world !== 'tunnel';
  const browsing = universe && journey.world === 'hub';
  const pointer = useRef(new THREE.Vector2()), parallax = useRef({ value: 0 });
  const previousRoute = useRef({ stage: journey.stage, world: journey.world });
  useEffect(() => { const move = (e: PointerEvent) => { const r = gl.domElement.getBoundingClientRect(); pointer.current.set((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1); }; gl.domElement.addEventListener('pointermove', move); return () => gl.domElement.removeEventListener('pointermove', move); }, [gl]);
  useEffect(() => {
    const previous = previousRoute.current; previousRoute.current = { stage: journey.stage, world: journey.world };
    if (controls.current) controls.current.enabled = false;
    parallax.current.value = 0;
    if (journey.transition || (journey.stage === 5 && journey.world === 'tunnel') || (journey.stage === 6 && journey.finale === 'gathering')) return;
    const stage = journey.stage;
    const isWorld = stage === 5 || stage === 6, door = stage === 5 && journey.world === 'entry';
    const endingPair=stage===6&&['sealing','end'].includes(journey.finale);
    const pairFrame=storyLayout(journey,size.width,size.height).hero;
    const pairSpan=Math.max(4.761/(pairFrame.height/size.height),5.454/(pairFrame.width/size.width)/(size.width/size.height));
    const height = isWorld && !door ? (stage === 6 ? endingPair?pairSpan:9.2 : universeSpan(size.width, size.height)) : presentationSpan(stage, size.width, size.height, journey.gift);
    const z = height / (2 * Math.tan(THREE.MathUtils.degToRad(38 / 2)));
    const target = new THREE.Vector3(0, stage === 6 ? 1.1 : stage === 3 ? (journey.envelope === 'closed' ? -.25 : .5) : door ? 0.05 : 0.35, (isWorld && !door) ? WORLD_Z : 0);
    const destination = new THREE.Vector3(0, stage === 1 ? 2.1 : isWorld && !door ? 3.4 : stage === 3 ? target.y + 1.5 : 1.85, z + target.z);
    if (camera.userData.storyStage === stage && previous.stage !== stage && camera.userData.storyViewport === `${size.width}:${size.height}`) {
      delete camera.userData.storyStage;
      const look = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(camera.position.distanceTo(target)).add(camera.position);
      if (controls.current) { controls.current.target.copy(look); controls.current.update(); controls.current.enabled = browsing; }
      moving.current = false;
      return watchTimeline(gsap.to(parallax.current, { value: browsing ? 1 : 0, duration: reduced ? 0 : 0.8 }));
    }
    if (universe && journey.world !== 'hub') { if (!saved.current) saved.current = { position: camera.position.clone(), target: controls.current?.target.clone() ?? target.clone(), aspect: size.width / size.height }; if (journey.world !== 'promise') return; }
    if (browsing && saved.current) {
      const savedView = saved.current, distance = destination.distanceTo(target);
      target.copy(savedView.target);
      destination.copy(savedView.position);
      if (Math.abs(savedView.aspect - size.width / size.height) > .01) destination.sub(target).normalize().multiplyScalar(distance).add(target);
      saved.current = null;
    }
    if (browsing && previous.stage === 5 && previous.world === 'tunnel' && camera.userData.portalSettled && camera.userData.portalViewport === `${size.width}:${size.height}`) {
      // The intro already established position, orientation and FOV. Hand that pose over verbatim.
      const look = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(camera.position.distanceTo(target)).add(camera.position);
      if (controls.current) { controls.current.target.copy(look); controls.current.update(); controls.current.enabled = true; }
      moving.current = false;
      return watchTimeline(gsap.to(parallax.current, { value: 1, duration: reduced ? 0 : 0.8, ease: 'sine.inOut' }));
    }
    moving.current = true;
    const look = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(camera.position.distanceTo(target)).add(camera.position);
    const t = gsap.timeline();
    t.to(look, { x: target.x, y: target.y, z: target.z, duration: reduced ? 0 : 2.2, ease: 'power2.inOut' }, 0);
    t.to(camera.position, { x: destination.x, y: destination.y, z: destination.z, duration: reduced ? 0 : 2.2, ease: 'power2.inOut', onUpdate: () => camera.lookAt(look) }, 0);
    t.call(() => { moving.current = false; if (controls.current) { controls.current.target.copy(target); controls.current.update(); controls.current.enabled = browsing; } });
    t.to(parallax.current, { value: browsing ? 1 : 0, duration: reduced ? 0 : 0.8, ease: 'sine.inOut' });
    const clean = watchTimeline(t); return () => { clean(); moving.current = false; };

  }, [journey.stage, journey.world, journey.gift, journey.envelope, journey.finale, journey.endingPhase, journey.transition, reduced, resetCamera, camera, size.width, size.height]);
  const viewOffset = useRef<number | null>(null);
  useFrame((_, delta) => {
    const frame = storyLayout(journey, size.width, size.height).hero;
    const wanted = size.height / 2 - (frame.y + frame.height / 2);
    viewOffset.current = reduced || viewOffset.current === null ? wanted : THREE.MathUtils.damp(viewOffset.current, wanted, 3, delta);
    (camera as THREE.PerspectiveCamera).setViewOffset(size.width, size.height, 0, viewOffset.current, size.width, size.height);
  });
  useFrame((_, delta) => { if (!controls.current || !browsing || reduced || drag.current || moving.current) return; const target = controls.current.target; target.x = THREE.MathUtils.damp(target.x, pointer.current.x * 0.13 * parallax.current.value, 2, delta); target.y = THREE.MathUtils.damp(target.y, 0.35 - pointer.current.y * 0.1 * parallax.current.value, 2, delta); });
  return <OrbitControls ref={controls} makeDefault enabled={false} enableDamping dampingFactor={0.065} enablePan={false} minDistance={8} maxDistance={48} minPolarAngle={Math.PI * 0.23} maxPolarAngle={Math.PI * 0.64} rotateSpeed={0.42} zoomSpeed={0.55} onStart={() => { drag.current = true; if (browsing) window.dispatchEvent(new CustomEvent('hbd:orbit-active', { detail: { active: true } })); }} onEnd={() => { drag.current = false; window.dispatchEvent(new CustomEvent('hbd:orbit-active', { detail: { active: false } })); }} />;
}

function SoftShadow() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(98,31,66,.32)'); gradient.addColorStop(0.45, 'rgba(98,31,66,.17)'); gradient.addColorStop(1, 'rgba(98,31,66,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.23, 0]}><planeGeometry args={[5.5, 4.8]} /><meshBasicMaterial map={texture} transparent depthWrite={false} /></mesh>;
}

function Atmosphere({ night, reduced }: { night: boolean; reduced: boolean }) {
  const ambient = useRef<THREE.AmbientLight>(null), hemisphere = useRef<THREE.HemisphereLight>(null), sun = useRef<THREE.DirectionalLight>(null), fill = useRef<THREE.PointLight>(null);
  useEffect(() => {
    if (!ambient.current || !hemisphere.current || !sun.current || !fill.current) return;
    const t = gsap.timeline();
    for (const [object, intensity] of [[ambient.current, night ? 0.4 : 0.6], [hemisphere.current, night ? 0.45 : 0.85], [sun.current, night ? 1.6 : 2.3], [fill.current, night ? 12 : 8]] as const) t.to(object, { intensity, duration: reduced ? 0 : 2.4, ease: 'sine.inOut' }, 0);
    return watchTimeline(t);
  }, [night, reduced]);
  return <><ambientLight ref={ambient} intensity={0.6} /><hemisphereLight ref={hemisphere} args={['#fff7ef', '#ba6b93', 0.85]} /><directionalLight ref={sun} position={[-4,6,5]} intensity={2.3} color="#fff0dc" /><pointLight ref={fill} position={[4,3,-2]} color="#f3a8ce" intensity={8} /></>;
}

function World(props: Props) {
  const { journey: j, memory, reduced, onDone, onMemory, onActivity, resetCamera, holdProgress, pinRejection, ratingReaction, onReady } = props;
  const stage = j.stage, dark = stage === 5 || (stage === 6 && j.finale !== 'end');
    const ambient = useRef<THREE.Group>(null);
  useEffect(() => { onReady(); }, [onReady]);
  useFrame(state => { if (ambient.current && !reduced) { ambient.current.rotation.y = state.clock.elapsedTime * 0.04; ambient.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.14; ambient.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.025; } });
  const sceneState=useThree(), boundClock=useRef(0), heroBox=useMemo(()=>new THREE.Box3(),[]), corner=useMemo(()=>new THREE.Vector3(),[]);
  useFrame((_,delta)=>{
    boundClock.current+=delta;if(boundClock.current<.5||j.transition||j.world==='tunnel')return;boundClock.current=0;
    const names=['gift-model','cake-model','birthday-card-text','envelope-model','letter-sheet',j.world==='entry'?'door-model':'particle-heart',j.finale==='end'?'ending-couple':'particle-heart'];
    const object=sceneState.scene.getObjectByName(names[stage]);
    if(!object||!object.visible||stage===4||stage===5&&j.world!=='entry') {window.dispatchEvent(new CustomEvent('hbd:hero-bounds',{detail:null}));return;}
    object.updateWorldMatrix(true,true);heroBox.setFromObject(object);
    if (stage === 2) {
      const number = sceneState.scene.getObjectByName('birthday-22');
      if (number) { number.updateWorldMatrix(true, true); heroBox.expandByObject(number); }
    }
    if(heroBox.isEmpty())return;
    const rect=sceneState.gl.domElement.getBoundingClientRect();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const x of [heroBox.min.x,heroBox.max.x])for(const y of [heroBox.min.y,heroBox.max.y])for(const z of [heroBox.min.z,heroBox.max.z]) {
      corner.set(x,y,z).project(sceneState.camera);const sx=rect.left+(corner.x+1)*rect.width/2,sy=rect.top+(1-corner.y)*rect.height/2;
      minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
    }
    window.dispatchEvent(new CustomEvent('hbd:hero-bounds',{detail:{x:minX,y:minY,width:maxX-minX,height:maxY-minY}}));
    const action = stage===5 ? object.getObjectByName('door-lock') : stage===3 && j.envelope==='ready' ? object.getObjectByName('letter-sheet') : object;
    if(action && [0,1,3,5].includes(stage)){
      heroBox.setFromObject(action);minX=Infinity;minY=Infinity;maxX=-Infinity;maxY=-Infinity;
      for(const x of [heroBox.min.x,heroBox.max.x])for(const y of [heroBox.min.y,heroBox.max.y])for(const z of [heroBox.min.z,heroBox.max.z]){
        corner.set(x,y,z).project(sceneState.camera);const sx=rect.left+(corner.x+1)*rect.width/2,sy=rect.top+(1-corner.y)*rect.height/2;
        minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
      }
      const x=Math.max(0,minX-12),y=Math.max(0,minY-12);
      window.dispatchEvent(new CustomEvent('hbd:action-bounds',{detail:{x,y,width:Math.max(44,Math.min(rect.width,maxX+12)-x),height:Math.max(44,Math.min(rect.height,maxY+12)-y)}}));
    }
  });
  const orbitPose=useRef(new THREE.Vector3()), orbitSettled=useRef(0), worldBoundsSent=useRef(false), orbitViewport=useRef('');
  useFrame((_,delta)=>{
    if(stage!==5||j.world!=='hub'){worldBoundsSent.current=false;orbitSettled.current=0;return;}
    const viewport = `${sceneState.size.width}:${sceneState.size.height}`;
    if (orbitViewport.current !== viewport) { orbitViewport.current = viewport; worldBoundsSent.current = false; orbitSettled.current = 0; }
    if(orbitPose.current.distanceToSquared(sceneState.camera.position)>.0004) {
      orbitPose.current.copy(sceneState.camera.position);orbitSettled.current=0;worldBoundsSent.current=false;return;
    }
    orbitSettled.current+=delta;if(orbitSettled.current<.85||worldBoundsSent.current)return;
    worldBoundsSent.current=true;
    const rect=sceneState.gl.domElement.getBoundingClientRect(), masks:{x:number;y:number;width:number;height:number}[]=[];
    sceneState.scene.getObjectByName('universe-root')?.traverse(object=>{
      if(!/^(memory-|activity-)/.test(object.name)||!object.visible)return;
      object.updateWorldMatrix(true,true);heroBox.setFromObject(object);if(heroBox.isEmpty())return;
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      for(const x of [heroBox.min.x,heroBox.max.x])for(const y of [heroBox.min.y,heroBox.max.y])for(const z of [heroBox.min.z,heroBox.max.z]) {
        corner.set(x,y,z).project(sceneState.camera);const sx=rect.left+(corner.x+1)*rect.width/2,sy=rect.top+(1-corner.y)*rect.height/2;
        minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
      }
      if(maxX>0&&minX<rect.width&&maxY>0&&minY<rect.height)masks.push({x:minX,y:minY,width:maxX-minX,height:maxY-minY});
    });
    const center = sceneState.scene.getObjectByName('particle-heart');
    if (center?.visible) {
      center.updateWorldMatrix(true, false);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const x of [-1.15, 1.15]) for (const y of [-1.2, 1.05]) {
        corner.set(x, y, 0).applyMatrix4(center.matrixWorld).project(sceneState.camera);
        const sx = rect.left + (corner.x + 1) * rect.width / 2, sy = rect.top + (1 - corner.y) * rect.height / 2;
        minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
      }
      masks.push({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
    }
    window.dispatchEvent(new CustomEvent('hbd:world-bounds',{detail:masks}));
  });
  return <>
    <CameraRig journey={j} reduced={reduced} resetCamera={resetCamera} />
    <Atmosphere night={dark || j.transition?.kind === 'paper-door'} reduced={reduced} />
    <StorySequence journey={j} reduced={reduced} onDone={onDone} pinRejection={pinRejection} pinProgress={props.pinProgress} holdProgress={holdProgress} breathOriginRef={props.breathOriginRef} breathTargetRef={props.breathTargetRef} />
    {(stage === 5 || stage === 6 || j.transition?.kind === 'paper-door') && <UniverseSequence dateMachine={props.dateMachine} journey={j} memory={memory} reduced={reduced} onDone={onDone} onMemory={onMemory} onActivity={onActivity} holdProgress={holdProgress} ratingReaction={ratingReaction} />}
    {!dark && stage < 4 && <>{<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}><circleGeometry args={[2.7, 80]} /><meshStandardMaterial color="#efb7ce" roughness={0.72} /></mesh>}<SoftShadow /></>}
    {stage < 5 && <group ref={ambient}>{[-1, 1].map((side, i) => <group key={i} position={[side * 3.1, i ? 1.5 : 0.5, -1.9]} rotation={[0.1, side * 0.4, side * 0.12]}><Heart scale={0.21 + i * 0.06} color={dark ? '#ad467b' : '#e59eb9'} glow={dark} /></group>)}</group>}
    {!reduced && stage < 5 && <Sparkles count={dark ? 70 : 26} scale={[11, 6, 7]} size={dark ? 2.5 : 2} speed={0.15} color={dark ? '#ffbad8' : '#fff8e7'} opacity={0.65} />}
    <SceneEffects night={dark} focused={j.stage === 5 && j.world === 'promise'} />
  </>;
}

// Keep the render passes mounted while activity state and guide cues change.
const SceneEffects = memo(function SceneEffects({ night, focused }: { night: boolean; focused: boolean }) {
  // The close-up transparent globe needs the clear render path; mipmap Bloom
  // blanks this focused composition on the tested WebGL renderer.
  return <EffectComposer multisampling={0}>{!focused && <Bloom mipmapBlur luminanceThreshold={1.5} intensity={night ? .75 : .4}/>}<ToneMapping mode={ToneMappingMode.ACES_FILMIC}/></EffectComposer>;
});

export default function Scene(props: Props) {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    // Prepare the finale during the envelope scene, before the portal needs it.
    if (props.journey.stage === 3) useGLTF.preload(`${import.meta.env.BASE_URL}assets/models/monchhichi-couple.glb`);
  }, [props.journey.stage]);
  useEffect(() => { const change = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', change); return () => document.removeEventListener('visibilitychange', change); }, []);
  return <Canvas dpr={[1, 1.4]} frameloop={visible ? 'always' : 'never'} camera={{ position: [0, 2.15, 8.3], fov: 38, near: 0.1, far: 70 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
    <Suspense fallback={null}><World {...props} reduced={props.reduced || props.paused} /></Suspense>
  </Canvas>;
}
