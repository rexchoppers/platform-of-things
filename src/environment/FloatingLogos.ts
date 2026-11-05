import * as THREE from 'three';
import atlasUrl from '../assets/worlds/grove/logos.webp';

/** One floating skill logo, from a Logo.* marker in the world's .blend. Positions are game [x, y, z]. */
export interface LogoData {
  position: number[];
  uv: number[];
  width: number;
  height: number;
  colour: number[];
}

const BOB_HEIGHT = 0.1;
const LOGO_BRIGHTNESS = 0.85;
const HALO_REACH = 1.1; // How far the glow extends past a logo's edge, in metres
const HALO_STRENGTH = 0.16;

// Every logo turns to face you, stays upright, and bobs. All of it runs on the GPU.
const VERTEX_SHADER = `
  uniform float time;
  attribute vec2 corner;
  attribute float phase;
  attribute vec3 tint;
  varying vec2 vUv;
  varying vec3 vTint;
  void main() {
    vec3 centre = position;
    centre.y += sin(time * 0.75 + phase) * ${BOB_HEIGHT.toFixed(2)};
    vec2 toViewer = normalize(cameraPosition.xz - centre.xz);
    vec3 world = centre + vec3(toViewer.y, 0.0, -toViewer.x) * corner.x;
    world.y += corner.y;
    vUv = uv;
    vTint = tint;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

/** The skill logos above Grove's flower beds. Two draw calls however many logos there are. */
export class FloatingLogos {
  public readonly group = new THREE.Group();
  private readonly time = { value: 0 };

  constructor(logos: LogoData[]) {
    const texture = new THREE.TextureLoader().load(atlasUrl);
    texture.colorSpace = THREE.NoColorSpace; // Drawn straight to the screen, so no conversion either way
    texture.anisotropy = 4;

    const halos = new THREE.Mesh(
      this.createQuads(logos, HALO_REACH, () => [-1, -1, 1, 1]),
      new THREE.ShaderMaterial({
        uniforms: { time: this.time },
        vertexShader: VERTEX_SHADER,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vTint;
          void main() {
            float fade = max(1.0 - length(vUv), 0.0);
            gl_FragColor = vec4(vTint * fade * fade * ${HALO_STRENGTH.toFixed(2)}, 1.0);
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );

    const images = new THREE.Mesh(
      this.createQuads(logos, 0, (logo) => logo.uv),
      new THREE.ShaderMaterial({
        uniforms: { time: this.time, atlas: { value: texture } },
        vertexShader: VERTEX_SHADER,
        fragmentShader: `
          uniform sampler2D atlas;
          varying vec2 vUv;
          void main() {
            vec4 texel = texture2D(atlas, vUv);
            if (texel.a < 0.2) discard; // What's left writes depth, so nearer logos hide further ones
            // The atlas is premultiplied, which keeps edges clean when it's filtered.
            gl_FragColor = vec4(texel.rgb / texel.a * ${LOGO_BRIGHTNESS.toFixed(2)}, texel.a);
          }
        `,
        transparent: true,
      })
    );

    // Halos first, so logos draw over the glow of the ones behind them.
    images.renderOrder = 1;
    for (const mesh of [halos, images]) {
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  /** One quad per logo. `reach` grows it past the logo's edge, and uvRect picks what it samples. */
  private createQuads(logos: LogoData[], reach: number, uvRect: (logo: LogoData) => number[]): THREE.BufferGeometry {
    const centres: number[] = [];
    const corners: number[] = [];
    const uvs: number[] = [];
    const phases: number[] = [];
    const tints: number[] = [];
    const indices: number[] = [];

    logos.forEach((logo, index) => {
      const halfWidth = logo.width / 2 + reach;
      const halfHeight = logo.height / 2 + reach;
      const [left, bottom, right, top] = uvRect(logo);
      const first = index * 4;
      corners.push(-halfWidth, -halfHeight, halfWidth, -halfHeight, halfWidth, halfHeight, -halfWidth, halfHeight);
      uvs.push(left, bottom, right, bottom, right, top, left, top);
      for (let i = 0; i < 4; i++) {
        centres.push(...logo.position);
        phases.push(index * 1.7); // Logos bob out of step with each other
        tints.push(...logo.colour);
      }
      indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(centres, 3));
    geometry.setAttribute('corner', new THREE.Float32BufferAttribute(corners, 2));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
    geometry.setAttribute('tint', new THREE.Float32BufferAttribute(tints, 3));
    geometry.setIndex(indices);
    return geometry;
  }

  public update(time: number): void {
    this.time.value = time;
  }
}
