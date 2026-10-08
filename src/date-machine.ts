import { useCallback, useEffect, useReducer, useRef } from 'react';
import gsap from 'gsap';
import { content } from './content';
import { emitStorySound, type SoundCue } from './audio-cues';
import type { GuideEvent } from './guide-controller';

export type CapsulePhase = 'ready' | 'spinning' | 'capsule' | 'opening' | 'revealed';
export type CapsuleState = { phase: CapsulePhase; chosen: number | null; opened: number[]; saved: number[]; serial: number; round: number };
export type CapsuleMotion = { time: number; opening: number };
const initial: CapsuleState = { phase: 'ready', chosen: null, opened: [], saved: [], serial: 0, round: 0 };
type Event = { type: 'spin'; chosen: number } | { type: 'arrived' | 'open' | 'revealed' | 'save' | 'new-round' | 'reset' };
export function capsuleReducer(state: CapsuleState, event: Event): CapsuleState {
  switch (event.type) {
    case 'spin': return !['ready','revealed'].includes(state.phase) || state.opened.includes(event.chosen) || event.chosen < 0 || event.chosen >= content.promises.length ? state : { ...state, phase: 'spinning', chosen: event.chosen, serial: state.serial + 1 };
    case 'arrived': return state.phase === 'spinning' ? { ...state, phase: 'capsule' } : state;
    case 'open': return state.phase === 'capsule' ? { ...state, phase: 'opening' } : state;
    case 'revealed': return state.phase === 'opening' && state.chosen !== null ? { ...state, phase: 'revealed', opened: [...state.opened, state.chosen] } : state;
    case 'save': return state.phase === 'revealed' && state.chosen !== null && !state.saved.includes(state.chosen) ? { ...state, saved: [...state.saved, state.chosen] } : state;
    case 'new-round': return state.phase === 'revealed' && state.opened.length === content.promises.length ? { ...initial, saved: state.saved, serial: state.serial, round: state.round + 1 } : state;
    case 'reset': return initial;
  }
}

/** One selection per spin; timing survives closing the panel and background tabs. */
export function useDateMachine(enabled: boolean, reduced: boolean, onGuide: (event: GuideEvent) => void) {
  const [state, dispatch] = useReducer(capsuleReducer, initial);
  const latest = useRef(state); latest.current = state;
  const motion = useRef<CapsuleMotion>({ time: 0, opening: 0 });
  const locked = useRef(false), played = useRef(new Set<string>()), guide = useRef(onGuide); guide.current = onGuide;
  useEffect(() => { locked.current = state.phase === 'spinning' || state.phase === 'opening'; }, [state.phase]);
  useEffect(() => {
    if (!enabled || !['spinning','opening'].includes(state.phase)) return;
    const spin = state.phase === 'spinning', key = spin ? 'time' : 'opening', end = spin ? 3.4 : 1;
    const sounds: [number, SoundCue][] = spin ? [[.05,'capsule-crank'],[.9,'capsule-tumble'],[2.55,'capsule-land']] : [[.12,'capsule-pop'],[.65,'capsule-paper']];
    const update = () => sounds.forEach(([at, cue]) => { const id = `${state.round}/${state.serial}/${cue}`; if (motion.current[key] >= at && !played.current.has(id)) { played.current.add(id); emitStorySound(cue); } });
    const complete = () => { update(); dispatch({ type: spin ? 'arrived' : 'revealed' }); guide.current(spin ? 'promise-arrived' : latest.current.opened.length === content.promises.length - 1 ? 'promise-complete' : 'promise-picked'); };
    if (reduced) { motion.current[key] = end; complete(); return; }
    const tween = gsap.to(motion.current, { [key]: end, duration: spin ? end - motion.current.time : (1 - motion.current.opening) * 1.65, ease: 'none', onUpdate: update, onComplete: complete });
    const visibility = () => tween.paused(document.hidden);
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => { tween.kill(); document.removeEventListener('visibilitychange', visibility); };
  }, [enabled, reduced, state.phase, state.serial, state.round]);
  const spin = useCallback(() => {
    const current = latest.current;
    if (!enabled || locked.current || !['ready','revealed'].includes(current.phase)) return;
    const remaining = content.promises.map((_, i) => i).filter(i => !current.opened.includes(i));
    if (!remaining.length) return;
    locked.current = true; motion.current.time = 0; motion.current.opening = 0;
    dispatch({ type: 'spin', chosen: remaining[Math.floor(Math.random() * remaining.length)] }); guide.current('promise-spin');
  }, [enabled]);
  const open = useCallback(() => { if (enabled && !locked.current && latest.current.phase === 'capsule') { locked.current = true; dispatch({ type: 'open' }); } }, [enabled]);
  const save = useCallback(() => { const current=latest.current; if (enabled && current.phase==='revealed' && current.chosen!==null && !current.saved.includes(current.chosen)) { dispatch({ type: 'save' }); emitStorySound('capsule-save'); guide.current('promise-saved'); } }, [enabled]);
  const newRound = useCallback(() => { if (enabled) { motion.current.time=0;motion.current.opening=0;dispatch({ type:'new-round' }); } }, [enabled]);
  const reset = useCallback(() => { locked.current=false;played.current.clear();motion.current.time=0;motion.current.opening=0;dispatch({type:'reset'}); },[]);
  return { state, motion, spin, open, save, newRound, reset };
}
export type DateMachine = ReturnType<typeof useDateMachine>;
