import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Round } from '../games/knockdown/assets/scripts/core/Round';
import { PHYSICS, shotVelocity } from '../games/knockdown/assets/scripts/core/config';
import { LEVELS, validateLevels } from '../games/knockdown/assets/scripts/core/levels';

test('all five levels have valid geometry and identifiers', () => {
  assert.equal(LEVELS.length, 5);
  validateLevels(LEVELS);
});
test('last shot waits for falling targets, then wins', () => {
  const round = new Round(2, 1);
  assert.equal(round.fire(), true);
  round.tick(4, true);
  assert.equal(round.phase, 'settling');
  round.clear('a');
  round.clear('b');
  round.tick(0.01, true);
  assert.equal(round.phase, 'won');
});
test('no ammunition and a settled structure is a loss', () => {
  const round = new Round(2, 1);
  round.fire();
  round.tick(0.5, false);
  assert.equal(round.phase, 'settling');
  round.tick(1, false);
  assert.equal(round.phase, 'lost');
});
test('cooldown, duplicates, and terminal states cannot corrupt score', () => {
  const round = new Round(1, 2);
  assert.equal(round.fire(), true);
  assert.equal(round.fire(), false);
  assert.equal(round.clear('a'), true);
  assert.equal(round.clear('a'), false);
  round.tick(1, false);
  assert.equal(round.phase, 'won');
  assert.equal(round.fire(), false);
  assert.equal(round.remaining, 1);
});
test('ballistic launch reaches the selected point under gravity', () => {
  const target = [2, 3, -0.3] as const;
  const velocity = shotVelocity(target);
  const t = (target[2] - PHYSICS.launch[2]) / velocity[2];
  const actual = PHYSICS.launch.map(
    (v, i) => v + velocity[i] * t + (i === 1 ? 0.5 * PHYSICS.gravity * t * t : 0),
  );
  actual.forEach((v, i) => assert.ok(Math.abs(v - target[i]) < 1e-8));
});
