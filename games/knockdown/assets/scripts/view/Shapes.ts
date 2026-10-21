import { Color, Material, Mesh, MeshRenderer, Node, primitives, utils } from 'cc';
import { BlockSpec } from '../core/levels';

export const COLORS = {
  wood: '#E9C393',
  mint: '#66DAC5',
  coral: '#F17D66',
  gold: '#E6AD53',
  ink: '#173744',
  navy: '#102630',
  white: '#F5F1E5',
  muted: '#91AFB4',
};
export const color = (hex: string): Color => new Color().fromHEX(hex);

export class Shapes {
  private materials = new Map<string, Material>();
  private boxMesh = utils.createMesh(primitives.box());
  private sphereMesh = utils.createMesh(primitives.sphere(0.5, { segments: 16 }));
  private cylinderMesh = utils.createMesh(primitives.cylinder(0.5, 0.5, 1, { radialSegments: 32 }));
  material(hex: string, unlit = false): Material {
    const key = hex + unlit;
    let mat = this.materials.get(key);
    if (!mat) {
      mat = new Material();
      mat.initialize({ effectName: unlit ? 'builtin-unlit' : 'builtin-standard' });
      mat.setProperty(unlit ? 'mainColor' : 'albedo', color(hex));
      if (!unlit) {
        mat.setProperty('roughness', 0.78);
        mat.setProperty('metallic', 0.05);
      }
      this.materials.set(key, mat);
    }
    return mat;
  }
  mesh(
    parent: Node,
    name: string,
    size: readonly number[],
    pos: readonly number[],
    hex: string,
    shape: 'box' | 'sphere' | 'cylinder' = 'box',
    unlit = false,
  ): Node {
    const node = new Node(name);
    parent.addChild(node);
    node.setPosition(pos[0], pos[1], pos[2]);
    node.setScale(size[0], size[1], size[2]);
    const render = node.addComponent(MeshRenderer);
    render.mesh =
      shape === 'box' ? this.boxMesh : shape === 'sphere' ? this.sphereMesh : this.cylinderMesh;
    render.setMaterial(this.material(hex, unlit), 0);
    render.shadowCastingMode = MeshRenderer.ShadowCastingMode.ON;
    render.receiveShadow = 1;
    return node;
  }
  block(parent: Node, spec: BlockSpec): Node {
    const node = new Node(spec.id);
    parent.addChild(node);
    node.setPosition(...spec.position);
    this.mesh(node, 'Body', spec.size, [0, 0, 0], COLORS[spec.kind]);
    // Recessed-looking front inlay: restrained detail, still legible during a collapse.
    const [w, h, d] = spec.size;
    if (spec.kind !== 'gold') {
      this.mesh(
        node,
        'Inset',
        [w * 0.77, h * 0.77, 0.014],
        [0, 0, d / 2 + 0.009],
        spec.kind === 'wood' ? '#C89865' : spec.kind === 'mint' ? '#3BA995' : '#CB5D4B',
      );
      this.mesh(node, 'Face', [w * 0.68, h * 0.68, 0.018], [0, 0, d / 2 + 0.02], COLORS[spec.kind]);
      if (spec.kind === 'wood')
        this.mesh(
          node,
          'Grain',
          [w * 0.43, 0.018, 0.006],
          [0, -h * 0.15, d / 2 + 0.033],
          '#D7AB77',
        );
    } else {
      this.mesh(node, 'Trim', [w * 0.92, 0.035, 0.015], [0, h * 0.25, d / 2 + 0.01], '#FFE0A0');
    }
    for (const child of node.children) {
      if (child.name === 'Body') continue;
      const render = child.getComponent(MeshRenderer)!;
      render.shadowCastingMode = MeshRenderer.ShadowCastingMode.OFF;
      render.receiveShadow = 0;
    }
    return node;
  }
  destroy(): void {
    for (const mat of this.materials.values()) mat.destroy();
    for (const mesh of [this.boxMesh, this.sphereMesh, this.cylinderMesh]) mesh.destroy();
  }
}
