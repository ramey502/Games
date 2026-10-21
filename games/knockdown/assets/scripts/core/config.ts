/** Shared by the Cocos runtime and headless physics regression tests. Units: metres, seconds. */
export const PHYSICS = {
  step: 1 / 120,
  maxSubSteps: 6,
  gravity: -9.81,
  friction: 0.38,
  restitution: 0.06,
  linearDamping: 0.08,
  angularDamping: 0.12,
  ballRadius: 0.28,
  ballMass: 3.2,
  flightSpeed: 23,
  launch: [0, 1.2, 8] as readonly [number, number, number],
  platformTop: 0,
  platformDepth: 0.95,
  platformWidth: 8.6,
  clearHeight: -1.1,
  settleSpeed: 0.14,
  settleAngularSpeed: 0.22,
  settleSeconds: 0.85,
  minimumFlightWait: 1.1,
  shotCooldown: 0.7,
} as const;

export type Point3 = readonly [number, number, number];
export function shotVelocity(target: Point3): Point3 {
  const [sx, sy, sz] = PHYSICS.launch;
  const t = Math.hypot(target[0] - sx, target[2] - sz) / PHYSICS.flightSpeed;
  return [
    (target[0] - sx) / t,
    (target[1] - sy - 0.5 * PHYSICS.gravity * t * t) / t,
    (target[2] - sz) / t,
  ];
}
