import type { GuideCue } from './guide-controller';
export type FaceExpression = 'gentle' | 'happy' | 'shy' | 'excited' | 'blow' | 'thanks';
export type FacePerformance = { mouth: number; round: number; talking: boolean; expression: FaceExpression };
export const restingFace = (): FacePerformance => ({ mouth: 0, round: 0, talking: false, expression: 'gentle' });
const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
export function speechTimeline(text: string) {
  let time = 0;
  return [...segmenter.segment(text)].map(({ segment }, i) => {
    const silent = /^[\s.,!?…♡♥ๆ–—:;]+$/u.test(segment);
    const pause = /[.!?…]/u.test(segment) ? 260 : /[♡♥]/u.test(segment) ? 170 : /\s/u.test(segment) ? 85 : 43 + i % 3 * 5;
    const start = time; time += pause;
    return { text: segment, start, end: time, silent };
  });
}
export function expressionFor(cue: GuideCue | null): FaceExpression {
  if (!cue) return 'gentle';
  if (cue.pose === 'Blow') return 'blow';
  if (cue.pose === 'Shy') return 'shy';
  if (cue.pose === 'Celebrate') return 'excited';
  if (cue.pose === 'Thanks') return 'thanks';
  return cue.kind === 'quiet' ? 'gentle' : 'happy';
}
export function readingHold(text: string) { return Math.min(9000, Math.max(3600, speechTimeline(text).length * 65)); }
