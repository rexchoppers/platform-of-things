import * as THREE from 'three';

interface ParticleStyle {
  count: number;
  size: number; // World units
  rise: number; // How high a particle climbs in its life
  spread: number; // Radius at the base
  speed: number; // Lives per second
  hot: THREE.Color; // Colour when young
  cool: THREE.Color; // Colour when old
}

const FLAMES: ParticleStyle = {
  count: 80,
  size: 0.8,
  rise: 1.5,
  spread: 0.5,
  speed: 1.0,
  hot: new THREE.Color(1.0, 0.8, 0.38),
  cool: new THREE.Color(1.0, 0.24, 0.04),
};

const SPARKS: ParticleStyle = {
  count: 30,
  size: 0.07,
  rise: 6.5,
  spread: 0.4,
  speed: 0.3,
  hot: new THREE.Color(1.0, 0.75, 0.35),
  cool: new THREE.Color(1.0, 0.3, 0.05),
};

const LIGHT_INTENSITY = 110; // Candela. Blender previews assume the same.
const LIGHT_RANGE = 40;

const VERTEX_SHADER = `
  uniform float time;
  uniform float size;
  uniform float rise;
  uniform float spread;
  uniform float speed;
  uniform float pixelsPerUnit;
  attribute vec3 seed;
  varying float vLife;

  void main() {
    float life = fract(time * speed * (0.75 + seed.z * 0.5) + seed.x);
    float angle = seed.y * 6.283 + life * 2.5;
    float narrowing = (1.0 - life) * (1.0 - life);
    float radius = spread * (0.1 + seed.z * 0.9) * narrowing;
    float drift = sin(time * 2.3 + seed.y * 9.0) * 0.12 * life;

    vec3 offset = vec3(cos(angle) * radius + drift, life * rise * (0.6 + seed.z * 0.7), sin(angle) * radius);
    vec4 viewPosition = modelViewMatrix * vec4(offset, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = size * (1.0 - life * 0.7) * pixelsPerUnit / -viewPosition.z;
    vLife = life;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 hot;
  uniform vec3 cool;
  varying float vLife;

  void main() {
    float edge = max(1.0 - length(gl_PointCoord - 0.5) * 2.0, 0.0);
    vec3 color = mix(hot, cool, smoothstep(0.08, 0.7, vLife));
    gl_FragColor = vec4(color * edge * edge * (1.0 - vLife) * 0.8, 1.0);
  }
`;

/** The live part of a campfire: flames, sparks, and flickering light. All motion runs on the GPU. */
export class Campfire {
  public readonly group = new THREE.Group();
  private readonly light: THREE.PointLight;
  private readonly materials: THREE.ShaderMaterial[] = [];

  constructor(position: THREE.Vector3) {
    this.group.position.copy(position);

    this.group.add(this.createParticles(FLAMES));
    this.group.add(this.createParticles(SPARKS));

    this.light = new THREE.PointLight(new THREE.Color(1.0, 0.46, 0.16), LIGHT_INTENSITY, LIGHT_RANGE, 2);
    this.light.position.y = 0.8;
    this.group.add(this.light);
  }

  private createParticles(style: ParticleStyle): THREE.Points {
    const seeds = new Float32Array(style.count * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    // Particle positions come from the shader, so nothing here describes real bounds.
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(style.count * 3), 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        size: { value: style.size },
        rise: { value: style.rise },
        spread: { value: style.spread },
        speed: { value: style.speed },
        pixelsPerUnit: { value: 1000 },
        hot: { value: style.hot },
        cool: { value: style.cool },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.materials.push(material);

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  public update(time: number, pixelsPerUnit: number): void {
    // Uneven sine waves read as a living flame instead of a pulse.
    const flicker = 0.86 + 0.08 * Math.sin(time * 9.1) + 0.04 * Math.sin(time * 23.7) + 0.02 * Math.sin(time * 41.3);
    this.light.intensity = LIGHT_INTENSITY * flicker;

    for (const material of this.materials) {
      material.uniforms.time.value = time;
      material.uniforms.pixelsPerUnit.value = pixelsPerUnit;
    }
  }
}
