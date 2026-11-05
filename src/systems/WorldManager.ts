import * as THREE from 'three';
import { planets } from '../config/planets';
import { Aurora } from '../environment/Aurora';
import { Campfire } from '../environment/Campfire';
import { Collisions } from '../environment/Collisions';
import { Confetti } from '../environment/Confetti';
import { Fireflies } from '../environment/Fireflies';
import { FloatingLogos } from '../environment/FloatingLogos';
import { ProjectorBeam } from '../environment/ProjectorBeam';
import { MOON_DIRECTION, Skybox } from '../environment/Skybox';
import { Terrain } from '../environment/Terrain';
import { hasWorld, loadWorld, preloadWorlds, updateWorldAnimation, WorldManifest } from '../environment/WorldAssets';
import { PlayerController } from '../core/PlayerController';
import { PortalData, Portals } from './Portals';
import { Slideshow } from './Slideshow';
import { UIManager } from '../ui/UIManager';

const AMBIENT_INTENSITY = 0.9; // Low, so the moon does most of the lighting. Blender previews assume the same.
const MOONLIGHT_TINT = new THREE.Color(0.72, 0.8, 1.0); // Moonlight reads cool against warm firelight
const SHADOW_REACH = 75; // Half the width of the area the moon's shadow map covers

const RETURN_DISTANCE = 4.5; // How far in front of a tent's door you stand when you leave it
const FADE_MS = 450;
const HOLD_MS = 500;
const UNBUILT_HOLD_MS = 1700;

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

export interface WorldEntered {
  manifest: WorldManifest;
  slideshow: Slideshow | null;
  isFirstWorld: boolean;
}

/** Everything in one world that lives in the scene. Kept after leaving, so coming back is instant. */
interface Stage {
  id: string;
  manifest: WorldManifest;
  group: THREE.Group;
  portals: Portals;
  slideshow: Slideshow | null;
  update: (time: number, pixelsPerUnit: number) => void;
}

export class WorldManager {
  private readonly stages = new Map<string, Stage>();
  private readonly ambient = new THREE.AmbientLight();
  private readonly moonlight = this.createMoonlight();
  private current: Stage | null = null;
  private isTraveling = false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly skybox: Skybox,
    private readonly ui: UIManager,
    private readonly player: PlayerController,
    private readonly onEntered: (entered: WorldEntered) => void
  ) {
    this.ambient.intensity = AMBIENT_INTENSITY;
    scene.add(this.ambient, this.moonlight);
  }

  /** Enters the first world, then fetches the others in the background so tents open quickly. */
  public async start(worldId: string): Promise<void> {
    try {
      await this.enter(worldId, null);
    } catch (error) {
      // A world that fails to load leaves the sky and an open, flat ground, not a dead page.
      console.error(`Failed to load world "${worldId}"`, error);
      this.applyLook(worldId);
      this.player.resetPosition(0, 0, 0);
    }
    preloadWorlds();
  }

  private applyLook(worldId: string): void {
    const config = planets[worldId];
    this.ui.updatePlanetInfo(config);
    this.scene.fog = new THREE.FogExp2(config.skyColor, config.fogDensity);
    this.skybox.setColors(config);
    this.ambient.color.setHex(config.ambientColor);
    this.moonlight.color.setHex(config.lightColor).multiply(MOONLIGHT_TINT);
    this.moonlight.intensity = config.lightIntensity;
  }

  private async enter(worldId: string, fromWorld: string | null): Promise<void> {
    const world = await loadWorld(worldId);
    const { manifest } = world;

    // Ground comes first, because effects built below read its height.
    Terrain.setHeightfield(world.heightfield);
    Collisions.setColliders(manifest.colliders);

    let stage = this.stages.get(worldId);
    if (!stage) {
      stage = this.buildStage(worldId, world.root, manifest);
      this.stages.set(worldId, stage);
    }

    this.current?.slideshow?.setActive(false);
    if (this.current) this.scene.remove(this.current.group);
    this.scene.add(stage.group);
    this.current = stage;
    stage.slideshow?.setActive(true);

    this.applyLook(worldId);
    this.moonlight.shadow.needsUpdate = true;

    // Arrive outside the tent you came through, or at the spawn point.
    const door = manifest.portals.find((portal) => portal.world === fromWorld);
    this.player.setMaxDistance(manifest.spawn.walkRadius);
    if (door) this.placeOutside(door);
    else this.player.resetPosition(manifest.spawn.x, manifest.spawn.z, manifest.spawn.facing);

    this.onEntered({ manifest, slideshow: stage.slideshow, isFirstWorld: fromWorld === null });
  }

  private placeOutside(door: PortalData): void {
    const outX = Math.sin(door.yaw);
    const outZ = Math.cos(door.yaw);
    this.player.resetPosition(door.x + outX * RETURN_DISTANCE, door.z + outZ * RETURN_DISTANCE, door.yaw + Math.PI);
  }

  private buildStage(id: string, root: THREE.Group, manifest: WorldManifest): Stage {
    const group = new THREE.Group();
    group.add(root);

    const fireflies = new Fireflies();
    group.add(fireflies.points);

    const portals = new Portals(manifest.portals);
    group.add(portals.group);

    for (const light of manifest.pointLights) {
      const colour = new THREE.Color(light.colour[0], light.colour[1], light.colour[2]);
      const pointLight = new THREE.PointLight(colour, light.candela, light.range, 2);
      pointLight.position.fromArray(light.position);
      group.add(pointLight);
    }

    const campfires: Campfire[] = manifest.campfires.map(
      ({ position, size }) => new Campfire(new THREE.Vector3().fromArray(position), size)
    );
    if (manifest.firePoint) campfires.push(new Campfire(new THREE.Vector3().fromArray(manifest.firePoint)));
    for (const campfire of campfires) group.add(campfire.group);

    let slideshow: Slideshow | null = null;
    let beam: ProjectorBeam | null = null;
    if (manifest.screen) {
      slideshow = new Slideshow(manifest.screen);
      group.add(slideshow.mesh);
      if (manifest.projector) {
        beam = new ProjectorBeam(new THREE.Vector3().fromArray(manifest.projector), manifest.screen);
        group.add(beam.group);
      }
    }

    const aurora = manifest.aurora ? new Aurora(manifest.aurora) : null;
    if (aurora) group.add(aurora.mesh);

    const logos = manifest.logos?.length ? new FloatingLogos(manifest.logos) : null;
    if (logos) group.add(logos.group);

    const confetti = manifest.confetti ? new Confetti(manifest.confetti) : null;
    if (confetti) group.add(confetti.points);

    return {
      id,
      manifest,
      group,
      portals,
      slideshow,
      update: (time, pixelsPerUnit) => {
        fireflies.update(time, pixelsPerUnit);
        portals.update(time, pixelsPerUnit);
        for (const campfire of campfires) campfire.update(time, pixelsPerUnit);
        beam?.update(time, pixelsPerUnit);
        aurora?.update(time);
        logos?.update(time);
        confetti?.update(time, pixelsPerUnit);
      },
    };
  }

  private async travel(portal: PortalData): Promise<void> {
    if (!this.current) return;
    const leaving = this.current;
    this.isTraveling = true;
    this.player.setFrozen(true);

    const canEnter = hasWorld(portal.world);
    this.ui.showPortalMessage(planets[portal.world].name, canEnter ? '' : 'Still being built');
    await wait(FADE_MS);

    if (canEnter) {
      try {
        await this.enter(portal.world, leaving.id);
      } catch (error) {
        console.error(`Failed to load world "${portal.world}"`, error);
        this.placeOutside(portal);
      }
    } else {
      this.placeOutside(portal);
    }

    await wait(canEnter ? HOLD_MS : UNBUILT_HOLD_MS);
    this.ui.hidePortalMessage();
    await wait(FADE_MS);
    this.player.setFrozen(false);
    this.isTraveling = false;
  }

  private createMoonlight(): THREE.DirectionalLight {
    const moonlight = new THREE.DirectionalLight();
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
    // Nothing that casts a shadow moves, so the map is drawn once per world.
    moonlight.shadow.autoUpdate = false;
    return moonlight;
  }

  public update(time: number, viewportHeight: number): void {
    updateWorldAnimation(time);
    if (!this.current) return;

    const pixelsPerUnit = viewportHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.current.update(time, pixelsPerUnit);

    if (!this.isTraveling) {
      const portal = this.current.portals.findEntered(this.camera.position);
      if (portal) void this.travel(portal);
    }
  }
}
