import * as THREE from 'three';
import { SceneManager } from './core/SceneManager';
import { PlayerController } from './core/PlayerController';
import { Skybox } from './environment/Skybox';
import { ShootingStars } from './environment/ShootingStars';
import { WorldManager } from './systems/WorldManager';
import { Interactions } from './systems/Interactions';
import { Dog } from './objects/Dog';
import { MusicSystem } from './systems/MusicSystem';
import { UIManager } from './ui/UIManager';

export class Game {
  private readonly sceneManager = new SceneManager();
  private readonly uiManager = new UIManager();
  private readonly musicSystem = new MusicSystem();
  private readonly clock = new THREE.Clock();
  private readonly skybox = new Skybox();
  private readonly shootingStars = new ShootingStars();
  private readonly dog = new Dog('Ivy');
  private readonly playerController: PlayerController;
  private readonly worldManager: WorldManager;
  private readonly fpsCounter: HTMLDivElement;
  private interactions: Interactions | null = null;
  private isWorldReady = false;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  constructor() {
    const { scene, camera, controls } = this.sceneManager;

    this.playerController = new PlayerController(camera, controls);
    this.worldManager = new WorldManager(scene, camera, this.skybox, this.uiManager, this.playerController);

    scene.add(this.skybox.getMesh());
    scene.add(this.shootingStars.group);
    scene.add(this.dog.mesh);

    this.uiManager.instructions.addEventListener('click', () => {
      if (!this.isWorldReady) return;
      controls.lock();
      this.musicSystem.start();
    });
    controls.addEventListener('lock', () => this.uiManager.setPaused(false));
    controls.addEventListener('unlock', () => this.uiManager.setPaused(true));

    // Press F to show the FPS counter.
    this.fpsCounter = document.createElement('div');
    this.fpsCounter.style.cssText =
      'position:fixed;top:10px;right:10px;color:#0f0;font:bold 16px monospace;background:rgba(0,0,0,0.7);padding:5px 10px;z-index:9999;border-radius:4px;display:none;';
    document.body.appendChild(this.fpsCounter);
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyF') {
        this.fpsCounter.style.display = this.fpsCounter.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  public async start(): Promise<void> {
    this.uiManager.setLoading(true);
    await this.worldManager.load('home');

    const manifest = this.worldManager.manifest;
    if (manifest) {
      const position = (point: number[]) => new THREE.Vector3(point[0], point[1], point[2]);
      this.dog.mesh.position.copy(position(manifest.dogStart));
      this.interactions = new Interactions(
        this.sceneManager.camera,
        this.dog,
        this.uiManager,
        this.playerController,
        position(manifest.creditsSign),
        position(manifest.firePoint)
      );
    }

    this.animate();
    this.isWorldReady = true;
    this.uiManager.setLoading(false);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // Capped so a long frame can't carry the player straight through something.
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.frameCount++;
    if (time - this.lastFpsUpdate >= 0.5) {
      this.fpsCounter.textContent = `FPS: ${Math.round(this.frameCount / (time - this.lastFpsUpdate))}`;
      this.frameCount = 0;
      this.lastFpsUpdate = time;
    }

    this.skybox.update(delta, time);
    this.shootingStars.update(delta);
    this.worldManager.update(time, this.sceneManager.renderer.domElement.height);
    this.playerController.update(delta);
    this.dog.update(delta, this.sceneManager.camera.position);
    this.interactions?.update();
    this.sceneManager.render();
  };
}
