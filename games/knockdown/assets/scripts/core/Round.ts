import { PHYSICS } from './config';

export type Phase = 'ready' | 'settling' | 'won' | 'lost';
/** Pure game state. A last-shot collision must finish before a defeat can be decided. */
export class Round {
  phase: Phase = 'ready';
  remaining: number;
  shots = 0;
  cleared = new Set<string>();
  private sinceShot = Infinity;
  private quietTime = 0;
  constructor(
    readonly total: number,
    readonly budget: number,
  ) {
    this.remaining = budget;
  }
  get canShoot(): boolean {
    return (
      this.remaining > 0 &&
      (this.phase === 'ready' || this.phase === 'settling') &&
      this.sinceShot >= PHYSICS.shotCooldown
    );
  }
  fire(): boolean {
    if (!this.canShoot) return false;
    this.remaining--;
    this.shots++;
    this.sinceShot = 0;
    this.quietTime = 0;
    this.phase = 'settling';
    return true;
  }
  clear(id: string): boolean {
    if (this.cleared.has(id) || this.phase === 'won' || this.phase === 'lost') return false;
    this.cleared.add(id);
    return true;
  }
  tick(dt: number, moving: boolean): void {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.sinceShot += dt;
    if (this.cleared.size >= this.total) {
      this.phase = 'won';
      return;
    }
    if (this.shots === 0) return;
    this.quietTime = moving ? 0 : this.quietTime + dt;
    if (this.sinceShot >= PHYSICS.minimumFlightWait && this.quietTime >= PHYSICS.settleSeconds) {
      this.phase = this.remaining === 0 ? 'lost' : 'ready';
    }
  }
}
