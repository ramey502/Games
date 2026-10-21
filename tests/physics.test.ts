import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../games/knockdown/assets/scripts/core/levels';
import { createPhysicsFixture } from '../tools/physics-world';

for (const level of LEVELS) {
  test(`${level.id}: stands for 8 seconds without a shot`, () => {
    const f = createPhysicsFixture(level);
    f.advance(8);
    assert.equal(f.remaining().length, level.blocks.length);
    for (const { body, spec } of f.blocks) {
      const drift = Math.hypot(
        body.position.x - spec.position[0],
        body.position.y - spec.position[1],
        body.position.z - spec.position[2],
      );
      assert.ok(drift < 0.12, `${spec.id} drifted ${drift}m`);
    }
  });
  test(`${level.id}: physically solvable within the ammunition budget`, () => {
    const f = createPhysicsFixture(level);
    f.advance(4);
    assert.ok(level.solution.length <= level.balls);
    for (const target of level.solution) {
      f.shoot(target);
      f.advance(5);
    }
    assert.equal(f.remaining().length, 0, `Remaining: ${f.remaining().map((b) => b.spec.id)}`);
  });

  test(`${level.id}: small aim and settling variations leave enough ammunition for cleanup`, () => {
    for (const warmup of [0.8, 2, 4]) {
      for (const offset of [-0.04, 0, 0.04]) {
        const f = createPhysicsFixture(level);
        f.advance(warmup);
        let shots = 0;
        for (const target of level.solution) {
          f.shoot([target[0] + offset, target[1], target[2] + 0.3]);
          f.advance(5);
          shots++;
          if (!f.remaining().length) break;
        }
        // A real player can aim at the remaining block's new location. Never teleport it.
        while (f.remaining().length && shots < level.balls) {
          const { body } = f.remaining()[0];
          f.shoot([body.position.x, Math.max(0.16, body.position.y), body.position.z]);
          f.advance(5);
          shots++;
        }
        assert.equal(f.remaining().length, 0, `warmup=${warmup}, offset=${offset}`);
      }
    }
  });
}
