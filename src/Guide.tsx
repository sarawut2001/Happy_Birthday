import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Heart } from 'lucide-react';
import * as THREE from 'three';
import { Monchhichi } from './Monchhichi';
import { guideMuted, type GuideCue } from './guide-controller';
import type { Journey } from './journey';
import type { MonchhichiPose } from './monchhichi-model';
import './guide.css';
import { placeGuide, fitBubble, guideRoute, guideBlocked, guideContentRects, guideContentBlocked, type GuideRect, type GuidePlacement } from './guide-layout';
import { expressionFor, restingFace, speechTimeline, type FacePerformance } from './guide-speech';

type ScreenPoint = { x: number; y: number };
type GuideProps = { journey: Journey; cue: GuideCue | null; reduced: boolean; ready: boolean; videoPlaying: boolean; onRepeat: () => void; sceneFailed: boolean; onMouthAnchor?: (point: ScreenPoint) => void; breathTargetRef?: MutableRefObject<ScreenPoint | null> };
class GuideBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function FallbackActor({ onLoaded }: { onLoaded: () => void }) {
  useEffect(onLoaded, [onLoaded]);
  return <span className="guide-fallback" aria-hidden="true"><Heart size={42} strokeWidth={1.4} /><span>♡</span></span>;
}

function Actor({ pose, reduced, paused, onLoaded, onHead, onMouth, gaze, travel, gestureToken, anchorVersion, performance, speed }: { performance: MutableRefObject<FacePerformance>; speed: number; anchorVersion:number; gaze: MutableRefObject<ScreenPoint>; travel: MutableRefObject<number>; gestureToken: string; pose: MonchhichiPose; reduced: boolean; paused: boolean; onLoaded: () => void; onHead: (point: ScreenPoint) => void; onMouth?: (point: ScreenPoint) => void }) {
  const root = useRef<THREE.Group>(null), loaded = useRef(false);
  const { camera, size, gl, invalidate } = useThree();
  const headPoint = useMemo(() => new THREE.Vector3(), []), mouthPoint = useMemo(() => new THREE.Vector3(), []);
  const previousHead = useRef<ScreenPoint | null>(null), previousMouth = useRef<ScreenPoint | null>(null), localTime = useRef(0);
  useEffect(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    orthographic.zoom = Math.max(1, (size.height - 8) / 3.3);
    orthographic.position.set(0, 1.4, 5); orthographic.lookAt(0, 1.4, 0); orthographic.updateProjectionMatrix(); invalidate();
  }, [camera, size.height, invalidate]);
  useEffect(()=>{invalidate();},[anchorVersion,invalidate]);
  useFrame((_, delta) => {
    if (!root.current || document.hidden) return;
    const head = root.current.getObjectByName('Head');
    if (!head) return;
    if (!loaded.current) { loaded.current = true; onLoaded(); }
    const rect = gl.domElement.getBoundingClientRect();
    if (!paused && !reduced) localTime.current += Math.min(delta,.1);
    const turn = THREE.MathUtils.clamp((gaze.current.x-(rect.left+rect.width/2))/Math.max(360,innerWidth),-.26,.26);
    const tilt = THREE.MathUtils.clamp((gaze.current.y-(rect.top+rect.height*.35))/Math.max(450,innerHeight),-.055,.055);
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, turn+(paused?0:Math.sin(localTime.current*.35)*.018),1.8,Math.min(delta,.1));
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, tilt,1.8,Math.min(delta,.1));
    root.current.updateMatrixWorld(true);
    // Head is pivoted at the neck. These offsets locate the face center and
    // mouth on the front artwork, and move with the animated Head bone.
    headPoint.set(0, .76, .30); head.localToWorld(headPoint); headPoint.project(camera);
    const facialMouth = root.current.getObjectByName('face-mouth');
    if (facialMouth) { const faceMesh = facialMouth as THREE.Mesh; if (!faceMesh.geometry.boundingBox) faceMesh.geometry.computeBoundingBox(); faceMesh.geometry.boundingBox!.getCenter(mouthPoint); facialMouth.localToWorld(mouthPoint); }
    else { mouthPoint.set(-.065, .19, .36); head.localToWorld(mouthPoint); } mouthPoint.project(camera);
    const headScreen = { x: rect.left + (headPoint.x + 1) * rect.width / 2, y: rect.top + (1 - headPoint.y) * rect.height / 2 };
    const mouthScreen = { x: rect.left + (mouthPoint.x + 1) * rect.width / 2, y: rect.top + (1 - mouthPoint.y) * rect.height / 2 };
    if (!previousHead.current || Math.hypot(headScreen.x - previousHead.current.x, headScreen.y - previousHead.current.y) > 1) { previousHead.current = headScreen; onHead(headScreen); }
    if (onMouth && (!previousMouth.current || Math.hypot(mouthScreen.x - previousMouth.current.x, mouthScreen.y - previousMouth.current.y) > 1)) { previousMouth.current = mouthScreen; onMouth(mouthScreen); }
  });
  return <group ref={root}><Monchhichi pose={pose} reduced={reduced} paused={paused} settleWhenPaused name="guide-monchhichi" gestureToken={gestureToken} travel={travel} performance={performance} speed={speed} /></group>;
}

// The guide and cake use different cameras. This viewport layer carries the
// visible airflow between their projected anchors without either Canvas crop.
function Breath({ mouth, target }: { mouth: MutableRefObject<ScreenPoint | null>; target: MutableRefObject<ScreenPoint | null> }) {
  const svg = useRef<SVGSVGElement>(null), ribbons = useRef<(SVGPathElement | null)[]>([]), sparks = useRef<(SVGCircleElement | null)[]>([]);
  useEffect(() => {
    let frame = 0, elapsed = 0, last = performance.now(), finished = false;
    let width = 0, height = 0;
    const tick = (now: number) => {
      if (!svg.current || document.hidden || finished) return;
      elapsed += Math.min((now - last) / 1000, .08); last = now;
      if (width !== window.innerWidth || height !== window.innerHeight) {
        width = window.innerWidth; height = window.innerHeight;
        svg.current.setAttribute('viewBox', `0 0 ${width} ${height}`);
      }
      const from = mouth.current, to = target.current;
      if (from && to) {
        const dx = to.x - from.x, dy = to.y - from.y, length = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / length, ny = dx / length, curve = Math.min(28, length * .06);
        const controlA = { x: from.x + dx * .30 + nx * curve, y: from.y + dy * .12 + ny * curve };
        const controlB = { x: from.x + dx * .77 - nx * curve * .45, y: from.y + dy * .88 - ny * curve * .45 };
        const at = (t: number, lane: number) => {
          const u = 1 - t, wave = Math.sin(t * Math.PI) * (lane + Math.sin(t * 14 + elapsed * 8 + lane) * 2.2);
          return { x: u ** 3 * from.x + 3 * u * u * t * controlA.x + 3 * u * t * t * controlB.x + t ** 3 * to.x + nx * wave,
            y: u ** 3 * from.y + 3 * u * u * t * controlA.y + 3 * u * t * t * controlB.y + t ** 3 * to.y + ny * wave };
        };
        const fade = 1 - THREE.MathUtils.smoothstep(elapsed, 1.34, 1.82);
        ribbons.current.forEach((path, i) => {
          if (!path) return;
          const age = elapsed - .07 - i * .045, head = THREE.MathUtils.clamp(age / 1.08, 0, 1), tail = THREE.MathUtils.clamp((age - .42) / 1.08, 0, 1);
          let d = '';
          for (let k = 0; k <= 24; k++) {
            const p = at(tail + (head - tail) * k / 24, (i - 1.5) * 3.2);
            d += `${k ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
          }
          path.setAttribute('d', d);
          path.setAttribute('opacity', String(head > tail ? THREE.MathUtils.clamp(age / .16, 0, 1) * fade * (i % 2 ? .85 : .65) : 0));
        });
        sparks.current.forEach((spark, i) => {
          if (!spark) return;
          const progress = (elapsed - .11 - i * .055) / 1.07;
          const p = at(THREE.MathUtils.clamp(progress, 0, 1), (i % 3 - 1) * 4.5);
          spark.setAttribute('cx', p.x.toFixed(2)); spark.setAttribute('cy', p.y.toFixed(2));
          spark.setAttribute('opacity', String(progress > 0 && progress < 1 ? Math.sin(progress * Math.PI) * .65 * fade : 0));
        });
      } else {
        ribbons.current.forEach(path => path?.setAttribute('opacity', '0'));
        sparks.current.forEach(spark => spark?.setAttribute('opacity', '0'));
      }
      svg.current.setAttribute('data-breath-time', elapsed.toFixed(3));
      if (elapsed < 1.85) frame = requestAnimationFrame(tick);
      else { finished = true; svg.current.setAttribute('data-breath-complete', 'true'); }
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !finished) { last = performance.now(); frame = requestAnimationFrame(tick); }
    };
    document.addEventListener('visibilitychange', visibility);
    if (!document.hidden) frame = requestAnimationFrame(tick);
    return () => { finished = true; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); };
  }, [mouth, target]);
  return <svg ref={svg} className="guide-breath" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    {Array.from({ length: 4 }, (_, i) => <path key={`ribbon-${i}`} ref={element => { ribbons.current[i] = element; }} className={`guide-air-ribbon guide-air-ribbon-${i % 2}`} opacity="0" />)}
    {Array.from({ length: 8 }, (_, i) => <circle key={`spark-${i}`} ref={element => { sparks.current[i] = element; }} className="guide-air-spark" r={i % 3 === 0 ? 1.5 : .95} opacity="0" />)}
  </svg>;
}

function Speech({ cue, reduced, running, performance, onComplete }: { cue: GuideCue | null; reduced: boolean; running: boolean; performance: MutableRefObject<FacePerformance>; onComplete: (id: string) => void }) {
  const timeline = useMemo(() => speechTimeline(cue?.text ?? ''), [cue?.text]);
  const [visible, setVisible] = useState(0);
  const gate = useRef(running); gate.current = running;
  useEffect(() => {
    let raf = 0, elapsed = 0, previous = performanceNow(), shown = 0, finished = false;
    setVisible(0); performance.current.talking = false; performance.current.mouth = 0;
    const tick = (now: number) => {
      const delta = Math.min(80, now - previous); previous = now;
      if (!document.hidden && gate.current && cue) {
        elapsed += delta;
        const count = reduced ? timeline.length : timeline.filter(g => g.start <= elapsed).length;
        if (count !== shown) { shown = count; setVisible(count); }
        const current = timeline[Math.max(0, count - 1)];
        const duration = timeline.at(-1)?.end ?? 0;
        const speaking = !reduced && elapsed < duration && !!current && !current.silent;
        performance.current.talking = speaking;
        performance.current.mouth = speaking ? .15 + .75 * Math.sin(elapsed / 155 * Math.PI) ** 2 : 0;
        performance.current.round = speaking ? .18 + .3 * Math.sin(elapsed / 390) ** 2 : 0;
        if ((reduced || elapsed >= duration) && !finished) {
          finished = true; performance.current.talking = false; performance.current.mouth = 0; performance.current.round = 0;
          onComplete(cue.id); window.dispatchEvent(new CustomEvent('hbd:guide-spoken', { detail: { id: cue.id } }));
        }
      } else { performance.current.talking = false; performance.current.mouth = 0; performance.current.round = 0; }
      if (!finished) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); performance.current.talking = false; performance.current.mouth = 0; performance.current.round = 0; };
  }, [cue?.id, timeline, reduced, performance, onComplete]);
  return <><span className="sr-only">{cue?.text ?? ''}</span><span className="guide-speech-visual" aria-hidden="true">{timeline.map((g, i) => <span key={i} className={i < visible ? 'guide-written' : 'guide-unwritten'}>{g.text}</span>)}</span></>;
}
const performanceNow = () => window.performance.now();

export function Guide({ journey, cue, reduced, ready, videoPlaying, onRepeat, sceneFailed, onMouthAnchor, breathTargetRef }: GuideProps) {
  const [actorReady, setActorReady] = useState(false), [failed, setFailed] = useState(false);
  const [moving, setMoving] = useState(false), [blocked, setBlocked] = useState(false), [dragging, setDragging] = useState(false), [completedCue, setCompletedCue] = useState('');
  const [anchorVersion, setAnchorVersion] = useState(0);
  const [farewellDone, setFarewellDone] = useState(false);
  useEffect(() => { setFarewellDone(false); }, [journey.stage, journey.finale]);
  useEffect(() => {
    if (journey.stage !== 6 || journey.finale !== 'end' || journey.endingPhase !== 'complete' || completedCue !== cue?.id || !completedCue.startsWith('finale/end/complete/')) return;
    const timer = window.setTimeout(() => setFarewellDone(true), 3200);
    return () => window.clearTimeout(timer);
  }, [journey.stage, journey.finale, journey.endingPhase, completedCue, cue?.id]);
  const frame = useRef<HTMLDivElement>(null), actor = useRef<HTMLButtonElement>(null), bubble = useRef<HTMLDivElement>(null);
  const placement = useRef<GuidePlacement | null>(null), lockedRoute = useRef(''), hero = useRef<GuideRect | null>(null), obstacles = useRef<GuideRect[]>([]);
  const worldDockChosen = useRef(false);
  const flight = useRef(false), gaze = useRef<ScreenPoint>({ x: 0, y: 0 }), travel = useRef(0), facial = useRef(restingFace());
  const lastHead = useRef<ScreenPoint | null>(null), mouth = useRef<ScreenPoint | null>(null);
  const markLoaded = useCallback(() => setActorReady(true), []), markFailed = useCallback(() => { setFailed(true); setActorReady(true); }, []);
  const projectMouth = useCallback((point: ScreenPoint) => { mouth.current = point; onMouthAnchor?.(point); }, [onMouthAnchor]);
  const complete = useCallback((id: string) => setCompletedCue(id), []);
  const muted = guideMuted(journey, videoPlaying);
  const warpHidden = journey.stage === 5 && journey.world === 'tunnel' && !['opening', 'suction'].includes(journey.worldPhase);
  const universe = journey.stage === 5 && journey.world !== 'entry';
  const browsing = journey.stage === 5 && journey.world === 'hub';
  const reading = journey.stage === 4 || universe && !['hub', 'tunnel'].includes(journey.world);
  const activeCue = ready && actorReady && !muted ? cue : null;
  const hidden = warpHidden || videoPlaying || farewellDone || journey.stage === 6 && journey.finale === 'end' && ['watching', 'closing'].includes(journey.endingPhase);
  const canSpeak = !moving && !hidden && !(browsing && (dragging || blocked));
  const blowing = journey.stage === 1 && journey.cake === 'blowing' && !reduced && !journey.transition && !sceneFailed && !failed;
  const pose: MonchhichiPose = blowing ? 'Blow' : moving ? 'Idle' : activeCue && completedCue !== activeCue.id && canSpeak ? activeCue.pose : 'Idle';
  const paused = !moving && (videoPlaying || reading && (!activeCue || completedCue === activeCue.id));
  facial.current.expression = blowing ? 'blow' : expressionFor(activeCue);
  const layoutRoute = guideRoute(journey);
  const layoutState = useRef({ journey, activeCue, reading, browsing, hidden }); layoutState.current = { journey, activeCue, reading, browsing, hidden };
  const pointTail = useCallback((point: ScreenPoint) => {
    lastHead.current = point;
    const element = bubble.current; if (!element) return;
    const rect = element.getBoundingClientRect();
    let x = THREE.MathUtils.clamp(point.x - rect.left, 16, rect.width - 16), y = THREE.MathUtils.clamp(point.y - rect.top, 16, rect.height - 16);
    if (point.y > rect.bottom) y = rect.height; else if (point.y < rect.top) y = 0; else if (point.x < rect.left) x = 0; else x = rect.width;
    element.style.setProperty('--guide-tail-x', `${x}px`); element.style.setProperty('--guide-tail-y', `${y}px`);
    element.style.setProperty('--guide-tail-angle', `${Math.atan2(point.y - rect.top - y, point.x - rect.left - x) * 180 / Math.PI + 180}deg`);
  }, []);
  useEffect(() => {
    let timer = 0;
    const orbit = (event: Event) => {
      window.clearTimeout(timer);
      if ((event as CustomEvent<{ active: boolean }>).detail.active) setDragging(true);
      else timer = window.setTimeout(() => setDragging(false), 950);
    };
    window.addEventListener('hbd:orbit-active', orbit);
    if (!browsing) { setDragging(false); setBlocked(false); }
    return () => { window.clearTimeout(timer); window.removeEventListener('hbd:orbit-active', orbit); };
  }, [browsing]);
  useEffect(() => {
    let raf = 0, scheduled = 0, animation = 0, resized = false, release = 0, settle = 0;
    const viewport = window.visualViewport, route = layoutRoute;
    worldDockChosen.current = false;
    if (!browsing) obstacles.current = [];
    if (lockedRoute.current !== route) hero.current = null;
    const set = (p: GuidePlacement, scale = 1) => {
      const a = actor.current, b = bubble.current; if (!a || !b) return;
      // Keep the WebGL drawing surface unchanged while the screen-space actor moves.
      a.style.transform = `translate3d(${p.actor.x + p.actor.width * (1 - scale) / 2}px,${p.actor.y + p.actor.height * (1 - scale)}px,0) scale(${p.actor.width / 200 * scale})`;
      frame.current?.style.setProperty('--warp-x', `${p.actor.x + p.actor.width / 2}px`);
      frame.current?.style.setProperty('--warp-y', `${p.actor.y + p.actor.height - 18}px`);
      frame.current?.setAttribute('data-guide-placed', 'true');
      Object.assign(b.style, { left: `${p.bubble.x}px`, top: `${p.bubble.y}px`, width: `${p.bubble.width}px`, height: `${p.bubble.height}px` });
      placement.current = p; frame.current?.setAttribute('data-guide-side', p.side);
      if (lastHead.current) pointTail(lastHead.current);
    };
    const measure = () => {
      const { journey, activeCue, reading, browsing, hidden } = layoutState.current;
      if (!actor.current || !bubble.current || !frame.current || flight.current && !resized) return;
      const width = Math.min(innerWidth, viewport?.width ?? innerWidth), height = Math.min(innerHeight, viewport?.height ?? innerHeight);
      if (browsing && !obstacles.current.length && !sceneFailed && !resized) return;
      frame.current.closest<HTMLElement>('.app')?.style.setProperty('--keyboard-lift', `${Math.max(0, innerHeight - (viewport?.height ?? innerHeight) - (viewport?.offsetTop ?? 0))}px`);
      const masks = guideContentRects();
      const maxWidth = width < 600 ? Math.min(250, width - (placement.current?.actor.width ?? 88) - 38) : browsing && height > width ? 180 : reading ? 380 : 360;
      const probe = document.createElement('div'); probe.className = 'guide-bubble';
      const visualText = bubble.current.querySelector('.guide-speech-visual');
      if (visualText) probe.appendChild(visualText.cloneNode(true)); else probe.textContent = activeCue?.text ?? '';
      Object.assign(probe.style, { position: 'fixed', left: '-10000px', top: '0', width: 'max-content', maxWidth: `${maxWidth}px`, minWidth: `${Math.min(140, maxWidth)}px`, height: 'auto', visibility: 'hidden', transform: 'none', transition: 'none' });
      frame.current.appendChild(probe); const measured = probe.getBoundingClientRect();
      const bw = Math.min(maxWidth, Math.ceil(measured.width)), measuredHeight = Math.ceil(measured.height); probe.remove();
      const bh = Math.max(40, measuredHeight);
      const choosingWorldDock = browsing && obstacles.current.length > 0 && !worldDockChosen.current;
      const protectedContent = browsing ? masks.concat(obstacles.current) : masks;
      let next = placeGuide(journey, width, height, bw, bh, protectedContent, hero.current);
      const before = placement.current, sameRoute = lockedRoute.current === route;
      if (before && sameRoute && !resized && !hidden && !choosingWorldDock && !guideContentBlocked(before.actor, masks) && !(hero.current && !reading && guideBlocked(before.actor, null, [hero.current]))) {
        // New text changes only its own bubble. A moving scene cannot chase the guide.
        const stableActor = { ...before.actor, width: next.actor.width, height: next.actor.height };
        next = { ...before, actor: stableActor, bubble: fitBubble(stableActor, before.side, width, height, bw, bh, protectedContent.concat(hero.current && !reading ? [hero.current] : [])), gaze: next.gaze };
      }
      if (choosingWorldDock) worldDockChosen.current = true;
      gaze.current = next.gaze;
      if (browsing) {
        const collision = guideBlocked(next.actor, activeCue ? next.bubble : null, obstacles.current);
        window.clearTimeout(release);
        if (collision) setBlocked(true); else release = window.setTimeout(() => setBlocked(false), 350);
      }
      if (!before || hidden) {
        // Opening the player hides the guide at its current dock. Moving that
        // dock during the opacity fade would look like a jump behind the frame.
        const videoFocus = journey.stage === 6 && journey.finale === 'end' && ['watching', 'closing'].includes(journey.endingPhase);
        cancelAnimationFrame(animation); flight.current = false; resized = false; lockedRoute.current = route; set(videoFocus && before ? before : next); frame.current?.removeAttribute('data-guide-warp'); frame.current?.removeAttribute('data-guide-covered'); frame.current?.style.removeProperty('--warp-opacity'); setMoving(false); setAnchorVersion(v => v + 1); return;
      }
      lockedRoute.current = route;
      resized = false;
      const distance = Math.hypot(next.actor.x - before.actor.x, next.actor.y - before.actor.y), sizeChange = Math.abs(next.actor.width - before.actor.width);
      if (distance < 1 && sizeChange < .5) { set(next); frame.current?.removeAttribute('data-guide-warp'); frame.current?.removeAttribute('data-guide-covered'); frame.current?.style.removeProperty('--warp-opacity'); setMoving(false); return; }
      cancelAnimationFrame(animation);
      flight.current = true; frame.current?.setAttribute('data-guide-warp', 'prepare');
      // The previous dock can intersect newly opened content. Fade there only
      // when it remains clear; otherwise keep the departure actor hidden.
      frame.current?.setAttribute('data-guide-covered', guideContentBlocked(before.actor, masks) ? 'true' : 'false');
      setMoving(true);
      // Only the source and destination are ever visible. Position and size change
      // during the dark beat, with a fixed 200 × 296 WebGL drawing surface.
      const initialOpacity = Number(frame.current?.style.getPropertyValue('--warp-opacity') || 1);
      const duration = reduced ? 240 : 1360;
      const ease = (t: number) => t * t * (3 - 2 * t);
      let elapsed = 0, previous = performanceNow(), relocated = false;
      const tick = (now: number) => {
        if (document.hidden) { previous = now; animation = requestAnimationFrame(tick); return; }
        elapsed += now - previous; previous = now;
        const t = Math.min(1, elapsed / duration);
        const departure = reduced ? .45 : .36, arrival = reduced ? .5 : .44, settled = reduced ? 1 : .82;
        let opacity = initialOpacity, scale = 1, phase = 'prepare';
        if (t < departure) {
          const fade = ease(Math.max(0, (t - (reduced ? 0 : .12)) / (departure - (reduced ? 0 : .12))));
          opacity = initialOpacity * (1 - fade); scale = reduced ? 1 : 1 - .16 * fade;
          phase = t < .12 && !reduced ? 'prepare' : 'out';
          set(before, scale);
        } else if (t < arrival) {
          opacity = 0; phase = 'relocate';
          set(next, reduced ? 1 : .84); relocated = true;
        } else {
          // A slow frame can skip the invisible beat; force it for one frame.
          if (!relocated) { set(next, reduced ? 1 : .84); frame.current?.style.setProperty('--warp-opacity', '0'); relocated = true; animation = requestAnimationFrame(tick); return; }
          const fade = ease(Math.min(1, (t - arrival) / (settled - arrival)));
          opacity = fade; scale = reduced ? 1 : .84 + .16 * fade;
          phase = t < settled ? 'in' : 'settle'; set(next, scale);
        }
        frame.current?.setAttribute('data-guide-warp', phase);
        frame.current?.style.setProperty('--warp-opacity', `${opacity}`);
        if (t >= departure) frame.current?.removeAttribute('data-guide-covered');
        frame.current?.style.setProperty('--warp-glow', `${reduced ? 0 : Math.sin(t * Math.PI)}`);
        if (t < 1) animation = requestAnimationFrame(tick);
        else {
          set(next); frame.current?.removeAttribute('data-guide-warp'); frame.current?.style.removeProperty('--warp-opacity');
          flight.current = false; setMoving(false); setAnchorVersion(v => v + 1); schedule();
        }
      };
      animation = requestAnimationFrame(tick);
    };
    const schedule = () => { cancelAnimationFrame(scheduled); scheduled = requestAnimationFrame(measure); };
    const resize = () => { resized = true; schedule(); };
    const worldBounds = (e: Event) => { obstacles.current = (e as CustomEvent<GuideRect[]>).detail; worldDockChosen.current = false; schedule(); };
    const receive = (e: Event) => { hero.current = (e as CustomEvent<GuideRect | null>).detail; schedule(); };
    window.addEventListener('hbd:guide-layout', schedule); window.addEventListener('hbd:world-bounds', worldBounds); window.addEventListener('hbd:hero-bounds', receive); window.addEventListener('resize', resize); viewport?.addEventListener('resize', resize);
    const observer = new ResizeObserver(schedule); observer.observe(bubble.current!);
    document.querySelectorAll('.letter-paper,.world-panel,.ending-copy,.ending-video-card').forEach(el => observer.observe(el));
    document.addEventListener('scroll', schedule, true); raf = requestAnimationFrame(measure);
    // Check final DOM positions after panel/heading entrance animations settle.
    settle = window.setTimeout(schedule, 2000);
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(scheduled); cancelAnimationFrame(animation); window.clearTimeout(release); window.clearTimeout(settle); flight.current = false; observer.disconnect(); document.removeEventListener('scroll', schedule, true); window.removeEventListener('hbd:guide-layout', schedule); window.removeEventListener('hbd:world-bounds', worldBounds); window.removeEventListener('hbd:hero-bounds', receive); window.removeEventListener('resize', resize); viewport?.removeEventListener('resize', resize); };
  }, [layoutRoute, reduced, pointTail]);
  useEffect(() => { window.dispatchEvent(new Event('hbd:guide-layout')); }, [activeCue?.text, reading, browsing, hidden]);
  const frameStyle = { '--guide-tail-y': '45%' } as CSSProperties;
  return <><div ref={frame} className={`guide ${moving ? 'guide-traveling' : ''} ${reading ? 'guide-quiet' : ''} ${universe ? 'guide-universe' : ''} ${browsing && (dragging || blocked) ? 'guide-obscured' : ''} ${muted ? 'guide-muted' : ''} ${hidden ? 'guide-hidden' : ''} ${activeCue ? `guide-${activeCue.kind}` : 'guide-silent'}`} role="group" aria-label="คำแนะนำจาก Monchhichi" style={frameStyle}>
    <div className="guide-warp-effect" aria-hidden="true"><span className="guide-warp-ring" />{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--spark-angle': `${i * 45}deg`, '--spark-delay': `${i * .04}s` } as CSSProperties} />)}</div>
    <button ref={actor} type="button" className="guide-actor" onClick={onRepeat} disabled={!ready || !actorReady || muted || hidden || moving} aria-label="แตะ Monchhichi เพื่ออ่านคำแนะนำอีกครั้ง" title="อ่านคำแนะนำอีกครั้ง" aria-describedby={activeCue ? 'guide-message' : undefined}>
      {failed || sceneFailed ? <FallbackActor onLoaded={markLoaded} /> : <GuideBoundary onError={markFailed}>
        <Canvas style={{ pointerEvents: 'none' }} resize={{ offsetSize: true }} orthographic camera={{ position: [0, 1.4, 5], zoom: 38, near: .1, far: 20 }} dpr={[1, 1.5]} frameloop={hidden || reduced ? 'demand' : 'always'} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => { gl.setClearColor(0, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; }} fallback={<FallbackActor onLoaded={markLoaded} />} aria-hidden="true">
          <ambientLight intensity={.55} /><hemisphereLight args={['#fff6ee', '#9b7485', .7]} /><directionalLight position={[-3, 4, 5]} intensity={2.1} /><directionalLight position={[3, 3, -3]} intensity={1.5} color="#ffd7eb" />
          <Suspense fallback={null}><Actor pose={pose} reduced={reduced} paused={paused} onLoaded={markLoaded} onHead={pointTail} onMouth={projectMouth} gaze={gaze} travel={travel} gestureToken={moving ? 'travel' : activeCue && completedCue !== activeCue.id ? activeCue.id : 'rest'} anchorVersion={anchorVersion} performance={facial} speed={blowing ? 1 : .65} /></Suspense>
        </Canvas>
      </GuideBoundary>}
    </button>
    <div ref={bubble} id="guide-message" className={`guide-bubble ${activeCue && canSpeak ? 'guide-bubble-visible' : ''}`} role="status" aria-live="polite" aria-atomic="true"><Speech key={activeCue?.id ?? 'silent'} cue={activeCue} reduced={reduced} running={canSpeak} performance={facial} onComplete={complete} /></div>
  </div>{blowing && breathTargetRef && <Breath mouth={mouth} target={breathTargetRef} />}</>;
}
