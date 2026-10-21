import CANNON from '@cocos/cannon';
import { PHYSICS, Point3, shotVelocity } from '../games/knockdown/assets/scripts/core/config';
import { LevelSpec } from '../games/knockdown/assets/scripts/core/levels';

/** Same Cannon version, solver defaults, material and timestep as Creator 3.8.8. */
export function createPhysicsFixture(level: LevelSpec) {
  const world = new CANNON.World();
  world.gravity.set(0, PHYSICS.gravity, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  world.solver.tolerance = 0.0001;
  world.allowSleep = true;
  world.defaultMaterial.friction = PHYSICS.friction;
  world.defaultMaterial.restitution = PHYSICS.restitution;
  world.defaultContactMaterial.contactEquationStiffness = 1000000;
  world.defaultContactMaterial.frictionEquationStiffness = 1000000;
  world.defaultContactMaterial.contactEquationRelaxation = 3;
  world.defaultContactMaterial.frictionEquationRelaxation = 3;
  const material = world.defaultMaterial;
  const platform = new CANNON.Body({ mass: 0, material });
  platform.addShape(
    new CANNON.Box(new CANNON.Vec3(PHYSICS.platformWidth / 2, 0.25, PHYSICS.platformDepth / 2)),
  );
  platform.position.set(0, -0.25, 0);
  world.addBody(platform);
  const blocks = level.blocks.map((spec) => {
    const body = new CANNON.Body({ mass: spec.mass, material });
    body.addShape(new CANNON.Box(new CANNON.Vec3(...spec.size.map((v) => v / 2))));
    body.position.set(...spec.position);
    body.linearDamping = PHYSICS.linearDamping;
    body.angularDamping = PHYSICS.angularDamping;
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.1;
    world.addBody(body);
    return { spec, body };
  });
  function advance(seconds: number) {
    for (let i = 0; i < Math.ceil(seconds / PHYSICS.step); i++) world.step(PHYSICS.step);
  }
  function shoot(target: Point3) {
    const ball = new CANNON.Body({ mass: PHYSICS.ballMass, material });
    ball.addShape(new CANNON.Sphere(PHYSICS.ballRadius));
    ball.position.set(...PHYSICS.launch);
    ball.velocity.set(...shotVelocity(target));
    ball.linearDamping = 0;
    world.addBody(ball);
  }
  return {
    world,
    blocks,
    advance,
    shoot,
    remaining: () => blocks.filter(({ body }) => body.position.y >= PHYSICS.clearHeight),
  };
}
