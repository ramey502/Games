import {
  _decorator,
  AudioClip,
  AudioSource,
  BoxCollider,
  Camera,
  EffectAsset,
  Component,
  DirectionalLight,
  EventMouse,
  EventTouch,
  geometry,
  input,
  Input,
  Layers,
  Node,
  PhysicsSystem,
  resources,
  screen,
  RigidBody,
  SphereCollider,
  Vec2,
  Vec3,
  Vec4,
  view,
  ResolutionPolicy,
  profiler,
} from 'cc';
import { PHYSICS, shotVelocity } from './core/config';
import { LEVELS, validateLevels } from './core/levels';
import { Round } from './core/Round';
import { Platform } from './platform/Platform';
import { Shapes, COLORS, color } from './view/Shapes';
import { Hud } from './view/Hud';

const { ccclass, property } = _decorator;
interface TargetBody {
  id: string;
  node: Node;
  body: RigidBody;
  cleared: boolean;
}
interface Ball {
  node: Node;
  age: number;
}
interface Spark {
  node: Node;
  velocity: Vec3;
  age: number;
  duration: number;
}

@ccclass('KnockdownGame')
export class KnockdownGame extends Component {
  /** Explicit scene dependencies prevent build-time stripping of procedural materials. */
  @property([EffectAsset])
  effects: EffectAsset[] = [];
  private shapes = new Shapes();
  private platform = new Platform();
  private camera!: Camera;
  private world!: Node;
  private structure!: Node;
  private cannon!: Node;
  private dots: Node[] = [];
  private targets: TargetBody[] = [];
  private balls: Ball[] = [];
  private sparks: Spark[] = [];
  private hud!: Hud;
  private round!: Round;
  private levelIndex = 0;
  private age = 0;
  private dragging = false;
  private touchId: number | null = null;
  private aimPoint = new Vec3(0, 0.6, 0);
  private recoil = 0;
  private shake = 0;
  private paused = false;
  private cameraHome = new Vec3(0.8, 3.8, 13.4);
  private audio!: AudioSource;
  private clips: Record<string, AudioClip> = {};
  private lastImpact = 0;
  private disposeVisibility?: () => void;

  onLoad(): void {
    validateLevels(LEVELS);
    view.setDesignResolutionSize(1280, 720, ResolutionPolicy.SHOW_ALL);
    profiler.hideStats();
    const physics = PhysicsSystem.instance;
    physics.enable = true;
    physics.gravity = new Vec3(0, PHYSICS.gravity, 0);
    physics.fixedTimeStep = PHYSICS.step;
    physics.maxSubSteps = PHYSICS.maxSubSteps;
    physics.allowSleep = true;
    physics.defaultMaterial.friction = PHYSICS.friction;
    physics.defaultMaterial.restitution = PHYSICS.restitution;
    for (const group of [1, 2, 4]) physics.collisionMatrix[group] = 7;
    this.world = new Node('Playfield');
    this.node.addChild(this.world);
    this.createStage();
    this.hud = new Hud(
      this.node,
      (i) => this.loadLevel(i),
      () => this.loadLevel(this.levelIndex),
      () => {
        this.platform.progress.sound = !this.platform.progress.sound;
        this.platform.save();
        this.rebuildHud();
      },
    );
    this.audio = this.node.addComponent(AudioSource);
    for (const name of ['shot', 'impact', 'win'])
      resources.load(`audio/${name}`, AudioClip, (error, clip) => {
        if (!error && this.isValid) this.clips[name] = clip;
      });
    this.loadLevel(0);
    input.on(Input.EventType.TOUCH_START, this.touchStart, this);
    input.on(Input.EventType.TOUCH_MOVE, this.touchMove, this);
    input.on(Input.EventType.TOUCH_END, this.touchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.touchCancel, this);
    input.on(Input.EventType.MOUSE_DOWN, this.mouseDown, this);
    input.on(Input.EventType.MOUSE_MOVE, this.mouseMove, this);
    input.on(Input.EventType.MOUSE_UP, this.mouseUp, this);
    view.on('canvas-resize', this.resize, this);
    this.disposeVisibility = this.platform.onVisibility(
      () => {
        this.paused = true;
        this.touchCancel();
        PhysicsSystem.instance.enable = false;
        this.audio.stop();
      },
      () => {
        this.paused = false;
        PhysicsSystem.instance.enable = true;
      },
    );
    this.resize();
  }

  private createStage(): void {
    const scene = this.node.scene;
    scene.globals.skybox.enabled = false;
    scene.globals.fog.enabled = true;
    scene.globals.fog.type = 0;
    scene.globals.fog.fogColor = color('#112E3B');
    scene.globals.fog.fogStart = 20;
    scene.globals.fog.fogEnd = 70;
    scene.globals.ambient.skyColor = new Vec4(0.9, 0.95, 1, 1);
    scene.globals.ambient.skyIllum = 18000;
    scene.globals.shadows.enabled = true;
    scene.globals.shadows.type = 1;
    scene.globals.ambient.groundAlbedo = new Vec4(0.35, 0.43, 0.46, 1);
    const lightNode = new Node('Key Light');
    this.node.addChild(lightNode);
    lightNode.setRotationFromEuler(-55, -30, 0);
    const light = lightNode.addComponent(DirectionalLight);
    light.color = color('#FFF0D4');
    light.illuminance = 38000;
    light.shadowEnabled = true;
    light.shadowDistance = 35;
    light.shadowNormalBias = 0.04;
    light.shadowBias = 0.001;
    light.shadowPcf = 1;
    const camNode = new Node('Game Camera');
    this.node.addChild(camNode);
    camNode.setPosition(this.cameraHome);
    camNode.lookAt(new Vec3(0, 1.15, 0));
    this.camera = camNode.addComponent(Camera);
    this.camera.fov = 36;
    this.camera.near = 0.1;
    this.camera.far = 120;
    this.camera.clearColor = color('#112E3B');
    this.camera.visibility = Layers.Enum.DEFAULT;
    this.shapes.mesh(this.world, 'Floor', [160, 0.2, 160], [0, -2.7, 0], '#173C48');
    this.shapes.mesh(this.world, 'Island', [12, 0.22, 8], [0, -2.53, 0], '#214954', 'cylinder');
    this.shapes.mesh(
      this.world,
      'Island inset',
      [10.8, 0.04, 7.2],
      [0, -2.4, 0],
      '#29525B',
      'cylinder',
    );
    const table = this.shapes.mesh(
      this.world,
      'Table',
      [PHYSICS.platformWidth, 0.5, PHYSICS.platformDepth],
      [0, -0.25, 0],
      '#2D535C',
    );
    const tableBody = table.addComponent(RigidBody);
    tableBody.type = RigidBody.Type.STATIC;
    tableBody.group = 2;
    table.addComponent(BoxCollider);
    tableBody.setMask(7);
    this.shapes.mesh(
      this.world,
      'Table lip',
      [PHYSICS.platformWidth + 0.04, 0.08, PHYSICS.platformDepth + 0.04],
      [0, -0.38, 0],
      COLORS.gold,
    );
    for (const x of [-3.25, 3.25]) {
      this.shapes.mesh(this.world, 'Table stand', [0.4, 1.9, 0.5], [x, -1.45, 0], '#163540');
      this.shapes.mesh(this.world, 'Foot', [0.9, 0.1, 1.2], [x, -2.35, 0], '#102D38');
    }
    // Visual ground markers stay outside the play area and carry no collision shapes.
    for (let i = 0; i < 13; i++)
      this.shapes.mesh(
        this.world,
        'Floor dash',
        [0.035, 0.012, 0.2],
        [-6 + i, -2.385, 3],
        '#42666B',
      );
    for (const x of [-7, 7]) {
      this.shapes.mesh(this.world, 'Bollard', [0.16, 1.6, 0.16], [x, -1.6, -3], '#2E5661');
      this.shapes.mesh(
        this.world,
        'Lamp',
        [0.27, 0.18, 0.27],
        [x, -0.74, -3],
        COLORS.gold,
        'box',
        true,
      );
    }
    this.cannon = new Node('Launcher');
    this.world.addChild(this.cannon);
    this.cannon.setPosition(...PHYSICS.launch);
    this.shapes.mesh(this.cannon, 'Housing', [0.75, 0.6, 0.9], [0, -0.32, 0.3], COLORS.ink);
    const barrel = this.shapes.mesh(
      this.cannon,
      'Barrel',
      [0.5, 1.2, 0.5],
      [0, 0, 0.15],
      COLORS.gold,
      'cylinder',
    );
    barrel.setRotationFromEuler(90, 0, 0);
    const rim = this.shapes.mesh(
      this.cannon,
      'Muzzle rim',
      [0.62, 0.16, 0.62],
      [0, 0, -0.38],
      COLORS.mint,
      'cylinder',
    );
    rim.setRotationFromEuler(90, 0, 0);
    const bore = this.shapes.mesh(
      this.cannon,
      'Bore',
      [0.38, 0.018, 0.38],
      [0, 0, -0.47],
      COLORS.navy,
      'cylinder',
    );
    bore.setRotationFromEuler(90, 0, 0);
    for (let i = 0; i < 16; i++) {
      const dot = this.shapes.mesh(
        this.world,
        'Aim bead',
        [0.055, 0.055, 0.055],
        [0, 0, 0],
        COLORS.mint,
        'sphere',
        true,
      );
      dot.active = false;
      this.dots.push(dot);
    }
  }

  private loadLevel(index: number): void {
    this.unscheduleAllCallbacks();
    this.touchCancel();
    if (this.structure) {
      this.structure.active = false;
      this.structure.destroy();
    }
    for (const ball of this.balls) {
      ball.node.active = false;
      ball.node.destroy();
    }
    this.balls = [];
    for (const spark of this.sparks) spark.node.destroy();
    this.sparks = [];
    this.levelIndex = index;
    const level = LEVELS[index];
    this.age = 0;
    this.shake = 0;
    this.round = new Round(level.blocks.length, level.balls);
    this.structure = new Node(`Structure-${level.id}`);
    this.world.addChild(this.structure);
    this.targets = level.blocks.map((spec) => {
      const node = this.shapes.block(this.structure, spec);
      const body = node.addComponent(RigidBody);
      body.type = RigidBody.Type.DYNAMIC;
      body.mass = spec.mass;
      body.group = 1;
      body.linearDamping = PHYSICS.linearDamping;
      body.angularDamping = PHYSICS.angularDamping;
      body.allowSleep = true;
      body.sleepThreshold = 0.1;
      const collider = node.addComponent(BoxCollider);
      collider.size = new Vec3(...spec.size);
      collider.on('onCollisionEnter', this.onImpact, this);
      body.setMask(7);
      return { id: spec.id, node, body, cleared: false };
    });
    this.rebuildHud();
  }
  private rebuildHud(): void {
    this.hud.build(
      LEVELS[this.levelIndex],
      this.levelIndex,
      this.platform.progress.best,
      this.platform.progress.sound,
      this.platform.safeInset(),
      this.platform.safeTopInset(),
    );
    if (this.round.phase === 'won' || this.round.phase === 'lost')
      this.hud.showResult(this.round, LEVELS[this.levelIndex], this.levelIndex);
  }
  private resize(): void {
    // SHOW_ALL scales the HUD; a perspective camera still uses the physical canvas aspect.
    // Preserve the same horizontal play area when a browser panel becomes narrow.
    const size = screen.windowSize;
    const aspect = size.width / Math.max(1, size.height);
    this.camera.fov =
      (2 * Math.atan(Math.tan(Math.PI / 10) * Math.max(1, 16 / 9 / aspect)) * 180) / Math.PI;
    this.rebuildHud();
  }
  private sound(name: string, volume = 1): void {
    if (this.platform.progress.sound && this.clips[name])
      this.audio.playOneShot(this.clips[name], volume);
  }
  private onImpact(): void {
    if (this.round.shots === 0 || this.age - this.lastImpact < 0.085) return;
    this.lastImpact = this.age;
    this.sound('impact', 0.36);
  }
  private aim(screen: Vec2): void {
    const ray = this.camera.screenPointToRay(screen.x, screen.y, new geometry.Ray());
    const physics = PhysicsSystem.instance;
    if (physics.raycastClosest(ray, 1, 100))
      this.aimPoint.set(physics.raycastClosestResult.hitPoint);
    else {
      const t = -ray.o.z / ray.d.z;
      this.aimPoint.set(
        Math.max(-4.7, Math.min(4.7, ray.o.x + ray.d.x * t)),
        Math.max(0.16, Math.min(4.5, ray.o.y + ray.d.y * t)),
        0,
      );
    }
    const velocity = shotVelocity([this.aimPoint.x, this.aimPoint.y, this.aimPoint.z]);
    this.cannon.lookAt(
      new Vec3(
        PHYSICS.launch[0] + velocity[0],
        PHYSICS.launch[1] + velocity[1],
        PHYSICS.launch[2] + velocity[2],
      ),
    );
    const duration = (this.aimPoint.z - PHYSICS.launch[2]) / velocity[2];
    this.dots.forEach((dot, i) => {
      const t = (duration * (i + 1)) / (this.dots.length + 1);
      dot.active = true;
      dot.setPosition(
        PHYSICS.launch[0] + velocity[0] * t,
        PHYSICS.launch[1] + velocity[1] * t + 0.5 * PHYSICS.gravity * t * t,
        PHYSICS.launch[2] + velocity[2] * t,
      );
    });
    // worldToScreen returns framebuffer pixels; convert into design-space HUD coordinates.
    const projected = this.camera.worldToScreen(this.aimPoint);
    const viewport = view.getViewportRect();
    projected.x = (projected.x - viewport.x) / view.getScaleX();
    projected.y = (projected.y - viewport.y) / view.getScaleY();
    this.hud.reticle(projected, this.round.canShoot && this.age > 0.8);
  }
  private shoot(): void {
    if (this.paused || this.age < 0.8 || !this.round.fire()) return;
    const ball = this.shapes.mesh(
      this.world,
      'Cannonball',
      [PHYSICS.ballRadius * 2, PHYSICS.ballRadius * 2, PHYSICS.ballRadius * 2],
      PHYSICS.launch,
      '#F5E6C4',
      'sphere',
    );
    // Keep transforms at unit scale for the physics sphere; visual remains a child.
    const projectile = new Node('Projectile');
    this.world.addChild(projectile);
    projectile.setPosition(...PHYSICS.launch);
    ball.setParent(projectile);
    ball.setPosition(0, 0, 0);
    const body = projectile.addComponent(RigidBody);
    body.mass = PHYSICS.ballMass;
    body.group = 4;
    body.linearDamping = 0;
    body.angularDamping = 0.05;
    projectile.addComponent(SphereCollider).radius = PHYSICS.ballRadius;
    body.setMask(7);
    body.setLinearVelocity(
      new Vec3(...shotVelocity([this.aimPoint.x, this.aimPoint.y, this.aimPoint.z])),
    );
    this.balls.push({ node: projectile, age: 0 });
    this.recoil = 1;
    this.shake = 0.06;
    this.sound('shot', 0.7);
    this.platform.haptic();
  }
  private touchStart(e: EventTouch): void {
    if (this.touchId !== null) return;
    const ui = e.getUILocation();
    if (this.hud.click(ui) || this.hud.blocksInput(ui)) return;
    this.touchId = e.getID();
    this.dragging = true;
    this.aim(e.getLocation());
  }
  private touchMove(e: EventTouch): void {
    if (e.getID() === this.touchId && this.dragging) this.aim(e.getLocation());
  }
  private touchEnd(e: EventTouch): void {
    if (e.getID() !== this.touchId) return;
    if (this.dragging) {
      this.aim(e.getLocation());
      this.shoot();
    }
    this.touchCancel();
  }
  private touchCancel(): void {
    this.dragging = false;
    this.touchId = null;
    for (const dot of this.dots) dot.active = false;
    this.hud?.reticle(null, false);
  }
  private mouseDown(e: EventMouse): void {
    if (e.getButton() !== 0 || this.touchId !== null) return;
    const ui = e.getUILocation();
    if (this.hud.click(ui) || this.hud.blocksInput(ui)) return;
    this.dragging = true;
    this.aim(e.getLocation());
  }
  private mouseMove(e: EventMouse): void {
    if (this.dragging && this.touchId === null) this.aim(e.getLocation());
  }
  private mouseUp(e: EventMouse): void {
    if (e.getButton() !== 0 || this.touchId !== null) return;
    if (this.dragging) {
      this.aim(e.getLocation());
      this.shoot();
    }
    this.touchCancel();
  }

  private burst(pos: Vec3): void {
    for (let i = 0; i < 5; i++) {
      const node = this.shapes.mesh(
        this.world,
        'Chip',
        [0.07, 0.07, 0.07],
        [pos.x, pos.y, pos.z],
        i % 2 ? COLORS.mint : COLORS.gold,
        'box',
        true,
      );
      const angle = (i * Math.PI * 2) / 5;
      this.sparks.push({
        node,
        velocity: new Vec3(Math.cos(angle) * 1.1, 1.5 + 0.2 * i, Math.sin(angle)),
        age: 0,
        duration: 0.55,
      });
    }
  }
  update(dt: number): void {
    if (this.paused || !this.round) return;
    dt = Math.min(dt, 0.05);
    this.age += dt;
    const linear = new Vec3(),
      angular = new Vec3();
    let moving = false;
    for (const target of this.targets) {
      if (target.cleared) continue;
      if (target.node.position.y < PHYSICS.clearHeight) {
        target.cleared = true;
        if (this.round.clear(target.id)) {
          this.burst(target.node.position);
          this.shake = Math.max(this.shake, 0.035);
        }
      } else {
        target.body.getLinearVelocity(linear);
        target.body.getAngularVelocity(angular);
        if (linear.length() > PHYSICS.settleSpeed || angular.length() > PHYSICS.settleAngularSpeed)
          moving = true;
      }
    }
    for (const ball of this.balls) ball.age += dt;
    this.balls = this.balls.filter((ball) => {
      if (ball.age > 5 || ball.node.position.y < -12) {
        ball.node.destroy();
        return false;
      }
      if (ball.age < PHYSICS.minimumFlightWait) moving = true;
      return true;
    });
    for (const target of this.targets)
      if (target.cleared && target.node.active && target.node.position.y < -8)
        target.node.active = false;
    const phase = this.round.phase;
    this.round.tick(dt, moving);
    if (phase !== this.round.phase && (this.round.phase === 'won' || this.round.phase === 'lost')) {
      this.touchCancel();
      if (this.round.phase === 'won') {
        this.platform.complete(LEVELS[this.levelIndex].id, this.round.shots);
        this.sound('win', 0.65);
        this.platform.haptic();
      }
      this.scheduleOnce(() => {
        if (this.round.phase === 'won' || this.round.phase === 'lost')
          this.hud.showResult(this.round, LEVELS[this.levelIndex], this.levelIndex);
      }, 0.6);
    }
    this.hud.update(
      this.round,
      this.age < 5 && this.round.shots === 0 ? LEVELS[this.levelIndex].hint : '拖动瞄准 · 松手发射',
    );
    this.recoil = Math.max(0, this.recoil - dt * 5);
    this.cannon.setPosition(
      PHYSICS.launch[0],
      PHYSICS.launch[1],
      PHYSICS.launch[2] + this.recoil * 0.15,
    );
    this.shake = Math.max(0, this.shake - dt * 0.2);
    this.camera.node.setPosition(
      this.cameraHome.x + Math.sin(this.age * 81) * this.shake,
      this.cameraHome.y + Math.cos(this.age * 67) * this.shake,
      this.cameraHome.z,
    );
    this.sparks = this.sparks.filter((spark) => {
      spark.age += dt;
      if (spark.age > spark.duration) {
        spark.node.destroy();
        return false;
      }
      spark.velocity.y -= 9.81 * dt;
      spark.node.setPosition(
        spark.node.position.clone().add(spark.velocity.clone().multiplyScalar(dt)),
      );
      const scale = 0.07 * (1 - spark.age / spark.duration);
      spark.node.setScale(scale, scale, scale);
      return true;
    });
  }
  onDestroy(): void {
    input.off(Input.EventType.TOUCH_START, this.touchStart, this);
    input.off(Input.EventType.TOUCH_MOVE, this.touchMove, this);
    input.off(Input.EventType.TOUCH_END, this.touchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.touchCancel, this);
    input.off(Input.EventType.MOUSE_DOWN, this.mouseDown, this);
    input.off(Input.EventType.MOUSE_MOVE, this.mouseMove, this);
    input.off(Input.EventType.MOUSE_UP, this.mouseUp, this);
    view.off('canvas-resize', this.resize, this);
    this.disposeVisibility?.();
    this.shapes.destroy();
  }
}
