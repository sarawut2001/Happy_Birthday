import type { Journey } from './journey';
import { storyLayout } from './story-layout';
export type GuideRect = { x: number; y: number; width: number; height: number };
export type GuidePlacement = { actor: GuideRect; bubble: GuideRect; side: 'left' | 'right'; gaze: { x: number; y: number }; score: number };
const overlap = (a: GuideRect, b: GuideRect, margin = 14) => Math.max(0, Math.min(a.x + a.width, b.x + b.width + margin) - Math.max(a.x, b.x - margin)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height + margin) - Math.max(a.y, b.y - margin));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function guideRoute(j: Journey) {
  // Feedback within a scene never moves the actor; each activity has its own dock.
  if (j.stage === 5) return `world/${j.world}`;
  return `${j.stage}:${j.stage === 6 && j.finale === 'end' ? `ending/${j.endingPhase}` : 'scene'}`;
}
export function fitBubble(actor: GuideRect, side: 'left' | 'right', width: number, height: number, bw: number, bh: number, masks: GuideRect[]) {
  const edge = width < 600 ? 12 : 24;
  const inwardX = side === 'right' ? actor.x - bw - 20 : actor.x + actor.width + 20;
  const alignedX = side === 'right' ? actor.x + actor.width - bw : actor.x;
  const positions = [
    { x: inwardX, y: actor.y + 8 },
    { x: inwardX, y: actor.y + actor.height * .45 - bh / 2 },
    { x: alignedX, y: actor.y - bh - 24 },
    { x: inwardX, y: actor.y - bh + 24 },
    { x: alignedX, y: actor.y + actor.height + 20 },
    { x: inwardX, y: actor.y + actor.height - bh - 12 },
    ...(width >= 600 ? [{ x: alignedX, y: height - bh - 100 }] : []),
  ];
  return positions.map(p => ({ x: clamp(p.x, edge, width - bw - edge), y: clamp(p.y, 60, height - bh - 78), width: bw, height: bh }))
    .sort((a, b) => masks.reduce((s, r) => s + overlap(a, r), overlap(a, actor, 10)) - masks.reduce((s, r) => s + overlap(b, r), overlap(b, actor, 10)))[0];
}
function preferredDock(j: Journey, portrait: boolean): { side: 'left' | 'right'; y: number } {
  if (j.stage === 4) return { side: 'left', y: .055 };
  if (j.stage === 5) {
    if (j.world === 'memory' || j.world === 'puzzle') return { side: 'right', y: .07 };
    if (j.world === 'promise') return { side: 'left', y: .07 };
    return { side: j.world === 'entry' ? 'right' : 'left', y: .56 };
  }
  if (j.stage === 6 && j.finale === 'end' && j.endingPhase === 'invitation') return { side: 'right', y: portrait ? .82 : .23 };
  if (j.stage === 6) return { side: j.finale === 'end' ? 'right' : 'left', y: .38 };
  return { side: j.stage === 1 || j.stage === 3 ? 'right' : 'left', y: .57 };
}
export function placeGuide(j: Journey, width: number, height: number, bubbleWidth: number, bubbleHeight: number, protectedRects: GuideRect[], hero: GuideRect | null): GuidePlacement {
  const layout = storyLayout(j, width, height), preferred = preferredDock(j, height > width);
  const ending = j.stage === 6 && j.finale === 'end';
  const actorWidth = ending && !layout.small ? Math.min(j.endingPhase === 'invitation' && layout.portrait ? 112 : 132, layout.actorWidth)
    : j.stage === 0 && layout.portrait && !layout.small ? Math.min(layout.actorWidth, Math.max(96, (width - 400) / 2 - width * .08 - 12))
    : layout.actorWidth;
  const actorHeight = actorWidth * 1.48;
  const bottomGap = ending ? 56 : 88;
  const inset = layout.small ? 16 : clamp(width * .10, 64, 172);
  const masks = [...protectedRects, ...(!layout.reading && !layout.universe ? [hero ?? layout.hero] : j.stage === 5 && j.world === 'entry' ? [hero ?? layout.hero] : [])];
  const choices: GuidePlacement[] = [];
  const sides: ('left' | 'right')[] = [preferred.side, preferred.side === 'left' ? 'right' : 'left'];
  for (const side of sides) {
    // Start inside the viewport, then try nearby blank areas before edge fallbacks.
    const insets = layout.small ? [inset] : [inset, inset * 1.35, inset * .8, ...(j.stage === 5 && j.world === 'hub' ? [width * .22, width * .29, width * .32] : [])];
    const ys = [height * preferred.y, 60, height * .23, height * .39, height * .55, height * .70, ...(j.stage === 5 && j.world === 'hub' ? [.14, .31, .46, .51, .54, .61, .66, .78].map(y => height * y) : []), height - actorHeight - (ending ? 56 : 100)];
    for (const offset of insets) for (const y of ys) {
      const actor = { x: side === 'left' ? offset : width - actorWidth - offset, y: clamp(y, 54, height - actorHeight - bottomGap), width: actorWidth, height: actorHeight };
      const bubble = fitBubble(actor, side, width, height, bubbleWidth, bubbleHeight, masks);
      const collision = masks.reduce((sum, r) => sum + overlap(actor, r) * 1.5 + overlap(bubble, r) * 2, 0);
      const preference = (side === preferred.side ? 0 : 220) + Math.abs(actor.y - height * preferred.y) * .35 + Math.abs(offset - inset);
      choices.push({ actor, bubble, side, gaze: hero ? { x: hero.x + hero.width / 2, y: hero.y + hero.height * .45 } : { x: width / 2, y: height * .48 }, score: collision * 100 + preference });
    }
  }
  return choices.sort((a, b) => a.score - b.score)[0];
}
export function guideContentBlocked(actor: GuideRect, rects: GuideRect[]) {
  return rects.some(r => overlap(actor, r, 8) > 20);
}
export function guideBlocked(actor: GuideRect, bubble: GuideRect | null, obstacles: GuideRect[]) {
  return obstacles.some(r => overlap(actor, r, 8) > actor.width * actor.height * .16 || bubble && overlap(bubble, r, 8) > bubble.width * bubble.height * .10);
}

/** Protect content and controls, leaving decorative panel backgrounds available. */
export function guideContentRects(): GuideRect[] {
  const selectors = '.pin-form,.letter-lines,.letter-paper h2,.letter-paper .signature,.read-all,.letter-layout>.primary-button,.memory-frame,.memory-copy,.world-panel h2,.world-panel .panel-kicker,.world-panel .panel-close,.world-panel .text-button,.capsule-model-anchor,.capsule-topline>span,.capsule-actions,.date-ticket,.capsule-collection-button,.date-collection,.puzzle-grid,.puzzle-full-photo,.puzzle-progress,.puzzle-layout>p,.ending-video-card,.final-copy h2,.heart-rating,.final-copy>.primary-button,.ending-copy h2,.ending-wishes p,.ending-signature,.ending-actions button,.header p,.footer button,.utility-controls,.reset-camera,.scene-content>.primary-button,.universe-tools';
  const glyphs = '.header p,h2,.panel-kicker,.ending-wishes p,.ending-signature';
  const rects: GuideRect[] = [];
  for (const element of document.querySelectorAll<HTMLElement>(selectors)) {
    if (element.closest('.sr-only,[inert],[aria-hidden="true"]') || getComputedStyle(element).display === 'none') continue;
    const boxes = element.matches(glyphs) ? (() => { const range = document.createRange(); range.selectNodeContents(element); return [...range.getClientRects()]; })() : [element.getBoundingClientRect()];
    const capsulePanel = element.closest('.panel-promise')?.getBoundingClientRect();
    for (const r of boxes) {
      // Scrolled-away capsule headings must not occupy the guide's clear dock.
      const left = Math.max(r.left, capsulePanel?.left ?? r.left), top = Math.max(r.top, capsulePanel?.top ?? r.top);
      const right = Math.min(r.right, capsulePanel?.right ?? r.right), bottom = Math.min(r.bottom, capsulePanel?.bottom ?? r.bottom);
      if (right > left && bottom > top && bottom > 0 && top < innerHeight) rects.push({ x: left, y: top, width: right - left, height: bottom - top });
    }
  }
  return rects;
}
