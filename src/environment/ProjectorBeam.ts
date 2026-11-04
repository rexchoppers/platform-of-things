import * as THREE from 'three';
import { ScreenData } from '../systems/Slideshow';

const DUST_COUNT = 90;
const DUST_SIZE = 0.06;

/** A faint flickering cone of light from the lens to the screen, with dust in it. No real light, to protect FPS. */
export class ProjectorBeam {
  public readonly group = new THREE.Group();
  private readonly time = { value: 0 };
  private readonly pixelsPerUnit = { value: 1000 };

  constructor(lens: THREE.Vector3, screen: ScreenData) {
    const right = new THREE.Vector3(Math.cos(screen.yaw), 0, -Math.sin(screen.yaw));
    const centre = new THREE.Vector3().fromArray(screen.position);
    const corner = (across: number, up: number): THREE.Vector3 =>
      centre
        .clone()
        .addScaledVector(right, (across * screen.width) / 2)
        .add(new THREE.Vector3(0, (up * screen.height) / 2, 0));
    const corners = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];

    this.group.add(this.createCone(lens, corners));
    this.group.add(this.createDust(lens, corners));
  }

  private createCone(lens: THREE.Vector3, corners: THREE.Vector3[]): THREE.Mesh {
    const points: number[] = [];
    const along: number[] = [];
    corners.forEach((start, index) => {
      const end = corners[(index + 1) % corners.length];
      points.push(...lens.toArray(), ...start.toArray(), ...end.toArray());
      along.push(0, 1, 1);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));

    const cone = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { time: this.time },
        vertexShader: `
          attribute float along;
          varying float vAlong;
          void main() {
            vAlong = along;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          varying float vAlong;
          void main() {
            float flicker = 0.92 + 0.08 * sin(time * 23.0) * sin(time * 7.0);
            float strength = 0.075 * (1.0 - vAlong * 0.8) * flicker;
            gl_FragColor = vec4(vec3(1.0, 0.95, 0.82) * strength, 1.0);
          }
        `,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    cone.frustumCulled = false;
    return cone;
  }

  private createDust(lens: THREE.Vector3, corners: THREE.Vector3[]): THREE.Points {
    const positions = new Float32Array(DUST_COUNT * 3);
    const seeds = new Float32Array(DUST_COUNT * 3);
    const point = new THREE.Vector3();
    for (let i = 0; i < DUST_COUNT; i++) {
      // A random spot inside the beam, nearer the lens than the screen.
      const across = Math.random();
      const up = Math.random();
      point
        .lerpVectors(corners[0], corners[1], across)
        .lerp(new THREE.Vector3().lerpVectors(corners[3], corners[2], across), up)
        .lerp(lens, 0.3 + Math.random() * 0.65);
      positions.set(point.toArray(), i * 3);
      seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));

    const dust = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { time: this.time, pixelsPerUnit: this.pixelsPerUnit },
        vertexShader: `
          uniform float time;
          uniform float pixelsPerUnit;
          attribute vec3 seed;
          varying float vGlow;
          void main() {
            vec3 p = position;
            p.x += sin(time * (0.2 + seed.x * 0.3) + seed.y * 6.283) * 0.35;
            p.y += sin(time * (0.15 + seed.y * 0.2) + seed.z * 6.283) * 0.25;
            p.z += cos(time * (0.2 + seed.z * 0.25) + seed.x * 6.283) * 0.35;
            vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = ${DUST_SIZE.toFixed(2)} * pixelsPerUnit / -viewPosition.z;
            vGlow = 0.25 + 0.2 * sin(time * (0.5 + seed.x) + seed.y * 6.283);
          }
        `,
        fragmentShader: `
          varying float vGlow;
          void main() {
            float edge = max(1.0 - length(gl_PointCoord - 0.5) * 2.0, 0.0);
            gl_FragColor = vec4(vec3(1.0, 0.95, 0.82) * edge * edge * vGlow, 1.0);
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    dust.frustumCulled = false;
    return dust;
  }

  public update(time: number, pixelsPerUnit: number): void {
    this.time.value = time;
    this.pixelsPerUnit.value = pixelsPerUnit;
  }
}
