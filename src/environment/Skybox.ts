import * as THREE from 'three';
import { PlanetConfig } from '../config/planets';
import nightSkyUrl from '../assets/sky/night_sky.webp';
import cloudsUrl from '../assets/sky/clouds.webp';
import moonUrl from '../assets/sky/moon.webp';

// Radians per second. The stars wheel around a tilted axis, about one turn in 17 minutes.
const STAR_SPIN_SPEED = 0.006;

/** Where the moon sits. The world's main light shines from the same direction. */
export const MOON_DIRECTION = new THREE.Vector3(-0.4, 0.47, -0.79).normalize();

const blackTexture = (): THREE.DataTexture => {
  const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
};

export class Skybox {
  private readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;

  constructor() {
    this.uniforms = {
      horizonColor: { value: new THREE.Color() },
      zenithColor: { value: new THREE.Color() },
      cloudColor: { value: new THREE.Color() },
      moonColor: { value: new THREE.Color() },
      moonDirection: { value: MOON_DIRECTION },
      galaxyMap: { value: blackTexture() },
      cloudMap: { value: blackTexture() },
      moonMap: { value: blackTexture() },
      time: { value: 0 },
      starSpin: { value: 0 },
    };

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(2500, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
          varying vec3 vDirection;
          void main() {
            // Measured from the camera, so the sky stays put however far the player walks.
            vDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 horizonColor;
          uniform vec3 zenithColor;
          uniform vec3 cloudColor;
          uniform vec3 moonColor;
          uniform vec3 moonDirection;
          uniform sampler2D galaxyMap;
          uniform sampler2D cloudMap;
          uniform sampler2D moonMap;
          uniform float time;
          uniform float starSpin;
          varying vec3 vDirection;

          const float PI = 3.14159265359;
          const float MOON_RADIUS = 0.052; // Radians. Larger than life, so its face can be seen
          const float MOON_BRIGHTNESS = 0.68;
          const mat3 STAR_TILT = mat3(
            1.0, 0.0, 0.0,
            0.0, 0.8253, 0.5646,
            0.0, -0.5646, 0.8253
          );

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }

          float hash13(vec3 p) {
            p = fract(p * 0.1031);
            p += dot(p, p.zyx + 31.32);
            return fract((p.x + p.y) * p.z);
          }

          vec3 hash33(vec3 p) {
            p = fract(p * vec3(0.1031, 0.1030, 0.0973));
            p += dot(p, p.yxz + 33.33);
            return fract((p.xxy + p.yxx) * p.zyx);
          }

          // One layer of soft stars. Each grid cell may hold one star, kept far enough
          // from the cell's walls that its glow never gets cut off.
          vec3 starLayer(vec3 d, float scale, float density, float radius, float level, float halo) {
            vec3 p = d * scale;
            vec3 cell = floor(p);
            if (hash13(cell) > density) return vec3(0.0);

            vec3 rand = hash33(cell + 7.0);
            float reach = radius * (halo > 0.0 ? 3.0 : 1.0);
            vec3 star = 0.5 + (rand - 0.5) * (1.0 - 2.0 * reach);
            float dist = length(fract(p) - star);

            float core = 1.0 - smoothstep(0.0, radius, dist);
            float glow = halo * pow(1.0 - smoothstep(0.0, reach, dist), 3.0);
            float strength = level * (0.25 + 0.75 * rand.x * rand.x) * (core * core + glow);
            float twinkle = 0.8 + 0.2 * sin(time * (0.7 + rand.y * 1.8) + rand.z * 6.283);
            vec3 tint = mix(vec3(0.8, 0.88, 1.0), vec3(1.0, 0.92, 0.8), rand.y);
            return tint * strength * twinkle;
          }

          vec3 spinningSky(vec3 dir) {
            vec3 d = STAR_TILT * dir;
            float s = sin(starSpin);
            float c = cos(starSpin);
            d = vec3(c * d.x + s * d.z, d.y, -s * d.x + c * d.z);

            // Galaxy glow baked in Blender. It also packs more stars into its band.
            vec2 uv = vec2(atan(d.x, -d.z) / (2.0 * PI) + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5);
            vec3 galaxy = texture2D(galaxyMap, uv).rgb;
            float band = clamp(galaxy.b * 22.0, 0.0, 1.0);

            vec3 sky = galaxy;
            sky += starLayer(d, 170.0, 0.03 + 0.05 * band, 0.3, 0.42, 0.0);
            sky += starLayer(d + 3.0, 80.0, 0.024, 0.2, 0.9, 0.0);
            sky += starLayer(d + 5.0, 28.0, 0.11, 0.1, 2.0, 0.09);
            return sky;
          }

          void main() {
            vec3 dir = normalize(vDirection);
            float up = max(dir.y, 0.0);

            // World colours. The horizon matches the fog so the land melts into the sky.
            vec3 color = mix(horizonColor, zenithColor, pow(up, 0.55));

            color += spinningSky(dir) * smoothstep(0.0, 0.12, dir.y);

            // The moon, drawn as a small disc in the sky with a clean edge. Stars don't show through it.
            float toMoon = dot(dir, moonDirection);
            vec3 moonRight = normalize(cross(moonDirection, vec3(0.0, 1.0, 0.0)));
            vec3 moonUp = cross(moonRight, moonDirection);
            vec2 onMoon = vec2(dot(dir, moonRight), dot(dir, moonUp)) / MOON_RADIUS;
            float moonEdge = length(onMoon);
            float moonMask = (1.0 - smoothstep(1.0 - fwidth(moonEdge) * 1.5, 1.0, moonEdge)) * step(0.0, toMoon);
            float limb = 0.74 + 0.26 * pow(sqrt(max(1.0 - moonEdge * moonEdge, 0.0)), 0.6);
            vec3 moonFace = texture2D(moonMap, onMoon * 0.5 + 0.5).rgb * limb * MOON_BRIGHTNESS;
            color = mix(color, moonColor * moonFace, moonMask);

            float aura = max(toMoon, 0.0);
            color += moonColor * (pow(aura, 260.0) * 0.06 + pow(aura, 40.0) * 0.012) * (1.0 - moonMask);

            // Two noise layers sliding past each other, so clouds drift and change shape.
            vec2 skyPlane = dir.xz / (up + 0.24);
            float large = texture2D(cloudMap, skyPlane * 0.1 + time * vec2(0.0030, 0.0012)).r;
            float small = texture2D(cloudMap, skyPlane * 0.23 - time * vec2(0.0018, 0.0034)).g;
            float cover = smoothstep(0.54, 0.84, large * 0.74 + small * 0.32);
            cover *= smoothstep(0.03, 0.26, dir.y) * 0.62;
            vec3 litCloud = cloudColor + moonColor * (0.0035 + 0.06 * pow(aura, 12.0));
            color = mix(color, litCloud, cover);

            // A touch of noise hides banding in the dark gradient.
            color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }
        `,
      })
    );
    this.mesh.renderOrder = -1;

    this.loadTextures();
  }

  private loadTextures(): void {
    const loader = new THREE.TextureLoader();
    loader.load(nightSkyUrl, (texture) => {
      // Mipmaps would draw a seam where the longitude wraps.
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      this.uniforms.galaxyMap.value = texture;
    });
    loader.load(cloudsUrl, (texture) => {
      texture.colorSpace = THREE.NoColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      this.uniforms.cloudMap.value = texture;
    });
    loader.load(moonUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      this.uniforms.moonMap.value = texture;
    });
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public update(delta: number, time: number): void {
    this.uniforms.time.value = time;
    this.uniforms.starSpin.value += delta * STAR_SPIN_SPEED;
  }

  public setColors(config: PlanetConfig): void {
    const sky = new THREE.Color(config.skyColor);
    const light = new THREE.Color(config.lightColor);
    this.uniforms.horizonColor.value.copy(sky);
    this.uniforms.zenithColor.value.copy(sky).multiplyScalar(0.14);
    this.uniforms.cloudColor.value.copy(sky).multiplyScalar(0.8);
    this.uniforms.moonColor.value.copy(light);
  }
}
