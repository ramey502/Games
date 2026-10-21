import { game, Game, sys } from 'cc';

interface WechatApi {
  getMenuButtonBoundingClientRect?: () => { bottom: number };
  vibrateShort?: (options: { type: 'light' | 'medium' }) => void;
  getSystemInfoSync?: () => {
    safeArea?: { left: number; right: number; top: number; bottom: number };
    screenWidth: number;
    screenHeight: number;
  };
}
export interface Progress {
  version: 1;
  best: Record<string, number>;
  sound: boolean;
}
const KEY = 'knockdown.progress.v1';

/** All platform-specific calls live here. Core gameplay never touches wx or the DOM. */
export class Platform {
  private wx = (globalThis as typeof globalThis & { wx?: WechatApi }).wx;
  readonly progress: Progress = this.load();
  private lastHaptic = 0;
  private load(): Progress {
    try {
      const p: unknown = JSON.parse(sys.localStorage.getItem(KEY) || 'null');
      if (
        p &&
        typeof p === 'object' &&
        'version' in p &&
        p.version === 1 &&
        'best' in p &&
        typeof p.best === 'object' &&
        p.best
      ) {
        const best: Record<string, number> = {};
        for (const [k, v] of Object.entries(p.best))
          if (typeof v === 'number' && Number.isInteger(v) && v > 0) best[k] = v;
        return { version: 1, best, sound: !('sound' in p) || p.sound !== false };
      }
    } catch {
      /* Storage may be unavailable in private mode; gameplay remains available. */
    }
    return { version: 1, best: {}, sound: true };
  }
  save(): void {
    try {
      sys.localStorage.setItem(KEY, JSON.stringify(this.progress));
    } catch {
      /* best-effort */
    }
  }
  complete(level: string, shots: number): void {
    this.progress.best[level] = Math.min(this.progress.best[level] ?? Infinity, shots);
    this.save();
  }
  haptic(): void {
    if (Date.now() - this.lastHaptic < 100) return;
    this.lastHaptic = Date.now();
    this.wx?.vibrateShort?.({ type: 'light' });
  }
  /** Symmetrical insets also leave room for the WeChat capsule in landscape. */
  safeInset(): number {
    try {
      const info = this.wx?.getSystemInfoSync?.();
      if (info?.safeArea)
        return (
          Math.max(info.safeArea.left, info.screenWidth - info.safeArea.right, 24) /
          info.screenWidth
        );
    } catch {
      /* use default */
    }
    return 0;
  }
  /** Keep status information below the native menu, which is outside the canvas UI. */
  safeTopInset(): number {
    try {
      const info = this.wx?.getSystemInfoSync?.();
      const menu = this.wx?.getMenuButtonBoundingClientRect?.();
      if (info && info.screenHeight > 0) {
        const bottom = Math.max(info.safeArea?.top ?? 0, menu?.bottom ?? 0);
        return bottom > 0 ? (bottom + 8) / info.screenHeight : 0;
      }
    } catch {
      /* Older hosts may not expose menu geometry. */
    }
    return 0;
  }
  onVisibility(hide: () => void, show: () => void): () => void {
    game.on(Game.EVENT_HIDE, hide);
    game.on(Game.EVENT_SHOW, show);
    return () => {
      game.off(Game.EVENT_HIDE, hide);
      game.off(Game.EVENT_SHOW, show);
    };
  }
}
