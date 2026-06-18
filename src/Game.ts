import * as THREE from 'three';
import { SceneManager } from './core/SceneManager';
import { PlayerController } from './core/PlayerController';
import { SkyEnvironment } from './environment/SkyEnvironment';
import { Skybox } from './environment/Skybox';
import { ShootingStars } from './environment/ShootingStars';
import { PlanetManager } from './systems/PlanetManager';
import { MusicSystem } from './systems/MusicSystem';
import { UIManager } from './ui/UIManager';
import { Dog } from './objects/Dog';
import { SlideRenderer, SlideContent } from './systems/SlideRenderer';

// Slide images - add your images to src/assets/ and import them here
import childhoodImage from './assets/childhood.png';
import javaImage from './assets/java.svg';
import image2014 from './assets/2014.jpg';
import image2016 from './assets/2016.png';
import image2017 from './assets/2017.jpeg';
import image2019 from './assets/2019.jpg';
import image2020 from './assets/2020.svg';
import image2022 from './assets/2022.jpg';
import image2025 from './assets/2025.jpeg';

export class Game {
  private sceneManager: SceneManager;
  private playerController: PlayerController;
  private skyEnvironment: SkyEnvironment;
  private skybox: Skybox;
  private shootingStars: ShootingStars;
  private planetManager: PlanetManager;
  private musicSystem: MusicSystem;
  private uiManager: UIManager;
  private clock: THREE.Clock;
  private dog: Dog;

  // Dog interaction state
  private isNearDog: boolean = false;
  private dogInteractionDistance: number = 3;
  private isShowingDogQuote: boolean = false;

  // Credits sign interaction state
  private isNearCreditsSign: boolean = false;
  private creditsSignPosition = { x: 8, z: 0 };
  private creditsSignInteractionDistance: number = 3;

  // FPS counter
  private fpsCounter: HTMLDivElement;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  // Slideshow state
  private isNearScreen: boolean = false;
  private screenInteractionDistance: number = 20;
  private screenPosition = { x: 15, z: 0 }; // Match position from Decorations.ts
  private projectorPosition = { x: -3, z: 0 }; // Projector position
  private projectorInteractionDistance: number = 4;
  private isNearProjector: boolean = false;
  private currentSlide: number = 0;
  private slideRenderer: SlideRenderer;
  private screenMesh: THREE.Mesh | null = null;
  private raycaster: THREE.Raycaster;
  private slides: SlideContent[] = [
    {
      title: 'My Journey',
      text: 'Click the projector to start.',
      layout: 'text-only',
      isIntro: true
    },
    {
      title: '1999',
      text: 'This is where it all started.',
      image: childhoodImage,
      layout: 'image-top'
    },
    {
      title: '2012',
      text: 'Wrote my first lines of code. Java for game mods, plus learning sysadmin along the way.',
      image: javaImage,
      layout: 'image-top'
    },
    {
      title: '2014',
      text: 'Discovered web development. Started building side projects and taking on small client work.',
      image: image2014,
      layout: 'image-top'
    },
    {
      title: '2016',
      text: 'Moved into mobile app development. First internship building a prototype mental health app.',
      image: image2016,
      layout: 'image-top'
    },
    {
      title: '2017',
      text: 'Started a Software Development Apprenticeship at 3PL.',
      image: image2017,
      layout: 'image-top'
    },
    {
      title: '2019',
      text: 'Completed my apprenticeship. Joined Orka Technology Group, later promoted to Senior Software Engineer.',
      image: image2019,
      layout: 'image-top'
    },
    {
      title: '2020',
      text: 'Started a part-time BSc Computing + IT degree at The Open University.',
      image: image2020,
      layout: 'image-top'
    },
    {
      title: '2022',
      text: 'Joined Papertrail as Technical Lead.',
      image: image2022,
      layout: 'image-top'
    },
    {
      title: '2025',
      text: 'Joined LocalStack as Senior Full-Stack Engineer.',
      image: image2025,
      layout: 'image-top'
    },
    {
      title: '2026',
      text: '14 years of programming. 9 years in the industry. To be continued...',
      layout: 'text-only'
    },
  ];

  constructor() {
    // Initialize core systems
    this.sceneManager = new SceneManager();
    this.uiManager = new UIManager();
    this.musicSystem = new MusicSystem();
    this.clock = new THREE.Clock();

    // Initialize slide renderer for projector screen
    this.slideRenderer = new SlideRenderer();
    this.slideRenderer.preloadImages(this.slides);

    // Initialize raycaster for click detection
    this.raycaster = new THREE.Raycaster();

    // Click handler for projector - advances slides
    document.addEventListener('click', () => {
      if (!this.sceneManager.controls.isLocked) return;
      if (this.planetManager.getCurrentPlanet() !== 'story') return;

      // Cast ray from center of screen (crosshair)
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.sceneManager.camera);

      const decorations = this.planetManager.getDecorations();
      const intersects = this.raycaster.intersectObjects(decorations, true);

      for (const intersect of intersects) {
        // Check if we clicked the projector or its children
        let obj: THREE.Object3D | null = intersect.object;
        while (obj) {
          if (obj.userData.isProjector) {
            this.nextSlide();
            return;
          }
          obj = obj.parent;
        }
      }
    });

    // Create FPS counter (hidden by default, toggle with F key)
    this.fpsCounter = document.createElement('div');
    this.fpsCounter.style.cssText = 'position:fixed;top:10px;left:10px;color:#0f0;font:bold 16px monospace;background:rgba(0,0,0,0.7);padding:5px 10px;z-index:9999;border-radius:4px;display:none;';
    document.body.appendChild(this.fpsCounter);

    // Debug key toggles (F = FPS counter, C = clearance zones)
    // Slideshow navigation ([ = prev, ] = next)
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyF') {
        this.fpsCounter.style.display = this.fpsCounter.style.display === 'none' ? 'block' : 'none';
      }
      if (event.code === 'KeyC') {
        const decorations = this.planetManager.getDecorations();
        decorations.forEach((dec) => {
          if (dec.userData.isDebugClearance) {
            dec.visible = !dec.visible;
          }
        });
      }
      // Slideshow navigation
      if (this.isNearScreen && this.planetManager.getCurrentPlanet() === 'story') {
        if (event.code === 'BracketLeft') {
          this.prevSlide();
        }
        if (event.code === 'BracketRight') {
          this.nextSlide();
        }
      }
    });

    // Initialize player controller
    this.playerController = new PlayerController(
      this.sceneManager.camera,
      this.sceneManager.controls
    );

    // Initialize Ivy the dog
    this.dog = new Dog('Ivy');
    this.dog.setPosition(3, 0, 3);
    this.sceneManager.scene.add(this.dog.mesh);

    // Initialize environment
    this.skybox = new Skybox();
    this.sceneManager.scene.add(this.skybox.getMesh());

    this.skyEnvironment = new SkyEnvironment();
    this.skyEnvironment.addToScene(this.sceneManager.scene);

    this.shootingStars = new ShootingStars();
    this.sceneManager.scene.add(this.shootingStars.group);

    // Initialize planet manager
    this.planetManager = new PlanetManager(
      this.sceneManager.scene,
      this.sceneManager.camera,
      this.skybox,
      this.uiManager,
      this.playerController
    );

    // Setup event listeners
    this.setupEventListeners();

    // Setup dog interaction
    this.setupDogInteraction();
  }

  private setupEventListeners(): void {
    // Click to start
    this.uiManager.instructions.addEventListener('click', () => {
      this.sceneManager.controls.lock();
      this.musicSystem.start();
    });

    this.sceneManager.controls.addEventListener('lock', () => {
      this.uiManager.hideInstructions();
    });

    this.sceneManager.controls.addEventListener('unlock', () => {
      this.uiManager.showInstructions();
    });
  }

  private setupDogInteraction(): void {
    const interactHandler = () => {
      // Dog quote takes priority if showing
      if (this.isShowingDogQuote) {
        this.hideDogQuote();
        return;
      }
      // Check credits sign interaction (only on home planet)
      if (this.isNearCreditsSign && this.planetManager.getCurrentPlanet() === 'home') {
        this.showCredits();
        return;
      }
      // Bookshelf interaction (articles planet)
      const bookshelfProximity = this.planetManager.checkBookshelfProximity();
      if (bookshelfProximity.near && bookshelfProximity.url) {
        this.planetManager.interactWithBookshelf();
        return;
      }
      // Dog interaction
      if (this.isNearDog) {
        this.petDog();
      }
    };

    this.playerController.setInteractCallback(interactHandler);
  }

  private petDog(): void {
    this.dog.pet();
    this.uiManager.hideDogPrompt();
    this.uiManager.showDogQuote();
    this.isShowingDogQuote = true;
  }

  private hideDogQuote(): void {
    this.uiManager.hideDogQuote();
    this.isShowingDogQuote = false;
  }

  private showCredits(): void {
    this.uiManager.hideCreditsPrompt();
    window.open('https://github.com/rexchoppers/platform-of-things/blob/master/CREDITS.md', '_blank');
  }

  private checkDogProximity(): void {
    if (!this.sceneManager.controls.isLocked) return;

    const distance = this.dog.getDistanceToPlayer(this.sceneManager.camera.position);
    const wasNearDog = this.isNearDog;
    this.isNearDog = distance <= this.dogInteractionDistance;

    // Show/hide prompt based on proximity
    if (this.isNearDog && !wasNearDog && !this.isShowingDogQuote) {
      this.uiManager.showDogPrompt();
    } else if (!this.isNearDog && wasNearDog && !this.isShowingDogQuote) {
      this.uiManager.hideDogPrompt();
    }

    // Hide quote if player walks away
    if (!this.isNearDog && this.isShowingDogQuote) {
      this.hideDogQuote();
    }
  }

  private checkCreditsSignProximity(): void {
    if (!this.sceneManager.controls.isLocked) return;
    if (this.planetManager.getCurrentPlanet() !== 'home') {
      if (this.isNearCreditsSign) {
        this.uiManager.hideCreditsPrompt();
        this.isNearCreditsSign = false;
      }
      return;
    }

    const playerPos = this.sceneManager.camera.position;
    const dx = playerPos.x - this.creditsSignPosition.x;
    const dz = playerPos.z - this.creditsSignPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const wasNearSign = this.isNearCreditsSign;
    this.isNearCreditsSign = distance <= this.creditsSignInteractionDistance;

    // Show/hide prompt based on proximity
    if (this.isNearCreditsSign && !wasNearSign) {
      this.uiManager.showCreditsPrompt();
    } else if (!this.isNearCreditsSign && wasNearSign) {
      this.uiManager.hideCreditsPrompt();
    }
  }

  private checkScreenProximity(): void {
    if (!this.sceneManager.controls.isLocked) return;
    if (this.planetManager.getCurrentPlanet() !== 'story') {
      if (this.isNearScreen) {
        this.uiManager.hideSlidePrompt();
        this.isNearScreen = false;
      }
      this.screenMesh = null; // Always reset when not on story planet
      return;
    }

    // Find and setup screen mesh if not already done (or if decorations were reloaded)
    if (!this.screenMesh || !this.screenMesh.parent) {
      this.setupScreenMesh();
    }

    const playerPos = this.sceneManager.camera.position;
    const dx = playerPos.x - this.screenPosition.x;
    const dz = playerPos.z - this.screenPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const wasNearScreen = this.isNearScreen;
    this.isNearScreen = distance <= this.screenInteractionDistance;

    if (this.isNearScreen && !wasNearScreen) {
      this.uiManager.showSlidePrompt();
      this.updateSlideDisplay();
    } else if (!this.isNearScreen && wasNearScreen) {
      // Only hide if also not near projector
      if (!this.isNearProjector) {
        this.uiManager.hideSlidePrompt();
      }
      this.slideRenderer.renderIdleScreen();
    }
  }

  private checkProjectorProximity(): void {
    if (!this.sceneManager.controls.isLocked) return;
    if (this.planetManager.getCurrentPlanet() !== 'story') {
      if (this.isNearProjector) {
        this.uiManager.hideSlidePrompt();
        this.isNearProjector = false;
      }
      return;
    }

    const playerPos = this.sceneManager.camera.position;
    const dx = playerPos.x - this.projectorPosition.x;
    const dz = playerPos.z - this.projectorPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const wasNearProjector = this.isNearProjector;
    this.isNearProjector = distance <= this.projectorInteractionDistance;

    if (this.isNearProjector && !wasNearProjector) {
      this.uiManager.showSlidePrompt();
    } else if (!this.isNearProjector && wasNearProjector) {
      // Only hide if also not near screen
      if (!this.isNearScreen) {
        this.uiManager.hideSlidePrompt();
      }
    }
  }

  private setupScreenMesh(): void {
    // Find the projector screen in the scene
    const decorations = this.planetManager.getDecorations();
    for (const obj of decorations) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.isProjectorScreen) {
          this.screenMesh = child;
          // Replace the screen's placeholder material with the live slide texture,
          // disposing the one it shipped with so it isn't leaked.
          const previous = child.material;
          const material = new THREE.MeshBasicMaterial({
            map: this.slideRenderer.getTexture(),
          });
          this.screenMesh.material = material;
          if (Array.isArray(previous)) previous.forEach((m) => m.dispose());
          else previous.dispose();
          // Render idle screen initially, or current slide if player is near
          const playerPos = this.sceneManager.camera.position;
          const dx = playerPos.x - this.screenPosition.x;
          const dz = playerPos.z - this.screenPosition.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          if (distance <= this.screenInteractionDistance) {
            this.updateSlideDisplay();
          } else {
            this.slideRenderer.renderIdleScreen();
          }
        }
      });
    }
  }

  private nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.updateSlideDisplay();
  }

  private prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.updateSlideDisplay();
  }

  private updateSlideDisplay(): void {
    const slide = this.slides[this.currentSlide];
    // Count intro slides for adjusted numbering
    const introCount = this.slides.filter(s => s.isIntro).length;
    // Render slide to the projector screen texture
    this.slideRenderer.renderSlide(slide, this.currentSlide, this.slides.length, introCount);
  }

  public start(): void {
    // Load the initial planet
    this.planetManager.loadPlanet('home');

    // Start the animation loop
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Update FPS counter
    this.frameCount++;
    if (time - this.lastFpsUpdate >= 0.5) {
      const fps = Math.round(this.frameCount / (time - this.lastFpsUpdate));
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsUpdate = time;
    }

    // Update sky environment
    this.skyEnvironment.update(delta, time);

    // Update shooting stars
    this.shootingStars.update(delta);

    // Animate portals
    this.planetManager.animatePortals(delta, time);

    // Animate decorations
    this.planetManager.animateDecorations(delta, time);

    // Animate terminal
    this.planetManager.animateTerminal(delta, time);

    // Check terminal proximity
    this.planetManager.checkTerminalProximity();

    // Check bookshelf proximity
    const bookshelfProximity = this.planetManager.checkBookshelfProximity();
    if (bookshelfProximity.near && bookshelfProximity.categoryName) {
      this.uiManager.showBookshelfPrompt(bookshelfProximity.categoryName);
    } else {
      this.uiManager.hideBookshelfPrompt();
    }

    // Update player movement
    if (this.sceneManager.controls.isLocked) {
      this.playerController.update(delta, this.planetManager.getCurrentFlatRadius());

      // Check portal collision
      this.planetManager.checkPortalCollision();
    }

    // Update Ivy (always follows player)
    this.dog.update(
      delta,
      this.sceneManager.camera.position,
      this.planetManager.getCurrentFlatRadius()
    );

    // Check dog proximity for interaction prompt
    this.checkDogProximity();

    // Check credits sign proximity
    this.checkCreditsSignProximity();

    // Check screen proximity for slideshow
    this.checkScreenProximity();

    // Check projector proximity for slide prompt
    this.checkProjectorProximity();

    // Render
    this.sceneManager.render();
  };
}
