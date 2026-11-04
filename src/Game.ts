import * as THREE from 'three';
import { SceneManager } from './core/SceneManager';
import { PlayerController } from './core/PlayerController';
import { Skybox } from './environment/Skybox';
import { ShootingStars } from './environment/ShootingStars';
import { WorldEntered, WorldManager } from './systems/WorldManager';
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
  private readonly interactions: Interactions;
  private isWorldReady = false;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  constructor() {
    const { scene, camera, controls } = this.sceneManager;

    this.playerController = new PlayerController(camera, controls);
    this.interactions = new Interactions(camera, this.dog, this.uiManager, this.playerController);
    this.worldManager = new WorldManager(scene, camera, this.skybox, this.uiManager, this.playerController, (entered) =>
      this.onWorldEntered(entered)
    );

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
    await this.worldManager.start('home');
    this.animate();
    this.isWorldReady = true;
    this.uiManager.setLoading(false);
  }

  private onWorldEntered({ manifest, slideshow, isFirstWorld }: WorldEntered): void {
    // Ivy starts on her bed in the first world, and comes along through tents after that.
    if (isFirstWorld) {
      this.dog.mesh.position.fromArray(manifest.dogStart);
    } else {
      const player = this.sceneManager.camera.position;
      this.dog.mesh.position.set(player.x + 2, player.y, player.z + 2);
    }
    this.interactions.setWorld(manifest, slideshow);
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
    this.interactions.update();
    this.sceneManager.render();
  };
}
