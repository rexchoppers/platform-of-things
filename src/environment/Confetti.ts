import * as THREE from 'three';

const COUNT = 110;
const SIZE = 0.11;
const WIDTH = 25;
const DEPTH = 10;
const FALL_HEIGHT = 11;
// As the screen shows them, because the shader writes colours straight to it. Muted, because it's night.
const COLOURS = [
  [0.72, 0.58, 0.2], // Gold
  [0.72, 0.68, 0.6], // Cream
  [0.42, 0.3, 0.62], // The banners' purple
  [0.75, 0.45, 0.13], // The banners' orange
  [0.25, 0.42, 0.7], // The banners' blue
  [0.6, 0.16, 0.16], // The carpet's red
];

/** Paper slowly falling over Haven's stage and turning as it goes. All motion runs on the GPU. */
export class Confetti {
  public readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;

  /** `bottom` is the middle of the lowest level the paper reaches, from the Confetti marker in the .blend. */
  constructor(bottom: number[]) {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3);
    const tints = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions.set(
        [bottom[0] + (Math.random() - 0.5) * WIDTH, bottom[1], bottom[2] + (Math.random() - 0.5) * DEPTH],
        i * 3
      );
      seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
      tints.set(COLOURS[i % COLOURS.length], i * 3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute('tint', new THREE.BufferAttribute(tints, 3));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelsPerUnit: { value: 1000 },
      },
      vertexShader: `
        uniform float time;
        uniform float pixelsPerUnit;
        attribute vec3 seed;
        attribute vec3 tint;
        varying vec3 vTint;
        varying float vTurn;

        void main() {
          vec3 p = position;
          float fallen = seed.x * ${FALL_HEIGHT.toFixed(1)} - time * (0.28 + seed.y * 0.3);
          p.y += mod(fallen, ${FALL_HEIGHT.toFixed(1)});
          p.x += sin(time * 0.5 + seed.y * 6.283) * 0.5;
          p.z += cos(time * 0.37 + seed.z * 6.283) * 0.5;

          vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = ${SIZE.toFixed(2)} * pixelsPerUnit / -viewPosition.z;

          vTint = tint;
          vTurn = abs(cos(time * (1.4 + seed.z * 2.2) + seed.x * 6.283));
        }
      `,
      fragmentShader: `
        varying vec3 vTint;
        varying float vTurn;

        void main() {
          // A turning square of paper looks thinner, and catches less light, as it goes edge-on.
          if (abs(gl_PointCoord.y - 0.5) > 0.08 + vTurn * 0.42) discard;
          gl_FragColor = vec4(vTint * (0.4 + 0.6 * vTurn), 1.0);
        }
      `,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  public update(time: number, pixelsPerUnit: number): void {
    this.material.uniforms.time.value = time;
    this.material.uniforms.pixelsPerUnit.value = pixelsPerUnit;
  }
}
