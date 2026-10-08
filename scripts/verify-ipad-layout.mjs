import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Verify the captured DOM geometry; this does not replace a live browser run.
const audit = JSON.parse(readFileSync(new URL('../docs/ipad-layout-qa.json', import.meta.url), 'utf8'));
const motion = JSON.parse(readFileSync(new URL('../docs/ipad-motion-qa.json', import.meta.url), 'utf8'));
const animation = JSON.parse(readFileSync(new URL('../docs/animation-layout-qa.json', import.meta.url), 'utf8'));
const finalAnimation = JSON.parse(readFileSync(new URL('../docs/animation-layout-final-qa.json', import.meta.url), 'utf8'));
assert.equal(audit.records.length, 150);
assert.deepEqual(audit.errors, []);
for (const record of audit.records) {
  const label = `${record.name} ${record.width}×${record.height}`;
  assert.equal(record.overflow, false, `${label}: horizontal overflow`);
  const targets = [...record.buttons, ...Object.entries(record.elements)
    .filter(([name]) => name === '.panel-close')
    .map(([, element]) => element)];
  for (const target of targets) {
    assert.equal(target.canClick, true, `${label}: blocked ${target.text ?? 'close button'}`);
    assert.ok(target.x >= -1 && target.y >= -1 && target.x + target.width <= record.width + 1
      && target.y + target.height <= record.height + 1, `${label}: clipped control`);
  }
  for (const target of record.buttons) {
    assert.ok(target.font >= 16, `${label}: small action text`);
    assert.ok(target.height >= (record.width >= 600 ? 60 : 56), `${label}: small action target`);
  }
  const actor = record.elements['.guide-actor'];
  if (actor) assert.ok(actor.x >= -1 && actor.y >= -1 && actor.x + actor.width <= record.width + 1
    && actor.y + actor.height <= record.height + 1, `${label}: clipped guide`);
}
assert.equal(motion.passed, true);
assert.deepEqual(motion.errors, []);
for (const evidence of [animation, finalAnimation]) {
  assert.equal(evidence.passed, true);
  assert.deepEqual(evidence.errors, []);
  const opened = evidence.checks.find(check => check.name === 'open-lid-before-handoff');
  assert.deepEqual(opened.position, [0, 0, 0]);
  assert.deepEqual(opened.scale, [1, 1, 1]);
  assert.equal(opened.transition, 'idle');
  assert.ok(opened.lidY > .765 && opened.lidAngle < -.3);
  assert.equal(evidence.checks.find(check => check.name === 'cake-removed-from-birthday').passed, true);
  const letter = evidence.checks.find(check => check.name === 'letter-portrait-size');
  assert.ok(letter.w > 700 && letter.h > 800);
  assert.equal(letter.font, '20px');
  assert.deepEqual(evidence.checks.find(check => check.name === 'guide-render-surface-and-zoom-stable').sizes, ['200:296']);
  for (const view of ['portrait-world-centers', 'landscape-world-centers']) {
    const points = evidence.checks.find(check => check.name === view).points;
    assert.equal(points.length, 9);
    assert.ok(points.every(point => point.inside && point.onCanvas));
  }
}
assert.equal(animation.checks.filter(check => check.name === 'real-3D-tap' && check.passed).length, 9);
console.log('PASS: 150 scene/viewport captures, normal-motion journey and focused animation checks.');
