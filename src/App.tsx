import { Component, lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import gsap from 'gsap';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Heart, Mail, Pause, Play, RotateCcw, Volume2, VolumeX, X, Compass } from 'lucide-react';
import { chapters, content } from './content';
import { useSurpriseAudio } from './audio';
import { emitStorySound } from './audio-cues';
import { initialJourney, journeyReducer, type JourneyEvent, type Stage, type WorldView } from './journey';
import { Guide } from './Guide';
import { EndingVideo } from './EndingVideo';
import { DateCapsule } from './DateCapsule';
import { useDateMachine } from './date-machine';
import { useGuide, type GuideEvent } from './guide-controller';
import { storyLayout, useStoryViewport } from './story-layout';
const Scene = lazy(() => import('./Scene'));

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.warn('3D scene unavailable', error.message, info.componentStack); this.props.onError(); }
  render() { return this.state.failed ? <div className="scene-fallback"><Heart size={110} strokeWidth={1} /><span>โลกเล็ก ๆ ของเรา</span></div> : this.props.children; }
}

function Button({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button className="primary-button" onClick={onClick} disabled={disabled}><span>{children}</span><ArrowRight size={18} aria-hidden="true" /></button>;
}

function HoldHeart({ onComplete, onCancel, paused, progressRef }: { onComplete: () => void; onCancel: () => void; paused: boolean; progressRef: React.MutableRefObject<number> }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef(0), started = useRef(0), done = useRef(false);
  const complete = useRef(onComplete); complete.current = onComplete;
  const cancel = useCallback((notify = false) => { if (notify && started.current && progressRef.current > 0 && progressRef.current < 1 && !done.current) onCancel(); emitStorySound('hold-stop'); cancelAnimationFrame(frame.current); started.current = 0; progressRef.current = 0; setProgress(0); }, [progressRef, onCancel]);
  useEffect(() => {
    const hide = () => { if (document.hidden) cancel(); };
    document.addEventListener('visibilitychange', hide);
    return () => { emitStorySound('hold-stop'); cancelAnimationFrame(frame.current); document.removeEventListener('visibilitychange', hide); };
  }, [cancel]);
  useEffect(() => { if (paused) cancel(); }, [paused, cancel]);
  const start = () => {
    if (started.current || done.current) return;
    started.current = performance.now(); emitStorySound('hold-start');
    const tick = (now: number) => {
      const p = Math.min((now - started.current) / 1500, 1); progressRef.current = p; setProgress(p); emitStorySound('hold-progress', { progress: p });
      if (p >= 1) { done.current = true; emitStorySound('hold-stop'); complete.current(); } else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  return <div className="hold-control">
    <button className="model-hit hold-hit" aria-label="กดหัวใจค้างหนึ่งวินาทีครึ่งเพื่อเปิดประตูความทรงจำ" onPointerDown={e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); start(); }} onPointerUp={() => cancel(true)} onPointerCancel={() => cancel()} onLostPointerCapture={() => cancel()} onBlur={() => cancel()} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); } }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') cancel(true); }}>
      <svg className="hold-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" /><circle cx="60" cy="60" r="56" strokeDasharray="352" strokeDashoffset={352 * (1 - progress)} /></svg>
    </button>
    <button className="text-button enter-alternative" onClick={onComplete}>เปิดประตูโดยไม่กดค้าง <ArrowRight size={14} /></button>
  </div>;
}

const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
const letterParts = content.letter.map(p => [...segmenter.segment(p)].map(s => s.segment));
const letterLength = letterParts.reduce((sum, p) => sum + p.length, 0);
function Letter({ reduced, onNext, onGuideEvent }: { reduced: boolean; onNext: () => void; onGuideEvent: (event: GuideEvent) => void }) {
  const [visible, setVisible] = useState(reduced ? letterLength : 0);
  const reported = useRef(false);
  useEffect(() => { if (visible >= letterLength && !reported.current) { reported.current = true; onGuideEvent('letter-complete'); } }, [visible, onGuideEvent]);
  useEffect(() => {
    if (reduced) { setVisible(letterLength); return; }
    const timer = window.setInterval(() => setVisible(n => Math.min(n + 3, letterLength)), 30);
    return () => clearInterval(timer);
  }, [reduced]);
  let offset = 0;
  return <div className="letter-layout">
    <article className="letter-paper" aria-labelledby="letter-title">
      <span className="paper-stamp" aria-hidden="true"><Heart size={23} /></span>
      <h2 id="letter-title">ถึงแฟนที่น่ารักที่สุดในโลก</h2>
      <div className="sr-only">{content.letter.map((p, i) => <p key={i}>{p}</p>)}</div>
      <div className="letter-lines" aria-hidden="true">{letterParts.map((chars, i) => {
        const n = Math.max(0, Math.min(chars.length, visible - offset)); offset += chars.length;
        return <p key={i}><span>{chars.slice(0, n).join('')}</span><span className="unwritten">{chars.slice(n).join('')}</span></p>;
      })}</div>
      <div className={`signature ${visible >= letterLength ? 'revealed' : ''}`}>{content.signature}<Heart size={15} aria-hidden="true" /></div>
      {visible < letterLength && <button className="text-button read-all" onClick={() => { emitStorySound('tap'); setVisible(letterLength); }}>อ่านข้อความทั้งหมด <ArrowRight size={14} /></button>}
    </article>
    <Button onClick={onNext}>ไปดูโลกของเรากัน</Button>
  </div>;
}

const initialTiles = [4, 0, 7, 2, 8, 1, 5, 3, 6];
function PhotoPuzzle({ onGuideEvent, reduced }: { onGuideEvent: (event: GuideEvent) => void; reduced: boolean }) {
  const [tiles, setTiles] = useState(initialTiles), [selected, setSelected] = useState<number | null>(null);
  const solved = tiles.every((value, i) => value === i);
  const reported = useRef(false);
  useEffect(() => { if (solved && !reported.current) { reported.current = true; onGuideEvent('puzzle-complete'); } }, [solved, onGuideEvent]);
  const puzzle = content.puzzle;
  const swap = (index: number) => {
    if (solved) return;
    if (selected === null) { setSelected(index); onGuideEvent('puzzle-selected'); return; }
    setTiles(current => { const next = [...current]; [next[selected], next[index]] = [next[index], next[selected]]; return next; });
    setSelected(null);
    onGuideEvent('puzzle-swapped');
  };
  return <div className={`puzzle-layout ${solved ? 'puzzle-solved' : ''}`}><p className="panel-kicker">PIECE BY PIECE, US</p><h2>{solved ? puzzle.title : content.activityTitles.puzzle}</h2>{solved && <p>{puzzle.caption}</p>}
    {solved ? <motion.div className="puzzle-full-photo" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .8 }}><img src={puzzle.image} alt={puzzle.alt} /><Heart size={18} aria-hidden="true" /></motion.div> : <div className="puzzle-grid" role="group" aria-label="ภาพความทรงจำแบ่งเก้าชิ้น">{tiles.map((tile, index) => <motion.button layout key={tile} transition={{ duration: reduced ? 0 : .65, ease: [.22, 1, .36, 1] }} className={selected === index ? 'selected' : ''} onClick={() => swap(index)} aria-label={`ช่อง ${index + 1}: ชิ้นภาพ ${tile + 1}`} aria-pressed={selected === index}><span className="puzzle-piece" aria-hidden="true" style={{ left: `${-(tile % 3) * 100}%`, top: `${-Math.floor(tile / 3) * 100}%` }}><img src={puzzle.image} alt="" draggable={false} style={{ objectPosition: puzzle.focus, transform: `scale(${puzzle.zoom})` }} /></span></motion.button>)}</div>}
    <p className="puzzle-progress" role="status">{solved ? 'เก็บรอยยิ้มนี้เอาไว้นานๆนะคะ' : `${tiles.filter((tile, i) => tile === i).length} / 9 ชิ้นอยู่ถูกที่`}</p>
    {!solved && <button className="text-button" onClick={() => { setTiles([0, 1, 2, 3, 4, 5, 6, 7, 8]); setSelected(null); }}>ดูภาพเต็มเลย <ArrowRight size={14} /></button>}
  </div>;
}

export default function App() {
  const [journey, dispatch] = useReducer(journeyReducer, initialJourney);
  const viewport = useStoryViewport(), composition = storyLayout(journey, viewport.width, viewport.height);
  const systemReduced = !!useReducedMotion(), [motionPaused, setMotionPaused] = useState(false);
  const reduced = systemReduced || motionPaused;
  const [pin, setPin] = useState(''), [pinError, setPinError] = useState(''), [shake, setShake] = useState(0);
  const [ready, setReady] = useState(false), [sceneFailed, setSceneFailed] = useState(false);
  const [memory, setMemory] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const { cue: guideCue, say: guideSay, repeat: repeatGuide } = useGuide(journey, { ready, videoPlaying, reduced });
  const guideEvent = useCallback((event: GuideEvent) => {
    const cues = { 'letter-complete': 'signature', 'puzzle-selected': 'tile-select', 'puzzle-swapped': 'tile-swap', 'puzzle-complete': 'puzzle-complete' } as const;
    if (event in cues) emitStorySound(cues[event as keyof typeof cues]);
    guideSay(event);
  }, [guideSay]);
  const dateMachine = useDateMachine(journey.stage === 5 && journey.world === 'promise', reduced, guideEvent);
  const cancelHold = useCallback(() => { emitStorySound('hold-release'); guideSay('hold-cancel'); }, [guideSay]);
  const breathOrigin = useRef<{ x: number; y: number } | null>(null);
  const breathTarget = useRef<{ x: number; y: number } | null>(null);
  const setMouthAnchor = useCallback((point: { x: number; y: number }) => { breathOrigin.current = point; }, []);
  const holdProgress = useRef(0);
  const [cameraReset, setCameraReset] = useState(0);
  const [chapterMenu, setChapterMenu] = useState(false);
  const [holdCancelled, setHoldCancelled] = useState(false);
  const [ratingPreview, setRatingPreview] = useState(0), [ratingReaction, setRatingReaction] = useState(0);
  const [pinRejection, setPinRejection] = useState(0), [pinRejecting, setPinRejecting] = useState(false);
  const pinControl = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLInputElement>(null), actionRef = useRef<HTMLButtonElement>(null), mainRef = useRef<HTMLElement>(null);
  const pinBusy = useRef(false);
  const audio = useSurpriseAudio(journey, videoPlaying, reduced), audioActive = useRef(audio.setVideoActive); audioActive.current = audio.setVideoActive;
  const stage = journey.stage, spotlight = stage === 0 && journey.gift !== 'locked';
  useEffect(() => {
    const positionHit = (event: Event) => {
      const r = (event as CustomEvent<{ x: number; y: number; width: number; height: number }>).detail;
      const hit = mainRef.current?.querySelector<HTMLElement>('.model-hit');
      if (!hit || !r) return;
      Object.assign(hit.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px`, translate: 'none', maxWidth: 'none' });
    };
    window.addEventListener('hbd:action-bounds', positionHit);
    return () => window.removeEventListener('hbd:action-bounds', positionHit);
  }, []);
  const busy = !!journey.transition || (stage === 0 && journey.gift === 'opening') || journey.cake === 'blowing' || (stage === 3 && (journey.envelope === 'opening' || journey.envelope === 'reading')) || (stage === 5 && journey.world === 'tunnel') || (stage === 6 && (journey.finale === 'gathering' || journey.finale === 'sealing'));
  const worldPanel = stage === 5 && ['memory', 'promise', 'puzzle'].includes(journey.world);
  const dark = stage === 5 || (stage === 6 && journey.finale !== 'end');
  const endingVideoOpen = stage === 6 && journey.finale === 'end' && ['watching', 'closing'].includes(journey.endingPhase);
  const [endingActionsReady, setEndingActionsReady] = useState(false);
  const endingSoundPlayed = useRef(false);
  useEffect(() => {
    if (!journey.endingRevealed) { setEndingActionsReady(false); endingSoundPlayed.current = false; }
  }, [journey.endingRevealed]);
  const revealEnding = useCallback(() => {
    if (!endingSoundPlayed.current) { endingSoundPlayed.current = true; audio.sound('ending', { once: true }); }
  }, [audio.sound]);
  const current = content.memories[memory];
  useEffect(() => {
    if (stage !== 3) return;
    // Warm the dedicated puzzle while the letter is being opened. The 3D cards
    // already load their textures behind the initial scene without blocking it.
    const image = new window.Image(); image.src = content.puzzle.image;
    void image.decode().catch(() => {});
  }, [stage]);
  const done = useCallback((event: JourneyEvent) => {
    if (event.type === 'envelope-opened') emitStorySound('paper-ready');
    if (event.type === 'candles-out') emitStorySound('wish-made');
    if (event.type === 'gathered') emitStorySound('gather-complete');
    if (event.type === 'world-arrived') emitStorySound('world-ready');
    if (event.type === 'transition-complete' && event.kind === 'gift-cake') emitStorySound('cake-arrive');
    dispatch(event);
  }, []);
  useEffect(() => { if (guideCue?.kind === 'guide') audio.sound('guide-bubble'); }, [guideCue?.id, audio.sound]);
  const markReady = useCallback(() => setReady(true), []);
  const markFailed = useCallback(() => { setSceneFailed(true); setReady(true); }, []);
  const setPlaying = useCallback((active: boolean) => { setVideoPlaying(active); audioActive.current(active); }, []);
  useEffect(() => { const focus = endingVideoOpen ? mainRef.current?.querySelector<HTMLElement>('.ending-video-player,.ending-video-close') : worldPanel ? mainRef.current?.querySelector<HTMLButtonElement>('.panel-close') : stage === 6 && journey.finale === 'end' ? mainRef.current?.querySelector<HTMLElement>(journey.endingPhase === 'complete' ? '.ending-copy h2' : '.ending-video-cover') : mainRef.current; focus?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }, [stage, journey.world, worldPanel, journey.finale, journey.endingPhase, endingVideoOpen]);
  useEffect(() => { if (spotlight) actionRef.current?.focus({ preventScroll: true }); }, [spotlight]);
  useEffect(() => {
    if (!pinRejecting || !pinControl.current) return;
    const control = pinControl.current, digits = control.querySelectorAll('.pin-digit');
    const complete = () => { setPin(''); setPinRejecting(false); pinBusy.current = false; pinRef.current?.focus({ preventScroll: true }); };
    if (reduced) { complete(); return; }
    const t = gsap.timeline({ onComplete: complete });
    t.to(control, { x: -9, duration: 0.07 });
    t.to(control, { x: 9, duration: 0.1, repeat: 3, yoyo: true, ease: 'sine.inOut' });
    t.to(control, { x: 0, duration: 0.18, ease: 'sine.out' });
    t.to(digits, { y: -10, scale: 1.12, duration: 0.18, stagger: 0.055, ease: 'sine.out' }, 0.48);
    t.call(() => emitStorySound('pin-reset'), [], 0.66);
    t.to(digits, { y: 13, scale: 0.7, opacity: 0, duration: 0.38, stagger: 0.055, ease: 'power2.in' }, 0.66);
    const visibility = () => t.paused(document.hidden);
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => { t.kill(); document.removeEventListener('visibilitychange', visibility); gsap.set([control, ...digits], { clearProps: 'transform,opacity' }); };
  }, [pinRejection, pinRejecting, reduced]);
  useEffect(() => {
    const hide = () => setHoldCancelled(document.hidden);
    document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  // The same completion events keep the full story usable when WebGL is unavailable.
  useEffect(() => {
    if (!sceneFailed || !busy) return;
    const event: JourneyEvent | null = journey.transition ? { type: 'transition-complete', kind: journey.transition.kind } : stage === 0 ? { type: 'gift-opened' } : stage === 1 ? { type: 'candles-out' } : stage === 3 ? { type: journey.envelope === 'opening' ? 'envelope-opened' : 'paper-arrived' } : stage === 5 ? { type: 'world-arrived' } : stage === 6 ? { type: journey.finale === 'gathering' ? 'gathered' : 'sealed' } : null;
    if (!event) return;
    const timer = window.setTimeout(() => dispatch(event), reduced ? 0 : 900); return () => clearTimeout(timer);
  }, [sceneFailed, busy, stage, journey.envelope, journey.finale, journey.transition, reduced]);
  const validatePin = (value: string) => {
    if (pinBusy.current || spotlight) return;
    const digits = value.replace(/\D/g, '').slice(0, 6); setPin(digits); setPinError('');
    if (digits.length !== 6) { if (digits.length > pin.length) audio.sound('tap'); return; }
    pinBusy.current = true;
    if (digits === content.pin) { pinRef.current?.blur(); audio.sound('unlock'); dispatch({ type: 'unlock' }); pinBusy.current = false; }
    else { audio.sound('pin-wrong'); setPinError('ยังไม่ใช่น้า ลองอีกที ♡'); guideSay('pin-wrong'); setPinRejection(v => v + 1); setPinRejecting(true); }
  };
  const nudgePin = () => { if (busy || pinBusy.current) return; audio.sound('nudge'); setShake(v => v + 1); setPinError('ใส่รหัสเพื่อเปิดก่อนนะ'); guideSay('pin-nudge'); pinRef.current?.focus(); };
  const dismissGift = () => { if (journey.gift !== 'teasing') return; audio.reset(); audio.sound('panel-close'); dispatch({ type: 'dismiss-gift' }); setPin(''); pinBusy.current = false; pinRef.current?.focus(); };
  const openGift = () => { if (journey.gift !== 'teasing') return; dispatch({ type: 'open-gift' }); };
  const world = (view: WorldView) => { if (view !== journey.world) { audio.sound(view === 'hub' ? 'panel-close' : 'panel-open'); } setPlaying(false); dispatch({ type: 'world', view }); };
  const chooseMemory = useCallback((index: number) => { audio.sound('photo-change', { pan: Math.sin(index / content.memories.length * Math.PI * 2 + .5) * .35 }); setMemory(index); dispatch({ type: 'world', view: 'memory' }); }, [audio.sound]);
  const finish = () => { setPlaying(false); dispatch({ type: 'finish' }); };
  const visit = (next: Stage) => { if (busy) return; audio.reset(); audio.sound('navigate'); setChapterMenu(false); setPlaying(false); dispatch({ type: 'visit', stage: next }); };
  const replay = () => { audio.reset(); audio.sound('navigate'); setPinRejecting(false); setPinRejection(0); setRatingReaction(0); pinBusy.current = false; setPin(''); setPinError(''); setMemory(0); dateMachine.reset(); setRatingPreview(0); setPlaying(false); dispatch({ type: 'replay' }); };
  const selectRating = (value: number) => { audio.sound(value <= 2 ? 'rating-shy' : value === 3 ? 'rating-three' : value === 4 ? 'rating-four' : 'rating-five'); setRatingPreview(0); setRatingReaction(v => v + 1); dispatch({ type: 'rating', value }); };
  const onDialogKey = (event: React.KeyboardEvent) => {
    if (!spotlight && !worldPanel && !endingVideoOpen) return;
    if (event.key === 'Escape' && endingVideoOpen && document.fullscreenElement) return;
    if (event.key === 'Escape') { if (endingVideoOpen) { setPlaying(false); dispatch({ type: 'ending-video-close' }); } else if (worldPanel) world('hub'); else dismissGift(); }
    if (event.key === 'Tab') {
      const controls = [...mainRef.current!.querySelectorAll<HTMLElement>('button:not(:disabled), video, [href]')].filter(el => el.getClientRects().length > 0 && !el.closest('[inert]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  const modelAction = stage === 0 ? (spotlight ? openGift : nudgePin) : stage === 1 ? () => dispatch({ type: 'blow' }) : stage === 3 ? () => { dispatch({ type: journey.envelope === 'closed' ? 'open-envelope' : 'read-letter' }); } : undefined;
  const actionLabel = stage === 0 ? (spotlight ? 'แตะกล่องเพื่อเปิดเซอร์ไพรส์' : 'แตะกล่องของขวัญ') : stage === 1 ? 'แตะเค้กเพื่อเป่าเทียน' : journey.envelope === 'ready' ? 'แตะกระดาษเพื่ออ่านข้อความ' : 'แตะเพื่อเปิดซองจดหมาย';
  return <div style={composition.variables as React.CSSProperties} data-composition={composition.portrait ? 'portrait' : 'landscape'} className={`app has-guide stage-${stage} ${dark ? 'theme-night' : 'theme-blush'} ${spotlight ? 'gift-spotlight' : ''} ${reduced ? 'motion-reduced' : ''} ${worldPanel ? 'has-world-panel' : ''} ${stage === 5 && journey.world === 'promise' ? 'has-date-machine' : ''} ${journey.transition ? `is-transitioning transition-${journey.transition.kind}` : ''} ${journey.finale === 'end' && stage === 6 ? 'ending' : ''} ${stage === 6 ? `finale-${journey.finale} ending-${journey.endingPhase}` : ''}`}>
    <motion.div className="story-night-backdrop" aria-hidden="true" initial={false} animate={{ opacity: dark || journey.transition?.kind === 'paper-door' ? 1 : 0 }} transition={{ duration: reduced ? 0 : 3.2, ease: 'easeInOut' }} />
    <a className="skip-link" href="#main">ข้ามไปเนื้อหา</a>
    {stage !== 6 && <header className="header"><p>A LITTLE SECRET, JUST FOR YOU</p></header>}
    <main id="main" ref={mainRef} tabIndex={-1} className="journey" role={spotlight || worldPanel || endingVideoOpen ? 'dialog' : undefined} aria-modal={spotlight || worldPanel || endingVideoOpen ? true : undefined} aria-label={endingVideoOpen ? 'โรงหนังความทรงจำของเรา' : spotlight ? 'กล่องเซอร์ไพรส์ที่ปลดล็อกแล้ว' : worldPanel ? 'เรื่องราวในโลกของเรา' : chapters[stage]} onKeyDown={onDialogKey}>
      <h1 className="sr-only">{chapters[stage]}</h1>
      <Guide journey={journey} cue={guideCue} reduced={reduced} ready={ready} videoPlaying={videoPlaying} onRepeat={repeatGuide} sceneFailed={sceneFailed} onMouthAnchor={setMouthAnchor} breathTargetRef={breathTarget} />
      <motion.div className="scene-reveal" initial={{ opacity: reduced ? 0 : 1 }} animate={{ opacity: 0 }} transition={{ duration: 2.1, ease: [0.22, 1, 0.36, 1] }} aria-hidden="true" />

      <div className={`visual-stage ${stage === 4 ? 'paper-stage' : ''} ${worldPanel ? 'world-panel-background' : ''}`}>
        <div className="scene-halo" aria-hidden="true" />
        <div className="canvas-wrap"><SceneBoundary onError={markFailed}><Suspense fallback={null}><Scene journey={journey} memory={memory} dateMachine={dateMachine} reduced={reduced} paused={motionPaused} onDone={done} onMemory={chooseMemory} onActivity={world} resetCamera={cameraReset} holdProgress={holdProgress} breathOriginRef={breathOrigin} breathTargetRef={breathTarget} pinRejection={pinRejection} pinProgress={pin.length} ratingReaction={ratingReaction} onReady={markReady} /></Suspense></SceneBoundary></div>
        {!ready && <div className="scene-loading" role="status"><Heart size={23} /><span>กำลังจัดเซอร์ไพรส์ให้เธอ…</span></div>}
        {modelAction && <button ref={actionRef} className="model-hit" onClick={modelAction} disabled={!ready || busy || (stage === 1 && journey.cake === 'out')} aria-label={actionLabel} />}
        {stage === 5 && journey.world === 'entry' && <HoldHeart progressRef={holdProgress} onComplete={() => { dispatch({ type: 'hold-heart' }); }} onCancel={cancelHold} paused={holdCancelled} />}
      </div>

      {stage === 5 && journey.world === 'tunnel' && <p className="sr-only" role="status">{{ opening: 'ประตูกำลังเปิด', suction: 'กำลังเข้าสู่ประตู', warp: 'กำลังเดินทางผ่านดวงดาว', arriving: 'ถึงกาแล็กซีของเราแล้ว', forming: 'ดวงดาวกำลังรวมเป็นหัวใจ', revealing: 'ความทรงจำกำลังออกจากหัวใจ', exploring: 'สำรวจโลกของเราได้เลย', locked: '' }[journey.worldPhase]}</p>}
      <motion.div className="scene-content" inert={!!journey.transition || endingVideoOpen} animate={{ opacity: journey.transition ? 0 : 1 }} transition={{ duration: reduced ? 0 : 0.75, ease: 'easeInOut' }}>
        {stage === 0 && !spotlight && <form className="pin-form" onSubmit={e => { e.preventDefault(); validatePin(pin); }}>
          <label htmlFor="secret-pin">ใส่รหัสเพื่อเปิด</label>
          <motion.div ref={pinControl} className={`pin-control ${pinRejecting ? 'pin-rejecting' : ''} ${pinError ? 'has-error' : ''}`} animate={{ x: reduced ? 0 : shake ? [0, -(8 + shake % 2), 8, -6, 4, 0] : 0 }} transition={{ duration: 0.4 }}>
            <div className="pin-slots" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} className={pin.length === i ? 'current' : pin[i] ? 'filled' : ''}>{pin[i] ? <b className="pin-digit">{pin[i]}</b> : <i />}</span>)}</div>
            <input ref={pinRef} id="secret-pin" type="text" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} readOnly={pinRejecting} aria-busy={pinRejecting} onChange={e => validatePin(e.target.value)} aria-describedby="pin-error" aria-invalid={!!pinError} aria-label="รหัสเปิดของขวัญ 6 หลัก" />
          </motion.div><p id="pin-error" className="input-message sr-only">{pinError || ' '}</p>
        </form>}
        {stage === 0 && spotlight && !busy && <button className="text-button spotlight-back" onClick={dismissGift}><ArrowLeft size={15} /> กลับไปหน้ากล่อง</button>}
        {stage === 1 && journey.cake === 'out' && !journey.transition && <Button onClick={() => visit(2)}>ไปฉลองกัน</Button>}
        {stage === 2 && <><div className="celebration-copy sr-only"><h2>{content.birthday.title}</h2><p>{content.birthday.wishes.join(' ')}</p></div><Button onClick={() => { dispatch({ type: 'celebrate-next' }); }}><Mail size={18} aria-hidden="true" /> {content.birthday.letterAction}</Button></>}
        {stage === 4 && <Letter reduced={reduced} onGuideEvent={guideEvent} onNext={() => { dispatch({ type: 'enter-world' }); }} />}
        {stage === 5 && journey.world === 'hub' && <motion.div className="universe-tools" initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.85, ease: 'easeOut' }}>
          <Button onClick={finish}>ไปเซอร์ไพรส์สุดท้าย</Button>
          <div className="world-keyboard" aria-label="เลือกวัตถุในจักรวาลด้วยคีย์บอร์ด">{content.memories.map((m, i) => <button key={m.image} onClick={() => chooseMemory(i)}>{m.title}</button>)}<button onClick={() => world('promise')}>{content.activityTitles.promise}</button><button onClick={() => world('puzzle')}>{content.activityTitles.puzzle}</button></div>
        </motion.div>}
        {stage === 5 && worldPanel && <motion.section key={journey.world} className={`world-panel panel-${journey.world}`} initial={{ opacity: 0, y: reduced || journey.world === 'promise' ? 0 : 25, scale: reduced || journey.world === 'promise' ? 1 : 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduced ? 0 : 1.1, delay: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <button className="panel-close icon-button" aria-label="ปิดและกลับสู่จักรวาล" autoFocus onClick={() => world('hub')}><X size={18} /></button>
          {journey.world === 'memory' && <div className="memory-layout"><div className="memory-frame"><img src={current.image} alt={current.alt} /><Heart size={18} aria-hidden="true" /></div><div className="memory-copy"><p className="photo-date">{current.date}</p><h2>{current.title}</h2><p>{current.caption}</p>{current.sample && <span className="sample-label">ภาพตัวอย่าง · รอรูปของเรา</span>}</div></div>}
          {journey.world === 'promise' && <DateCapsule machine={dateMachine} reduced={reduced} sceneFailed={sceneFailed} />}
          {journey.world === 'puzzle' && <PhotoPuzzle onGuideEvent={guideEvent} reduced={reduced} />}
          <button className="text-button world-back" onClick={() => world('hub')}><ArrowLeft size={15} /> กลับสู่จักรวาล</button>
        </motion.section>}
        {stage === 6 && journey.finale === 'rating' && <motion.div className="final-copy" initial={{ opacity: 0, y: reduced ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 1.1 }}><h2 className="rating-question" id="rating-label">เซอร์ไพรส์นี้ได้กี่หัวใจ?</h2><div className="heart-rating" role="radiogroup" aria-labelledby="rating-label" onMouseLeave={() => setRatingPreview(0)}>{Array.from({ length: 5 }, (_, i) => <button key={i} role="radio" aria-checked={journey.rating === i + 1} aria-label={`${i + 1} หัวใจ`} className={(ratingPreview || journey.rating) > i ? 'filled' : ''} style={{ '--heart-index': i } as React.CSSProperties} onMouseEnter={() => setRatingPreview(i + 1)} tabIndex={journey.rating === i + 1 || (journey.rating === 0 && i === 0) ? 0 : -1} onKeyDown={e => { const next = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? (i + 1) % 5 + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? (i + 4) % 5 + 1 : e.key === 'Home' ? 1 : e.key === 'End' ? 5 : 0; if (next) { e.preventDefault(); selectRating(next); (e.currentTarget.parentElement?.children[next - 1] as HTMLButtonElement)?.focus(); } }} onClick={() => selectRating(i + 1)}><motion.span key={ratingReaction} animate={i === 4 && journey.rating === 4 && !reduced ? { scale: [1, 1.18, 1, 1.12, 1], y: [0, -4, 0, -3, 0] } : { scale: 1, y: 0 }} transition={{ duration: reduced ? 0 : 1.2, ease: 'easeInOut' }}><Heart size={35} /></motion.span></button>)}</div><Button disabled={!journey.rating} onClick={() => { dispatch({ type: 'seal' }); }}>มอบหัวใจให้เค้าหน่อยย</Button></motion.div>}
        {stage === 6 && journey.finale === 'end' && journey.endingRevealed && <motion.div className={`ending-copy ${journey.endingPhase !== 'complete' ? 'ending-copy-hidden' : ''}`} inert={journey.endingPhase !== 'complete'} aria-hidden={journey.endingPhase !== 'complete'} initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: journey.endingPhase === 'complete' ? 1 : 0, y: 0 }} transition={{ duration: reduced ? 0 : 1.4 }}>
          <motion.h2 tabIndex={-1} onAnimationComplete={revealEnding} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 1.2, delay: reduced ? 0 : .3 }}>{content.birthday.title} ♡</motion.h2>
          <div className="ending-wishes">{['ขอให้เธอได้ยิ้มกับเรื่องเล็ก ๆ ได้ทำสิ่งที่รัก', 'และเป็นตัวเองอย่างสบายใจ', 'วันไหนเหนื่อยก็พักได้ เค้าจะอยู่ข้าง ๆ เธอตรงนี้', content.final].map((line, i) => <motion.p key={line} initial={{ opacity: 0, y: reduced ? 0 : 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : .9 + i * 0.55 }}>{line}</motion.p>)}</div>
          <motion.p onAnimationComplete={() => setEndingActionsReady(true)} className="ending-signature" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 1.2, delay: reduced ? 0 : 3.1 }}>รักเธอนะ มากที่สุดในสามโลกเลยยยย <Heart size={14} aria-hidden="true" /></motion.p>
          {endingActionsReady && <motion.div className="ending-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 1.2 }}><Button onClick={() => { visit(5); world('hub'); }}>กลับไปดูความทรงจำ</Button><button className="text-button ending-rewatch" onClick={() => dispatch({ type: 'ending-video-start' })}><Play size={16} /> ดูเรื่องของเราอีกครั้ง</button><button className="text-button" onClick={replay}><RotateCcw size={15} /> เริ่มเซอร์ไพรส์อีกครั้ง</button></motion.div>}
        </motion.div>}

      </motion.div>
      {stage === 6 && journey.finale === 'end' && journey.endingPhase !== 'complete' && <EndingVideo phase={journey.endingPhase} reduced={reduced}
        onStart={() => { setChapterMenu(false); dispatch({ type: 'ending-video-start' }); }}
        onClose={() => { setPlaying(false); dispatch({ type: 'ending-video-close' }); }}
        onExited={() => dispatch({ type: 'ending-video-closed' })} onPlaying={setPlaying} />}
    </main>
    <footer className="footer" inert={spotlight || worldPanel || endingVideoOpen}>
      <button className="chapter-indicator" aria-expanded={chapterMenu} aria-label="เปิดลำดับเรื่องราว" disabled={busy} onClick={() => setChapterMenu(v => !v)}>{String(stage + 1).padStart(2, '0')} <span>/ 07</span></button>
      {chapterMenu && <nav className="chapter-menu" aria-label="ลำดับเรื่องราว">{chapters.map((label, i) => <button key={label} disabled={i > journey.visited || busy} onClick={() => visit(i as Stage)} aria-label={`part ${i + 1}: ${label}`} aria-current={stage === i ? 'step' : undefined}><span>0{i + 1}</span>{label}{i < stage && <Check size={12} />}</button>)}</nav>}
    </footer>
    <div className="utility-controls" inert={endingVideoOpen}><button className="icon-button sound-button" onClick={audio.toggle} aria-pressed={audio.enabled} aria-label={audio.enabled ? 'ปิดเพลงและเสียงประกอบ' : 'เปิดเพลงและเสียงประกอบ'} title={audio.enabled ? 'ปิดเสียง' : 'เปิดเสียง'}>{audio.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="icon-button motion-button" onClick={() => setMotionPaused(v => !v)} aria-pressed={motionPaused} aria-label={motionPaused ? 'เปิดการเคลื่อนไหว' : 'ลดการเคลื่อนไหว'} title={motionPaused ? 'เปิดการเคลื่อนไหว' : 'ลดการเคลื่อนไหว'}>{motionPaused ? <Play size={17} /> : <Pause size={17} />}</button></div>
    {stage === 5 && journey.world === 'hub' && <button className="icon-button reset-camera" onClick={() => { audio.sound('navigate'); setCameraReset(v => v + 1); }} aria-label="คืนมุมกล้องเดิม" title="คืนมุมกล้องเดิม"><Compass size={19} /></button>}
    <p className="audio-error" role="status">{audio.error}</p>
    {busy && <p className="sr-only" role="status">กำลังเปิดเซอร์ไพรส์ให้เธอ…</p>}
  </div>;
}
