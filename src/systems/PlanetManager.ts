import * as THREE from 'three';
import { planets, portalConnections } from '../config/planets';
import { Terrain } from '../environment/Terrain';
import { Skybox } from '../environment/Skybox';
import { Portal } from '../objects/Portal';
import { Terminal } from '../objects/Terminal';
import { Decorations } from '../objects/Decorations';
import { UIManager } from '../ui/UIManager';
import { PlayerController } from '../core/PlayerController';

export class PlanetManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private skybox: Skybox;
  private uiManager: UIManager;
  private playerController: PlayerController;

  private currentPlanet = 'home';
  private currentFlatRadius = 40;

  private ground: THREE.Group | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private terminal: THREE.Group | null = null;

  private portals: THREE.Group[] = [];
  private portalLabels: THREE.Group[] = [];
  private decorations: THREE.Object3D[] = [];

  // Flat list of only the decoration nodes that actually animate, collected once
  // per planet load so the per-frame loop doesn't traverse the whole scene graph.
  private animatedNodes: { node: THREE.Object3D; decIndex: number }[] = [];

  // Animation frame skipping for performance
  private animationFrame: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    skybox: Skybox,
    uiManager: UIManager,
    playerController: PlayerController
  ) {
    this.scene = scene;
    this.camera = camera;
    this.skybox = skybox;
    this.uiManager = uiManager;
    this.playerController = playerController;
  }

  public getCurrentPlanet(): string {
    return this.currentPlanet;
  }

  public getCurrentFlatRadius(): number {
    return this.currentFlatRadius;
  }

  public getDecorations(): THREE.Object3D[] {
    return this.decorations;
  }

  // Free GPU resources (geometries, materials, textures, shadow maps) for an
  // object removed from the scene. Materials/geometries flagged
  // `userData.shared` are reused across planets and must NOT be disposed.
  private static disposeObject(root: THREE.Object3D): void {
    root.traverse((node) => {
      const geometry = (node as THREE.Mesh).geometry;
      if (geometry && !geometry.userData.shared) {
        geometry.dispose();
      }

      const material = (node as THREE.Mesh).material;
      if (material) {
        const mats = Array.isArray(material) ? material : [material];
        for (const mat of mats) {
          if (mat.userData.shared) continue;
          for (const value of Object.values(mat)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          mat.dispose();
        }
      }

      const light = node as THREE.Light & { shadow?: THREE.LightShadow };
      if (light.isLight && light.shadow?.map) {
        light.shadow.map.dispose();
      }
    });
  }

  private clearPlanet(): void {
    if (this.ground) {
      this.scene.remove(this.ground);
      PlanetManager.disposeObject(this.ground);
      this.ground = null;
    }
    if (this.terminal) {
      this.scene.remove(this.terminal);
      PlanetManager.disposeObject(this.terminal);
      this.terminal = null;
    }
    this.portals.forEach((p) => { this.scene.remove(p); PlanetManager.disposeObject(p); });
    this.portalLabels.forEach((l) => { this.scene.remove(l); PlanetManager.disposeObject(l); });
    this.decorations.forEach((d) => { this.scene.remove(d); PlanetManager.disposeObject(d); });
    this.portals.length = 0;
    this.portalLabels.length = 0;
    this.decorations.length = 0;
    this.animatedNodes.length = 0;
    this.uiManager.hideHologramPanel();
  }

  // Walk each decoration once and record the handful of nodes that animate, so
  // the per-frame loop iterates a short flat list instead of the whole tree.
  private collectAnimatedNodes(): void {
    this.animatedNodes.length = 0;
    this.decorations.forEach((dec, decIndex) => {
      dec.traverse((child) => {
        const ud = child.userData;
        if (
          ud.isLanternFlame || ud.isLanternCore || ud.isLanternLight ||
          ud.isCampfireFlame || ud.isCampfireCore || ud.isCampfireLight ||
          ud.isFireflies || ud.isProjectorLight || ud.isProjectorGlow ||
          ud.isProjectorDust || ud.isFloatingSkill || ud.isAuroraInstanced ||
          ud.isFloatingCap || ud.isConfetti || ud.isConstellationChar
        ) {
          this.animatedNodes.push({ node: child, decIndex });
        }
      });
    });
  }

  public loadPlanet(planetId: string): void {
    this.clearPlanet();
    Terrain.clearPlatforms();

    const config = planets[planetId];
    this.currentPlanet = planetId;

    // Update UI
    this.uiManager.updatePlanetInfo(config);

    // Update sky/fog
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(config.skyColor, config.fogDensity);
    this.skybox.updateColors(config);

    // Update lighting - reuse the same lights across planets so the shadow map
    // is allocated once instead of being recreated (and leaked) on every load.
    if (!this.ambientLight) {
      this.ambientLight = new THREE.AmbientLight(config.ambientColor, 0.6);
      this.scene.add(this.ambientLight);
    } else {
      this.ambientLight.color.setHex(config.ambientColor);
    }

    if (!this.directionalLight) {
      this.directionalLight = new THREE.DirectionalLight(config.lightColor, config.lightIntensity);
      this.directionalLight.position.set(50, 100, 50);
      this.directionalLight.castShadow = true;
      this.directionalLight.shadow.mapSize.width = 1024;
      this.directionalLight.shadow.mapSize.height = 1024;
      this.directionalLight.shadow.camera.near = 0.5;
      this.directionalLight.shadow.camera.far = 500;
      this.directionalLight.shadow.camera.left = -100;
      this.directionalLight.shadow.camera.right = 100;
      this.directionalLight.shadow.camera.top = 100;
      this.directionalLight.shadow.camera.bottom = -100;
      this.scene.add(this.directionalLight);
    } else {
      this.directionalLight.color.setHex(config.lightColor);
      this.directionalLight.intensity = config.lightIntensity;
    }

    // Create ground - skills planet gets larger flat area for flower beds
    this.currentFlatRadius = planetId === 'skills' ? 60 : 40;
    this.ground = Terrain.createGround(config.groundColor, this.currentFlatRadius);
    this.scene.add(this.ground);

    // Create portals
    const connections = portalConnections[planetId];
    const angleStep = (Math.PI * 2) / Math.max(connections.length, 1);

    connections.forEach((targetPlanet, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const portalDistance = planetId === 'skills' ? 40 : 18;
      const portal = Portal.create(targetPlanet, angle, portalDistance);
      this.scene.add(portal);
      this.portals.push(portal);

      // Add label above tent
      const targetConfig = planets[targetPlanet];
      const label = Portal.createLabel(targetConfig.name, targetConfig.section, targetConfig.lightColor);
      label.position.copy(portal.position);
      label.position.y = 7;
      this.scene.add(label);
      this.portalLabels.push(label);
    });

    // Create decorations
    const planetDecorations = Decorations.create(planetId);
    planetDecorations.forEach((d) => {
      this.scene.add(d);
      this.decorations.push(d);
    });
    this.collectAnimatedNodes();

    // Add hologram terminal on home planet
    if (planetId === 'home') {
      this.terminal = Terminal.create();
      this.scene.add(this.terminal);
    }

    // Reset player position
    if (planetId === 'story') {
      this.playerController.resetPosition(this.currentFlatRadius, 0, -10, Math.PI);
      this.playerController.setMaxDistance(35);
    } else if (planetId === 'skills') {
      this.playerController.resetPosition(this.currentFlatRadius, 0, -30, Math.PI);
      this.playerController.setMaxDistance(50);
    } else if (planetId === 'education') {
      this.playerController.resetPosition(this.currentFlatRadius, 0, -10, Math.PI);
      this.playerController.setMaxDistance(35);
    } else if (planetId === 'articles') {
      this.playerController.resetPosition(this.currentFlatRadius, 0, -10, Math.PI);
      this.playerController.setMaxDistance(40);
    } else {
      this.playerController.setMaxDistance(90);
      this.playerController.resetPosition(this.currentFlatRadius);
    }
  }

  public checkPortalCollision(): void {
    // Don't check during transition
    if (this.uiManager.isInTransition()) return;

    const playerPosition = this.camera.position.clone();

    for (const portal of this.portals) {
      const distance = playerPosition.distanceTo(portal.position);

      if (distance < 7) {
        const targetPlanet = portal.userData.targetPlanet;
        this.uiManager.fadeTransition(() => {
          this.loadPlanet(targetPlanet);
        });
        break;
      }
    }
  }

  public checkTerminalProximity(): void {
    if (this.terminal) {
      const distanceToTerminal = this.camera.position.distanceTo(this.terminal.position);
      if (distanceToTerminal < 5) {
        this.uiManager.showHologramPanel();
      } else {
        this.uiManager.hideHologramPanel();
      }
    }
  }

  private nearestBookshelf: THREE.Object3D | null = null;

  public checkBookshelfProximity(): { near: boolean; categoryName?: string; url?: string } {
    if (this.currentPlanet !== 'articles') {
      this.nearestBookshelf = null;
      return { near: false };
    }

    const playerPosition = this.camera.position.clone();
    let closestDistance = Infinity;
    let closestBookshelf: THREE.Object3D | null = null;

    for (const decoration of this.decorations) {
      if (decoration.userData.isBookshelf) {
        const distance = playerPosition.distanceTo(decoration.position);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestBookshelf = decoration;
        }
      }
    }

    if (closestBookshelf && closestDistance < 5) {
      this.nearestBookshelf = closestBookshelf;
      return {
        near: true,
        categoryName: closestBookshelf.userData.categoryName,
        url: closestBookshelf.userData.url,
      };
    }

    this.nearestBookshelf = null;
    return { near: false };
  }

  public interactWithBookshelf(): void {
    if (this.nearestBookshelf && this.nearestBookshelf.userData.url) {
      window.open(this.nearestBookshelf.userData.url, '_blank');
    }
  }

  public animatePortals(delta: number, time: number): void {
    this.portals.forEach((portal, index) => {
      Portal.animate(portal, delta, time, index);
    });
  }

  public animateDecorations(delta: number, time: number): void {
    this.animationFrame++;

    // Common animations for all planets (lanterns, etc.) - skip every other frame for performance
    if (this.animationFrame % 2 === 0) {
      for (const { node: child, decIndex } of this.animatedNodes) {
        {
          // Lantern flame animation (works on all planets)
          if (child.userData.isLanternFlame) {
            const flicker = Math.sin(time * 8 + decIndex) * 0.02 + Math.sin(time * 12 + decIndex * 2) * 0.01;
            child.position.y = child.userData.baseY + flicker;
            child.scale.setScalar(1 + Math.sin(time * 10 + decIndex) * 0.1);
          }
          if (child.userData.isLanternCore) {
            child.position.y = child.userData.baseY + Math.sin(time * 10 + decIndex) * 0.015;
            child.scale.setScalar(1 + Math.sin(time * 15 + decIndex) * 0.15);
          }
          if (child.userData.isLanternLight) {
            const light = child as THREE.PointLight;
            light.intensity = child.userData.baseIntensity + Math.sin(time * 6 + decIndex) * 0.3;
          }

          // Campfire flame animation
          if (child.userData.isCampfireFlame) {
            const flicker = Math.sin(time * 10) * 0.03 + Math.sin(time * 15) * 0.02 + Math.random() * 0.01;
            child.position.y = child.userData.baseY + flicker;
            child.scale.set(
              1 + Math.sin(time * 8) * 0.1,
              1 + Math.sin(time * 12) * 0.15,
              1 + Math.sin(time * 9) * 0.1
            );
          }
          if (child.userData.isCampfireCore) {
            child.position.y = child.userData.baseY + Math.sin(time * 12) * 0.02;
            child.scale.setScalar(1 + Math.sin(time * 14) * 0.12);
          }
          if (child.userData.isCampfireLight) {
            const light = child as THREE.PointLight;
            const flicker = Math.sin(time * 8) * 0.4 + Math.sin(time * 13) * 0.2 + Math.random() * 0.2;
            light.intensity = child.userData.baseIntensity + flicker;
          }

          // Fireflies animation (home planet)
          if (child instanceof THREE.Points && child.userData.isFireflies) {
            const positions = child.geometry.attributes.position.array as Float32Array;
            const phases = child.geometry.attributes.phase.array as Float32Array;
            const original = child.userData.originalPositions as Float32Array;

            for (let i = 0; i < positions.length / 3; i++) {
              const phase = phases[i];
              positions[i * 3] = original[i * 3] + Math.sin(time * 0.5 + phase) * 0.5;
              positions[i * 3 + 1] = original[i * 3 + 1] + Math.sin(time * 0.7 + phase * 2) * 0.3;
              positions[i * 3 + 2] = original[i * 3 + 2] + Math.cos(time * 0.4 + phase) * 0.5;
            }
            child.geometry.attributes.position.needsUpdate = true;
            const material = child.material as THREE.PointsMaterial;
            material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
          }

          // Projector effects (story planet)
          if (child.userData.isProjectorLight) {
            const light = child as THREE.SpotLight;
            const baseIntensity = child.userData.baseIntensity || 3;
            const flicker = Math.random() * 0.4 - 0.2;
            const pulse = Math.sin(time * 20) * 0.15;
            light.intensity = baseIntensity + flicker + pulse;
          }
          if (child.userData.isProjectorGlow) {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.8 + Math.random() * 0.2;
            mat.transparent = true;
          }
          if (child instanceof THREE.Points && child.userData.isProjectorDust) {
            const positions = child.geometry.attributes.position.array as Float32Array;
            const speeds = child.geometry.attributes.speed.array as Float32Array;
            const phases = child.geometry.attributes.phase.array as Float32Array;
            const original = child.userData.originalPositions as Float32Array;

            for (let i = 0; i < positions.length / 3; i++) {
              const speed = speeds[i];
              const phase = phases[i];
              positions[i * 3] = original[i * 3] + Math.sin(time * speed + phase) * 0.3;
              positions[i * 3 + 1] = original[i * 3 + 1] + Math.sin(time * speed * 0.7 + phase * 2) * 0.2;
              positions[i * 3 + 2] = original[i * 3 + 2] + Math.cos(time * speed * 0.5 + phase) * 0.2;
            }
            child.geometry.attributes.position.needsUpdate = true;
            const mat = child.material as THREE.PointsMaterial;
            mat.opacity = 0.3 + Math.sin(time * 3) * 0.1 + Math.random() * 0.05;
          }

          // Floating skill icons animation (skills planet)
          if (child.userData.isFloatingSkill) {
            const baseY = child.userData.baseY || 3;
            const phase = child.userData.phaseOffset || 0;
            child.position.y = baseY + Math.sin(time * 1.5 + phase) * 0.15;
          }

          // Aurora instanced mesh animation (skills planet)
          if (child.userData.isAuroraInstanced) {
            const mesh = child as THREE.InstancedMesh;
            const basePositions = child.userData.basePositions as { x: number; y: number; z: number; phase: number; scaleY: number }[];
            const dummy = child.userData.dummy as THREE.Object3D;

            for (let i = 0; i < basePositions.length; i++) {
              const { x, y, z, phase, scaleY } = basePositions[i];

              // Sway the rays like curtains in wind
              const sway = Math.sin(time * 0.4 + phase) * 2 + Math.sin(time * 0.7 + phase * 1.3) * 1;
              dummy.position.set(x + sway, y, z + Math.cos(time * 0.3 + phase) * 1.5);
              dummy.scale.set(1, scaleY, 1);
              dummy.updateMatrix();
              mesh.setMatrixAt(i, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;

            // Shimmer effect - pulse opacity on shared material
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.18 + Math.sin(time * 2) * 0.04;
          }

          // Floating graduation caps (education planet)
          if (child.userData.isFloatingCap) {
            const baseY = child.userData.baseY || 8;
            const phase = child.userData.phaseOffset || 0;
            child.position.y = baseY + Math.sin(time * 0.8 + phase) * 0.5;
            child.rotation.y += delta * 0.3;
            child.rotation.z = 0.2 + Math.sin(time * 1.2 + phase) * 0.1;
          }

          // Confetti animation (education planet)
          if (child instanceof THREE.Points && child.userData.isConfetti) {
            const positions = child.geometry.attributes.position.array as Float32Array;
            const phases = child.geometry.attributes.phase.array as Float32Array;
            const original = child.userData.originalPositions as Float32Array;

            for (let i = 0; i < positions.length / 3; i++) {
              const phase = phases[i];
              // Gentle falling and swaying motion
              const fallSpeed = 0.5 + (phase / Math.PI) * 0.3;
              let y = original[i * 3 + 1] - ((time * fallSpeed + phase) % 12);
              if (y < 0) y += 12; // Reset to top

              positions[i * 3] = original[i * 3] + Math.sin(time * 2 + phase) * 0.5;
              positions[i * 3 + 1] = y;
              positions[i * 3 + 2] = original[i * 3 + 2] + Math.cos(time * 1.5 + phase) * 0.3;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }

          // Text constellation animation (articles planet)
          if (child.userData.isConstellationChar) {
            const baseY = child.userData.baseY || 60;
            const phase = child.userData.phaseOffset || 0;
            const speed = child.userData.twinkleSpeed || 1;

            // Gentle floating motion
            child.position.y = baseY + Math.sin(time * 0.3 + phase) * 2;

            // Twinkle effect - vary opacity
            const sprite = child as THREE.Sprite;
            const mat = sprite.material as THREE.SpriteMaterial;
            const baseOpacity = child.userData.isBrightStar ? 0.7 : 0.4;
            mat.opacity = baseOpacity + Math.sin(time * speed + phase) * 0.2;
          }
        }
      }
    }
  }

  public animateTerminal(delta: number, time: number): void {
    if (this.terminal) {
      Terminal.animate(this.terminal, delta, time);
    }
  }
}
