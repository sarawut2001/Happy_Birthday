export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WorldView = 'entry' | 'tunnel' | 'hub' | 'memory' | 'promise' | 'puzzle';
export type EndingPhase = 'invitation' | 'watching' | 'closing' | 'complete';
export type WorldPhase = 'locked' | 'opening' | 'suction' | 'warp' | 'arriving' | 'forming' | 'revealing' | 'exploring';
export type StoryTransition = { kind: 'gift-cake' | 'cake-celebration' | 'card-envelope' | 'letter-paper' | 'paper-door'; from: Stage; to: Stage };
export type Journey = {
  transition: StoryTransition | null;
  stage: Stage; visited: Stage; unlocked: boolean;
  gift: 'locked' | 'teasing' | 'opening';
  cake: 'lit' | 'blowing' | 'out';
  envelope: 'closed' | 'opening' | 'ready' | 'reading';
  world: WorldView; worldPhase: WorldPhase; finale: 'gathering' | 'rating' | 'sealing' | 'end'; rating: number;
  endingPhase: EndingPhase; endingRevealed: boolean;
};
export const initialJourney: Journey = { transition: null, stage: 0, visited: 0, unlocked: false, gift: 'locked', cake: 'lit', envelope: 'closed', world: 'entry', worldPhase: 'locked', finale: 'gathering', rating: 0, endingPhase: 'invitation', endingRevealed: false };
export type JourneyEvent =
  | { type: 'transition-complete'; kind: StoryTransition['kind'] }
  | { type: 'unlock' | 'dismiss-gift' | 'open-gift' | 'gift-opened' | 'blow' | 'candles-out' | 'celebrate-next' | 'open-envelope' | 'envelope-opened' | 'read-letter' | 'paper-arrived' | 'enter-world' | 'hold-heart' | 'world-arrived' | 'finish' | 'gathered' | 'seal' | 'sealed' | 'replay' }
  | { type: 'world'; view: WorldView }
  | { type: 'world-phase'; phase: WorldPhase }
  | { type: 'rating'; value: number }
  | { type: 'ending-video-start' | 'ending-video-close' | 'ending-video-closed' }
  | { type: 'visit'; stage: Stage };
const advance = (state: Journey, stage: Stage): Journey => ({ ...state, stage, visited: Math.max(state.visited, stage) as Stage });
function bridge(state: Journey, kind: StoryTransition['kind'], to: Stage): Journey { return state.transition ? state : { ...state, transition: { kind, from: state.stage, to } }; }
export function journeyReducer(s: Journey, e: JourneyEvent): Journey {
  switch (e.type) {
    case 'transition-complete': {
      if (!s.transition || e.kind !== s.transition.kind) return s;
      const next = { ...advance(s, s.transition.to), transition: null };
      if (e.kind === 'gift-cake') next.gift = 'locked';
      if (e.kind === 'cake-celebration') next.cake = 'out';
      if (e.kind === 'letter-paper') next.envelope = 'reading';
      return next;
    }
    case 'unlock': return s.stage === 0 && s.gift === 'locked' ? { ...s, unlocked: true, gift: 'teasing' } : s;
    case 'dismiss-gift': return s.stage === 0 && s.gift === 'teasing' ? { ...s, gift: 'locked' } : s;
    case 'open-gift': return s.stage === 0 && s.gift === 'teasing' ? { ...s, gift: 'opening' } : s;
    case 'gift-opened': return s.stage === 0 && s.gift === 'opening' && !s.transition ? bridge(s, 'gift-cake', 1) : s;
    case 'blow': return s.stage === 1 && s.cake === 'lit' ? { ...s, cake: 'blowing' } : s;
    case 'candles-out': return s.stage === 1 && s.cake === 'blowing' ? bridge({ ...s, cake: 'out' }, 'cake-celebration', 2) : s;
    case 'celebrate-next': return s.stage === 2 ? bridge(s, 'card-envelope', 3) : s;
    case 'open-envelope': return s.stage === 3 && s.envelope === 'closed' ? { ...s, envelope: 'opening' } : s;
    case 'envelope-opened': return s.stage === 3 && s.envelope === 'opening' ? { ...s, envelope: 'ready' } : s;
    case 'read-letter': return s.stage === 3 && s.envelope === 'ready' ? bridge({ ...s, envelope: 'reading' }, 'letter-paper', 4) : s;
    case 'paper-arrived': return s.stage === 3 && s.envelope === 'reading' && !s.transition ? bridge(s, 'letter-paper', 4) : s;
    case 'enter-world': return s.stage === 4 ? bridge({ ...s, world: 'entry', worldPhase: 'locked' }, 'paper-door', 5) : s;
    case 'hold-heart': return s.stage === 5 && s.world === 'entry' ? { ...s, world: 'tunnel', worldPhase: 'opening' } : s;
    case 'world-phase': return s.stage === 5 && s.world === 'tunnel' ? { ...s, worldPhase: e.phase } : s;
    case 'world-arrived': return s.stage === 5 && s.world === 'tunnel' ? { ...s, world: 'hub', worldPhase: 'exploring' } : s;
    case 'world': return s.stage === 5 && s.world !== 'entry' && s.world !== 'tunnel' && e.view !== 'entry' && e.view !== 'tunnel' ? { ...s, world: e.view } : s;
    case 'finish': return s.stage === 5 && s.world !== 'entry' && s.world !== 'tunnel' ? { ...advance(s, 6), finale: 'gathering', rating: 0, endingPhase: 'invitation', endingRevealed: false } : s;
    case 'gathered': return s.stage === 6 && s.finale === 'gathering' ? { ...s, finale: 'rating' } : s;
    case 'rating': return s.stage === 6 && s.finale === 'rating' && Number.isInteger(e.value) && e.value >= 1 && e.value <= 5 ? { ...s, rating: e.value } : s;
    case 'seal': return s.stage === 6 && s.finale === 'rating' && s.rating > 0 ? { ...s, finale: 'sealing' } : s;
    case 'sealed': return s.stage === 6 && s.finale === 'sealing' ? { ...s, finale: 'end' } : s;
    case 'ending-video-start': return s.stage === 6 && s.finale === 'end' && ['invitation', 'complete'].includes(s.endingPhase) ? { ...s, endingPhase: 'watching' } : s;
    case 'ending-video-close': return s.stage === 6 && s.finale === 'end' && ['invitation', 'watching'].includes(s.endingPhase) ? { ...s, endingPhase: 'closing' } : s;
    case 'ending-video-closed': return s.stage === 6 && s.finale === 'end' && s.endingPhase === 'closing' ? { ...s, endingPhase: 'complete', endingRevealed: true } : s;
    case 'visit': return !s.transition && e.stage <= s.visited && s.gift !== 'teasing' && !(s.stage === 0 && s.gift === 'opening') && s.cake !== 'blowing' && !(s.stage === 3 && (s.envelope === 'opening' || s.envelope === 'reading')) && s.world !== 'tunnel' && !(s.stage === 6 && (s.finale === 'gathering' || s.finale === 'sealing')) ? { ...s, stage: e.stage, envelope: e.stage === 3 && s.envelope === 'reading' ? 'ready' : e.stage === 4 ? 'reading' : s.envelope } : s;
    case 'replay': return { ...initialJourney };
    default: return s;
  }
}
