import {
  Camera,
  Canvas,
  Color,
  Graphics,
  Label,
  Layers,
  Node,
  UITransform,
  Vec2,
  Vec3,
  view,
} from 'cc';
import { LEVELS, LevelSpec } from '../core/levels';
import { Round } from '../core/Round';
import { color, COLORS } from './Shapes';

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
}
export class Hud {
  readonly root = new Node('HUD');
  private layout = new Node('Layout');
  private shots!: Label;
  private score!: Label;
  private caption!: Label;
  private meter!: Graphics;
  private aim!: Graphics;
  private result: Node | null = null;
  private hits: Hit[] = [];
  private resultHits: Hit[] = [];
  private width = 1280;
  private height = 720;
  private margin = 42;
  private lastText = '';
  constructor(
    parent: Node,
    private select: (i: number) => void,
    private retry: () => void,
    private sound: () => void,
  ) {
    parent.addChild(this.root);
    this.root.layer = Layers.Enum.UI_2D;
    this.root.addComponent(UITransform).setContentSize(1280, 720);
    const camNode = new Node('UI Camera');
    parent.addChild(camNode);
    camNode.setPosition(0, 0, 1000);
    const camera = camNode.addComponent(Camera);
    camera.projection = Camera.ProjectionType.ORTHO;
    camera.visibility = Layers.Enum.UI_2D;
    camera.priority = 10;
    camera.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
    camera.orthoHeight = 360;
    camera.near = 0.1;
    camera.far = 2000;
    const canvas = this.root.addComponent(Canvas);
    canvas.cameraComponent = camera;
    this.root.addChild(this.layout);
    this.layout.layer = Layers.Enum.UI_2D;
  }
  private node(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    parent.addChild(n);
    n.setPosition(x, y, 0);
    n.addComponent(UITransform).setContentSize(w, h);
    return n;
  }
  private text(
    parent: Node,
    text: string,
    x: number,
    y: number,
    size: number,
    hex = COLORS.white,
    w = 300,
    align: 'left' | 'center' | 'right' = 'left',
  ): Label {
    const n = this.node(parent, text, x, y, w, size * 1.8);
    const label = n.addComponent(Label);
    label.string = text;
    label.fontSize = size;
    label.lineHeight = size * 1.35;
    label.color = color(hex);
    label.horizontalAlign =
      align === 'left'
        ? Label.HorizontalAlign.LEFT
        : align === 'right'
          ? Label.HorizontalAlign.RIGHT
          : Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.fontFamily = 'Arial';
    return label;
  }
  private panel(
    parent: Node,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    radius = 16,
  ): Node {
    const n = this.node(parent, 'Panel', x, y, w, h);
    const g = n.addComponent(Graphics);
    g.fillColor = color(fill);
    g.roundRect(-w / 2, -h / 2, w, h, radius);
    g.fill();
    return n;
  }
  private button(
    parent: Node,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    action: () => void,
    active = false,
    result = false,
  ): void {
    this.panel(parent, x, y, w, h, active ? COLORS.mint : '#21434F', 12);
    this.text(parent, text, x, y, 18, active ? COLORS.navy : COLORS.white, w - 12, 'center');
    (result ? this.resultHits : this.hits).push({ x, y, w, h, action });
  }
  build(
    level: LevelSpec,
    index: number,
    best: Record<string, number>,
    sound: boolean,
    inset = 0,
    topInset = 0,
  ): void {
    for (const child of [...this.layout.children]) {
      child.active = false;
      child.destroy();
    }
    this.layout.removeAllChildren();
    this.result = null;
    this.hits = [];
    this.resultHits = [];
    this.lastText = '';
    const size = view.getVisibleSize();
    this.width = size.width;
    this.height = size.height;
    this.margin = Math.max(34, size.width * inset + 12);
    const left = -this.width / 2 + this.margin;
    const right = this.width / 2 - this.margin;
    const top = this.height / 2 - Math.max(42, this.height * topInset + 10);
    this.text(this.layout, 'K N O C K   /   物 理 游 乐 场', left + 180, top, 15, COLORS.mint, 360);
    this.text(
      this.layout,
      `${String(index + 1).padStart(2, '0')}  ${level.title}`,
      left + 180,
      top - 48,
      36,
      COLORS.white,
      360,
    );
    this.text(this.layout, level.subtitle, left + 180, top - 88, 16, COLORS.muted, 360);
    this.panel(this.layout, right - 92, top - 32, 184, 84, '#21434F');
    this.text(this.layout, '剩余炮弹', right - 96, top - 14, 14, COLORS.muted, 130, 'center');
    this.shots = this.text(this.layout, '', right - 96, top - 46, 32, COLORS.white, 130, 'center');
    this.score = this.text(this.layout, '', right - 112, top - 104, 17, COLORS.white, 220, 'right');
    this.meter = this.node(this.layout, 'Progress', right - 184, top - 129, 184, 8).addComponent(
      Graphics,
    );
    this.text(
      this.layout,
      '五种结构 · 五种解法',
      left + 120,
      -this.height / 2 + 125,
      13,
      COLORS.muted,
      240,
    );
    for (let i = 0; i < LEVELS.length; i++)
      this.button(
        this.layout,
        `${best[LEVELS[i].id] ? '✓ ' : ''}${i + 1}`,
        left + 23 + i * 55,
        -this.height / 2 + 80,
        46,
        42,
        () => this.select(i),
        i === index,
      );
    this.button(this.layout, '重来  ↻', right - 132, -this.height / 2 + 80, 112, 42, this.retry);
    this.button(
      this.layout,
      sound ? '声音 开' : '声音 关',
      right - 20,
      -this.height / 2 + 80,
      94,
      42,
      this.sound,
    );
    this.panel(this.layout, 0, -this.height / 2 + 57, 440, 80, '#102630', 16);
    this.caption = this.text(
      this.layout,
      '拖动瞄准 · 松手发射',
      0,
      -this.height / 2 + 67,
      19,
      COLORS.white,
      390,
      'center',
    );
    this.text(
      this.layout,
      '击落所有积木  /  用更少的炮弹完成',
      0,
      -this.height / 2 + 35,
      13,
      COLORS.muted,
      390,
      'center',
    );
    this.aim = this.node(this.layout, 'Reticle', 0, 0, 60, 60).addComponent(Graphics);
  }
  update(round: Round, hint: string): void {
    this.shots.string = `${round.remaining} / ${round.budget}`;
    this.score.string = `已击落  ${String(round.cleared.size).padStart(2, '0')} / ${String(round.total).padStart(2, '0')}`;
    const key = `${round.cleared.size}`;
    if (this.lastText !== key) {
      this.lastText = key;
      this.meter.clear();
      this.meter.fillColor = color('#325562');
      this.meter.roundRect(0, 0, 184, 5, 2);
      this.meter.fill();
      if (round.cleared.size) {
        this.meter.fillColor = color(COLORS.mint);
        this.meter.roundRect(0, 0, (184 * round.cleared.size) / round.total, 5, 2);
        this.meter.fill();
      }
    }
    this.caption.string =
      round.remaining === 0 && round.phase === 'settling' ? '等一等，连锁反应还在继续…' : hint;
  }
  reticle(position: Vec3 | null, ready: boolean): void {
    if (!this.aim) return;
    this.aim.clear();
    if (!position) return;
    this.aim.node.setPosition(position.x - this.width / 2, position.y - this.height / 2, 0);
    this.aim.strokeColor = color(ready ? COLORS.mint : '#F17D66');
    this.aim.lineWidth = 2;
    this.aim.circle(0, 0, 17);
    this.aim.stroke();
    for (const [x, y] of [
      [-25, 0],
      [18, 0],
      [0, -25],
      [0, 18],
    ]) {
      this.aim.moveTo(x, y);
      this.aim.lineTo(x + (y === 0 ? 7 : 0), y + (x === 0 ? 7 : 0));
      this.aim.stroke();
    }
    this.aim.fillColor = color(COLORS.white);
    this.aim.circle(0, 0, 2);
    this.aim.fill();
  }
  showResult(round: Round, level: LevelSpec, index: number): void {
    if (this.result) return;
    this.resultHits = [];
    this.result = this.node(this.layout, 'Result', 0, 0, this.width, this.height);
    const shade = this.result.addComponent(Graphics);
    shade.fillColor = new Color(8, 22, 29, 205);
    shade.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    shade.fill();
    this.panel(this.result, 0, 0, 470, 300, '#173744', 24);
    const won = round.phase === 'won';
    this.text(
      this.result,
      won ? '全 部 击 落' : '换个角度，再来一次',
      0,
      94,
      won ? 17 : 24,
      won ? COLORS.mint : COLORS.white,
      400,
      'center',
    );
    this.text(
      this.result,
      won
        ? round.shots <= level.par
          ? '干净利落。'
          : '全部倒下！'
        : `还剩 ${round.total - round.cleared.size} 块`,
      0,
      35,
      36,
      COLORS.white,
      400,
      'center',
    );
    this.text(
      this.result,
      won ? `用了 ${round.shots} 发  ·  挑战目标 ${level.par} 发` : level.hint,
      0,
      -16,
      16,
      COLORS.muted,
      420,
      'center',
    );
    this.button(
      this.result,
      '再试一次',
      won ? -104 : 0,
      -88,
      won ? 170 : 220,
      48,
      this.retry,
      false,
      true,
    );
    if (won)
      this.button(
        this.result,
        index === 4 ? '回到第一关' : '下一关  →',
        100,
        -88,
        180,
        48,
        () => this.select((index + 1) % 5),
        true,
        true,
      );
  }
  click(point: Vec2): boolean {
    const x = point.x - this.width / 2,
      y = point.y - this.height / 2;
    for (const hit of this.result ? this.resultHits : this.hits)
      if (Math.abs(x - hit.x) < hit.w / 2 && Math.abs(y - hit.y) < hit.h / 2) {
        hit.action();
        return true;
      }
    return !!this.result;
  }
  blocksInput(point: Vec2): boolean {
    const x = point.x - this.width / 2,
      y = point.y - this.height / 2;
    return (
      !!this.result ||
      y < -this.height / 2 + 112 ||
      y > this.height / 2 - 145 ||
      this.hits.some((h) => Math.abs(x - h.x) < h.w / 2 && Math.abs(y - h.y) < h.h / 2)
    );
  }
}
