import { useCallback, useEffect, useRef, useState } from 'react';
import type { Journey } from './journey';
import { readingHold } from './guide-speech';
import type { MonchhichiPose } from './monchhichi-model';

export type GuideEvent = 'pin-nudge' | 'pin-wrong' | 'hold-cancel' | 'letter-complete' | 'puzzle-selected' | 'puzzle-swapped' | 'puzzle-complete' | 'promise-picked' | 'promise-spin' | 'promise-arrived' | 'promise-saved' | 'promise-complete';
export type GuideCue = { id: string; text: string; pose: MonchhichiPose; kind: 'guide' | 'reaction' | 'quiet' | 'celebration' };
type GuideOptions = { ready: boolean; videoPlaying: boolean; reduced: boolean };
type ScopedCue = { scope: string; cue: GuideCue };

export function guideMuted(j: Journey, videoPlaying = false) {
  return videoPlaying || (j.stage === 6 && j.finale === 'end' && ['watching', 'closing'].includes(j.endingPhase)) || !!j.transition || (j.stage === 0 && j.gift === 'opening') ||
    (j.stage === 3 && ['opening', 'reading'].includes(j.envelope)) ||
    (j.stage === 5 && j.world === 'tunnel') ||
    (j.stage === 6 && ['gathering', 'sealing'].includes(j.finale));
}

function scope(j: Journey) {
  if (j.transition) return `transition/${j.transition.kind}`;
  if (j.stage === 0) return `gift/${j.gift}`;
  if (j.stage === 1) return `cake/${j.cake}`;
  if (j.stage === 3) return `envelope/${j.envelope}`;
  if (j.stage === 5) return `world/${j.world}/${j.world === 'tunnel' ? j.worldPhase : ''}`;
  if (j.stage === 6) return `finale/${j.finale}/${j.endingPhase}/${j.rating}`;
  return `stage/${j.stage}`;
}

function direction(j: Journey, visitedHub: boolean): Omit<GuideCue, 'id'> | null {
  if (guideMuted(j)) return null;
  switch (j.stage) {
    case 0: return j.gift === 'teasing'
      ? { text: 'ปลดล็อกแล้ว! แตะกล่องเพื่อเปิดเลย ♡', pose: 'Present', kind: 'guide' }
      : { text: 'ใส่รหัส 6 หลัก แล้วไปเปิดของขวัญกัน ♡', pose: 'Wave', kind: 'guide' };
    case 1: return j.cake === 'blowing'
      ? { text: 'ฟู่… ขอให้คำอธิษฐานเป็นจริงนะ ♡', pose: 'Blow', kind: 'quiet' }
      : j.cake === 'out'
        ? { text: 'เทียนดับแล้ว ไปฉลองกันเลย ♡', pose: 'Celebrate', kind: 'celebration' }
        : { text: 'อธิษฐานก่อนนะ แล้วแตะเค้กเพื่อเป่า ♡', pose: 'Present', kind: 'guide' };
    case 2: return { text: 'สุขสันต์ 22 ปีน้า! มีจดหมายรออยู่ด้วย ♡', pose: 'Celebrate', kind: 'celebration' };
    case 3: return j.envelope === 'ready'
      ? { text: 'กระดาษออกมาแล้ว แตะเพื่ออ่านได้เลย ♡', pose: 'Present', kind: 'guide' }
      : { text: 'แตะซองนี้ได้เลย มีข้อความถึงเธอ ♡', pose: 'Present', kind: 'guide' };
    case 4: return { text: 'ค่อย ๆ อ่านได้เลย เค้าเขียนถึงเธอไว้นะ ♡', pose: 'Idle', kind: 'quiet' };
    case 5: {
      if (j.world === 'entry') return { text: 'กดหัวใจค้าง แล้วตามมาเลย ♡', pose: 'Invite', kind: 'guide' };
      if (j.world === 'hub') return visitedHub ? null : { text: 'ลากดูรอบ ๆ แล้วแตะรูป ตู้แคปซูล หรือจิ๊กซอว์ได้เลย ♡', pose: 'Invite', kind: 'guide' };
      if (j.world === 'memory') return { text: 'รูปนี้มีเรื่องน่ารัก ๆ อยู่ด้วยนะ ♡', pose: 'Idle', kind: 'quiet' };
      if (j.world === 'promise') return { text: 'ลองหมุนดูสิ ว่าเค้าอยากพาที่รักไปทำอะไร ♡', pose: 'Present', kind: 'guide' };
      if (j.world === 'puzzle') return { text: 'แตะภาพสองชิ้นเพื่อสลับกันนะ ♡', pose: 'Present', kind: 'guide' };
      return null;
    }
    case 6: {
      if (j.finale === 'end') return j.endingPhase === 'invitation'
        ? { text: 'เค้ารวมช่วงเวลาของเราไว้ในคลิปนี้แล้ว มาดูด้วยกันนะ ♡', pose: 'Present', kind: 'guide' }
        : { text: 'ยังอยากมีที่รักอยู่ในเรื่องของเค้าไปอีกนาน ๆ เลย ♡', pose: 'Thanks', kind: 'quiet' };
      if (j.rating === 5) return { text: 'เย้! ห้าหัวใจเต็มเลย ขอบคุณน้า ♡', pose: 'Celebrate', kind: 'celebration' };
      if (j.rating > 0) return { text: `ได้ ${j.rating} หัวใจแล้ว ขอบคุณน้า ♡`, pose: 'Shy', kind: 'reaction' };
      return { text: 'เลือกหัวใจให้เซอร์ไพรส์นี้ได้เลย ♡', pose: 'Thanks', kind: 'guide' };
    }
  }
}

function feedback(event: GuideEvent, j: Journey): Omit<GuideCue, 'id'> | null {
  switch (event) {
    case 'pin-nudge': return j.stage === 0 && j.gift === 'locked' ? { text: 'ต้องปลดล็อกก่อนน้า ใส่รหัสได้เลย ♡', pose: 'Present', kind: 'reaction' } : null;
    case 'pin-wrong': return j.stage === 0 && j.gift === 'locked' ? { text: 'อ๊ะ ยังไม่ใช่น้า ลองอีกที ♡', pose: 'Shy', kind: 'reaction' } : null;
    case 'hold-cancel': return j.stage === 5 && j.world === 'entry' ? { text: 'อีกนิดนึง กดหัวใจค้างไว้จนเต็มนะ ♡', pose: 'Invite', kind: 'reaction' } : null;
    case 'letter-complete': return j.stage === 4 ? { text: 'เมื่ออ่านพร้อมแล้ว ไปดูโลกของเรากัน ♡', pose: 'Idle', kind: 'quiet' } : null;
    case 'puzzle-selected': return j.stage === 5 && j.world === 'puzzle' ? { text: 'เลือกอีกชิ้นเพื่อสลับกันได้เลย ♡', pose: 'Present', kind: 'reaction' } : null;
    case 'puzzle-swapped': return j.stage === 5 && j.world === 'puzzle' ? { text: 'สลับแล้ว เลือกอีกสองชิ้นต่อได้เลย ♡', pose: 'Present', kind: 'reaction' } : null;
    case 'puzzle-complete': return j.stage === 5 && j.world === 'puzzle' ? { text: 'ครบแล้ว! เก่งมากเลย ♡', pose: 'Celebrate', kind: 'celebration' } : null;
    case 'promise-spin': return j.stage === 5 && j.world === 'promise' ? { text: 'ลุ้นด้วยกันนะ จะได้เดตแบบไหนน้า ♡', pose: 'Shy', kind: 'reaction' } : null;
    case 'promise-arrived': return j.stage === 5 && j.world === 'promise' ? { text: 'มาแล้ว! แตะแคปซูลเพื่อเปิดได้เลย ♡', pose: 'Present', kind: 'guide' } : null;
    case 'promise-saved': return j.stage === 5 && j.world === 'promise' ? { text: 'เก็บไว้แล้ว ค่อย ๆ ไปด้วยกันนะ ♡', pose: 'Thanks', kind: 'reaction' } : null;
    case 'promise-complete': return j.stage === 5 && j.world === 'promise' ? { text: 'ได้ครบแล้ว ค่อย ๆ ไปด้วยกันนะ ♡', pose: 'Celebrate', kind: 'celebration' } : null;
    case 'promise-picked': return j.stage === 5 && j.world === 'promise' ? { text: 'ใบนี้ตั้งใจให้เธอเลยนะ ♡', pose: 'Thanks', kind: 'reaction' } : null;
  }
}

/** One visible cue: interaction feedback wins over the current scene direction. */
export function useGuide(journey: Journey, { ready, videoPlaying, reduced }: GuideOptions) {
  const route = scope(journey), latest = useRef(journey); latest.current = journey;
  const reducedRef = useRef(reduced); reducedRef.current = reduced;
  const options = useRef({ ready, videoPlaying }); options.current = { ready, videoPlaying };
  const [base, setBase] = useState<ScopedCue | null>(null), [reaction, setReaction] = useState<ScopedCue | null>(null);
  const visitedHub = useRef(false), previousVisited = useRef(journey.visited), sequence = useRef(0);
  const completed = useRef(new Set<GuideEvent>()), last = useRef<ScopedCue | null>(null), repeatDirection = useRef<ScopedCue | null>(null);
  const activeScope = useRef(route);
  if (activeScope.current !== route) { activeScope.current = route; completed.current.clear(); repeatDirection.current = null; }

  useEffect(() => {
    if (journey.visited === 0 && previousVisited.current > 0) { visitedHub.current = false; completed.current.clear(); last.current = null; repeatDirection.current = null; }
    previousVisited.current = journey.visited;
  }, [journey.visited]);

  useEffect(() => {
    setReaction(current => current?.scope === route ? current : null);
    if (!ready) { setBase(null); return; }
    const next = direction(latest.current, visitedHub.current);
    if (latest.current.stage === 5 && latest.current.world === 'hub') visitedHub.current = true;
    if (!next) { setBase(null); return; }
    const cue = { ...next, id: `${route}/${++sequence.current}` };
    const delay = latest.current.stage === 6 && latest.current.finale === 'end' && latest.current.endingPhase === 'complete' && !reducedRef.current ? 4500 : 0;
    if (!delay) { setBase({ scope: route, cue }); return; }
    setBase(null);
    const timer = window.setTimeout(() => setBase({ scope: route, cue }), delay);
    return () => window.clearTimeout(timer);
  }, [route, ready]);

  // A message expires only after it was actually delivered. Travel, drag,
  // background tabs and video do not consume the visitor's reading time.
  useEffect(() => {
    let timer = 0;
    const finished = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail.id;
      const current = reaction?.cue.id === id ? reaction : base?.cue.id === id ? base : null;
      if (!current || !(current === reaction || current.cue.kind === 'quiet' || journey.stage === 5 && journey.world === 'hub')) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setReaction(value => value?.cue.id === id ? null : value);
        setBase(value => value?.cue.id === id ? null : value);
      }, readingHold(current.cue.text));
    };
    window.addEventListener('hbd:guide-spoken', finished);
    return () => { window.clearTimeout(timer); window.removeEventListener('hbd:guide-spoken', finished); };
  }, [base, reaction, journey.stage, journey.world]);

  const say = useCallback((event: GuideEvent) => {
    const j = latest.current, next = feedback(event, j);
    if (!options.current.ready || !next || guideMuted(j)) return;
    if (options.current.videoPlaying) return;
    if (['letter-complete', 'puzzle-complete'].includes(event)) {
      if (completed.current.has(event)) return;
      completed.current.add(event);
    }
    const currentScope = scope(j);
    const cue = { ...next, id: `${currentScope}/${event}/${++sequence.current}` };
    // Finishing the typewriter does not mean the visitor has finished reading.
    // Cache the next-step direction for an intentional tap on the mascot.
    if (event === 'letter-complete') { repeatDirection.current = { scope: currentScope, cue }; return; }
    setBase(null);
    setReaction({ scope: currentScope, cue });
  }, []);
  const repeat = useCallback(() => {
    const j = latest.current;
    if (!options.current.ready || guideMuted(j, options.current.videoPlaying)) return;
    const currentScope = scope(j), previous = repeatDirection.current?.scope === currentScope ? repeatDirection.current : last.current;
    const next = previous?.scope === currentScope ? previous.cue : direction(j, j.stage === 5 && j.world === 'hub' ? false : visitedHub.current);
    if (next) { setBase(null); setReaction({ scope: currentScope, cue: { ...next, id: `${currentScope}/repeat/${++sequence.current}` } }); }
  }, []);
  const active = reaction?.scope === route ? reaction : base?.scope === route ? base : null;
  if (active && !guideMuted(journey, videoPlaying)) last.current = active;
  return { cue: ready && !guideMuted(journey, videoPlaying) ? active?.cue ?? null : null, say, repeat };
}
