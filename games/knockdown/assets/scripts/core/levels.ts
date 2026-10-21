import { Point3 } from './config';

export type BlockKind = 'wood' | 'mint' | 'coral' | 'gold';
export interface BlockSpec {
  id: string;
  position: Point3;
  size: Point3;
  kind: BlockKind;
  mass: number;
}
export interface LevelSpec {
  id: string;
  title: string;
  subtitle: string;
  hint: string;
  balls: number;
  par: number;
  blocks: readonly BlockSpec[];
  /** Reproducible baseline solution; these are world-space aim points, not forced outcomes. */
  solution: readonly Point3[];
}

function b(
  id: string,
  x: number,
  y: number,
  w = 0.72,
  h = 0.72,
  kind: BlockKind = 'wood',
  z = 0,
  d = 0.72,
): BlockSpec {
  return { id, position: [x, y, z], size: [w, h, d], kind, mass: Math.max(0.3, w * h * d * 1.8) };
}

export const LEVELS: readonly LevelSpec[] = [
  {
    id: 'first-crack',
    title: '支点',
    subtitle: '找到让整座塔倾倒的那一点',
    hint: '试着瞄准底部的薄荷色支柱',
    balls: 4,
    par: 2,
    blocks: [
      b('stem', 0, 0.65, 0.62, 1.3, 'mint'),
      b('beam', 0, 1.49, 3.2, 0.38, 'gold'),
      ...[-1.1, 0, 1.1].map((x, i) => b(`row-${i}`, x, 2.04)),
      ...[-0.55, 0.55].map((x, i) => b(`top-${i}`, x, 2.76, 0.72, 0.72, 'coral')),
      b('crown', 0, 3.48, 0.72, 0.72, 'mint'),
    ],
    solution: [
      [0.18, 0.55, 0],
      [0, 0.45, 0],
    ],
  },
  {
    id: 'big-head',
    title: '失衡',
    subtitle: '两条腿，撑着一个大脑袋',
    hint: '从一侧下手，让重心离开支撑',
    balls: 5,
    par: 3,
    blocks: [
      b('left-leg', -1.1, 0.75, 0.5, 1.5, 'mint'),
      b('right-leg', 1.1, 0.75, 0.5, 1.5, 'mint'),
      b('chin', 0, 1.7, 3.4, 0.4, 'gold'),
      ...[-1.1, 0, 1.1].flatMap((x, i) => [
        b(`face-${i}`, x, 2.26, 0.9, 0.72, 'coral'),
        b(`hair-${i}`, x, 2.98, 0.9, 0.72),
      ]),
    ],
    solution: [
      [-1.1, 0.65, 0],
      [1.1, 0.65, 0],
      [0, 0.35, 0],
    ],
  },
  {
    id: 'cargo-bridge',
    title: '断桥',
    subtitle: '让桥面，带走桥上的一切',
    hint: '打掉一端支撑，观察桥面的倾斜',
    balls: 5,
    par: 3,
    blocks: [
      b('pier-left', -1.65, 0.6, 0.6, 1.2, 'mint'),
      b('pier-right', 1.65, 0.6, 0.6, 1.2, 'mint'),
      b('deck', 0, 1.38, 4.2, 0.36, 'gold'),
      ...[-1.5, -0.5, 0.5, 1.5].flatMap((x, i) => [
        b(`cargo-${i}`, x, 1.94, 0.75, 0.76),
        b(`upper-${i}`, x, 2.7, 0.75, 0.76, 'coral'),
      ]),
    ],
    solution: [
      [-1.65, 0.5, 0],
      [1.65, 0.5, 0],
      [0, 0.25, 0],
    ],
  },
  {
    id: 'chain-reaction',
    title: '连锁',
    subtitle: '一块倒下，下一块会发生什么',
    hint: '击打高处和侧边，让长条发生旋转',
    balls: 5,
    par: 3,
    blocks: [
      ...[-2.8, -1.4, 0, 1.4, 2.8].map((x, i) =>
        b(`domino-${i}`, x, 1.15, 0.46, 2.3, i % 2 ? 'coral' : 'mint', 0, 0.66),
      ),
      b('link-left', -2.1, 2.46, 2.05, 0.32, 'gold'),
      b('link-right', 2.1, 2.46, 2.05, 0.32, 'gold'),
      b('center', 0, 2.66, 0.8, 0.72),
    ],
    solution: [
      [-2.65, 1.7, 0],
      [2.65, 1.7, 0],
      [0.15, 1.4, 0],
    ],
  },
  {
    id: 'through-the-gate',
    title: '破局',
    subtitle: '外框之内，还有真正的支点',
    hint: '从门框中间瞄准后方支柱',
    balls: 6,
    par: 4,
    blocks: [
      b('gate-left', -1.8, 1.05, 0.55, 2.1, 'coral', 0.35, 0.6),
      b('gate-right', 1.8, 1.05, 0.55, 2.1, 'coral', 0.35, 0.6),
      b('gate-lintel', 0, 2.28, 4.2, 0.36, 'gold', 0.35, 0.6),
      b('inner-stem', 0, 0.65, 0.6, 1.3, 'mint', -0.35, 0.6),
      b('inner-deck', 0, 1.48, 2.4, 0.36, 'gold', -0.35, 0.6),
      ...[-0.8, 0, 0.8].map((x, i) => b(`inner-${i}`, x, 1.96, 0.62, 0.6, 'wood', -0.35, 0.6)),
      ...[-1.4, -0.7, 0, 0.7, 1.4].map((x, i) =>
        b(`roof-${i}`, x, 2.82, 0.64, 0.72, 'wood', 0.35, 0.6),
      ),
    ],
    solution: [
      [0.15, 0.6, -0.35],
      [-1.8, 0.7, 0.35],
      [1.8, 0.7, 0.35],
      [0, 0.3, 0],
    ],
  },
];

export function validateLevels(levels: readonly LevelSpec[]): void {
  const ids = new Set<string>();
  for (const level of levels) {
    if (ids.has(level.id)) throw new Error(`Duplicate level: ${level.id}`);
    ids.add(level.id);
    if (!Number.isInteger(level.balls) || level.balls < level.par || !level.blocks.length)
      throw new Error(`Invalid level: ${level.id}`);
    const blockIds = new Set<string>();
    for (const block of level.blocks) {
      if (
        blockIds.has(block.id) ||
        ![...block.position, ...block.size, block.mass].every(Number.isFinite) ||
        block.size.some((v) => v <= 0) ||
        block.mass <= 0
      )
        throw new Error(`Invalid block: ${level.id}/${block.id}`);
      blockIds.add(block.id);
      if (block.position[1] - block.size[1] / 2 < -0.001)
        throw new Error(`Block below platform: ${block.id}`);
    }
  }
}
