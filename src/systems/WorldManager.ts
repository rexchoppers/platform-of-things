import * as THREE from 'three';
import { planets } from '../config/planets';
import { Campfire } from '../environment/Campfire';
import { Collisions } from '../environment/Collisions';
import { Fireflies } from '../environment/Fireflies';
import { MOON_DIRECTION, Skybox } from '../environment/Skybox';
import { Terrain } from '../environment/Terrain';
import { loadWorld, updateWorldAnimation, WorldManifest } from '../environment/WorldAssets';
import { PlayerController } from '../core/PlayerController';
import { Portals } from './Portals';
import { UIManager } from '../ui/UIManager';

const AMBIENT_INTENSITY = 0.9; // Low, so the moon does most of the lighting. Blender previews assume the same.
const MOONLIGHT_TINT = new THREE.Color(0.72, 0.8, 1.0); // Moonlight reads cool against warm firelight
const LANTERN_INTENSITY = 4; // Candela
const LANTERN_RANGE = 10;
const DESK_LAMP_INTENSITY = 1.6; // Candela. Small and short range, so it barely costs anything.
const DESK_LAMP_RANGE = 5;
const SHADOW_REACH = 75; // Half the width of the area the moon's shadow map covers

export class WorldManager {
  /** The loaded world's marker positions, or null if it failed to load. */
  public manifest: WorldManifest | null = null;
  private campfire: Campfire | null = null;
  private fireflies: Fireflies | null = null;
  private portals: Portals | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly skybox: Skybox,
    private readonly ui: UIManager,
    private readonly player: PlayerController
  ) {}

  public async load(worldId: string): Promise<void> {
    const config = planets[worldId];
    this.ui.updatePlanetInfo(config);
    this.scene.fog = new THREE.FogExp2(config.skyColor, config.fogDensity);
    this.skybox.setColors(config);

    this.scene.add(new THREE.AmbientLight(config.ambientColor, AMBIENT_INTENSITY));
    const moonlight = this.createMoonlight(config.lightColor, config.lightIntensity);
    this.scene.add(moonlight);

    // A world that fails to load leaves the sky and an open, flat ground, not a dead page.
    try {
      const world = await loadWorld(worldId);
      Terrain.setHeightfield(world.heightfield);
      Collisions.setColliders(world.manifest.colliders);
      this.scene.add(world.root);
      this.manifest = world.manifest;
      moonlight.shadow.needsUpdate = true;

      const [fireX, fireY, fireZ] = world.manifest.firePoint;
      this.campfire = new Campfire(new THREE.Vector3(fireX, fireY, fireZ));
      this.scene.add(this.campfire.group);

      this.fireflies = new Fireflies();
      this.scene.add(this.fireflies.points);

      this.portals = new Portals(world.manifest.portals, this.ui, this.player);
      this.scene.add(this.portals.group);

      for (const [x, y, z] of world.manifest.lanternLights) {
        const lantern = new THREE.PointLight(new THREE.Color(1.0, 0.62, 0.27), LANTERN_INTENSITY, LANTERN_RANGE, 2);
        lantern.position.set(x, y, z);
        this.scene.add(lantern);
      }

      const deskLamp = new THREE.PointLight(0xfff5e6, DESK_LAMP_INTENSITY, DESK_LAMP_RANGE, 2);
      deskLamp.position.fromArray(world.manifest.deskLamp);
      this.scene.add(deskLamp);

      const { x, z, facing, walkRadius } = world.manifest.spawn;
      this.player.setMaxDistance(walkRadius);
      this.player.resetPosition(x, z, facing);
    } catch (error) {
      console.error(`Failed to load world "${worldId}"`, error);
      this.player.resetPosition(0, 0, 0);
    }
  }

  private createMoonlight(color: number, intensity: number): THREE.DirectionalLight {
    const moonlight = new THREE.DirectionalLight(color, intensity);
    moonlight.color.multiply(MOONLIGHT_TINT);
    moonlight.position.copy(MOON_DIRECTION).multiplyScalar(120);
    moonlight.castShadow = true;
    moonlight.shadow.mapSize.set(2048, 2048);
    moonlight.shadow.camera.near = 1;
    moonlight.shadow.camera.far = 260;
    moonlight.shadow.camera.left = -SHADOW_REACH;
    moonlight.shadow.camera.right = SHADOW_REACH;
    moonlight.shadow.camera.top = SHADOW_REACH;
    moonlight.shadow.camera.bottom = -SHADOW_REACH;
    moonlight.shadow.bias = -0.0003;
    moonlight.shadow.normalBias = 0.03;
    // Nothing that casts a shadow moves yet, so one render of the shadow map is enough.
    moonlight.shadow.autoUpdate = false;
    return moonlight;
  }

  public update(time: number, viewportHeight: number): void {
    updateWorldAnimation(time);
    const pixelsPerUnit = viewportHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.campfire?.update(time, pixelsPerUnit);
    this.fireflies?.update(time, pixelsPerUnit);
    this.portals?.update(time, pixelsPerUnit, this.camera.position);
  }
}
