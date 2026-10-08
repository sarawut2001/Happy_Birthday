import { useEffect, useState } from 'react';
import type { Journey } from './journey';

export type ScreenRect = { x: number; y: number; width: number; height: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Screen-space composition shared by the camera, controls and narrator. */
export function storyLayout(j: Journey, width: number, height: number) {
  const small = width < 600, portrait = height > width;
  const panel = j.stage === 5 && !['entry', 'tunnel', 'hub'].includes(j.world);
  const reading = j.stage === 4 || panel;
  const universe = j.stage === 5 && j.world !== 'entry';
  const ending = j.stage === 6 && j.finale === 'end';
  const videoEnding = ending && ['invitation', 'watching'].includes(j.endingPhase);
  const watching = videoEnding && j.endingPhase === 'watching';
  const endingPair = j.stage === 6 && ['sealing', 'end'].includes(j.finale);
  const edge = small ? 16 : 32;
  const readerTop = small ? 176 : j.stage === 4 ? (portrait ? 150 : 80) : portrait || width < 1100 ? 224 : 80;
  const actionBottom = small ? 92 : universe ? 92 : clamp(height * .13, 96, 156);
  const actorWidth = small ? (reading || universe || ending ? 64 : 88)
    : j.stage === 5 && j.world === 'promise' ? 104 : reading ? (portrait ? 124 : 128)
    : universe ? 108 : clamp(Math.min(width * .18, height * .19), 144, 160);
  const centerY = videoEnding ? (watching ? .12 : .155) : endingPair ? (portrait ? .245 : .22) : j.stage === 6 ? .34 : universe ? .48 : .43;
  const heroWidth = width * (videoEnding ? (portrait ? .44 : .28) : endingPair ? (small ? .86 : portrait ? .68 : .40) : small ? .88 : portrait ? .82 : .58);
  const heroHeight = height * (videoEnding ? (watching ? .16 : .24) : endingPair ? (portrait ? .42 : .36) : j.stage === 6 ? .28 : universe ? .68 : .55);
  const finalTop = height * (ending ? (portrait ? .50 : .44) : .55);
  const hero: ScreenRect = { x: (width - heroWidth) / 2, y: height * centerY - heroHeight / 2, width: heroWidth, height: heroHeight };
  return { small, portrait, panel, reading, universe, ending, edge, readerTop, actionBottom, actorWidth, hero,
    finalTop,
    variables: {
      '--story-edge': `${edge}px`, '--reader-top': `${readerTop}px`,
      '--action-bottom': `${actionBottom}px`, '--final-copy-top': `${finalTop}px`,
      '--reader-height': `${Math.max(200, height - readerTop - 104)}px`,
    },
  };
}

export function useStoryViewport() {
  const [size, setSize] = useState(() => ({ width: innerWidth, height: innerHeight }));
  useEffect(() => {
    let frame = 0;
    const resize = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setSize({ width: innerWidth, height: innerHeight })); };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);
  return size;
}

export function universeSpan(width: number, height: number) {
  return Math.max(10.2, (height > width ? 7.6 : 10.8) / (width / Math.max(height, 1)));
}

export function memoryHome(index: number, count: number, width: number, height: number): [number, number, number] {
  const portrait = height > width, small = width < 600;
  // Stable constellations: irregular heights, offsets and depth, never reshuffled by a render.
  const homes: [number, number, number][] = portrait
    ? [[-2.64, 3.45, .6], [2.12, 2.95, -.55], [.05, 3.8, -1.8], [-2.75, 1.05, -1], [2.2, 1.3, .3], [-1.65, 4.4, -7.5], [2.2, -1.15, -.8], [-1.2, -3.1, -.4], [1.85, -3.9, -1.25]]
    : [[-4.9, 2.65, .8], [-2.55, 3.75, -1.4], [1.2, 3.7, -.85], [5, 2.55, -.6], [-5.35, .2, -1.5], [3.05, .05, .7], [5.55, -.9, -1.4], [-2.2, -2.2, .5], [.5, -2.7, -1]];
  if (index < homes.length) { const [x, y, z] = homes[index]; return [x * (small ? .85 : 1), y, z]; }
  const angle = (index - homes.length) / Math.max(1, count - homes.length) * Math.PI * 2 + .4;
  return [Math.cos(angle) * (portrait ? 2.8 : 4.5), 1.1 + Math.sin(angle) * 3.2, -2.8];
}

export function activityHome(view: 'promise' | 'puzzle', width: number, height: number): [number, number, number] {
  const portrait = height > width;
  const homes: Record<typeof view, [number, number, number]> = portrait
    ? { promise: [-2.35, -3.45, -1], puzzle: [.7, -1.6, 1] }
    : { promise: [-4.6, -2.65, .2], puzzle: [3.25, -2.85, -.4] };
  const [x, y, z] = homes[view]; return [x * (width < 600 ? .85 : 1), y, z];
}
