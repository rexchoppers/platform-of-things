import * as THREE from 'three';
import { planets } from '../config/planets';

/** A portal tent's door, from a marker in the world's .blend. Its front faces (sin yaw, cos yaw). */
export interface PortalData {
  world: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

const TRIGGER_RADIUS = 1.5;

const DOOR_WIDTH = 3;
const DOOR_HEIGHT = 3.6;
const DOOR_INSET = 0.5;
const LABEL_HEIGHT = 5.8;
const MOTE_COUNT = 26;
const MOTE_SIZE = 0.13;

const LABEL_FONT = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";

/** Glow, motes, and a name for each portal tent. No real lights, to protect FPS. */
export class Portals {
  public readonly group = new THREE.Group();
  private readonly time = { value: 0 };
  private readonly pixelsPerUnit = { value: 1000 };

  constructor(private readonly portals: PortalData[]) {
    for (const portal of portals) {
      const tent = new THREE.Group();
      tent.position.set(portal.x, portal.y, portal.z);
      tent.rotation.y = portal.yaw;

      const colour = new THREE.Color(planets[portal.world].lightColor);
      tent.add(this.createDoorGlow(colour));
      tent.add(this.createGroundGlow(colour));
      tent.add(this.createMotes(colour));
      tent.add(this.createLabel(portal.world));
      this.group.add(tent);
    }
  }

  private createDoorGlow(colour: THREE.Color): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-DOOR_WIDTH / 2, 0, 0, DOOR_WIDTH / 2, 0, 0, 0, DOOR_HEIGHT, 0]), 3)
    );
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2));

    const door = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { colour: { value: colour }, time: this.time },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 colour;
          uniform float time;
          varying vec2 vUv;

          void main() {
            // 1 along the door's centre line, 0 at its slanted edges.
            float toEdge = 1.0 - abs(vUv.x * 2.0 - 1.0) / max(1.0 - vUv.y, 0.001);
            float ripple = 0.5 + 0.5 * sin(vUv.y * 9.0 - time * 1.4 + sin(vUv.x * 6.0 + time * 0.7) * 1.5);
            float glow = smoothstep(0.0, 0.4, toEdge) * (0.4 + 0.4 * ripple) * (1.0 - vUv.y * 0.35);
            gl_FragColor = vec4(colour * glow, 1.0);
            #include <colorspace_fragment>
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    door.position.z = -DOOR_INSET;
    return door;
  }

  private createGroundGlow(colour: THREE.Color): THREE.Mesh {
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.ShaderMaterial({
        uniforms: { colour: { value: colour }, time: this.time },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 colour;
          uniform float time;
          varying vec2 vUv;

          void main() {
            float fade = 1.0 - smoothstep(0.0, 1.0, length(vUv - 0.5) * 2.0);
            float pulse = 0.85 + 0.15 * sin(time * 1.1);
            gl_FragColor = vec4(colour * fade * fade * 0.3 * pulse, 1.0);
            #include <colorspace_fragment>
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.07, 1.1);
    glow.scale.set(3.2, 2.8, 1);
    return glow;
  }

  private createMotes(colour: THREE.Color): THREE.Points {
    const seeds = new Float32Array(MOTE_COUNT * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTE_COUNT * 3), 3));

    const motes = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { colour: { value: colour }, time: this.time, pixelsPerUnit: this.pixelsPerUnit },
        vertexShader: `
          uniform float time;
          uniform float pixelsPerUnit;
          attribute vec3 seed;
          varying float vFade;

          void main() {
            float life = fract(time * (0.08 + seed.z * 0.1) + seed.y);
            vec3 p = vec3(
              (seed.x - 0.5) * 3.0 * (1.0 - life * 0.6) + sin(time * 0.6 + seed.y * 6.283) * 0.12,
              life * 3.6,
              0.2 + seed.z * 1.6 + cos(time * 0.5 + seed.x * 6.283) * 0.12
            );
            vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = ${MOTE_SIZE.toFixed(2)} * pixelsPerUnit / -viewPosition.z;
            vFade = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.6, 1.0, life));
          }
        `,
        fragmentShader: `
          uniform vec3 colour;
          varying float vFade;

          void main() {
            float edge = max(1.0 - length(gl_PointCoord - 0.5) * 2.0, 0.0);
            gl_FragColor = vec4(colour * edge * edge * vFade, 1.0);
            #include <colorspace_fragment>
          }
        `,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    motes.frustumCulled = false;
    return motes;
  }

  private createLabel(world: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 220;
    const context = canvas.getContext('2d')!;
    context.textAlign = 'center';
    context.shadowColor = 'rgba(0, 0, 0, 0.9)';
    context.shadowBlur = 12;
    context.fillStyle = '#f0e8d6';
    context.font = `92px ${LABEL_FONT}`;
    context.fillText(planets[world].name, 320, 110);
    context.fillStyle = '#f2c283';
    context.font = `italic 46px ${LABEL_FONT}`;
    context.fillText(planets[world].section, 320, 176);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false }));
    label.scale.set(4.4, 4.4 * (canvas.height / canvas.width), 1);
    label.position.y = LABEL_HEIGHT;
    return label;
  }

  public update(time: number, pixelsPerUnit: number): void {
    this.time.value = time;
    this.pixelsPerUnit.value = pixelsPerUnit;
  }

  /** The tent whose door the player has walked into, if any. */
  public findEntered(playerPosition: THREE.Vector3): PortalData | null {
    for (const portal of this.portals) {
      if (Math.hypot(playerPosition.x - portal.x, playerPosition.z - portal.z) < TRIGGER_RADIUS) return portal;
    }
    return null;
  }
}
