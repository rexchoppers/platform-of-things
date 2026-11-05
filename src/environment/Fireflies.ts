import * as THREE from 'three';
import { Terrain } from './Terrain';

const COUNT = 60;
const SIZE = 0.16;
const INNER_RADIUS = 6;
const OUTER_RADIUS = 34;

/** Soft lights drifting around the clearing. All motion runs on the GPU. */
export class Fireflies {
  public readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = INNER_RADIUS + Math.random() * (OUTER_RADIUS - INNER_RADIUS);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.set([x, Terrain.getHeight(x, z) + 0.5 + Math.random() * 2.5, z], i * 3);
      seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelsPerUnit: { value: 1000 },
      },
      vertexShader: `
        uniform float time;
        uniform float pixelsPerUnit;
        attribute vec3 seed;
        varying float vGlow;

        void main() {
          vec3 p = position;
          p.x += sin(time * 0.5 + seed.x * 6.283) * 0.9 + sin(time * 0.23 + seed.y * 6.283) * 0.6;
          p.y += sin(time * 0.7 + seed.y * 6.283) * 0.35;
          p.z += cos(time * 0.4 + seed.z * 6.283) * 0.9;

          vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = ${SIZE.toFixed(2)} * pixelsPerUnit / -viewPosition.z;

          vGlow = smoothstep(-0.2, 0.9, sin(time * (0.8 + seed.x * 1.2) + seed.z * 6.283));
        }
      `,
      fragmentShader: `
        varying float vGlow;

        void main() {
          float edge = max(1.0 - length(gl_PointCoord - 0.5) * 2.0, 0.0);
          gl_FragColor = vec4(vec3(0.67, 1.0, 0.27) * edge * edge * vGlow, 1.0);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  public update(time: number, pixelsPerUnit: number): void {
    this.material.uniforms.time.value = time;
    this.material.uniforms.pixelsPerUnit.value = pixelsPerUnit;
  }
}
