import { LEVELS } from '../games/knockdown/assets/scripts/core/levels';
import { createPhysicsFixture } from './physics-world';
for (const level of LEVELS) {
  const fixture = createPhysicsFixture(level);
  fixture.advance(4);
  const initial = fixture.remaining().length;
  const report: unknown[] = [];
  for (const target of level.solution) {
    fixture.shoot(target);
    fixture.advance(5);
    report.push({
      target,
      remaining: fixture.remaining().map(({ spec, body }) => ({
        id: spec.id,
        p: [body.position.x, body.position.y, body.position.z].map((v) => +v.toFixed(2)),
      })),
    });
  }
  console.log(JSON.stringify({ level: level.id, initial, total: level.blocks.length, report }));
}
