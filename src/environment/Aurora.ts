import * as THREE from 'three';

const SEGMENTS = 72;
const ARC = 2.2; // Radians of sky the curtains span
const HEIGHT = 175;
const BRIGHTNESS = 0.3;

// How far out each curtain hangs and how tall it is, relative to the Aurora marker, and what sets it apart.
const CURTAINS = [
  { reach: 1.0, tall: 1.0, phase: 0.0 },
  { reach: 1.16, tall: 1.2, phase: 2.1 },
  { reach: 0.86, tall: 0.8, phase: 4.3 },
];

/**
 * Curtains of light in the sky, from the Aurora marker in the world's .blend: the marker sets their
 * bearing, distance, and base height. Three ribbons in one draw call, with all motion on the GPU.
 * blender/build_grove.py repeats the fragment shader's sums for its previews.
 */
export class Aurora {
  public readonly mesh: THREE.Mesh;
  private readonly time = { value: 0 };

  constructor(marker: number[]) {
    const [markerX, base, markerZ] = marker;
    const radius = Math.hypot(markerX, markerZ);
    const bearing = Math.atan2(markerX, markerZ);

    const positions: number[] = [];
    const curtainCoordinates: number[] = [];
    const phases: number[] = [];
    const indices: number[] = [];

    CURTAINS.forEach(({ reach, tall, phase }, curtain) => {
      const first = curtain * (SEGMENTS + 1) * 2;
      for (let s = 0; s <= SEGMENTS; s++) {
        const along = s / SEGMENTS;
        const angle = bearing + (along - 0.5) * ARC;
        const distance = radius * reach * (1 + 0.05 * Math.sin(along * 7 + phase));
        const x = Math.sin(angle) * distance;
        const z = Math.cos(angle) * distance;
        positions.push(x, base, z, x, base + HEIGHT * tall, z);
        curtainCoordinates.push(along, 0, along, 1);
        phases.push(phase, phase);
        if (s < SEGMENTS) {
          const a = first + s * 2;
          indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(curtainCoordinates, 2));
    geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
    geometry.setIndex(indices);

    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { time: this.time },
        vertexShader: `
          uniform float time;
          attribute float phase;
          varying vec2 vUv;
          varying float vPhase;
          void main() {
            vUv = uv;
            vPhase = phase;
            // The curtain ripples slowly, more at the top than at the bottom.
            vec3 moved = position;
            moved.xz *= 1.0 + (0.012 + 0.03 * uv.y) * sin(uv.x * 19.0 + time * 0.12 + phase);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(moved, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec2 vUv;
          varying float vPhase;
          void main() {
            float along = vUv.x;
            float up = vUv.y;
            float wander = sin(along * 9.0 + time * 0.11 + vPhase) * 2.2;
            float rays = 0.5 + 0.5 * sin(along * 70.0 + wander + time * 0.17);
            rays *= 0.62 + 0.38 * sin(along * 173.0 - wander * 1.7 - time * 0.29 + vPhase * 3.0);
            float bands = 0.5 + 0.5 * sin(along * 11.0 + time * 0.07 + vPhase * 2.0);
            bands = 0.35 + 0.65 * bands * bands;
            float fade = smoothstep(0.0, 0.09, up) * pow(1.0 - up, 1.8);
            float ends = smoothstep(0.0, 0.14, along) * (1.0 - smoothstep(0.86, 1.0, along));
            vec3 colour = mix(vec3(0.1, 1.0, 0.55), vec3(0.15, 0.7, 0.95), smoothstep(0.1, 0.8, up));
            gl_FragColor = vec4(colour * rays * bands * fade * ends * ${BRIGHTNESS.toFixed(2)}, 1.0);
          }
        `,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    this.mesh.frustumCulled = false;
  }

  public update(time: number): void {
    this.time.value = time;
  }
}
