import * as THREE from 'three';
import { planets } from '../config/planets';
import { Terrain } from '../environment/Terrain';

// Skill logos
import phpLogo from '../assets/php.svg';
import nodejsLogo from '../assets/nodejs.svg';
import pythonLogo from '../assets/python.svg';
import goLogo from '../assets/go.svg';
import csharpLogo from '../assets/csharp.svg';
import javaLogo from '../assets/java.svg';
import typescriptLogo from '../assets/typescript.svg';
import dartLogo from '../assets/dart.svg';
import nextjsLogo from '../assets/nextjs.svg';
import angularLogo from '../assets/angular.svg';
import reactLogo from '../assets/react.svg';
import reactNativeLogo from '../assets/react-native.svg';
import flutterLogo from '../assets/flutter.svg';
import ionicLogo from '../assets/ionic.svg';
import laravelLogo from '../assets/laravel.svg';
import nestjsLogo from '../assets/nestjs.svg';
import flaskLogo from '../assets/flask.svg';
import dotnetLogo from '../assets/dotnet.svg';
import postgresLogo from '../assets/postgres.svg';
import mysqlLogo from '../assets/mysql.svg';
import mongodbLogo from '../assets/mongodb.svg';
import redisLogo from '../assets/redis.svg';
import awsLogo from '../assets/aws.svg';
import gcpLogo from '../assets/gcp.svg';
import digitaloceanLogo from '../assets/digitalocean.svg';
import k8sLogo from '../assets/k8s.svg';
import dockerLogo from '../assets/docker.svg';
import githubLogo from '../assets/github.svg';
import gitlabLogo from '../assets/gitlab.svg';
import nginxLogo from '../assets/nginx.svg';
import terraformLogo from '../assets/terraform.svg';

export class Decorations {
  // ============================================
  // SHARED MATERIALS - Created once, reused everywhere for performance
  // ============================================
  private static readonly mats = {
    // Woods
    wood: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 }),
    lightWood: new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 }),

    // Stone
    stone: new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.9, flatShading: true }),
    darkStone: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 }),

    // Metal
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x3d3d3d }),

    // Nature
    leaves: new THREE.MeshStandardMaterial({ color: 0x2d5a27, flatShading: true }),
    bush: new THREE.MeshStandardMaterial({ color: 0x2a4a2a }),

    // Paper/Books
    paper: new THREE.MeshStandardMaterial({ color: 0xf5f5dc }),

    // Book colors
    bookRed: new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.9 }),
    bookGreen: new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.9 }),
    bookBlue: new THREE.MeshStandardMaterial({ color: 0x00008b, roughness: 0.9 }),
    bookPurple: new THREE.MeshStandardMaterial({ color: 0x4b0082, roughness: 0.9 }),
    bookBrown: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 }),
    bookTeal: new THREE.MeshStandardMaterial({ color: 0x2f4f4f, roughness: 0.9 }),
    bookMaroon: new THREE.MeshStandardMaterial({ color: 0x800000, roughness: 0.9 }),
    bookNavy: new THREE.MeshStandardMaterial({ color: 0x191970, roughness: 0.9 }),

    // Emissive/Glow
    candle: new THREE.MeshStandardMaterial({ color: 0xf5f5dc }),

    // Misc
    black: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }),
    roofDark: new THREE.MeshStandardMaterial({ color: 0x2a2a2a }),
    mushroomCap: new THREE.MeshStandardMaterial({ color: 0xcc4444 }),
  };

  // Book materials array for random selection
  private static readonly bookMats = [
    Decorations.mats.bookRed,
    Decorations.mats.bookGreen,
    Decorations.mats.bookBlue,
    Decorations.mats.bookPurple,
    Decorations.mats.bookBrown,
    Decorations.mats.bookTeal,
    Decorations.mats.bookMaroon,
    Decorations.mats.bookNavy,
  ];

  // Mark every shared material so scene teardown (PlanetManager.clearPlanet)
  // never disposes them - they are reused across every planet load.
  private static readonly _sharedInit = (() => {
    for (const mat of Object.values(Decorations.mats)) {
      mat.userData.shared = true;
    }
    return true;
  })();

  // Check if position is too close to any portal tent
  private static isNearPortal(x: number, z: number): boolean {
    const portalDistance = 18;
    const clearanceRadius = 5; // Matches tent size (6x5)
    const numPortals = 5;
    for (let i = 0; i < numPortals; i++) {
      const angle = (i / numPortals) * Math.PI * 2 - Math.PI / 2;
      const portalX = Math.cos(angle) * portalDistance;
      const portalZ = Math.sin(angle) * portalDistance;

      const dx = x - portalX;
      const dz = z - portalZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Circular clearance matching tent size
      if (dist < clearanceRadius) {
        return true;
      }
    }
    return false;
  }

  private static createRock(scale: number): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(scale, 0);
    const rock = new THREE.Mesh(geo, this.mats.stone);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    return rock;
  }

  private static createBush(): THREE.Group {
    const bush = new THREE.Group();

    // Low-poly bush using icosahedrons
    for (let i = 0; i < 2; i++) {
      const size = 0.5 + Math.random() * 0.3;
      const sphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 0),
        this.mats.bush
      );
      sphere.position.set(
        (Math.random() - 0.5) * 0.4,
        size * 0.7,
        (Math.random() - 0.5) * 0.4
      );
      sphere.rotation.set(Math.random(), Math.random(), Math.random());
      bush.add(sphere);
    }
    return bush;
  }

  private static createMushroom(): THREE.Group {
    const mushroom = new THREE.Group();

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 6);
    const stem = new THREE.Mesh(stemGeo, this.mats.candle); // cream color
    stem.position.y = 0.15;
    mushroom.add(stem);

    // Cap
    const capGeo = new THREE.SphereGeometry(0.2, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, this.mats.mushroomCap);
    cap.position.y = 0.3;
    mushroom.add(cap);

    return mushroom;
  }

  // Shared flower materials
  private static flowerColors = [0xff69b4, 0xffff00, 0xff6347, 0x9370db, 0xffffff];
  private static flowerMaterials = Decorations.flowerColors.map(
    c => new THREE.MeshStandardMaterial({ color: c })
  );

  // @ts-ignore
  private static flowerCenterMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
  private static stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });

  private static createFlower(): THREE.Group {
    const flower = new THREE.Group();

    // Stem - minimal segments
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 3);
    const stem = new THREE.Mesh(stemGeo, this.stemMaterial);
    stem.position.y = 0.2;
    flower.add(stem);

    // Flower head - single low-poly shape
    const petalMat = this.flowerMaterials[Math.floor(Math.random() * this.flowerMaterials.length)];
    const head = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.08, 0),
      petalMat
    );
    head.position.y = 0.4;
    flower.add(head);

    return flower;
  }

  private static createDeskSetup(): THREE.Group {
    const setup = new THREE.Group();

    // Desk materials
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 });

    // Desk top
    const deskTopGeo = new THREE.BoxGeometry(2.4, 0.08, 1.2);
    const deskTop = new THREE.Mesh(deskTopGeo, woodMat);
    deskTop.position.y = 0.75;
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    setup.add(deskTop);

    // Desk legs
    const legGeo = new THREE.BoxGeometry(0.08, 0.75, 0.08);
    const legPositions = [
      [-1.1, 0.375, -0.5],
      [-1.1, 0.375, 0.5],
      [1.1, 0.375, -0.5],
      [1.1, 0.375, 0.5]
    ];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(legGeo, darkWoodMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      setup.add(leg);
    }

    // Monitor
    const monitorStandGeo = new THREE.BoxGeometry(0.3, 0.05, 0.2);
    const monitorStand = new THREE.Mesh(monitorStandGeo, metalMat);
    monitorStand.position.set(0, 0.82, -0.3);
    setup.add(monitorStand);

    const monitorNeckGeo = new THREE.BoxGeometry(0.08, 0.25, 0.08);
    const monitorNeck = new THREE.Mesh(monitorNeckGeo, metalMat);
    monitorNeck.position.set(0, 0.97, -0.3);
    setup.add(monitorNeck);

    const monitorFrameGeo = new THREE.BoxGeometry(1.2, 0.7, 0.05);
    const monitorFrame = new THREE.Mesh(monitorFrameGeo, metalMat);
    monitorFrame.position.set(0, 1.45, -0.35);
    monitorFrame.castShadow = true;
    setup.add(monitorFrame);

    // Monitor screen (emissive for glow effect)
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      emissive: 0x4444ff,
      emissiveIntensity: 0.3,
    });
    const screenGeo = new THREE.BoxGeometry(1.1, 0.6, 0.02);
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.45, -0.32);
    setup.add(screen);

    // Keyboard
    const keyboardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const keyboardGeo = new THREE.BoxGeometry(0.5, 0.03, 0.18);
    const keyboard = new THREE.Mesh(keyboardGeo, keyboardMat);
    keyboard.position.set(0, 0.81, 0.1);
    setup.add(keyboard);

    // Mouse
    const mouseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const mouseGeo = new THREE.BoxGeometry(0.08, 0.025, 0.12);
    const mouse = new THREE.Mesh(mouseGeo, mouseMat);
    mouse.position.set(0.4, 0.805, 0.15);
    setup.add(mouse);

    // Mouse pad
    const mousepadMat = new THREE.MeshStandardMaterial({ color: 0x2d2d2d });
    const mousepadGeo = new THREE.BoxGeometry(0.25, 0.005, 0.2);
    const mousepad = new THREE.Mesh(mousepadGeo, mousepadMat);
    mousepad.position.set(0.4, 0.795, 0.15);
    setup.add(mousepad);

    // Office chair
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, 1.1);
    chairGroup.rotation.y = Math.PI; // Face the desk

    // Chair base (5-star)
    const chairBaseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const armGeo = new THREE.BoxGeometry(0.05, 0.03, 0.35);
      const arm = new THREE.Mesh(armGeo, chairBaseMat);
      arm.position.set(Math.sin(angle) * 0.15, 0.05, Math.cos(angle) * 0.15);
      arm.rotation.y = angle;
      chairGroup.add(arm);

      // Wheel
      const wheelGeo = new THREE.SphereGeometry(0.04, 6, 4);
      const wheel = new THREE.Mesh(wheelGeo, chairBaseMat);
      wheel.position.set(Math.sin(angle) * 0.3, 0.04, Math.cos(angle) * 0.3);
      chairGroup.add(wheel);
    }

    // Chair cylinder
    const cylinderGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
    const cylinder = new THREE.Mesh(cylinderGeo, metalMat);
    cylinder.position.y = 0.25;
    chairGroup.add(cylinder);

    // Chair seat
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const seatGeo = new THREE.BoxGeometry(0.5, 0.08, 0.5);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0.5;
    seat.castShadow = true;
    chairGroup.add(seat);

    // Chair back
    const backGeo = new THREE.BoxGeometry(0.48, 0.6, 0.08);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.85, -0.22);
    back.rotation.x = 0.1;
    back.castShadow = true;
    chairGroup.add(back);

    setup.add(chairGroup);

    // Small desk lamp
    const lampBaseMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const lampBaseGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.03, 8);
    const lampBase = new THREE.Mesh(lampBaseGeo, lampBaseMat);
    lampBase.position.set(-0.9, 0.81, -0.3);
    setup.add(lampBase);

    const lampArmGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6);
    const lampArm = new THREE.Mesh(lampArmGeo, lampBaseMat);
    lampArm.position.set(-0.9, 1.02, -0.3);
    lampArm.rotation.z = 0.3;
    setup.add(lampArm);

    const lampHeadGeo = new THREE.ConeGeometry(0.1, 0.15, 8);
    const lampHead = new THREE.Mesh(lampHeadGeo, lampBaseMat);
    lampHead.position.set(-0.78, 1.2, -0.3);
    lampHead.rotation.z = Math.PI + 0.5;
    setup.add(lampHead);

    // Lamp light
    const lampLight = new THREE.PointLight(0xfff5e6, 0.5, 3);
    lampLight.position.set(-0.75, 1.1, -0.3);
    setup.add(lampLight);

    // Coffee mug
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const mugGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.1, 8);
    const mug = new THREE.Mesh(mugGeo, mugMat);
    mug.position.set(0.9, 0.84, 0.2);
    setup.add(mug);

    // Mug handle
    const handleGeo = new THREE.TorusGeometry(0.03, 0.008, 6, 8, Math.PI);
    const handle = new THREE.Mesh(handleGeo, mugMat);
    handle.position.set(0.95, 0.84, 0.2);
    handle.rotation.y = Math.PI / 2;
    setup.add(handle);

    return setup;
  }

  private static createPetBed(): THREE.Group {
    const bed = new THREE.Group();

    // Bed base (oval cushion)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brown
    const baseGeo = new THREE.CylinderGeometry(0.7, 0.75, 0.15, 16);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.scale.set(1, 1, 0.8); // Make it oval
    base.position.y = 0.08;
    bed.add(base);

    // Soft cushion inside (lighter color)
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xdeb887 }); // Tan/beige
    const cushionGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16);
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.scale.set(1, 1, 0.8);
    cushion.position.y = 0.12;
    bed.add(cushion);

    // Raised rim/edge around the bed
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 }); // Darker brown
    const rimGeo = new THREE.TorusGeometry(0.62, 0.1, 8, 24);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1, 0.8, 1);
    rim.position.y = 0.18;
    bed.add(rim);

    // Small bone toy
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
    const boneCenter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6),
      boneMat
    );
    boneCenter.rotation.z = Math.PI / 2;
    boneCenter.position.set(0.3, 0.2, 0.1);
    bed.add(boneCenter);

    // Bone ends
    const boneEndGeo = new THREE.SphereGeometry(0.05, 6, 4);
    const boneEnd1 = new THREE.Mesh(boneEndGeo, boneMat);
    boneEnd1.position.set(0.22, 0.2, 0.1);
    bed.add(boneEnd1);
    const boneEnd2 = new THREE.Mesh(boneEndGeo, boneMat);
    boneEnd2.position.set(0.38, 0.2, 0.1);
    bed.add(boneEnd2);

    return bed;
  }

  private static createServerRack(): THREE.Group {
    const rack = new THREE.Group();

    // Rack frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    // Main cabinet body
    const cabinetGeo = new THREE.BoxGeometry(0.8, 2, 0.6);
    const cabinet = new THREE.Mesh(cabinetGeo, frameMat);
    cabinet.position.y = 1;
    cabinet.castShadow = true;
    rack.add(cabinet);

    // Front panel (slightly inset, with ventilation look)
    const frontMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    const frontGeo = new THREE.BoxGeometry(0.75, 1.9, 0.02);
    const front = new THREE.Mesh(frontGeo, frontMat);
    front.position.set(0, 1, 0.3);
    rack.add(front);

    // Server units (blinking lights effect)
    const serverMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const ledGreen = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.8
    });
    const ledBlue = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.5
    });

    // Add server units
    for (let i = 0; i < 5; i++) {
      const serverGeo = new THREE.BoxGeometry(0.7, 0.25, 0.5);
      const server = new THREE.Mesh(serverGeo, serverMat);
      server.position.set(0, 0.3 + i * 0.35, 0.02);
      rack.add(server);

      // LED lights on each server
      const ledGeo = new THREE.BoxGeometry(0.02, 0.02, 0.01);
      for (let j = 0; j < 3; j++) {
        const led = new THREE.Mesh(ledGeo, j === 0 ? ledGreen : ledBlue);
        led.position.set(-0.25 + j * 0.08, 0.3 + i * 0.35, 0.28);
        rack.add(led);
      }
    }

    // Side vents
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    for (let side = -1; side <= 1; side += 2) {
      const ventGeo = new THREE.BoxGeometry(0.02, 1.5, 0.4);
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(side * 0.41, 1, 0);
      rack.add(vent);
    }

    // Top vent
    const topVentGeo = new THREE.BoxGeometry(0.6, 0.02, 0.4);
    const topVent = new THREE.Mesh(topVentGeo, ventMat);
    topVent.position.set(0, 2.01, 0);
    rack.add(topVent);

    // Small status display
    const displayMat = new THREE.MeshStandardMaterial({
      color: 0x001a00,
      emissive: 0x003300,
      emissiveIntensity: 0.3
    });
    const displayGeo = new THREE.BoxGeometry(0.15, 0.08, 0.01);
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(0.2, 1.85, 0.31);
    rack.add(display);

    return rack;
  }

  private static createCoffeeCup(fallen: boolean = false): THREE.Group {
    const cup = new THREE.Group();

    const mugMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const mugGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.09, 8);
    const mug = new THREE.Mesh(mugGeo, mugMat);
    mug.position.y = 0.045;
    cup.add(mug);

    // Handle
    const handleGeo = new THREE.TorusGeometry(0.025, 0.007, 6, 8, Math.PI);
    const handle = new THREE.Mesh(handleGeo, mugMat);
    handle.position.set(0.045, 0.045, 0);
    handle.rotation.y = Math.PI / 2;
    cup.add(handle);

    // Coffee residue inside (dark)
    const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x3d2314 });
    const coffeeGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.01, 8);
    const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffee.position.y = 0.03;
    cup.add(coffee);

    if (fallen) {
      cup.rotation.x = Math.PI / 2;
      cup.rotation.z = Math.random() * Math.PI * 2;
    }

    return cup;
  }

  private static createRadioSpeaker(): THREE.Group {
    const radio = new THREE.Group();

    // Main body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.25, 0.15);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.125;
    radio.add(body);

    // Speaker grilles
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const grilleGeo = new THREE.CircleGeometry(0.08, 12);

    const grille1 = new THREE.Mesh(grilleGeo, grilleMat);
    grille1.position.set(-0.1, 0.12, 0.076);
    radio.add(grille1);

    const grille2 = new THREE.Mesh(grilleGeo, grilleMat);
    grille2.position.set(0.1, 0.12, 0.076);
    radio.add(grille2);

    // Display
    const displayMat = new THREE.MeshStandardMaterial({
      color: 0x001a33,
      emissive: 0x0066aa,
      emissiveIntensity: 0.4
    });
    const displayGeo = new THREE.BoxGeometry(0.12, 0.04, 0.01);
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(0, 0.2, 0.076);
    radio.add(display);

    // Buttons/knobs
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const knobGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8);

    for (let i = 0; i < 3; i++) {
      const knob = new THREE.Mesh(knobGeo, knobMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(-0.12 + i * 0.06, 0.05, 0.08);
      radio.add(knob);
    }

    // Antenna
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 });
    const antennaGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.3, 6);
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(0.15, 0.35, 0);
    antenna.rotation.z = -0.3;
    radio.add(antenna);

    return radio;
  }

  private static createTrashBin(): THREE.Group {
    const bin = new THREE.Group();

    // Bin body (solid cylinder with walls)
    const binMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });

    // Outer shell
    const outerGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.4, 12);
    const outer = new THREE.Mesh(outerGeo, binMat);
    outer.position.y = 0.2;
    bin.add(outer);

    // Inner cavity (slightly smaller, darker)
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const innerGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.38, 12);
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 0.22;
    bin.add(inner);

    // Rim at top
    const rimGeo = new THREE.TorusGeometry(0.19, 0.02, 6, 12);
    const rim = new THREE.Mesh(rimGeo, binMat);
    rim.position.y = 0.4;
    rim.rotation.x = Math.PI / 2;
    bin.add(rim);

    // Crumpled paper balls
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0 });
    const paperPositions = [
      { x: 0, y: 0.25, z: 0 },
      { x: 0.06, y: 0.3, z: 0.04 },
      { x: -0.05, y: 0.28, z: -0.03 },
      { x: 0.03, y: 0.35, z: -0.05 },
      { x: -0.04, y: 0.32, z: 0.06 },
      { x: 0, y: 0.38, z: 0 },
    ];

    for (const pos of paperPositions) {
      const paperGeo = new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.02, 0);
      const paper = new THREE.Mesh(paperGeo, paperMat);
      paper.position.set(pos.x, pos.y, pos.z);
      paper.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      bin.add(paper);
    }

    // One paper ball fallen next to bin
    const fallenPaper = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.045, 0),
      paperMat
    );
    fallenPaper.position.set(0.25, 0.04, 0.1);
    fallenPaper.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    bin.add(fallenPaper);

    return bin;
  }

  private static createBicycle(): THREE.Group {
    const bike = new THREE.Group();

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2255aa }); // Blue frame
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });

    // Key positions
    const wheelRadius = 0.32;
    const wheelBase = 1.0; // Distance between wheel centers
    const bottomBracketHeight = 0.28;
    const seatTubeTop = { x: -0.15, y: 0.75 };
    const headTubeTop = { x: 0.4, y: 0.72 };
    const bottomBracket = { x: 0, y: bottomBracketHeight };

    // Helper to create tube between two points
    const createTube = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      radius: number,
      material: THREE.Material
    ): THREE.Mesh => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const geo = new THREE.CylinderGeometry(radius, radius, length, 6);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, 0);
      mesh.rotation.z = angle - Math.PI / 2;
      return mesh;
    };

    // Wheels
    const wheelGeo = new THREE.TorusGeometry(wheelRadius, 0.02, 8, 20);

    const backWheelX = -wheelBase / 2;
    const frontWheelX = wheelBase / 2;

    const backWheel = new THREE.Mesh(wheelGeo, tireMat);
    backWheel.position.set(backWheelX, wheelRadius, 0);
    // No rotation - wheel stands upright facing along Z axis
    bike.add(backWheel);

    const frontWheel = new THREE.Mesh(wheelGeo, tireMat);
    frontWheel.position.set(frontWheelX, wheelRadius, 0);
    // No rotation - wheel stands upright facing along Z axis
    bike.add(frontWheel);

    // Wheel hubs
    const hubGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8);
    const backHub = new THREE.Mesh(hubGeo, metalMat);
    backHub.position.set(backWheelX, wheelRadius, 0);
    backHub.rotation.x = Math.PI / 2;
    bike.add(backHub);

    const frontHub = new THREE.Mesh(hubGeo, metalMat);
    frontHub.position.set(frontWheelX, wheelRadius, 0);
    frontHub.rotation.x = Math.PI / 2;
    bike.add(frontHub);

    // Frame tubes
    // Top tube (seat to head)
    bike.add(createTube(seatTubeTop, headTubeTop, 0.018, frameMat));

    // Down tube (head to bottom bracket)
    bike.add(createTube(headTubeTop, bottomBracket, 0.02, frameMat));

    // Seat tube (seat to bottom bracket)
    bike.add(createTube(seatTubeTop, bottomBracket, 0.02, frameMat));

    // Chain stays (bottom bracket to rear wheel)
    const rearAxle = { x: backWheelX, y: wheelRadius };
    bike.add(createTube(bottomBracket, rearAxle, 0.012, frameMat));

    // Seat stays (seat tube top to rear wheel)
    bike.add(createTube({ x: seatTubeTop.x, y: seatTubeTop.y - 0.1 }, rearAxle, 0.01, frameMat));

    // Fork (head tube to front wheel)
    const frontAxle = { x: frontWheelX, y: wheelRadius };
    bike.add(createTube(headTubeTop, frontAxle, 0.015, frameMat));

    // Head tube
    bike.add(createTube(headTubeTop, { x: headTubeTop.x, y: headTubeTop.y + 0.1 }, 0.02, frameMat));

    // Handlebar stem
    const stemTop = { x: headTubeTop.x + 0.05, y: headTubeTop.y + 0.18 };
    bike.add(createTube({ x: headTubeTop.x, y: headTubeTop.y + 0.1 }, stemTop, 0.012, metalMat));

    // Handlebars
    const handlebarGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6);
    const handlebar = new THREE.Mesh(handlebarGeo, metalMat);
    handlebar.position.set(stemTop.x, stemTop.y, 0);
    handlebar.rotation.x = Math.PI / 2;
    bike.add(handlebar);

    // Handlebar grips
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const gripGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 6);
    const grip1 = new THREE.Mesh(gripGeo, gripMat);
    grip1.position.set(stemTop.x, stemTop.y, 0.18);
    grip1.rotation.x = Math.PI / 2;
    bike.add(grip1);
    const grip2 = new THREE.Mesh(gripGeo, gripMat);
    grip2.position.set(stemTop.x, stemTop.y, -0.18);
    grip2.rotation.x = Math.PI / 2;
    bike.add(grip2);

    // Seat post
    const seatPostTop = { x: seatTubeTop.x - 0.02, y: seatTubeTop.y + 0.12 };
    bike.add(createTube(seatTubeTop, seatPostTop, 0.015, metalMat));

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.24, 0.04, 0.14);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(seatPostTop.x, seatPostTop.y + 0.02, 0);
    bike.add(seat);

    // Crank and pedals
    const crankGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6);
    const crank = new THREE.Mesh(crankGeo, metalMat);
    crank.position.set(bottomBracket.x, bottomBracket.y, 0);
    crank.rotation.x = Math.PI / 2;
    bike.add(crank);

    const pedalGeo = new THREE.BoxGeometry(0.1, 0.015, 0.06);
    const pedal1 = new THREE.Mesh(pedalGeo, metalMat);
    pedal1.position.set(bottomBracket.x, bottomBracket.y - 0.08, 0.1);
    bike.add(pedal1);
    const pedal2 = new THREE.Mesh(pedalGeo, metalMat);
    pedal2.position.set(bottomBracket.x, bottomBracket.y + 0.08, -0.1);
    bike.add(pedal2);

    // Kickstand (so it stands up)
    const kickstandGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6);
    const kickstand = new THREE.Mesh(kickstandGeo, metalMat);
    kickstand.position.set(-0.1, 0.15, 0.08);
    kickstand.rotation.z = 0.4;
    kickstand.rotation.x = 0.15;
    bike.add(kickstand);

    return bike;
  }

  private static createBookStack(): THREE.Group {
    const stack = new THREE.Group();

    const numBooks = 4 + Math.floor(Math.random() * 3);
    let currentHeight = 0;

    for (let i = 0; i < numBooks; i++) {
      const width = 0.18 + Math.random() * 0.08;
      const height = 0.03 + Math.random() * 0.02;
      const depth = 0.25 + Math.random() * 0.05;

      const bookGeo = new THREE.BoxGeometry(width, height, depth);
      // Use shared book materials
      const mat = this.bookMats[Math.floor(Math.random() * this.bookMats.length)];
      const book = new THREE.Mesh(bookGeo, mat);

      book.position.y = currentHeight + height / 2;
      // Slight random rotation for messiness
      book.rotation.y = (Math.random() - 0.5) * 0.15;
      book.position.x = (Math.random() - 0.5) * 0.03;
      book.position.z = (Math.random() - 0.5) * 0.03;

      stack.add(book);
      currentHeight += height;
    }

    return stack;
  }

  private static createPaperStack(): THREE.Group {
    const stack = new THREE.Group();
    const numSheets = 8 + Math.floor(Math.random() * 6);
    let currentHeight = 0;

    for (let i = 0; i < numSheets; i++) {
      const width = 0.21; // A4-ish paper width
      const height = 0.003; // Very thin
      const depth = 0.29; // A4-ish paper depth

      const sheetGeo = new THREE.BoxGeometry(width, height, depth);
      const sheet = new THREE.Mesh(sheetGeo, this.mats.paper);

      sheet.position.y = currentHeight + height / 2;
      // Random slight offset and rotation for messy pile effect
      sheet.rotation.y = (Math.random() - 0.5) * 0.1;
      sheet.position.x = (Math.random() - 0.5) * 0.02;
      sheet.position.z = (Math.random() - 0.5) * 0.02;

      stack.add(sheet);
      currentHeight += height + 0.001; // Small gap
    }

    // Add a few sheets askew on top
    for (let i = 0; i < 2; i++) {
      const sheet = new THREE.Mesh(
        new THREE.BoxGeometry(0.21, 0.003, 0.29),
        this.mats.paper
      );
      sheet.position.y = currentHeight + 0.01;
      sheet.rotation.y = (Math.random() - 0.5) * 0.5;
      sheet.rotation.z = (Math.random() - 0.5) * 0.1;
      sheet.position.x = (Math.random() - 0.5) * 0.05;
      sheet.position.z = (Math.random() - 0.5) * 0.05;
      stack.add(sheet);
    }

    return stack;
  }

  private static createMiniFridge(): THREE.Group {
    const fridge = new THREE.Group();

    // Main body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.45);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    fridge.add(body);

    // Door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const doorGeo = new THREE.BoxGeometry(0.48, 0.68, 0.02);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.35, 0.24);
    fridge.add(door);

    // Handle
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 });
    const handleGeo = new THREE.BoxGeometry(0.03, 0.15, 0.03);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.18, 0.45, 0.26);
    fridge.add(handle);

    // Brand logo area (small rectangle)
    const logoMat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
    const logoGeo = new THREE.BoxGeometry(0.12, 0.04, 0.01);
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.set(0, 0.6, 0.25);
    fridge.add(logo);

    // Feet
    const footMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const footGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
    const footPositions = [
      { x: -0.2, z: -0.18 },
      { x: 0.2, z: -0.18 },
      { x: -0.2, z: 0.18 },
      { x: 0.2, z: 0.18 },
    ];
    for (const pos of footPositions) {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(pos.x, 0.01, pos.z);
      fridge.add(foot);
    }

    return fridge;
  }

  private static createWorkbench(): THREE.Group {
    const bench = new THREE.Group();

    // Workbench materials
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

    // Bench top (thick wooden surface)
    const topGeo = new THREE.BoxGeometry(1.6, 0.1, 0.8);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.y = 0.85;
    top.castShadow = true;
    top.receiveShadow = true;
    bench.add(top);

    // Legs (4 sturdy legs)
    const legGeo = new THREE.BoxGeometry(0.1, 0.85, 0.1);
    const legPositions = [
      [-0.7, 0.425, -0.3],
      [-0.7, 0.425, 0.3],
      [0.7, 0.425, -0.3],
      [0.7, 0.425, 0.3]
    ];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      bench.add(leg);
    }

    // Cross braces for stability
    const braceGeo = new THREE.BoxGeometry(1.4, 0.06, 0.06);
    const brace1 = new THREE.Mesh(braceGeo, woodMat);
    brace1.position.set(0, 0.25, -0.3);
    bench.add(brace1);
    const brace2 = new THREE.Mesh(braceGeo, woodMat);
    brace2.position.set(0, 0.25, 0.3);
    bench.add(brace2);

    // Lower shelf
    const shelfGeo = new THREE.BoxGeometry(1.4, 0.05, 0.6);
    const shelf = new THREE.Mesh(shelfGeo, woodMat);
    shelf.position.set(0, 0.4, 0);
    bench.add(shelf);

    // === DRILL ===
    const drillGroup = new THREE.Group();

    // Drill body (main housing)
    const drillBodyGeo = new THREE.BoxGeometry(0.2, 0.12, 0.08);
    const drillBody = new THREE.Mesh(drillBodyGeo, new THREE.MeshStandardMaterial({ color: 0xdd4422 })); // Orange/red drill
    drillBody.position.set(0, 0.06, 0);
    drillGroup.add(drillBody);

    // Drill motor housing (bulkier back part)
    const motorGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8);
    const motor = new THREE.Mesh(motorGeo, new THREE.MeshStandardMaterial({ color: 0xcc3311 }));
    motor.rotation.z = Math.PI / 2;
    motor.position.set(-0.12, 0.06, 0);
    drillGroup.add(motor);

    // Handle (grip)
    const handleGeo = new THREE.BoxGeometry(0.05, 0.12, 0.06);
    const handle = new THREE.Mesh(handleGeo, darkMat);
    handle.position.set(-0.05, -0.02, 0);
    drillGroup.add(handle);

    // Chuck (where bit attaches)
    const chuckGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.04, 8);
    const chuck = new THREE.Mesh(chuckGeo, metalMat);
    chuck.rotation.z = Math.PI / 2;
    chuck.position.set(0.12, 0.06, 0);
    drillGroup.add(chuck);

    // Drill bit
    const bitGeo = new THREE.CylinderGeometry(0.008, 0.003, 0.1, 6);
    const bit = new THREE.Mesh(bitGeo, metalMat);
    bit.rotation.z = Math.PI / 2;
    bit.position.set(0.19, 0.06, 0);
    drillGroup.add(bit);

    // Trigger
    const triggerGeo = new THREE.BoxGeometry(0.02, 0.04, 0.03);
    const trigger = new THREE.Mesh(triggerGeo, darkMat);
    trigger.position.set(0.02, 0, 0);
    drillGroup.add(trigger);

    // Position drill on workbench (lying on its side)
    drillGroup.position.set(0.4, 0.9, 0.15);
    drillGroup.rotation.y = 0.3;
    bench.add(drillGroup);

    // Add some other workbench items

    // Small toolbox
    const toolboxGeo = new THREE.BoxGeometry(0.25, 0.12, 0.15);
    const toolbox = new THREE.Mesh(toolboxGeo, new THREE.MeshStandardMaterial({ color: 0x224488 }));
    toolbox.position.set(-0.5, 0.96, 0.2);
    bench.add(toolbox);

    // Screwdriver
    const screwdriverHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.018, 0.1, 6),
      new THREE.MeshStandardMaterial({ color: 0xffcc00 })
    );
    screwdriverHandle.position.set(-0.2, 0.95, -0.2);
    screwdriverHandle.rotation.z = Math.PI / 2 + 0.1;
    bench.add(screwdriverHandle);

    const screwdriverShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6),
      metalMat
    );
    screwdriverShaft.position.set(-0.09, 0.94, -0.2);
    screwdriverShaft.rotation.z = Math.PI / 2 + 0.1;
    bench.add(screwdriverShaft);

    // A few screws/nails scattered
    for (let i = 0; i < 4; i++) {
      const screwGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.025, 4);
      const screw = new THREE.Mesh(screwGeo, metalMat);
      screw.position.set(
        0.1 + (Math.random() - 0.5) * 0.3,
        0.91,
        -0.1 + (Math.random() - 0.5) * 0.2
      );
      screw.rotation.x = Math.PI / 2;
      screw.rotation.z = Math.random() * Math.PI;
      bench.add(screw);
    }

    // Tape measure
    const tapeMeasureGeo = new THREE.BoxGeometry(0.08, 0.08, 0.03);
    const tapeMeasure = new THREE.Mesh(tapeMeasureGeo, new THREE.MeshStandardMaterial({ color: 0xffff00 }));
    tapeMeasure.position.set(0.6, 0.94, -0.25);
    tapeMeasure.rotation.y = 0.5;
    bench.add(tapeMeasure);

    return bench;
  }

  private static createBBQ(): THREE.Group {
    const bbq = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 });
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff2200, emissiveIntensity: 0.6 });

    // Simple square grill body
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.3, 0.5);
    const body = new THREE.Mesh(bodyGeo, metalMat);
    body.position.y = 0.75;
    body.castShadow = true;
    bbq.add(body);

    // Grill top surface
    const topGeo = new THREE.BoxGeometry(0.75, 0.02, 0.45);
    const top = new THREE.Mesh(topGeo, grillMat);
    top.position.y = 0.92;
    bbq.add(top);

    // Open lid (tilted back)
    const lidGeo = new THREE.BoxGeometry(0.8, 0.05, 0.5);
    const lid = new THREE.Mesh(lidGeo, metalMat);
    lid.position.set(0, 1.1, -0.35);
    lid.rotation.x = -Math.PI / 3;
    bbq.add(lid);

    // Small fire glow inside
    const fireGeo = new THREE.IcosahedronGeometry(0.15, 0);
    const fire = new THREE.Mesh(fireGeo, fireMat);
    fire.position.set(0, 0.85, 0);
    fire.scale.set(1.5, 0.6, 1);
    bbq.add(fire);

    // Four legs
    for (let i = 0; i < 4; i++) {
      const xPos = (i % 2 === 0 ? -1 : 1) * 0.3;
      const zPos = (i < 2 ? -1 : 1) * 0.18;
      const legGeo = new THREE.BoxGeometry(0.05, 0.6, 0.05);
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(xPos, 0.3, zPos);
      bbq.add(leg);
    }

    return bbq;
  }

  private static createGardenTools(): THREE.Group {
    const tools = new THREE.Group();

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5 });

    // Rake
    const rakeHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 1.5, 6),
      woodMat
    );
    rakeHandle.position.set(0, 0.75, 0);
    rakeHandle.rotation.z = 0.15;
    tools.add(rakeHandle);

    // Rake head
    const rakeHeadGeo = new THREE.BoxGeometry(0.3, 0.02, 0.05);
    const rakeHead = new THREE.Mesh(rakeHeadGeo, metalMat);
    rakeHead.position.set(0.1, 0.05, 0);
    rakeHead.rotation.z = 0.15;
    tools.add(rakeHead);

    // Rake tines
    for (let i = -4; i <= 4; i++) {
      const tineGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.1, 4);
      const tine = new THREE.Mesh(tineGeo, metalMat);
      tine.position.set(0.1 + i * 0.03, 0, 0);
      tine.rotation.x = Math.PI / 2;
      tools.add(tine);
    }

    // Shovel (leaning next to rake)
    const shovelHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 1.4, 6),
      woodMat
    );
    shovelHandle.position.set(0.15, 0.7, 0.1);
    shovelHandle.rotation.z = 0.2;
    tools.add(shovelHandle);

    // Shovel blade
    const shovelBladeGeo = new THREE.BoxGeometry(0.2, 0.25, 0.02);
    const shovelBlade = new THREE.Mesh(shovelBladeGeo, metalMat);
    shovelBlade.position.set(0.22, 0.08, 0.1);
    shovelBlade.rotation.z = 0.2;
    shovelBlade.rotation.x = -0.3;
    tools.add(shovelBlade);

    // Watering can nearby
    const canMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
    const canBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.2, 8),
      canMat
    );
    canBody.position.set(-0.3, 0.1, 0.2);
    tools.add(canBody);

    // Watering can spout
    const spoutGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.2, 6);
    const spout = new THREE.Mesh(spoutGeo, canMat);
    spout.position.set(-0.2, 0.15, 0.2);
    spout.rotation.z = -0.8;
    tools.add(spout);

    // Watering can handle
    const canHandleGeo = new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI);
    const canHandle = new THREE.Mesh(canHandleGeo, canMat);
    canHandle.position.set(-0.3, 0.22, 0.2);
    canHandle.rotation.x = Math.PI / 2;
    tools.add(canHandle);

    return tools;
  }

  private static createDogToys(): THREE.Group {
    const toys = new THREE.Group();

    // Tennis ball
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xccff00 });
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      ballMat
    );
    ball.position.set(0, 0.06, 0);
    toys.add(ball);

    // White stripe on tennis ball
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.008, 4, 16),
      stripeMat
    );
    stripe.position.set(0, 0.06, 0);
    stripe.rotation.x = Math.PI / 2;
    toys.add(stripe);

    // Rope toy
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xcc8844 });
    const rope2Mat = new THREE.MeshStandardMaterial({ color: 0x4488cc });

    const ropeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8);
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.set(0.25, 0.03, 0.15);
    rope.rotation.z = Math.PI / 2;
    rope.rotation.y = 0.5;
    toys.add(rope);

    // Rope knots
    const knotGeo = new THREE.SphereGeometry(0.05, 6, 5);
    const knot1 = new THREE.Mesh(knotGeo, rope2Mat);
    knot1.position.set(0.08, 0.03, 0.1);
    toys.add(knot1);
    const knot2 = new THREE.Mesh(knotGeo, rope2Mat);
    knot2.position.set(0.42, 0.03, 0.2);
    toys.add(knot2);

    // Frisbee
    const frisbeeMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const frisbeeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16);
    const frisbee = new THREE.Mesh(frisbeeGeo, frisbeeMat);
    frisbee.position.set(-0.3, 0.01, 0.3);
    frisbee.rotation.x = 0.1;
    toys.add(frisbee);

    // Frisbee rim
    const rimGeo = new THREE.TorusGeometry(0.14, 0.015, 6, 16);
    const rim = new THREE.Mesh(rimGeo, frisbeeMat);
    rim.position.set(-0.3, 0.02, 0.3);
    rim.rotation.x = Math.PI / 2 + 0.1;
    toys.add(rim);

    return toys;
  }

  private static createLeash(): THREE.Group {
    const leash = new THREE.Group();

    // Leash material (nylon-like)
    const leashMat = new THREE.MeshStandardMaterial({ color: 0x2244aa });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7 });

    // Coiled leash on ground
    const coilRadius = 0.15;
    const coils = 3;
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      const angle = t * Math.PI * 2 * coils;
      const r = coilRadius * (1 - t * 0.3);
      const segGeo = new THREE.SphereGeometry(0.015, 4, 3);
      const seg = new THREE.Mesh(segGeo, leashMat);
      seg.position.set(
        Math.cos(angle) * r,
        0.02 + t * 0.08,
        Math.sin(angle) * r
      );
      leash.add(seg);
    }

    // Handle loop
    const handleGeo = new THREE.TorusGeometry(0.06, 0.012, 6, 12);
    const handle = new THREE.Mesh(handleGeo, leashMat);
    handle.position.set(0, 0.12, 0);
    handle.rotation.x = Math.PI / 3;
    leash.add(handle);

    // Metal clip at end
    const clipGeo = new THREE.BoxGeometry(0.025, 0.04, 0.01);
    const clip = new THREE.Mesh(clipGeo, metalMat);
    clip.position.set(0.12, 0.03, 0.08);
    leash.add(clip);

    return leash;
  }

  private static createRubberDuck(): THREE.Group {
    const duck = new THREE.Group();

    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.06, 10, 8);
    const body = new THREE.Mesh(bodyGeo, yellowMat);
    body.scale.set(1, 0.85, 1.1);
    body.position.y = 0.05;
    duck.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const head = new THREE.Mesh(headGeo, yellowMat);
    head.position.set(0, 0.11, 0.04);
    duck.add(head);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.015, 0.03, 6);
    const beak = new THREE.Mesh(beakGeo, orangeMat);
    beak.position.set(0, 0.1, 0.08);
    beak.rotation.x = Math.PI / 2;
    duck.add(beak);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.008, 6, 4);
    const eye1 = new THREE.Mesh(eyeGeo, blackMat);
    eye1.position.set(-0.02, 0.125, 0.065);
    duck.add(eye1);
    const eye2 = new THREE.Mesh(eyeGeo, blackMat);
    eye2.position.set(0.02, 0.125, 0.065);
    duck.add(eye2);

    // Tail (small bump at back)
    const tailGeo = new THREE.SphereGeometry(0.02, 6, 4);
    const tail = new THREE.Mesh(tailGeo, yellowMat);
    tail.position.set(0, 0.07, -0.07);
    duck.add(tail);

    return duck;
  }

  private static createMoss(): THREE.Mesh {
    const size = 0.5 + Math.random() * 1;
    const mossGeo = new THREE.CircleGeometry(size, 8);
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x3a5f3a,
      roughness: 1,
    });
    const moss = new THREE.Mesh(mossGeo, mossMat);
    moss.rotation.x = -Math.PI / 2;
    moss.rotation.z = Math.random() * Math.PI * 2;
    return moss;
  }

  private static createSteppingStone(): THREE.Mesh {
    const size = 0.4 + Math.random() * 0.3;
    const stoneGeo = new THREE.CylinderGeometry(size, size * 1.1, 0.1, 8);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.9,
      flatShading: true,
    });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.rotation.y = Math.random() * Math.PI;
    return stone;
  }

  private static createTextConstellation(): THREE.Group {
    const constellation = new THREE.Group();
    constellation.userData.isTextConstellation = true;

    // Characters to use - letters, symbols, and writing-related glyphs
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ&§¶†‡※✦✧★☆∞αβγδεζηθλμπσφψω'.split('');

    // Create glowing text sprites scattered across the sky
    const charCount = 150;
    const skyRadius = 120;
    const minHeight = 50;
    const maxHeight = 100;

    // Shared canvas for creating character textures
    const createCharTexture = (char: string, hue: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      // Glow effect
      ctx.shadowColor = `hsl(${hue}, 80%, 70%)`;
      ctx.shadowBlur = 15;

      // Draw character
      ctx.fillStyle = `hsl(${hue}, 70%, 85%)`;
      ctx.font = 'bold 48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 32, 32);

      return new THREE.CanvasTexture(canvas);
    };

    for (let i = 0; i < charCount; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];

      // Position in a dome above the scene
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * skyRadius;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = minHeight + Math.random() * (maxHeight - minHeight);

      // Color - ink blues and purples with some gold
      const hueOptions = [220, 240, 260, 280, 45]; // Blues, purples, gold
      const hue = hueOptions[Math.floor(Math.random() * hueOptions.length)];

      const texture = createCharTexture(char, hue);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, z);
      const scale = 2 + Math.random() * 4;
      sprite.scale.set(scale, scale, 1);

      // Store animation data
      sprite.userData.isConstellationChar = true;
      sprite.userData.baseY = y;
      sprite.userData.phaseOffset = Math.random() * Math.PI * 2;
      sprite.userData.twinkleSpeed = 0.5 + Math.random() * 1.5;

      constellation.add(sprite);
    }

    // Add some brighter "star" characters as focal points
    const starChars = ['★', '✦', '✧', '☆', '∞'];
    for (let i = 0; i < 20; i++) {
      const char = starChars[Math.floor(Math.random() * starChars.length)];

      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * skyRadius;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = minHeight + 10 + Math.random() * (maxHeight - minHeight);

      const texture = createCharTexture(char, 45); // Gold color
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, z);
      const scale = 4 + Math.random() * 3;
      sprite.scale.set(scale, scale, 1);

      sprite.userData.isConstellationChar = true;
      sprite.userData.baseY = y;
      sprite.userData.phaseOffset = Math.random() * Math.PI * 2;
      sprite.userData.twinkleSpeed = 0.3 + Math.random() * 0.7;
      sprite.userData.isBrightStar = true;

      constellation.add(sprite);
    }

    return constellation;
  }

  private static createAurora(): THREE.Group {
    const aurora = new THREE.Group();
    aurora.userData.isAurora = true;

    // Create vertical curtain-like aurora using InstancedMesh for performance
    const curtainCount = 3;

    for (let c = 0; c < curtainCount; c++) {
      const rayCount = 80 + c * 25;
      const curtainWidth = 280;
      const baseHeight = 60 + c * 20;
      const baseZ = 80 + c * 30;

      // Single geometry for all rays in this curtain
      const rayGeo = new THREE.PlaneGeometry(1.4, 50, 1, 1);

      // Shared material with vertex colors
      const rayMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const instancedMesh = new THREE.InstancedMesh(rayGeo, rayMat, rayCount);
      instancedMesh.userData.isAuroraInstanced = true;
      instancedMesh.userData.curtainIndex = c;

      // Store per-instance data for animation
      const basePositions: { x: number; y: number; z: number; phase: number; scaleY: number }[] = [];

      const dummy = new THREE.Object3D();
      const color = new THREE.Color();

      for (let i = 0; i < rayCount; i++) {
        const t = i / (rayCount - 1);
        const x = (t - 0.5) * curtainWidth;

        // Wavy curtain shape
        const waveOffset = Math.sin(t * Math.PI * 3) * 12 + Math.sin(t * Math.PI * 7) * 5;
        const z = baseZ + waveOffset;

        // Ray height varies
        const scaleY = 0.9 + Math.sin(t * Math.PI * 5) * 0.3 + Math.random() * 0.2;
        const rayHeight = 50 * scaleY;

        dummy.position.set(x, baseHeight + rayHeight / 2, z);
        dummy.scale.set(1 + Math.random() * 0.3, scaleY, 1);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);

        // Color gradient - green to cyan
        const hue = 0.4 - t * 0.2 + Math.random() * 0.08;
        color.setHSL(hue, 1.0, 0.55);
        instancedMesh.setColorAt(i, color);

        // Store base data for animation
        basePositions.push({
          x,
          y: baseHeight + rayHeight / 2,
          z,
          phase: t * Math.PI * 4 + c * 2,
          scaleY,
        });
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

      // Store animation data on the mesh
      instancedMesh.userData.basePositions = basePositions;
      instancedMesh.userData.dummy = new THREE.Object3D();

      aurora.add(instancedMesh);
    }

    return aurora;
  }

  private static createFireflyCluster(centerX: number, centerZ: number, count: number): THREE.Group {
    const group = new THREE.Group();

    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 12;
      positions[i * 3] = centerX + Math.cos(angle) * dist;
      positions[i * 3 + 1] = 0.5 + Math.random() * 3;
      positions[i * 3 + 2] = centerZ + Math.sin(angle) * dist;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      color: 0xaaff44,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const fireflies = new THREE.Points(geometry, material);
    fireflies.userData.isFireflies = true;
    fireflies.userData.originalPositions = positions.slice();
    group.add(fireflies);

    return group;
  }

  private static createLantern(): THREE.Group {
    const lantern = new THREE.Group();

    // Simple post
    const postGeo = new THREE.BoxGeometry(0.12, 2, 0.12);
    const post = new THREE.Mesh(postGeo, this.mats.trunk);
    post.position.y = 1;
    lantern.add(post);

    // Simple lantern box frame
    const frameGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.6,
      transparent: true,
      opacity: 0.7
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 2.2;
    lantern.add(frame);

    // Glowing flame - cone shape, bright emissive
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff6600,
      emissiveIntensity: 2
    });
    const flameGeo = new THREE.ConeGeometry(0.06, 0.15, 6);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 2.15;
    flame.userData.isLanternFlame = true;
    flame.userData.baseY = 2.15;
    lantern.add(flame);

    // Bright core
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffff66,
      emissiveIntensity: 3
    });
    const coreGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2.13;
    core.userData.isLanternCore = true;
    core.userData.baseY = 2.13;
    lantern.add(core);

    // Simple roof
    const roofGeo = new THREE.ConeGeometry(0.22, 0.15, 4);
    const roof = new THREE.Mesh(roofGeo, this.mats.roofDark);
    roof.position.y = 2.48;
    roof.rotation.y = Math.PI / 4;
    lantern.add(roof);

    // Warm glow light
    const light = new THREE.PointLight(0xffaa44, 1.2, 12);
    light.position.y = 2.2;
    light.userData.isLanternLight = true;
    light.userData.baseIntensity = 1.2;
    lantern.add(light);

    return lantern;
  }

  private static createCampfire(): THREE.Group {
    const campfire = new THREE.Group();

    // Stone ring
    const stoneCount = 10;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const radius = 0.8;
      const stoneGeo = new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.1, 0);
      const stone = new THREE.Mesh(stoneGeo, this.mats.darkStone);
      stone.position.set(
        Math.cos(angle) * radius,
        0.08,
        Math.sin(angle) * radius
      );
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      campfire.add(stone);
    }

    // Charred logs
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
      const logGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6);
      const logMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1 });
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.set(
        Math.cos(angle) * 0.25,
        0.15,
        Math.sin(angle) * 0.25
      );
      log.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      log.rotation.y = angle;
      campfire.add(log);
    }

    // Main flames
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9
    });
    const flameGeo = new THREE.ConeGeometry(0.2, 0.6, 6);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.4;
    flame.userData.isCampfireFlame = true;
    flame.userData.baseY = 0.4;
    campfire.add(flame);

    // Inner bright flame
    const innerFlameMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffcc00,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.95
    });
    const innerFlameGeo = new THREE.ConeGeometry(0.12, 0.45, 5);
    const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    innerFlame.position.y = 0.35;
    innerFlame.userData.isCampfireCore = true;
    innerFlame.userData.baseY = 0.35;
    campfire.add(innerFlame);

    // Embers / glowing coals
    const emberCount = 12;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberPhases = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.35;
      emberPositions[i * 3] = Math.cos(angle) * dist;
      emberPositions[i * 3 + 1] = 0.1 + Math.random() * 0.15;
      emberPositions[i * 3 + 2] = Math.sin(angle) * dist;
      emberPhases[i] = Math.random() * Math.PI * 2;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    emberGeo.setAttribute('phase', new THREE.BufferAttribute(emberPhases, 1));
    const emberMat = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const embers = new THREE.Points(emberGeo, emberMat);
    embers.userData.isCampfireEmbers = true;
    campfire.add(embers);

    // Fire light
    const fireLight = new THREE.PointLight(0xff6633, 2, 15);
    fireLight.position.y = 0.5;
    fireLight.userData.isCampfireLight = true;
    fireLight.userData.baseIntensity = 2;
    campfire.add(fireLight);

    campfire.userData.isCampfire = true;
    return campfire;
  }

  private static createCreditsSign(): THREE.Group {
    const sign = new THREE.Group();

    // Two posts
    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6);
    const leftPost = new THREE.Mesh(postGeo, this.mats.darkWood);
    leftPost.position.set(-0.6, 0.7, 0);
    sign.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, this.mats.darkWood);
    rightPost.position.set(0.6, 0.7, 0);
    sign.add(rightPost);

    // Sign board
    const boardGeo = new THREE.BoxGeometry(1.4, 0.8, 0.08);
    const board = new THREE.Mesh(boardGeo, this.mats.wood);
    board.position.y = 1.2;
    sign.add(board);

    // Create canvas texture with "Credits"
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Background (wood color)
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(0, 0, 512, 256);

    // "Credits" text - centered
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Credits', 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: texture });
    const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.7), textMat);
    textPlane.position.set(0, 1.2, 0.05);
    sign.add(textPlane);

    sign.userData.isCreditsSign = true;
    return sign;
  }

  private static createBirdHouse(): THREE.Group {
    const birdHouse = new THREE.Group();

    // Main body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.6, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    birdHouse.add(body);

    // Roof
    const roofGeo = new THREE.ConeGeometry(0.45, 0.3, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.45;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    birdHouse.add(roof);

    // Entrance hole
    const holeGeo = new THREE.CircleGeometry(0.1, 8);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(0, 0.05, 0.21);
    birdHouse.add(hole);

    // Perch
    const perchGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
    const perchMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const perch = new THREE.Mesh(perchGeo, perchMat);
    perch.rotation.x = Math.PI / 2;
    perch.position.set(0, -0.1, 0.27);
    birdHouse.add(perch);

    return birdHouse;
  }

  private static createBench(): THREE.Group {
    const bench = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });

    // Seat planks
    for (let i = 0; i < 3; i++) {
      const plankGeo = new THREE.BoxGeometry(2, 0.08, 0.25);
      const plank = new THREE.Mesh(plankGeo, woodMat);
      plank.position.set(0, 0.5, -0.25 + i * 0.28);
      plank.castShadow = true;
      bench.add(plank);
    }

    // Legs
    const legPositions = [
      [-0.8, 0.25, -0.2],
      [-0.8, 0.25, 0.2],
      [0.8, 0.25, -0.2],
      [0.8, 0.25, 0.2]
    ];
    for (const pos of legPositions) {
      const legGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      bench.add(leg);
    }

    // Back rest
    for (let i = 0; i < 2; i++) {
      const backGeo = new THREE.BoxGeometry(2, 0.08, 0.15);
      const back = new THREE.Mesh(backGeo, woodMat);
      back.position.set(0, 0.7 + i * 0.2, -0.35);
      back.rotation.x = 0.1;
      back.castShadow = true;
      bench.add(back);
    }

    // Back supports
    const supportPositions = [-0.8, 0, 0.8];
    for (const x of supportPositions) {
      const supportGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
      const support = new THREE.Mesh(supportGeo, woodMat);
      support.position.set(x, 0.75, -0.35);
      support.castShadow = true;
      bench.add(support);
    }

    return bench;
  }

  // Shared fern material
  private static fernMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e5a1c,
    side: THREE.DoubleSide
  });

  private static createFern(): THREE.Group {
    const fern = new THREE.Group();

    // Multiple fronds radiating out - reduced to 4
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
      const frondLength = 0.6 + Math.random() * 0.3;

      const frondGeo = new THREE.PlaneGeometry(0.15, frondLength);
      const frond = new THREE.Mesh(frondGeo, this.fernMaterial);
      frond.position.set(
        Math.cos(angle) * 0.1,
        frondLength / 2,
        Math.sin(angle) * 0.1
      );
      frond.rotation.x = -0.4 - Math.random() * 0.3;
      frond.rotation.y = angle;
      fern.add(frond);
    }
    return fern;
  }

  // Shared grass material
  private static grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d6b2a,
    side: THREE.DoubleSide
  });

  private static createTallGrass(): THREE.Group {
    const grass = new THREE.Group();

    // Several grass blades - reduced count
    const bladeCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < bladeCount; i++) {
      const height = 0.4 + Math.random() * 0.4;
      const bladeGeo = new THREE.PlaneGeometry(0.05, height);
      const blade = new THREE.Mesh(bladeGeo, this.grassMaterial);
      blade.position.set(
        (Math.random() - 0.5) * 0.3,
        height / 2,
        (Math.random() - 0.5) * 0.3
      );
      blade.rotation.y = Math.random() * Math.PI;
      blade.rotation.x = (Math.random() - 0.5) * 0.2;
      grass.add(blade);
    }
    return grass;
  }

  private static createLog(): THREE.Group {
    const log = new THREE.Group();

    const length = 2 + Math.random() * 2;
    const size = 0.35 + Math.random() * 0.15;

    // Simple box log
    const logGeo = new THREE.BoxGeometry(length, size, size);
    const logMesh = new THREE.Mesh(logGeo, this.mats.wood);
    logMesh.castShadow = true;
    log.add(logMesh);

    // Store radius for positioning
    log.userData.radius = size / 2;

    return log;
  }

  private static createCabin(): THREE.Group {
    const cabin = new THREE.Group();

    // Main cabin body
    const bodyWidth = 6;
    const bodyDepth = 5;
    const bodyHeight = 3;
    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 }); // Dark wood
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bodyHeight / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    cabin.add(body);

    // Roof
    const roofGeo = new THREE.ConeGeometry(5, 2.5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Saddle brown
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = bodyHeight + 1.25;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    cabin.add(roof);

    // Door
    const doorGeo = new THREE.BoxGeometry(1.2, 2, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1, bodyDepth / 2 + 0.05);
    cabin.add(door);

    // Windows
    const windowGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      emissive: 0xffaa44,
      emissiveIntensity: 0.3
    });

    const window1 = new THREE.Mesh(windowGeo, windowMat);
    window1.position.set(-1.5, 1.5, bodyDepth / 2 + 0.05);
    cabin.add(window1);

    const window2 = new THREE.Mesh(windowGeo, windowMat);
    window2.position.set(1.5, 1.5, bodyDepth / 2 + 0.05);
    cabin.add(window2);

    return cabin;
  }

  private static createTree(scale: number, bushiness: number = 1): THREE.Group {
    const tree = new THREE.Group();

    const trunkHeight = 5 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, trunkHeight, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.mats.trunk);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Layered foliage - bushiness affects width
    const leaves1 = new THREE.Mesh(
      new THREE.ConeGeometry(3 * scale * bushiness, 4 * scale, 8),
      this.mats.leaves
    );
    leaves1.position.y = trunkHeight + 1 * scale;
    leaves1.castShadow = true;
    tree.add(leaves1);

    const leaves2 = new THREE.Mesh(
      new THREE.ConeGeometry(2.2 * scale * bushiness, 3 * scale, 8),
      this.mats.leaves
    );
    leaves2.position.y = trunkHeight + 3 * scale;
    leaves2.castShadow = true;
    tree.add(leaves2);

    const leaves3 = new THREE.Mesh(
      new THREE.ConeGeometry(1.4 * scale * bushiness, 2 * scale, 8),
      this.mats.leaves
    );
    leaves3.position.y = trunkHeight + 4.5 * scale;
    leaves3.castShadow = true;
    tree.add(leaves3);

    return tree;
  }

  public static create(planetId: string): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    const config = planets[planetId];

    // Education planet gets the full campus
    if (planetId === 'education') {
      // Graduation ceremony scene

      // Main stage platform
      const stage = new THREE.Group();
      const stageHeight = 1.5;

      const stagePlatformGeo = new THREE.BoxGeometry(20, stageHeight, 12);
      const stageMat = new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 0.8,
      });
      const stagePlatform = new THREE.Mesh(stagePlatformGeo, stageMat);
      stagePlatform.position.y = stageHeight / 2;
      stagePlatform.castShadow = true;
      stagePlatform.receiveShadow = true;
      stage.add(stagePlatform);

      // Stage carpet (red runner) - on top of stage surface
      const carpetGeo = new THREE.BoxGeometry(6, 0.02, 11);
      const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
      const carpet = new THREE.Mesh(carpetGeo, carpetMat);
      carpet.position.y = stageHeight + 0.02;
      stage.add(carpet);

      // Podium (smaller lectern)
      const podium = new THREE.Group();
      const podiumBaseGeo = new THREE.BoxGeometry(1.2, 2, 0.8);
      const podiumMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
      const podiumBase = new THREE.Mesh(podiumBaseGeo, podiumMat);
      podiumBase.position.y = 1;
      podium.add(podiumBase);

      // Podium top (angled)
      const podiumTopGeo = new THREE.BoxGeometry(1.4, 0.2, 1);
      const podiumTop = new THREE.Mesh(podiumTopGeo, podiumMat);
      podiumTop.position.y = 2.1;
      podiumTop.rotation.x = -0.25;
      podium.add(podiumTop);

      podium.position.set(0, stageHeight, 2);
      stage.add(podium);

      // Stage position (closer to portal)
      const stageX = 0;
      const stageZ = 7;
      stage.position.set(stageX, Terrain.getTerrainHeight(stageX, stageZ), stageZ);
      stage.rotation.y = Math.PI; // Face toward portal/player
      objects.push(stage);

      // Register stage as walkable platform
      Terrain.addWalkablePlatform({
        x: stageX,
        z: stageZ,
        width: 20,
        depth: 12,
        height: stageHeight,
        rotation: Math.PI
      });


      // Big display screen showing all qualifications (same width as stage)
      const displayScreen = new THREE.Group();
      const screenWidth = 19; // Slightly less than stage width of 20
      const screenHeight = 10; // Adjusted for new layout

      // Screen frame
      const frameGeo = new THREE.BoxGeometry(screenWidth + 1, screenHeight + 1, 0.3);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.5,
        roughness: 0.3,
      });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = screenHeight / 2 + 0.5;
      displayScreen.add(frame);

      // Screen content
      const screenCanvas = document.createElement('canvas');
      screenCanvas.width = 1024;
      screenCanvas.height = 512;
      const ctx = screenCanvas.getContext('2d')!;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 512);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Qualifications', 512, 50);

      // Divider line
      ctx.strokeStyle = '#4a4a6a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 75);
      ctx.lineTo(974, 75);
      ctx.stroke();

      // === Bachelors Section (Top) ===
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6b4c9a';
      ctx.font = 'bold 28px "Segoe UI", sans-serif';
      ctx.fillText('Bachelors', 50, 115);

      // Bachelors card
      ctx.fillStyle = '#2d1f4e';
      ctx.fillRect(50, 130, 924, 80);
      ctx.fillStyle = '#6b4c9a';
      ctx.fillRect(50, 130, 6, 80);

      // University logo area
      ctx.fillStyle = '#3d2f5e';
      ctx.fillRect(70, 140, 60, 60);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OU', 100, 178);

      // Degree details
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.fillText('BSc Computing + IT', 150, 165);
      ctx.font = '18px "Segoe UI", sans-serif';
      ctx.fillStyle = '#cccccc';
      ctx.fillText('The Open University (Expected 2027)', 150, 190);

      // Status badge
      ctx.fillStyle = '#ffa500';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('IN PROGRESS', 959, 160);

      // Progress bar
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(700, 175, 260, 16);
      ctx.fillStyle = '#9966cc';
      ctx.fillRect(700, 175, 156, 16); // 60% progress
      ctx.strokeStyle = '#6b4c9a';
      ctx.lineWidth = 2;
      ctx.strokeRect(700, 175, 260, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('60%', 830, 188);

      // === AWS Certifications (Left side) ===
      ctx.fillStyle = '#ff9900';
      ctx.font = 'bold 28px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('AWS Certifications', 50, 260);

      // AWS Cert 1 - Developer Associate
      ctx.fillStyle = '#232f3e';
      ctx.fillRect(50, 275, 450, 55);
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(50, 275, 6, 55);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText('Certified Developer - Associate', 70, 300);
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Issued Aug 2025 · Expires Aug 2028', 70, 320);

      // AWS Cert 2 - AI Practitioner
      ctx.fillStyle = '#232f3e';
      ctx.fillRect(50, 340, 450, 55);
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(50, 340, 6, 55);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText('Certified AI Practitioner', 70, 365);
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Issued Apr 2025 · Expires Apr 2028', 70, 385);

      // AWS Cert 3 - Cloud Practitioner
      ctx.fillStyle = '#232f3e';
      ctx.fillRect(50, 405, 450, 55);
      ctx.fillStyle = '#ff9900';
      ctx.fillRect(50, 405, 6, 55);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText('Certified Cloud Practitioner', 70, 430);
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Issued Jun 2024 · Expires Aug 2028', 70, 450);

      // === BCS Certifications (Right side) ===
      ctx.fillStyle = '#1e4d8c';
      ctx.font = 'bold 28px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('BCS Certifications', 524, 260);

      // BCS Cert 1 - Software Development
      ctx.fillStyle = '#0a2351';
      ctx.fillRect(524, 275, 450, 55);
      ctx.fillStyle = '#1e4d8c';
      ctx.fillRect(524, 275, 6, 55);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.fillText('Level 3 Certificate in Software', 544, 297);
      ctx.fillText('Development Context & Methodologies', 544, 317);

      // BCS Cert 2 - Programming
      ctx.fillStyle = '#0a2351';
      ctx.fillRect(524, 340, 450, 55);
      ctx.fillStyle = '#1e4d8c';
      ctx.fillRect(524, 340, 6, 55);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText('Level 3 Certificate in Programming', 544, 375);

      const screenTexture = new THREE.CanvasTexture(screenCanvas);
      const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
      const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), screenMat);
      screenPlane.position.set(0, screenHeight / 2 + 0.5, 0.2);
      displayScreen.add(screenPlane);

      // Screen glow
      const screenLight = new THREE.PointLight(0x4488ff, 0.4, 8);
      screenLight.position.set(0, screenHeight / 2, 1);
      displayScreen.add(screenLight);

      // Position screen on stage - back of stage is at z: 31 (stageZ + 6 due to 180 rotation)
      displayScreen.position.set(0, stageHeight, stageZ + 6);
      displayScreen.rotation.y = Math.PI; // Face the player
      objects.push(displayScreen);

      // Audience seating (benches) - facing the stage
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const bench = this.createBench();
          const x = (col - 1) * 6;
          const z = -8 + row * 2; // Between portal and stage
          bench.position.set(x, Terrain.getTerrainHeight(x, z), z);
          bench.rotation.y = 0; // Face toward stage
          objects.push(bench);
        }
      }

      // Decorative banners on poles
      const createBanner = (color: number) => {
        const banner = new THREE.Group();

        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 6);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 4;
        banner.add(pole);

        const flagGeo = new THREE.BoxGeometry(0.1, 3, 1.5);
        const flagMat = new THREE.MeshStandardMaterial({ color: color });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0, 6.5, 0.8);
        banner.add(flag);

        return banner;
      };

      // Banners along the sides
      const banner1 = createBanner(0x1e4d8c);
      banner1.position.set(-12, Terrain.getTerrainHeight(-12, 0), 0);
      objects.push(banner1);

      const banner2 = createBanner(0xff9900);
      banner2.position.set(12, Terrain.getTerrainHeight(12, 0), 0);
      objects.push(banner2);

      const banner3 = createBanner(0x6b4c9a);
      banner3.position.set(-12, Terrain.getTerrainHeight(-12, 10), 10);
      objects.push(banner3);

      const banner4 = createBanner(0x6b4c9a);
      banner4.position.set(12, Terrain.getTerrainHeight(12, 10), 10);
      objects.push(banner4);

      // Confetti particles
      const confettiCount = 150;
      const confettiPositions = new Float32Array(confettiCount * 3);
      const confettiColors = new Float32Array(confettiCount * 3);
      const confettiPhases = new Float32Array(confettiCount);

      const confettiColorOptions = [
        new THREE.Color(0xff0000),
        new THREE.Color(0x00ff00),
        new THREE.Color(0x0000ff),
        new THREE.Color(0xffff00),
        new THREE.Color(0xff00ff),
        new THREE.Color(0x00ffff),
        new THREE.Color(0xffd700),
      ];

      for (let i = 0; i < confettiCount; i++) {
        confettiPositions[i * 3] = (Math.random() - 0.5) * 25;
        confettiPositions[i * 3 + 1] = 3 + Math.random() * 10;
        confettiPositions[i * 3 + 2] = 3 + (Math.random() - 0.5) * 10; // Around stage area (closer)

        const color = confettiColorOptions[Math.floor(Math.random() * confettiColorOptions.length)];
        confettiColors[i * 3] = color.r;
        confettiColors[i * 3 + 1] = color.g;
        confettiColors[i * 3 + 2] = color.b;

        confettiPhases[i] = Math.random() * Math.PI * 2;
      }

      const confettiGeo = new THREE.BufferGeometry();
      confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPositions, 3));
      confettiGeo.setAttribute('color', new THREE.BufferAttribute(confettiColors, 3));
      confettiGeo.setAttribute('phase', new THREE.BufferAttribute(confettiPhases, 1));

      const confettiMat = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      });

      const confetti = new THREE.Points(confettiGeo, confettiMat);
      confetti.userData.isConfetti = true;
      confetti.userData.originalPositions = new Float32Array(confettiPositions);
      objects.push(confetti);

      // Lanterns for ambiance
      const lanternPositions = [
        { x: -10, z: -5 },
        { x: 10, z: -5 },
        { x: -12, z: 4 },
        { x: 12, z: 4 },
        { x: -14, z: 14 },
        { x: 14, z: 14 },
      ];
      lanternPositions.forEach((pos) => {
        const lantern = this.createLantern();
        lantern.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        objects.push(lantern);
      });

      // Check if too close to stage area (stage at z=7, 20 wide, 12 deep)
      const isNearStage = (x: number, z: number): boolean => {
        return Math.abs(x) < 14 && z > -3 && z < 20;
      };

      // Tree spacing like story world
      const minTreeSpacing = 6;
      const treePositions: { x: number; z: number }[] = [];

      const isTooCloseToOtherTrees = (x: number, z: number): boolean => {
        for (const pos of treePositions) {
          const dx = x - pos.x;
          const dz = z - pos.z;
          if (dx * dx + dz * dz < minTreeSpacing * minTreeSpacing) {
            return true;
          }
        }
        return false;
      };

      // Trees surrounding the area (similar to story world)
      let treesPlaced = 0;
      let attempts = 0;
      while (treesPlaced < 250 && attempts < 2500) {
        attempts++;

        const angle = Math.random() * Math.PI * 2;
        const distance = 24 + Math.random() * 15; // Start beyond portal distance
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        // Skip if too close to portal
        if (this.isNearPortal(x, z)) continue;

        // Skip if too close to stage
        if (isNearStage(x, z)) continue;

        // Skip if too close to another tree
        if (isTooCloseToOtherTrees(x, z)) continue;

        const scale = 0.7 + Math.random() * 0.8;
        const tree = this.createTree(scale, 0.5 + Math.random() * 0.4);
        tree.position.set(x, Terrain.getTerrainHeight(x, z), z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        treePositions.push({ x, z });
        objects.push(tree);
        treesPlaced++;
      }

      // Ferns scattered around the edges
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 22 + Math.random() * 12;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearStage(x, z)) continue;

        const fern = this.createFern();
        fern.position.set(x, Terrain.getTerrainHeight(x, z), z);
        fern.rotation.y = Math.random() * Math.PI * 2;
        objects.push(fern);
      }

      // A few bushes for variety
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 14;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearStage(x, z)) continue;

        const bush = this.createBush();
        bush.position.set(x, Terrain.getTerrainHeight(x, z), z);
        bush.scale.setScalar(0.6 + Math.random() * 0.4);
        objects.push(bush);
      }

      // Book stacks on the left side of benches
      const bookStackPositions = [
        { x: -10, z: -7 },
        { x: -11, z: -4 },
        { x: -10, z: -1 },
      ];
      bookStackPositions.forEach((pos) => {
        const books = this.createBookStack();
        books.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        books.rotation.y = Math.random() * Math.PI;
        objects.push(books);
      });

      // Guest book stand on the right side of benches
      const guestBookStand = new THREE.Group();

      // Pedestal
      const pedestalGeo = new THREE.CylinderGeometry(0.3, 0.4, 1, 8);
      const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = 0.5;
      pedestal.castShadow = true;
      guestBookStand.add(pedestal);

      // Top plate
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
      const plateGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8);
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.y = 1.02;
      guestBookStand.add(plate);

      // Open book
      const bookGroup = new THREE.Group();
      const pageMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
      const coverMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

      // Left page
      const leftPageGeo = new THREE.BoxGeometry(0.25, 0.02, 0.35);
      const leftPage = new THREE.Mesh(leftPageGeo, pageMat);
      leftPage.position.set(-0.13, 0, 0);
      leftPage.rotation.z = 0.1;
      bookGroup.add(leftPage);

      // Right page
      const rightPage = new THREE.Mesh(leftPageGeo, pageMat);
      rightPage.position.set(0.13, 0, 0);
      rightPage.rotation.z = -0.1;
      bookGroup.add(rightPage);

      // Spine
      const spineGeo = new THREE.BoxGeometry(0.04, 0.03, 0.35);
      const spine = new THREE.Mesh(spineGeo, coverMat);
      spine.position.y = -0.01;
      bookGroup.add(spine);

      bookGroup.position.y = 1.08;
      bookGroup.rotation.y = 0.3;
      guestBookStand.add(bookGroup);

      // Pen
      const penGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 6);
      const penMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
      const pen = new THREE.Mesh(penGeo, penMat);
      pen.position.set(0.2, 1.1, 0.1);
      pen.rotation.z = Math.PI / 2;
      pen.rotation.y = 0.5;
      guestBookStand.add(pen);

      const standX = 9;
      const standZ = -3;
      guestBookStand.position.set(standX, Terrain.getTerrainHeight(standX, standZ), standZ);
      objects.push(guestBookStand);

      // More book stacks on the right side too
      const rightBookPositions = [
        { x: 11, z: -8 },
        { x: 10, z: -2 },
      ];
      rightBookPositions.forEach((pos) => {
        const books = this.createBookStack();
        books.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        books.rotation.y = Math.random() * Math.PI;
        objects.push(books);
      });

      // Flower arrangements along the sides (avoiding the stage area)
      const flowerClusterPositions = [
        { x: -12, z: -6 }, { x: 12, z: -6 },
        { x: -12, z: 0 }, { x: 12, z: 0 },
        { x: -14, z: -3 }, { x: 14, z: -3 },
        { x: -5, z: -6 }, { x: 5, z: -6 },
        { x: 0, z: -9 }, { x: -3, z: -11 }, { x: 3, z: -11 },
        { x: -14, z: 5 }, { x: 14, z: 5 },
        { x: -13, z: -8 }, { x: 13, z: -8 },
        { x: -8, z: -10 }, { x: 8, z: -10 },
        { x: -15, z: -1 }, { x: 15, z: -1 },
        { x: -16, z: 3 }, { x: 16, z: 3 },
        { x: -10, z: -12 }, { x: 10, z: -12 },
        { x: -6, z: -9 }, { x: 6, z: -9 },
        { x: -17, z: -5 }, { x: 17, z: -5 },
        { x: -15, z: 8 }, { x: 15, z: 8 },
        { x: -18, z: 1 }, { x: 18, z: 1 },
      ];
      flowerClusterPositions.forEach((pos) => {
        // Create a cluster of flowers
        for (let j = 0; j < 10; j++) {
          const flower = this.createFlower();
          const ox = pos.x + (Math.random() - 0.5) * 3.5;
          const oz = pos.z + (Math.random() - 0.5) * 3.5;
          flower.position.set(ox, Terrain.getTerrainHeight(ox, oz), oz);
          flower.scale.setScalar(0.6 + Math.random() * 0.5);
          flower.rotation.y = Math.random() * Math.PI * 2;
          objects.push(flower);
        }
      });

      return objects;
    }

    // Story/Chronicle planet - Projector Slideshow (positioned to the side, not blocking portal)
    if (planetId === 'story') {
      // Screen positioned to the right side, facing left toward center
      const screenX = 15;
      const screenZ = 0;
      const screen = new THREE.Group();
      const screenWidth = 20;
      const screenHeight = 12;

      // Screen frame (wooden)
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 });
      const frameThickness = 0.4;

      const topFrame = new THREE.Mesh(new THREE.BoxGeometry(screenWidth + 0.8, frameThickness, frameThickness), frameMat);
      topFrame.position.y = screenHeight / 2 + frameThickness / 2;
      screen.add(topFrame);

      const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(screenWidth + 0.8, frameThickness, frameThickness), frameMat);
      bottomFrame.position.y = -screenHeight / 2 - frameThickness / 2;
      screen.add(bottomFrame);

      const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, screenHeight + 0.8, frameThickness), frameMat);
      leftFrame.position.x = -screenWidth / 2 - frameThickness / 2;
      screen.add(leftFrame);

      const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, screenHeight + 0.8, frameThickness), frameMat);
      rightFrame.position.x = screenWidth / 2 + frameThickness / 2;
      screen.add(rightFrame);

      // Screen surface (where slides display) - brighter emissive for better visibility
      const screenMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, emissive: 0x666666 });
      const screenSurface = new THREE.Mesh(new THREE.BoxGeometry(screenWidth, screenHeight, 0.1), screenMat);
      screenSurface.userData.isProjectorScreen = true;
      screen.add(screenSurface);

      // Support posts (taller for bigger screen)
      const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
      const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 6, 8), postMat);
      leftPost.position.set(-screenWidth / 2 - 0.4, -screenHeight / 2 - 3, 0);
      screen.add(leftPost);

      const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 6, 8), postMat);
      rightPost.position.set(screenWidth / 2 + 0.4, -screenHeight / 2 - 3, 0);
      screen.add(rightPost);

      screen.position.set(screenX, Terrain.getTerrainHeight(screenX, screenZ) + screenHeight / 2 + 1.5, screenZ);
      screen.rotation.y = -Math.PI / 2; // Face left toward center
      screen.userData.isStoryScreen = true;
      objects.push(screen);

      // Projector on a stand - positioned left of screen, facing it
      const projector = new THREE.Group();
      const projectorBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
      );
      projector.add(projectorBody);

      // Lens (on the +X side, facing screen)
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x4488aa, metalness: 0.8, roughness: 0.2 })
      );
      lens.rotation.z = Math.PI / 2; // Horizontal cylinder
      lens.position.x = 0.5; // Front of projector
      projector.add(lens);

      // Lens glow
      const lensGlow = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffaa })
      );
      lensGlow.position.x = 0.61;
      lensGlow.rotation.y = Math.PI / 2;
      lensGlow.userData.isProjectorGlow = true;
      projector.add(lensGlow);

      // Projector flickering light (like a real projector)
      const projectorLight = new THREE.SpotLight(0xffffee, 3, 20, Math.PI / 6, 0.5, 1);
      projectorLight.position.x = 0.6;
      projectorLight.target.position.set(14, 2, 0); // Aim at screen
      projector.add(projectorLight);
      projector.add(projectorLight.target);
      projectorLight.userData.isProjectorLight = true;
      projectorLight.userData.baseIntensity = 3;

      // Dust particles in the light beam - short distance from projector
      const dustCount = 80;
      const dustPositions = new Float32Array(dustCount * 3);
      const dustSpeeds = new Float32Array(dustCount);
      const dustPhases = new Float32Array(dustCount);

      // Create particles in a short cone near the projector
      for (let i = 0; i < dustCount; i++) {
        // Distance along the beam - only 3 units from projector
        const t = Math.random();
        const distance = 0.8 + t * 3; // From x=0.8 to x=3.8

        // Cone radius increases with distance
        const maxRadius = t * 1.2;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * maxRadius;

        dustPositions[i * 3] = distance;
        dustPositions[i * 3 + 1] = Math.sin(angle) * radius;
        dustPositions[i * 3 + 2] = Math.cos(angle) * radius;

        dustSpeeds[i] = 0.2 + Math.random() * 0.3;
        dustPhases[i] = Math.random() * Math.PI * 2;
      }

      const dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      dustGeometry.setAttribute('speed', new THREE.BufferAttribute(dustSpeeds, 1));
      dustGeometry.setAttribute('phase', new THREE.BufferAttribute(dustPhases, 1));

      const dustMaterial = new THREE.PointsMaterial({
        color: 0xffffee,
        size: 0.08,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
      dustParticles.userData.isProjectorDust = true;
      dustParticles.userData.originalPositions = dustPositions.slice();
      projector.add(dustParticles);

      // Stand
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 1.2, 6),
        postMat
      );
      stand.position.y = -0.8;
      projector.add(stand);

      const standBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 0.1, 8),
        postMat
      );
      standBase.position.y = -1.4;
      projector.add(standBase);

      // Position projector further back from screen
      const projX = -3;
      const projZ = 0;
      projector.position.set(projX, Terrain.getTerrainHeight(projX, projZ) + 1.6, projZ);
      // No rotation needed - projector faces +X by default, screen is at +X
      projector.userData.isProjector = true; // Mark as interactive
      objects.push(projector);

      // Seating - more benches arranged like a cinema
      const benchPositions = [
        // Front row
        { x: 4, z: -4 }, { x: 4, z: -1.5 }, { x: 4, z: 1.5 }, { x: 4, z: 4 },
        // Middle row
        { x: 6, z: -5 }, { x: 6, z: -2.5 }, { x: 6, z: 0 }, { x: 6, z: 2.5 }, { x: 6, z: 5 },
        // Back row
        { x: 8, z: -4 }, { x: 8, z: -1.5 }, { x: 8, z: 1.5 }, { x: 8, z: 4 },
      ];
      for (const pos of benchPositions) {
        const bench = this.createBench();
        bench.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        bench.rotation.y = Math.PI / 2; // Face the screen
        objects.push(bench);
      }

      // Lanterns for ambient lighting - positioned wide to not block screen
      const lanternPositions = [
        { x: 2, z: -8 }, { x: 2, z: 8 },
        { x: 12, z: -10 }, { x: 12, z: 10 },
      ];
      for (const pos of lanternPositions) {
        const lantern = this.createLantern();
        lantern.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        objects.push(lantern);
      }

      // Helper to check if too close to screen (screen at x=15, z=0, 20 wide)
      const isNearScreen = (x: number, z: number): boolean => {
        return x > 10 && x < 25 && z > -12 && z < 12;
      };

      // Tree spacing like home world
      const minTreeSpacing = 6;
      const treePositions: { x: number; z: number }[] = [];

      const isTooCloseToOtherTrees = (x: number, z: number): boolean => {
        for (const pos of treePositions) {
          const dx = x - pos.x;
          const dz = z - pos.z;
          if (dx * dx + dz * dz < minTreeSpacing * minTreeSpacing) {
            return true;
          }
        }
        return false;
      };

      // Trees surrounding the area (similar to home world approach)
      let treesPlaced = 0;
      let attempts = 0;
      while (treesPlaced < 300 && attempts < 3000) {
        attempts++;

        const angle = Math.random() * Math.PI * 2;
        const distance = 24 + Math.random() * 15; // Start beyond portal distance
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        // Skip if too close to portal
        if (this.isNearPortal(x, z)) continue;

        // Skip if too close to screen
        if (isNearScreen(x, z)) continue;

        // Skip if too close to another tree
        if (isTooCloseToOtherTrees(x, z)) continue;

        const scale = 0.8 + Math.random() * 1.0;
        const tree = this.createTree(scale, 0.6 + Math.random() * 0.4);
        tree.position.set(x, Terrain.getTerrainHeight(x, z), z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        treePositions.push({ x, z });
        objects.push(tree);
        treesPlaced++;
      }

      // === STRING LIGHTS ===
      // Posts arranged in a horseshoe shape around the seating, avoiding screen
      const stringLightRadius = 22;
      const lightPostPositions: { x: number; z: number }[] = [];

      // Create posts in a horseshoe - from one side of screen, around back, to other side
      for (let i = 0; i < 14; i++) {
        // Start at angle pointing toward +z side of screen, go around the back
        const startAngle = Math.PI * 0.35; // Start near screen edge (+z side)
        const endAngle = Math.PI * 2 - Math.PI * 0.35; // End near screen edge (-z side)
        const angle = startAngle + (i / 13) * (endAngle - startAngle);

        const x = Math.cos(angle) * stringLightRadius;
        const z = Math.sin(angle) * stringLightRadius;

        // Skip if near portal
        if (this.isNearPortal(x, z)) continue;

        lightPostPositions.push({ x, z });

        // Post
        const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.5, 6);
        const post = new THREE.Mesh(postGeo, this.mats.darkWood);
        post.position.set(x, Terrain.getTerrainHeight(x, z) + 1.75, z);
        objects.push(post);
      }

      // String lights between adjacent posts (glowing bulbs) - don't loop back
      for (let i = 0; i < lightPostPositions.length - 1; i++) {
        const start = lightPostPositions[i];
        const end = lightPostPositions[i + 1];

        const bulbCount = 6;
        for (let j = 1; j < bulbCount; j++) {
          const t = j / bulbCount;
          const x = start.x + (end.x - start.x) * t;
          const z = start.z + (end.z - start.z) * t;
          const sag = Math.sin(t * Math.PI) * 0.4; // Slight sag in the middle
          const y = 3.5 - sag;

          const bulbGeo = new THREE.SphereGeometry(0.08, 8, 8);
          const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xffffaa,
            emissive: 0xffaa44,
            emissiveIntensity: 1.5
          });
          const bulb = new THREE.Mesh(bulbGeo, bulbMat);
          bulb.position.set(x, Terrain.getTerrainHeight(x, z) + y, z);
          objects.push(bulb);
        }
      }

      // === "NOW SHOWING" SIGN ===
      const nowShowingSign = new THREE.Group();

      // Posts
      const signPostGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6);
      const leftSignPost = new THREE.Mesh(signPostGeo, this.mats.darkWood);
      leftSignPost.position.set(-0.7, 0.9, 0);
      nowShowingSign.add(leftSignPost);

      const rightSignPost = new THREE.Mesh(signPostGeo, this.mats.darkWood);
      rightSignPost.position.set(0.7, 0.9, 0);
      nowShowingSign.add(rightSignPost);

      // Sign board
      const signBoardGeo = new THREE.BoxGeometry(1.6, 0.6, 0.08);
      const signBoard = new THREE.Mesh(signBoardGeo, this.mats.wood);
      signBoard.position.y = 1.6;
      nowShowingSign.add(signBoard);

      // Canvas texture for "Now Showing"
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 192;
      const signCtx = signCanvas.getContext('2d')!;
      signCtx.fillStyle = '#5c4033';
      signCtx.fillRect(0, 0, 512, 192);
      signCtx.fillStyle = '#ffeeaa';
      signCtx.font = 'bold 56px Arial';
      signCtx.textAlign = 'center';
      signCtx.textBaseline = 'middle';
      signCtx.fillText('Now Showing', 256, 96);

      const signTexture = new THREE.CanvasTexture(signCanvas);
      const signTextMat = new THREE.MeshBasicMaterial({ map: signTexture });
      const signTextPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), signTextMat);
      signTextPlane.position.set(0, 1.6, 0.05);
      nowShowingSign.add(signTextPlane);

      const signX = 0;
      const signZ = -6;
      nowShowingSign.position.set(signX, Terrain.getTerrainHeight(signX, signZ), signZ);
      nowShowingSign.rotation.y = Math.PI; // Face toward portal
      objects.push(nowShowingSign);

      // === SPEAKER STANDS ===
      const createSpeaker = (x: number, z: number, rotY: number) => {
        const speaker = new THREE.Group();

        // Stand pole
        const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.2, 8);
        const pole = new THREE.Mesh(poleGeo, this.mats.darkMetal);
        pole.position.y = 1.1;
        speaker.add(pole);

        // Base
        const baseGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.15, 8);
        const base = new THREE.Mesh(baseGeo, this.mats.darkMetal);
        base.position.y = 0.08;
        speaker.add(base);

        // Speaker box (bigger)
        const boxGeo = new THREE.BoxGeometry(1.0, 1.2, 0.6);
        const box = new THREE.Mesh(boxGeo, this.mats.black);
        box.position.y = 2.8;
        speaker.add(box);

        // Speaker cones (two larger ones)
        const coneGeo = new THREE.CircleGeometry(0.3, 16);
        const coneMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const coneTop = new THREE.Mesh(coneGeo, coneMat);
        coneTop.position.set(0, 3.1, 0.31);
        speaker.add(coneTop);

        const coneBottom = new THREE.Mesh(coneGeo, coneMat);
        coneBottom.position.set(0, 2.5, 0.31);
        speaker.add(coneBottom);

        speaker.position.set(x, Terrain.getTerrainHeight(x, z), z);
        speaker.rotation.y = rotY;
        return speaker;
      };

      objects.push(createSpeaker(10, -12, -0.3));
      objects.push(createSpeaker(10, 12, 0.3));

      // === FIREFLIES ===
      const storyFireflies = this.createFireflyCluster(5, 0, 25);
      objects.push(storyFireflies);

      // Add another cluster near the trees
      const treeFireflies = this.createFireflyCluster(-8, 5, 15);
      objects.push(treeFireflies);

      // More fireflies deeper in the trees
      objects.push(this.createFireflyCluster(-18, -10, 20));
      objects.push(this.createFireflyCluster(-15, 12, 18));
      objects.push(this.createFireflyCluster(20, -15, 15));
      objects.push(this.createFireflyCluster(18, 18, 12));

      // === DIRECTOR'S CHAIR ===
      const directorChair = new THREE.Group();

      // Chair legs (X-frame)
      const legMat = this.mats.darkWood;
      const legGeo = new THREE.BoxGeometry(0.06, 1.0, 0.06);

      // Front legs
      const frontLeftLeg = new THREE.Mesh(legGeo, legMat);
      frontLeftLeg.position.set(-0.25, 0.5, 0.2);
      frontLeftLeg.rotation.x = 0.15;
      directorChair.add(frontLeftLeg);

      const frontRightLeg = new THREE.Mesh(legGeo, legMat);
      frontRightLeg.position.set(0.25, 0.5, 0.2);
      frontRightLeg.rotation.x = 0.15;
      directorChair.add(frontRightLeg);

      // Back legs
      const backLeftLeg = new THREE.Mesh(legGeo, legMat);
      backLeftLeg.position.set(-0.25, 0.5, -0.2);
      backLeftLeg.rotation.x = -0.15;
      directorChair.add(backLeftLeg);

      const backRightLeg = new THREE.Mesh(legGeo, legMat);
      backRightLeg.position.set(0.25, 0.5, -0.2);
      backRightLeg.rotation.x = -0.15;
      directorChair.add(backRightLeg);

      // Seat (canvas)
      const seatGeo = new THREE.BoxGeometry(0.5, 0.05, 0.4);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a3d1a }); // Dark green canvas
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = 0.9;
      directorChair.add(seat);

      // Backrest
      const backGeo = new THREE.BoxGeometry(0.5, 0.4, 0.05);
      const back = new THREE.Mesh(backGeo, seatMat);
      back.position.set(0, 1.2, -0.2);
      directorChair.add(back);

      // Armrests
      const armGeo = new THREE.BoxGeometry(0.06, 0.06, 0.5);
      const leftArm = new THREE.Mesh(armGeo, legMat);
      leftArm.position.set(-0.28, 1.0, 0);
      directorChair.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, legMat);
      rightArm.position.set(0.28, 1.0, 0);
      directorChair.add(rightArm);

      const chairX = -3;
      const chairZ = 2;
      directorChair.position.set(chairX, Terrain.getTerrainHeight(chairX, chairZ), chairZ);
      directorChair.rotation.y = Math.PI / 2; // Facing the screen
      objects.push(directorChair);

      // Clapperboard near director's chair
      const clapperboard = new THREE.Group();

      // Main board
      const boardGeo = new THREE.BoxGeometry(0.5, 0.4, 0.03);
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
      const mainBoard = new THREE.Mesh(boardGeo, boardMat);
      clapperboard.add(mainBoard);

      // Clapper (top hinged part) - black and white stripes
      const clapperGeo = new THREE.BoxGeometry(0.5, 0.1, 0.025);
      const clapperMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
      const clapper = new THREE.Mesh(clapperGeo, clapperMat);
      clapper.position.set(0, 0.22, 0.01);
      clapper.rotation.x = -0.15; // Slightly open
      clapperboard.add(clapper);

      // White stripes on clapper
      const stripeGeo = new THREE.BoxGeometry(0.08, 0.1, 0.005);
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(-0.15 + i * 0.15, 0.22, 0.025);
        stripe.rotation.x = -0.15;
        clapperboard.add(stripe);
      }

      // White area on main board for text
      const textAreaGeo = new THREE.BoxGeometry(0.44, 0.3, 0.005);
      const textAreaMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
      const textArea = new THREE.Mesh(textAreaGeo, textAreaMat);
      textArea.position.set(0, -0.03, 0.02);
      clapperboard.add(textArea);

      // Lines on the text area
      const lineGeo = new THREE.BoxGeometry(0.4, 0.008, 0.002);
      const lineMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      for (let i = 0; i < 4; i++) {
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(0, 0.08 - i * 0.07, 0.025);
        clapperboard.add(line);
      }

      const clapX = -3.5;
      const clapZ = 2.5;
      clapperboard.position.set(clapX, Terrain.getTerrainHeight(clapX, clapZ) + 0.25, clapZ);
      clapperboard.rotation.x = -0.3; // Leaning back slightly
      clapperboard.rotation.y = 0.5; // Angled
      objects.push(clapperboard);

      // === OLD FILM CAMERA ON STAND ===
      const filmCamera = new THREE.Group();

      // Single pole stand
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8);
      const pole = new THREE.Mesh(poleGeo, this.mats.darkMetal);
      pole.position.y = 0.7;
      filmCamera.add(pole);

      // Base
      const baseGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.1, 12);
      const base = new THREE.Mesh(baseGeo, this.mats.darkMetal);
      base.position.y = 0.05;
      filmCamera.add(base);

      // Stand head
      const headGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.12, 8);
      const head = new THREE.Mesh(headGeo, this.mats.darkMetal);
      head.position.y = 1.45;
      filmCamera.add(head);

      // Camera body (boxy old-style)
      const cameraBodyGeo = new THREE.BoxGeometry(0.4, 0.3, 0.5);
      const cameraBody = new THREE.Mesh(cameraBodyGeo, this.mats.black);
      cameraBody.position.y = 1.65;
      filmCamera.add(cameraBody);

      // Film reels on top (rotated on X axis to stand upright)
      const reelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 20);
      const reelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4 });
      const leftReel = new THREE.Mesh(reelGeo, reelMat);
      leftReel.position.set(-0.12, 1.95, 0);
      leftReel.rotation.x = Math.PI / 2;
      filmCamera.add(leftReel);

      const rightReel = new THREE.Mesh(reelGeo, reelMat);
      rightReel.position.set(0.12, 1.95, 0);
      rightReel.rotation.x = Math.PI / 2;
      filmCamera.add(rightReel);

      // Reel spokes
      const spokeGeo = new THREE.BoxGeometry(0.25, 0.02, 0.01);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI;
        const leftSpoke = new THREE.Mesh(spokeGeo, this.mats.darkMetal);
        leftSpoke.position.set(-0.12, 1.95, 0);
        leftSpoke.rotation.x = Math.PI / 2;
        leftSpoke.rotation.z = angle;
        filmCamera.add(leftSpoke);

        const rightSpoke = new THREE.Mesh(spokeGeo, this.mats.darkMetal);
        rightSpoke.position.set(0.12, 1.95, 0);
        rightSpoke.rotation.x = Math.PI / 2;
        rightSpoke.rotation.z = angle;
        filmCamera.add(rightSpoke);
      }

      // Lens housing
      const lensHousingGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.2, 12);
      const lensHousing = new THREE.Mesh(lensHousingGeo, this.mats.black);
      lensHousing.position.set(0, 1.6, 0.35);
      lensHousing.rotation.x = Math.PI / 2;
      filmCamera.add(lensHousing);

      // Lens glass
      const lensGlassGeo = new THREE.CircleGeometry(0.06, 16);
      const lensGlassMat = new THREE.MeshStandardMaterial({ color: 0x4488aa, metalness: 0.9, roughness: 0.1 });
      const lensGlass = new THREE.Mesh(lensGlassGeo, lensGlassMat);
      lensGlass.position.set(0, 1.6, 0.46);
      filmCamera.add(lensGlass);

      // Hand crank
      const crankArmGeo = new THREE.BoxGeometry(0.15, 0.02, 0.02);
      const crankArm = new THREE.Mesh(crankArmGeo, this.mats.darkMetal);
      crankArm.position.set(0.28, 1.65, 0);
      filmCamera.add(crankArm);

      const crankHandleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8);
      const crankHandle = new THREE.Mesh(crankHandleGeo, this.mats.wood);
      crankHandle.position.set(0.35, 1.65, 0);
      filmCamera.add(crankHandle);

      const cameraX = -6;
      const cameraZ = -3;
      filmCamera.position.set(cameraX, Terrain.getTerrainHeight(cameraX, cameraZ), cameraZ);
      filmCamera.rotation.y = Math.PI / 3; // Pointing toward screen
      objects.push(filmCamera);

      // === SNACK STAND ===
      const snackStand = new THREE.Group();

      // Cart base/counter
      const counterGeo = new THREE.BoxGeometry(1.2, 0.1, 0.8);
      const counter = new THREE.Mesh(counterGeo, this.mats.wood);
      counter.position.y = 1.0;
      snackStand.add(counter);

      // Cart body
      const bodyGeo = new THREE.BoxGeometry(1.2, 0.9, 0.8);
      const body = new THREE.Mesh(bodyGeo, this.mats.lightWood);
      body.position.y = 0.5;
      snackStand.add(body);

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const wheelPositions = [
        { x: -0.5, z: 0.35 },
        { x: 0.5, z: 0.35 },
        { x: -0.5, z: -0.35 },
        { x: 0.5, z: -0.35 },
      ];
      for (const pos of wheelPositions) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(pos.x, 0.15, pos.z);
        wheel.rotation.z = Math.PI / 2;
        snackStand.add(wheel);
      }

      // Canopy poles
      const canopyPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6);
      const canopyPolePositions = [
        { x: -0.55, z: 0.35 },
        { x: 0.55, z: 0.35 },
        { x: -0.55, z: -0.35 },
        { x: 0.55, z: -0.35 },
      ];
      for (const pos of canopyPolePositions) {
        const canopyPole = new THREE.Mesh(canopyPoleGeo, this.mats.darkMetal);
        canopyPole.position.set(pos.x, 1.55, pos.z);
        snackStand.add(canopyPole);
      }

      // Canopy top
      const canopyGeo = new THREE.BoxGeometry(1.3, 0.08, 0.9);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0xcc3333 }); // Red and white stripes vibe
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = 2.1;
      snackStand.add(canopy);

      // Popcorn container on counter
      const popcornGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.25, 8);
      const popcornMat = new THREE.MeshStandardMaterial({ color: 0xffeecc });
      const popcorn = new THREE.Mesh(popcornGeo, popcornMat);
      popcorn.position.set(-0.3, 1.2, 0);
      snackStand.add(popcorn);

      // Another container
      const popcorn2 = new THREE.Mesh(popcornGeo, popcornMat);
      popcorn2.position.set(0.3, 1.2, 0);
      snackStand.add(popcorn2);

      const standX = -10;
      const standZ = 5;
      snackStand.position.set(standX, Terrain.getTerrainHeight(standX, standZ), standZ);
      snackStand.rotation.y = Math.PI / 4;
      objects.push(snackStand);

      // === BACK AREA FILL (behind projector) ===
      // Extra benches at the back - facing the screen
      const backBench1 = this.createBench();
      backBench1.position.set(-12, Terrain.getTerrainHeight(-12, -4), -4);
      backBench1.rotation.y = Math.PI / 2; // Face screen
      objects.push(backBench1);

      const backBench2 = this.createBench();
      backBench2.position.set(-10, Terrain.getTerrainHeight(-10, 8), 8);
      backBench2.rotation.y = Math.PI / 2; // Face screen
      objects.push(backBench2);

      // Some book stacks for film/story vibe
      const backBooks1 = this.createBookStack();
      backBooks1.position.set(-7, Terrain.getTerrainHeight(-7, -5), -5);
      objects.push(backBooks1);

      const backBooks2 = this.createBookStack();
      backBooks2.position.set(-11, Terrain.getTerrainHeight(-11, 1), 1);
      objects.push(backBooks2);

      // Lanterns at the back
      const backLantern1 = this.createLantern();
      backLantern1.position.set(-14, Terrain.getTerrainHeight(-14, 6), 6);
      objects.push(backLantern1);

      const backLantern2 = this.createLantern();
      backLantern2.position.set(-13, Terrain.getTerrainHeight(-13, -5), -5);
      objects.push(backLantern2);

      // === FOLIAGE ===
      // Bushes around the edges
      const bushPositions = [
        { x: -8, z: 10 }, { x: -12, z: 8 }, { x: -15, z: 3 },
        { x: -15, z: -3 }, { x: -12, z: -8 }, { x: -8, z: -10 },
        { x: 10, z: 14 }, { x: 10, z: -14 },
      ];
      for (const pos of bushPositions) {
        const bush = this.createBush();
        bush.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        objects.push(bush);
      }

      // Flowers scattered around
      const flowerPositions = [
        { x: -5, z: 8 }, { x: -7, z: 10 }, { x: -9, z: 7 },
        { x: -6, z: -7 }, { x: -8, z: -9 }, { x: -4, z: -10 },
        { x: 11, z: 10 }, { x: 12, z: 8 }, { x: 11, z: -10 }, { x: 12, z: -8 },
      ];
      for (const pos of flowerPositions) {
        const flower = this.createFlower();
        flower.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        flower.scale.setScalar(0.7 + Math.random() * 0.4);
        objects.push(flower);
      }

      // Tall grass patches
      const grassPositions = [
        { x: -10, z: 12 }, { x: -14, z: 8 }, { x: -16, z: 0 },
        { x: -14, z: -8 }, { x: -10, z: -12 },
        { x: 8, z: 15 }, { x: 8, z: -15 },
      ];
      for (const pos of grassPositions) {
        const grass = this.createTallGrass();
        grass.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        grass.scale.setScalar(0.8 + Math.random() * 0.3);
        objects.push(grass);
      }

      // Mushrooms near trees
      const mushroomPositions = [
        { x: -18, z: 5 }, { x: -17, z: -6 }, { x: -20, z: 0 },
        { x: 22, z: 12 }, { x: 23, z: -10 },
      ];
      for (const pos of mushroomPositions) {
        const mushroom = this.createMushroom();
        mushroom.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        objects.push(mushroom);
      }

      // Rocks scattered around
      const rockPositions = [
        { x: -16, z: 10 }, { x: -18, z: -8 }, { x: -20, z: 2 },
        { x: 20, z: 15 }, { x: 22, z: -12 },
      ];
      for (const pos of rockPositions) {
        const rock = this.createRock(0.3 + Math.random() * 0.4);
        rock.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z) + 0.15, pos.z);
        objects.push(rock);
      }

      // === EXTRA CINEMA TOUCHES ===
      // Picnic blanket on the ground
      const blanketGeo = new THREE.PlaneGeometry(2.5, 2);
      const blanketMat = new THREE.MeshStandardMaterial({
        color: 0x994444,
        roughness: 0.9,
        side: THREE.DoubleSide
      });
      const blanket = new THREE.Mesh(blanketGeo, blanketMat);
      blanket.rotation.x = -Math.PI / 2;
      blanket.position.set(-8, Terrain.getTerrainHeight(-8, 0) + 0.02, 0);
      blanket.rotation.z = 0.1;
      objects.push(blanket);

      // Cushions on the blanket
      const cushionGeo = new THREE.BoxGeometry(0.4, 0.15, 0.4);
      const cushionColors = [0x446688, 0x668844, 0x886644];
      for (let i = 0; i < 3; i++) {
        const cushionMat = new THREE.MeshStandardMaterial({ color: cushionColors[i], roughness: 0.9 });
        const cushion = new THREE.Mesh(cushionGeo, cushionMat);
        cushion.position.set(-8 + (i - 1) * 0.6, Terrain.getTerrainHeight(-8, 0) + 0.1, 0.3);
        cushion.rotation.y = Math.random() * 0.3 - 0.15;
        objects.push(cushion);
      }

      // Drink cooler near snack stand
      const coolerGeo = new THREE.BoxGeometry(0.6, 0.4, 0.4);
      const coolerMat = new THREE.MeshStandardMaterial({ color: 0x2244aa });
      const cooler = new THREE.Mesh(coolerGeo, coolerMat);
      cooler.position.set(-11, Terrain.getTerrainHeight(-11, 6) + 0.2, 6);
      objects.push(cooler);

      return objects;
    }

    // Home planet gets lots of trees
    if (planetId === 'home') {
      // Cabin position (near spawn but away from portals which are at distance 25)
      const cabinX = -14;
      const cabinZ = 25;
      const cabinClearance = 12; // Keep trees away from cabin

      let treesPlaced = 0;
      let attempts = 0;
      const minTreeSpacing = 6; // Minimum distance between trees
      const treesPositions: { x: number; z: number }[] = [];

      // Helper to check if position is too close to existing trees
      const isTooCloseToOtherTrees = (x: number, z: number): boolean => {
        for (const pos of treesPositions) {
          const dx = x - pos.x;
          const dz = z - pos.z;
          if (dx * dx + dz * dz < minTreeSpacing * minTreeSpacing) {
            return true;
          }
        }
        return false;
      };

      // Helper to check if too close to cabin
      const isTooCloseToCabin = (x: number, z: number): boolean => {
        const dx = x - cabinX;
        const dz = z - cabinZ;
        return dx * dx + dz * dz < cabinClearance * cabinClearance;
      };

      // === DEBUG: Portal clearance zone outlines (hidden by default, toggle with C key) ===
      const portalDistance = 18;
      const clearanceRadius = 5;
      const numPortals = 5;
      for (let i = 0; i < numPortals; i++) {
        const angle = (i / numPortals) * Math.PI * 2 - Math.PI / 2;
        const portalX = Math.cos(angle) * portalDistance;
        const portalZ = Math.sin(angle) * portalDistance;

        // Circular outline matching tent size
        const circleGeo = new THREE.RingGeometry(clearanceRadius - 0.1, clearanceRadius, 32);
        const circleMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const circle = new THREE.Mesh(circleGeo, circleMat);
        circle.rotation.x = -Math.PI / 2;
        circle.position.set(portalX, 0.1, portalZ);
        circle.visible = false;
        circle.userData.isDebugClearance = true;
        objects.push(circle);
      }

      // === TREES (200) ===
      while (treesPlaced < 200 && attempts < 2000) {
        attempts++;

        const angle = Math.random() * Math.PI * 2;
        // Trees form a forest ring surrounding the center clearing
        const distance = 14 + Math.random() * 35;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        // Skip if too close to portal area
        if (this.isNearPortal(x, z)) {
          continue;
        }

        // Skip if too close to cabin
        if (isTooCloseToCabin(x, z)) {
          continue;
        }

        // Skip if too close to another tree
        if (isTooCloseToOtherTrees(x, z)) {
          continue;
        }

        const scale = 0.6 + Math.random() * 1.8;
        const bushiness = 0.5 + Math.random() * 0.6; // 0.5 (thin) to 1.1 (normal)
        const tree = this.createTree(scale, bushiness);

        const terrainY = Terrain.getTerrainHeight(x, z);
        tree.position.set(x, terrainY, z);
        tree.rotation.y = Math.random() * Math.PI * 2;

        treesPositions.push({ x, z });
        objects.push(tree);
        treesPlaced++;
      }

      // === CABIN ===
      const cabin = this.createCabin();
      cabin.position.set(cabinX, Terrain.getTerrainHeight(cabinX, cabinZ), cabinZ);
      cabin.rotation.y = Math.atan2(-cabinX, -cabinZ);
      objects.push(cabin);

      // === ALL SMALL ITEMS ===
      // === CAMPFIRE ===
      const campfireX = 0;
      const campfireZ = -8;
      const campfire = this.createCampfire();
      campfire.position.set(campfireX, Terrain.getTerrainHeight(campfireX, campfireZ), campfireZ);
      objects.push(campfire);

      // === CREDITS SIGN (central location) ===
      const creditsSign = this.createCreditsSign();
      const signX = 8;
      const signZ = 0;
      creditsSign.position.set(signX, Terrain.getTerrainHeight(signX, signZ), signZ);
      creditsSign.rotation.y = -Math.PI / 2; // Face toward spawn
      objects.push(creditsSign);

      // Add a bench near the campfire
      const bench = this.createBench();
      const benchX = 3;
      const benchZ = -6;
      bench.position.set(benchX, Terrain.getTerrainHeight(benchX, benchZ), benchZ);
      // Calculate angle to face the campfire
      bench.rotation.y = Math.atan2(campfireX - benchX, campfireZ - benchZ);
      objects.push(bench);

      // Add stepping stones - path from spawn to campfire
      const stonePath = [
        { x: -2, z: -2 },
        { x: -3, z: -4 },
        { x: -2, z: -6 },
        { x: 0, z: -6 },
      ];
      for (const pos of stonePath) {
        const stone = this.createSteppingStone();
        const sx = pos.x + (Math.random() - 0.5) * 0.5;
        const sz = pos.z + (Math.random() - 0.5) * 0.5;
        stone.position.set(sx, Terrain.getTerrainHeight(sx, sz) + 0.05, sz);
        objects.push(stone);
      }

      // Desk position (opposite side from campfire)
      const deskX = 0;
      const deskZ = 5;

      // All object positions for exclusion zones
      const bedX = deskX + 3;
      const bedZ = deskZ + 0.5;
      const rackX = deskX - 3.5;
      const rackZ = deskZ + 1;
      const radioX = deskX + 2.5;
      const radioZ = deskZ - 1.5;
      const binX = -7;
      const binZ = 8;
      const bikeX = deskX - 5;
      const bikeZ = deskZ - 2;

      // Workbench position
      const workbenchX = -8;
      const workbenchZ = 9;

      // BBQ position (outdoor cooking area)
      const bbqX = 6;
      const bbqZ = 9;

      // Garden tools position (near cabin)
      const toolsX = cabinX + 8;
      const toolsZ = cabinZ - 2;

      // Second server rack position
      const rack2X = rackX - 1.2;
      const rack2Z = rackZ + 0.5;

      // Exclusion zones: { x, z, radius }
      const exclusionZones = [
        { x: 0, z: -8, r: 4 },       // Campfire
        { x: deskX, z: deskZ, r: 3.5 },  // Desk area
        { x: bedX, z: bedZ, r: 1.5 },    // Pet bed
        { x: rackX, z: rackZ, r: 1.2 },  // Server rack
        { x: rack2X, z: rack2Z, r: 1.2 }, // Second server rack
        { x: radioX, z: radioZ, r: 1 },  // Radio
        { x: binX, z: binZ, r: 0.8 },    // Bin
        { x: bikeX, z: bikeZ, r: 1.5 },  // Bike
        { x: cabinX, z: cabinZ, r: 8 },  // Cabin
        { x: workbenchX, z: workbenchZ, r: 1.5 },  // Workbench
        { x: bbqX, z: bbqZ, r: 1.2 },    // BBQ
        { x: toolsX, z: toolsZ, r: 1.5 }, // Garden tools
      ];

      // Helper to check if position is in any exclusion zone
      const isInExclusionZone = (x: number, z: number): boolean => {
        for (const zone of exclusionZones) {
          const dx = x - zone.x;
          const dz = z - zone.z;
          if (dx * dx + dz * dz < zone.r * zone.r) return true;
        }
        return false;
      };

      // Helper to check if too close to campfire (at 0, 0, -8)
      const isNearCampfire = (x: number, z: number): boolean => {
        const dx = x - 0;
        const dz = z - (-8);
        return dx * dx + dz * dz < 4 * 4;
      };

      // Helper to check if near desk area (larger zone for desk setup)
      const isNearDesk = (x: number, z: number): boolean => {
        const dx = x - deskX;
        const dz = z - deskZ;
        return dx * dx + dz * dz < 5 * 5;
      };

      // Add the desk setup (computer, chair, etc.)
      const deskSetup = this.createDeskSetup();
      deskSetup.position.set(deskX, Terrain.getTerrainHeight(deskX, deskZ), deskZ);
      // Face the desk towards spawn point
      deskSetup.rotation.y = Math.PI;
      objects.push(deskSetup);

      // Add Ivy's pet bed next to the desk
      const petBed = this.createPetBed();
      petBed.position.set(bedX, Terrain.getTerrainHeight(bedX, bedZ), bedZ);
      objects.push(petBed);

      // Add server rack near the desk
      const serverRack = this.createServerRack();
      serverRack.position.set(rackX, Terrain.getTerrainHeight(rackX, rackZ), rackZ);
      serverRack.rotation.y = Math.PI * 0.15; // Slightly angled
      objects.push(serverRack);

      // Empty coffee cups scattered around desk
      const cupPositions = [
        { x: deskX + 1.5, z: deskZ - 0.5, fallen: false },
        { x: deskX - 1.8, z: deskZ + 0.3, fallen: true },
        { x: deskX + 0.5, z: deskZ + 2.2, fallen: true },
        { x: deskX - 2.5, z: deskZ - 0.8, fallen: false },
      ];
      for (const pos of cupPositions) {
        const cup = this.createCoffeeCup(pos.fallen);
        cup.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z) + (pos.fallen ? 0.04 : 0), pos.z);
        cup.rotation.y = Math.random() * Math.PI * 2;
        objects.push(cup);
      }

      // Radio/speaker on a small area near the desk
      const radio = this.createRadioSpeaker();
      radio.position.set(radioX, Terrain.getTerrainHeight(radioX, radioZ), radioZ);
      radio.rotation.y = -0.3;
      objects.push(radio);

      // Trash bin with crumpled paper near desk
      const bin = this.createTrashBin();
      bin.position.set(binX, 0, binZ); // Place on flat ground
      objects.push(bin);

      // Bicycle parked nearby
      const bike = this.createBicycle();
      bike.position.set(bikeX, Terrain.getTerrainHeight(bikeX, bikeZ), bikeZ);
      bike.rotation.y = Math.PI * 0.3;
      objects.push(bike);

      // Stack of books near the campfire seating area
      const books1 = this.createBookStack();
      const books1X = -4;
      const books1Z = -10;
      books1.position.set(books1X, Terrain.getTerrainHeight(books1X, books1Z), books1Z);
      books1.rotation.y = Math.random() * Math.PI;
      objects.push(books1);

      // Another stack near the bench
      const books2 = this.createBookStack();
      const books2X = 4;
      const books2Z = -5;
      books2.position.set(books2X, Terrain.getTerrainHeight(books2X, books2Z), books2Z);
      books2.rotation.y = Math.random() * Math.PI;
      objects.push(books2);

      // More book stacks scattered around
      const books3 = this.createBookStack();
      const books3X = -6;
      const books3Z = 3;
      books3.position.set(books3X, Terrain.getTerrainHeight(books3X, books3Z), books3Z);
      books3.rotation.y = Math.random() * Math.PI;
      objects.push(books3);

      const books4 = this.createBookStack();
      const books4X = 6;
      const books4Z = 8;
      books4.position.set(books4X, Terrain.getTerrainHeight(books4X, books4Z), books4Z);
      books4.rotation.y = Math.random() * Math.PI;
      objects.push(books4);

      const books5 = this.createBookStack();
      const books5X = -2;
      const books5Z = 10;
      books5.position.set(books5X, Terrain.getTerrainHeight(books5X, books5Z), books5Z);
      books5.rotation.y = Math.random() * Math.PI;
      objects.push(books5);

      // Paper stacks around the area
      const papers1 = this.createPaperStack();
      const papers1X = deskX - 2;
      const papers1Z = deskZ + 1.5;
      papers1.position.set(papers1X, Terrain.getTerrainHeight(papers1X, papers1Z), papers1Z);
      papers1.rotation.y = 0.2;
      objects.push(papers1);

      const papers2 = this.createPaperStack();
      const papers2X = 2;
      const papers2Z = -12;
      papers2.position.set(papers2X, Terrain.getTerrainHeight(papers2X, papers2Z), papers2Z);
      papers2.rotation.y = -0.3;
      objects.push(papers2);

      const papers3 = this.createPaperStack();
      const papers3X = -5;
      const papers3Z = 7;
      papers3.position.set(papers3X, Terrain.getTerrainHeight(papers3X, papers3Z), papers3Z);
      papers3.rotation.y = Math.random() * Math.PI;
      objects.push(papers3);

      const papers4 = this.createPaperStack();
      const papers4X = 7;
      const papers4Z = 3;
      papers4.position.set(papers4X, Terrain.getTerrainHeight(papers4X, papers4Z), papers4Z);
      papers4.rotation.y = 1.2;
      objects.push(papers4);

      // Mini fridge between desk area and campfire
      const fridge = this.createMiniFridge();
      const fridgeX = 5;
      const fridgeZ = -2;
      fridge.position.set(fridgeX, Terrain.getTerrainHeight(fridgeX, fridgeZ), fridgeZ);
      fridge.rotation.y = -0.3;
      objects.push(fridge);

      // Workbench with drill (away from desk, near cabin side)
      const workbench = this.createWorkbench();
      workbench.position.set(workbenchX, Terrain.getTerrainHeight(workbenchX, workbenchZ), workbenchZ);
      workbench.rotation.y = 0.4; // Angled slightly
      objects.push(workbench);

      // BBQ grill for outdoor cooking
      const bbq = this.createBBQ();
      bbq.position.set(bbqX, Terrain.getTerrainHeight(bbqX, bbqZ), bbqZ);
      bbq.rotation.y = -0.5;
      objects.push(bbq);

      // Garden tools leaning against area near cabin
      const gardenTools = this.createGardenTools();
      gardenTools.position.set(toolsX, Terrain.getTerrainHeight(toolsX, toolsZ), toolsZ);
      gardenTools.rotation.y = 0.8;
      objects.push(gardenTools);

      // Second server rack next to the first one
      const serverRack2 = this.createServerRack();
      serverRack2.position.set(rack2X, Terrain.getTerrainHeight(rack2X, rack2Z), rack2Z);
      serverRack2.rotation.y = Math.PI * 0.1;
      objects.push(serverRack2);

      // Dog toys scattered near the pet bed
      const dogToys = this.createDogToys();
      const toysX = bedX - 1.5;
      const toysZ = bedZ + 1;
      dogToys.position.set(toysX, Terrain.getTerrainHeight(toysX, toysZ), toysZ);
      dogToys.rotation.y = 0.3;
      objects.push(dogToys);

      // Leash near the pet bed
      const leash = this.createLeash();
      const leashX = bedX + 0.8;
      const leashZ = bedZ - 0.5;
      leash.position.set(leashX, Terrain.getTerrainHeight(leashX, leashZ), leashZ);
      leash.rotation.y = 1.2;
      objects.push(leash);

      // Rubber duck on the desk (for debugging!)
      const rubberDuck = this.createRubberDuck();
      rubberDuck.position.set(deskX + 0.7, Terrain.getTerrainHeight(deskX, deskZ) + 0.9, deskZ - 0.1);
      rubberDuck.rotation.y = -0.5; // Looking at the monitor
      objects.push(rubberDuck);

      // Add moss patches around (avoiding all objects)
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 20;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (isInExclusionZone(x, z) || this.isNearPortal(x, z)) continue;

        const moss = this.createMoss();
        moss.position.set(x, Terrain.getTerrainHeight(x, z) + 0.01, z);
        objects.push(moss);
      }

      // === OUTER FLOWERS (60 clusters, ~400 flowers) ===
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 42 + Math.random() * 80;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        const clusterSize = 4 + Math.floor(Math.random() * 5);
        for (let j = 0; j < clusterSize; j++) {
          const flower = this.createFlower();
          const ox = (Math.random() - 0.5) * 3;
          const oz = (Math.random() - 0.5) * 3;
          flower.position.set(x + ox, Terrain.getTerrainHeight(x + ox, z + oz), z + oz);
          flower.scale.setScalar(0.6 + Math.random() * 0.5);
          objects.push(flower);
        }
      }

      // === FIREFLIES (5 clusters) ===
      // Center area fireflies (around the desk area)
      const centerFireflies = this.createFireflyCluster(deskX, deskZ, 20);
      objects.push(centerFireflies);

      // Add more firefly clusters throughout the forest
      const fireflyClusterPositions = [
        { x: 50, z: 30 },
        { x: -60, z: 40 },
        { x: 70, z: -50 },
        { x: -40, z: -70 },
      ];

      for (const pos of fireflyClusterPositions) {
        const clusterFireflies = this.createFireflyCluster(pos.x, pos.z, 15 + Math.random() * 10);
        objects.push(clusterFireflies);
      }

      // === MIDDLE ROCKS (12) ===
      for (let i = 0; i < 12; i++) {
        let x, z, attempts = 0;
        do {
          const angle = Math.random() * Math.PI * 2;
          const distance = 18 + Math.random() * 25;
          x = Math.cos(angle) * distance;
          z = Math.sin(angle) * distance;
          attempts++;
        } while ((isInExclusionZone(x, z) || this.isNearPortal(x, z)) && attempts < 20);

        if (attempts >= 20) continue;

        const rock = this.createRock(0.3 + Math.random() * 0.5);
        rock.position.set(x, Terrain.getTerrainHeight(x, z) + 0.15, z);
        objects.push(rock);
      }

      // === CENTER FLOWERS (scattered around spawn) ===
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 2 + Math.random() * 6;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        if (isInExclusionZone(x, z)) continue;

        const flower = this.createFlower();
        flower.position.set(x, Terrain.getTerrainHeight(x, z), z);
        flower.scale.setScalar(0.6 + Math.random() * 0.4);
        objects.push(flower);
      }

      // === CENTER GRASS (scattered around spawn) ===
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 2 + Math.random() * 6;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        if (isInExclusionZone(x, z)) continue;

        const grass = this.createTallGrass();
        grass.position.set(x, Terrain.getTerrainHeight(x, z), z);
        grass.scale.setScalar(0.7 + Math.random() * 0.3);
        objects.push(grass);
      }

      // === MIDDLE TALL GRASS (35) ===
      for (let i = 0; i < 35; i++) {
        let x, z, attempts = 0;
        do {
          const angle = Math.random() * Math.PI * 2;
          const distance = 8 + Math.random() * 20;
          x = Math.cos(angle) * distance;
          z = Math.sin(angle) * distance;
          attempts++;
        } while ((isInExclusionZone(x, z) || this.isNearPortal(x, z)) && attempts < 20);

        if (attempts >= 20) continue;

        const grass = this.createTallGrass();
        grass.position.set(x, Terrain.getTerrainHeight(x, z), z);
        objects.push(grass);
      }

      // === MIDDLE FERNS (20) ===
      for (let i = 0; i < 20; i++) {
        let x, z, attempts = 0;
        do {
          const angle = Math.random() * Math.PI * 2;
          const dist = 8 + Math.random() * 18;
          x = Math.cos(angle) * dist;
          z = Math.sin(angle) * dist;
          attempts++;
        } while ((isInExclusionZone(x, z) || this.isNearPortal(x, z)) && attempts < 20);

        if (attempts >= 20) continue;

        const fern = this.createFern();
        fern.position.set(x, Terrain.getTerrainHeight(x, z), z);
        fern.rotation.y = Math.random() * Math.PI * 2;
        fern.scale.setScalar(0.8 + Math.random() * 0.4);
        objects.push(fern);
      }

      // === SMALL FLOWER PATCHES (15, ~45 flowers) ===
      for (let i = 0; i < 15; i++) {
        let x, z, attempts = 0;
        do {
          const angle = Math.random() * Math.PI * 2;
          const dist = 6 + Math.random() * 16;
          x = Math.cos(angle) * dist;
          z = Math.sin(angle) * dist;
          attempts++;
        } while ((isInExclusionZone(x, z) || this.isNearPortal(x, z)) && attempts < 20);

        if (attempts >= 20) continue;

        for (let j = 0; j < 3; j++) {
          const flower = this.createFlower();
          const fx = x + (Math.random() - 0.5) * 1;
          const fz = z + (Math.random() - 0.5) * 1;
          flower.position.set(fx, Terrain.getTerrainHeight(fx, fz), fz);
          flower.scale.setScalar(0.5 + Math.random() * 0.4);
          objects.push(flower);
        }
      }

      // === MIDDLE BUSHES (10) ===
      for (let i = 0; i < 10; i++) {
        let x, z, attempts = 0;
        do {
          const angle = Math.random() * Math.PI * 2;
          const dist = 8 + Math.random() * 18;
          x = Math.cos(angle) * dist;
          z = Math.sin(angle) * dist;
          attempts++;
        } while ((isInExclusionZone(x, z) || this.isNearPortal(x, z)) && attempts < 20);

        if (attempts >= 20) continue;

        const bush = this.createBush();
        bush.position.set(x, Terrain.getTerrainHeight(x, z), z);
        objects.push(bush);
      }

      // === SEAT LOGS (2) ===
      const seatLogPositions = [
        { x: -3, z: -11, rot: 0.3 },
        { x: 3, z: -11.5, rot: -0.2 },
      ];
      for (const pos of seatLogPositions) {
        const log = this.createLog();
        const radius = log.userData.radius || 0.4;
        log.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z) + radius, pos.z);
        log.rotation.y = pos.rot;
        objects.push(log);
      }

      // === LANTERNS (5) - simplified, no PointLights ===

      const lanternPositions = [
        { x: -6, z: 6 },
        { x: 6, z: 6 },
        { x: -6, z: -4 },
        { x: 6, z: -4 },
        { x: cabinX + 5, z: cabinZ - 3 },
      ];
      for (const pos of lanternPositions) {
        const x = pos.x;
        const z = pos.z;

        if (isInExclusionZone(x, z)) continue;

        const lantern = this.createLantern();
        lantern.position.set(x, Terrain.getTerrainHeight(x, z), z);
        objects.push(lantern);
        exclusionZones.push({ x, z, r: 2 });
      }

      // === BIRD HOUSES & PORTAL FOLIAGE ===
      // Add bird houses on some trees (attach to tree positions)
      let birdHousesPlaced = 0;
      for (const treePos of treesPositions) {
        if (birdHousesPlaced >= 8) break;
        if (Math.random() > 0.05) continue; // Only some trees get bird houses

        const birdHouse = this.createBirdHouse();
        const heightOnTree = 4 + Math.random() * 3;
        const offsetAngle = Math.random() * Math.PI * 2;
        birdHouse.position.set(
          treePos.x + Math.cos(offsetAngle) * 0.8,
          Terrain.getTerrainHeight(treePos.x, treePos.z) + heightOnTree,
          treePos.z + Math.sin(offsetAngle) * 0.8
        );
        birdHouse.rotation.y = offsetAngle + Math.PI; // Face outward
        objects.push(birdHouse);
        birdHousesPlaced++;
      }

      // Portals are positioned at distance 25 at various angles
      // We want foliage BETWEEN portals (not blocking them) in the portal zone (distance 15-40)

      // Helper to check if angle is too close to a portal direction
      const isNearPortalAngle = (angle: number): boolean => {
        // Portals are roughly evenly distributed, avoid within ~30 degrees of each
        const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        // Approximate portal positions - they spread evenly (home has 5 portals)
        for (let p = 0; p < 5; p++) {
          const portalAngle = (p / 5) * Math.PI * 2 - Math.PI / 2;
          const diff = Math.abs(normalizedAngle - ((portalAngle + Math.PI * 2) % (Math.PI * 2)));
          const minDiff = Math.min(diff, Math.PI * 2 - diff);
          if (minDiff < 0.5) return true; // ~30 degrees clearance
        }
        return false;
      };

      // Add foliage IN the portal zone (distance 15-38) but between portals
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;

        // Skip if too close to a portal path
        if (isNearPortalAngle(angle)) continue;

        const distance = 15 + Math.random() * 23; // distance 15-38
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (isNearDesk(x, z)) continue;

        const terrainY = Terrain.getTerrainHeight(x, z);

        // Mix of foliage
        const choice = Math.random();
        if (choice < 0.2) {
          const bush = this.createBush();
          bush.position.set(x, terrainY, z);
          objects.push(bush);
        } else if (choice < 0.45) {
          const fern = this.createFern();
          fern.position.set(x, terrainY, z);
          fern.rotation.y = Math.random() * Math.PI * 2;
          objects.push(fern);
        } else if (choice < 0.7) {
          const grass = this.createTallGrass();
          grass.position.set(x, terrainY, z);
          objects.push(grass);
        } else {
          // Flower cluster
          for (let j = 0; j < 4; j++) {
            const flower = this.createFlower();
            const ox = (Math.random() - 0.5) * 2;
            const oz = (Math.random() - 0.5) * 2;
            flower.position.set(x + ox, Terrain.getTerrainHeight(x + ox, z + oz), z + oz);
            flower.scale.setScalar(0.6 + Math.random() * 0.5);
            objects.push(flower);
          }
        }
      }

      // Add foliage just outside portal zone too
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 15; // distance 40-55
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        const terrainY = Terrain.getTerrainHeight(x, z);

        const choice = Math.random();
        if (choice < 0.3) {
          const bush = this.createBush();
          bush.position.set(x, terrainY, z);
          objects.push(bush);
        } else if (choice < 0.6) {
          const fern = this.createFern();
          fern.position.set(x, terrainY, z);
          fern.rotation.y = Math.random() * Math.PI * 2;
          objects.push(fern);
        } else {
          for (let j = 0; j < 3; j++) {
            const flower = this.createFlower();
            const ox = (Math.random() - 0.5) * 1.5;
            const oz = (Math.random() - 0.5) * 1.5;
            flower.position.set(x + ox, Terrain.getTerrainHeight(x + ox, z + oz), z + oz);
            flower.scale.setScalar(0.7 + Math.random() * 0.4);
            objects.push(flower);
          }
        }
      }

      // Add some foliage inside portal approach (distance 8-14)
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;

        if (isNearPortalAngle(angle)) continue;

        const distance = 8 + Math.random() * 6;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (isNearCampfire(x, z) || isNearDesk(x, z)) continue;

        const terrainY = Terrain.getTerrainHeight(x, z);

        if (Math.random() < 0.5) {
          const grass = this.createTallGrass();
          grass.position.set(x, terrainY, z);
          objects.push(grass);
        } else {
          const fern = this.createFern();
          fern.position.set(x, terrainY, z);
          fern.scale.setScalar(0.6 + Math.random() * 0.3);
          objects.push(fern);
        }
      }
      // === ROCKS (25) ===
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 80;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;

        const scale = 0.5 + Math.random() * 1.5;
        const rock = this.createRock(scale);
        const terrainY = Terrain.getTerrainHeight(x, z);
        rock.position.set(x, terrainY + scale * 0.3, z);
        objects.push(rock);
      }

      // === BUSHES (25) ===
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 80;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;

        const bush = this.createBush();
        const terrainY = Terrain.getTerrainHeight(x, z);
        bush.position.set(x, terrainY, z);
        objects.push(bush);
      }

      // === FERNS (35) ===
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 80;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;

        const fern = this.createFern();
        const terrainY = Terrain.getTerrainHeight(x, z);
        fern.position.set(x, terrainY, z);
        fern.rotation.y = Math.random() * Math.PI * 2;
        fern.scale.setScalar(0.8 + Math.random() * 0.5);
        objects.push(fern);
      }

      // === TALL GRASS (50 patches) ===
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 18 + Math.random() * 80;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;

        const grass = this.createTallGrass();
        const terrainY = Terrain.getTerrainHeight(x, z);
        grass.position.set(x, terrainY, z);
        grass.rotation.y = Math.random() * Math.PI * 2;
        objects.push(grass);
      }

      // === MUSHROOM CLUSTERS (15, ~45 mushrooms) ===
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 70;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;

        // Small cluster of 2-5 mushrooms
        const clusterSize = 2 + Math.floor(Math.random() * 4);
        for (let j = 0; j < clusterSize; j++) {
          const mushroom = this.createMushroom();
          const offsetX = (Math.random() - 0.5) * 1.5;
          const offsetZ = (Math.random() - 0.5) * 1.5;
          const terrainY = Terrain.getTerrainHeight(x + offsetX, z + offsetZ);
          mushroom.position.set(x + offsetX, terrainY, z + offsetZ);
          mushroom.scale.setScalar(0.8 + Math.random() * 0.6);
          objects.push(mushroom);
        }
      }

      // === FLOWER PATCHES (25 patches, ~175 flowers) ===
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 80;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;

        // Larger patches of 5-10 flowers
        const patchSize = 5 + Math.floor(Math.random() * 6);
        for (let j = 0; j < patchSize; j++) {
          const flower = this.createFlower();
          const offsetX = (Math.random() - 0.5) * 3;
          const offsetZ = (Math.random() - 0.5) * 3;
          const terrainY = Terrain.getTerrainHeight(x + offsetX, z + offsetZ);
          flower.position.set(x + offsetX, terrainY, z + offsetZ);
          flower.scale.setScalar(0.7 + Math.random() * 0.6);
          objects.push(flower);
        }
      }

      // === FALLEN LOGS (10) ===
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 80;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;

        const log = this.createLog();
        const terrainY = Terrain.getTerrainHeight(x, z);
        const radius = log.userData.radius || 0.4;
        log.position.set(x, terrainY + radius, z);
        log.rotation.y = Math.random() * Math.PI * 2;
        objects.push(log);
      }
      return objects;
    }

    // Skills planet - Flower Bed Garden with floating skill icons
    if (planetId === 'skills') {
      // Category colors
      const colors = {
        languages: 0x68a063,       // Green (code)
        frameworks: 0x61dafb,      // Cyan (React-ish)
        mobile: 0x8b5cf6,          // Purple (mobile)
        cloud: 0x2496ed,           // Blue (cloud/sky)
        data: 0x336791,            // Deep blue (database)
        infrastructure: 0xf97316,  // Orange (tools)
      };

      // Create a large flower bed with floating skill icons above
      const createFlowerBed = (
        centerX: number,
        centerZ: number,
        width: number,
        depth: number,
        category: string,
        skills: string[],
        color: number
      ) => {
        const bed = new THREE.Group();

        // Wooden border around the bed
        const borderMat = this.mats.darkWood;
        const borderHeight = 0.25;
        const borderThickness = 0.15;

        // Front border
        const frontBorder = new THREE.Mesh(
          new THREE.BoxGeometry(width + borderThickness * 2, borderHeight, borderThickness),
          borderMat
        );
        frontBorder.position.set(0, borderHeight / 2, depth / 2 + borderThickness / 2);
        bed.add(frontBorder);

        // Back border
        const backBorder = new THREE.Mesh(
          new THREE.BoxGeometry(width + borderThickness * 2, borderHeight, borderThickness),
          borderMat
        );
        backBorder.position.set(0, borderHeight / 2, -depth / 2 - borderThickness / 2);
        bed.add(backBorder);

        // Left border
        const leftBorder = new THREE.Mesh(
          new THREE.BoxGeometry(borderThickness, borderHeight, depth),
          borderMat
        );
        leftBorder.position.set(-width / 2 - borderThickness / 2, borderHeight / 2, 0);
        bed.add(leftBorder);

        // Right border
        const rightBorder = new THREE.Mesh(
          new THREE.BoxGeometry(borderThickness, borderHeight, depth),
          borderMat
        );
        rightBorder.position.set(width / 2 + borderThickness / 2, borderHeight / 2, 0);
        bed.add(rightBorder);

        // Soil/dirt inside the bed
        const soilGeo = new THREE.BoxGeometry(width, 0.1, depth);
        const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1 });
        const soil = new THREE.Mesh(soilGeo, soilMat);
        soil.position.y = 0.12;
        bed.add(soil);

        // Flowers filling the bed (low poly)
        const flowerCount = Math.floor(width * depth * 1.5);
        const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 3);
        const headGeo = new THREE.IcosahedronGeometry(0.08, 0);
        const petalMat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.2
        });

        for (let i = 0; i < flowerCount; i++) {
          const fx = (Math.random() - 0.5) * (width - 0.3);
          const fz = (Math.random() - 0.5) * (depth - 0.3);

          // Flower stem
          const stem = new THREE.Mesh(stemGeo, this.stemMaterial);
          stem.position.set(fx, 0.2, fz);
          bed.add(stem);

          // Flower head (low poly icosahedron)
          const head = new THREE.Mesh(headGeo, petalMat);
          head.position.set(fx, 0.4, fz);
          bed.add(head);
        }

        // Category sign at the front (wooden two-post style)
        const signZ = depth / 2 + 0.5;
        const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6);

        const leftPost = new THREE.Mesh(postGeo, this.mats.darkWood);
        leftPost.position.set(-0.8, 0.7, signZ);
        bed.add(leftPost);

        const rightPost = new THREE.Mesh(postGeo, this.mats.darkWood);
        rightPost.position.set(0.8, 0.7, signZ);
        bed.add(rightPost);

        // Sign board
        const boardGeo = new THREE.BoxGeometry(1.8, 0.8, 0.08);
        const board = new THREE.Mesh(boardGeo, this.mats.wood);
        board.position.set(0, 1.2, signZ);
        bed.add(board);

        // Sign text
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 512;
        signCanvas.height = 256;
        const signCtx = signCanvas.getContext('2d')!;
        signCtx.fillStyle = '#5c4033';
        signCtx.fillRect(0, 0, 512, 256);
        signCtx.fillStyle = '#fff';
        signCtx.font = 'bold 64px Arial';
        signCtx.textAlign = 'center';
        signCtx.textBaseline = 'middle';
        signCtx.fillText(category, 256, 128);

        const signTexture = new THREE.CanvasTexture(signCanvas);
        const signTextMat = new THREE.MeshBasicMaterial({ map: signTexture });
        const signText = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.7), signTextMat);
        signText.position.set(0, 1.2, signZ + 0.05);
        bed.add(signText);

        // Skill logos mapping
        const skillLogos: Record<string, string> = {
          'PHP': phpLogo,
          'Node.js': nodejsLogo,
          'Python': pythonLogo,
          'Go': goLogo,
          'C#': csharpLogo,
          'Java': javaLogo,
          'TypeScript': typescriptLogo,
          'Dart': dartLogo,
          'Next.js': nextjsLogo,
          'Angular': angularLogo,
          'React': reactLogo,
          'React Native': reactNativeLogo,
          'Flutter': flutterLogo,
          'Ionic': ionicLogo,
          'Laravel': laravelLogo,
          'NestJS': nestjsLogo,
          'Flask': flaskLogo,
          '.NET': dotnetLogo,
          'Postgres': postgresLogo,
          'MySQL': mysqlLogo,
          'MongoDB': mongodbLogo,
          'Redis': redisLogo,
          'AWS': awsLogo,
          'GCP': gcpLogo,
          'DigitalOcean': digitaloceanLogo,
          'K8s': k8sLogo,
          'Docker': dockerLogo,
          'GitHub Actions': githubLogo,
          'GitLab CI': gitlabLogo,
          'NGINX': nginxLogo,
          'Terraform': terraformLogo,
        };

        // Floating skill icons above the bed
        const iconSpacing = width / (skills.length + 1);
        skills.forEach((skill, i) => {
          const iconX = -width / 2 + iconSpacing * (i + 1);
          const iconGroup = new THREE.Group();

          // Check if we have a logo for this skill
          const logoUrl = skillLogos[skill];
          if (logoUrl) {
            // Use image texture for skills with logos - load and use natural aspect ratio
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(logoUrl, (logoTexture) => {
              const img = logoTexture.image;
              const aspect = img.width / img.height;
              const height = 1.2;
              const logoWidth = height * aspect;

              const logoMat = new THREE.MeshBasicMaterial({
                map: logoTexture,
                transparent: true,
                side: THREE.DoubleSide
              });
              const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoWidth, height), logoMat);
              logo.position.y = 0.8;
              iconGroup.add(logo);
            });
          } else {
            // Skill label panel (text fallback)
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 256;
            labelCanvas.height = 128;
            const labelCtx = labelCanvas.getContext('2d')!;

            // Rounded rect background
            labelCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            labelCtx.fillRect(0, 0, 256, 128);

            // Border
            labelCtx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
            labelCtx.lineWidth = 8;
            labelCtx.strokeRect(4, 4, 248, 120);

            // Skill name
            labelCtx.fillStyle = '#333333';
            labelCtx.font = 'bold 36px Arial';
            labelCtx.textAlign = 'center';
            labelCtx.textBaseline = 'middle';
            labelCtx.fillText(skill, 128, 64);

            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelMat = new THREE.MeshBasicMaterial({
              map: labelTexture,
              transparent: true,
              side: THREE.DoubleSide
            });
            const label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), labelMat);
            label.position.y = 0.6;
            iconGroup.add(label);
          }

          iconGroup.position.set(iconX, 1.5, 0);
          iconGroup.userData.isFloatingSkill = true;
          iconGroup.userData.baseY = 1.5;
          iconGroup.userData.phaseOffset = i * 0.5;
          bed.add(iconGroup);
        });

        bed.position.set(centerX, Terrain.getTerrainHeight(centerX, centerZ), centerZ);
        bed.rotation.y = Math.PI; // Face towards portal
        return bed;
      };

      // Seven flower beds: 2 columns x 4 rows (last row has 1 centered)
      const bedWidth = 28;
      const bedDepth = 6;
      const colSpacing = 32;  // horizontal spacing between columns
      const rowSpacing = 14;  // vertical spacing between rows

      // Row 1 (closest to player)
      objects.push(createFlowerBed(
        -colSpacing / 2, -rowSpacing * 1.5,
        bedWidth, bedDepth,
        'Languages',
        ['PHP', 'Node.js', 'Python', 'Java', 'Go', 'C#', 'TypeScript', 'Dart'],
        colors.languages
      ));

      objects.push(createFlowerBed(
        colSpacing / 2, -rowSpacing * 1.5,
        bedWidth, bedDepth,
        'Frontend',
        ['React', 'Angular', 'Next.js'],
        colors.frameworks
      ));

      // Row 2
      objects.push(createFlowerBed(
        -colSpacing / 2, -rowSpacing * 0.5,
        bedWidth, bedDepth,
        'Backend',
        ['Laravel', 'NestJS', 'Flask', '.NET'],
        colors.frameworks
      ));

      objects.push(createFlowerBed(
        colSpacing / 2, -rowSpacing * 0.5,
        bedWidth, bedDepth,
        'Mobile',
        ['Flutter', 'Ionic', 'React Native'],
        colors.mobile
      ));

      // Row 3
      objects.push(createFlowerBed(
        -colSpacing / 2, rowSpacing * 0.5,
        bedWidth, bedDepth,
        'Cloud',
        ['AWS', 'GCP', 'DigitalOcean'],
        colors.cloud
      ));

      objects.push(createFlowerBed(
        colSpacing / 2, rowSpacing * 0.5,
        bedWidth, bedDepth,
        'Data',
        ['Postgres', 'MySQL', 'MongoDB', 'Redis'],
        colors.data
      ));

      // Row 4 (furthest from player, centered) - wider bed for infra logos
      objects.push(createFlowerBed(
        0, rowSpacing * 1.5,
        bedWidth + 22, bedDepth,
        'Infrastructure',
        ['Docker', 'K8s', 'GitHub Actions', 'GitLab CI', 'NGINX', 'Terraform'],
        colors.infrastructure
      ));

      // Central gazebo/focal point (small)
      const gazebo = new THREE.Group();

      // Base platform
      const platformGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.2, 8);
      const platformMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.y = 0.1;
      gazebo.add(platform);

      // Central pillar
      const pillarGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.8, 8);
      const pillar = new THREE.Mesh(pillarGeo, this.mats.stone);
      pillar.position.y = 1;
      gazebo.add(pillar);

      // Top ornament
      const topGeo = new THREE.OctahedronGeometry(0.3);
      const topMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffa500,
        emissiveIntensity: 0.3,
        metalness: 0.8
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 2.1;
      top.rotation.y = Math.PI / 4;
      gazebo.add(top);

      gazebo.position.set(0, Terrain.getTerrainHeight(0, 0), 0);
      objects.push(gazebo);

      // Paths connecting the beds
      const pathPositions = [
        // Horizontal paths
        ...Array.from({ length: 8 }, (_, i) => ({ x: -4 + i * 1.2, z: 0 })),
        // Vertical paths
        ...Array.from({ length: 8 }, (_, i) => ({ x: 0, z: -4 + i * 1.2 })),
      ];
      for (const pos of pathPositions) {
        const stone = this.createSteppingStone();
        stone.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z) + 0.02, pos.z);
        objects.push(stone);
      }

      // Trees surrounding (dense forest like story world)
      // Skills world uses flatRadius 60
      const skillsFlatRadius = 60;
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 45 + Math.random() * 20;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        if (this.isNearPortal(x, z)) continue;
        const scale = 0.6 + Math.random() * 0.8;
        const tree = this.createTree(scale, 0.5 + Math.random() * 0.5);
        tree.position.set(x, Terrain.getTerrainHeight(x, z, skillsFlatRadius), z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        objects.push(tree);
      }

      // Lanterns around the beds
      const lanternPositions = [
        { x: -34, z: -26 }, { x: 34, z: -26 },
        { x: -34, z: 26 }, { x: 34, z: 26 },
        { x: -34, z: 0 }, { x: 34, z: 0 },
        { x: 0, z: -14 }, { x: 0, z: 14 },
      ];
      for (const pos of lanternPositions) {
        const lantern = this.createLantern();
        lantern.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z, skillsFlatRadius), pos.z);
        objects.push(lantern);
      }

      // Fireflies
      objects.push(this.createFireflyCluster(0, 0, 50));
      objects.push(this.createFireflyCluster(-28, -24, 15));
      objects.push(this.createFireflyCluster(28, 24, 15));

      // Benches to sit and admire
      const bench1 = this.createBench();
      bench1.position.set(-38, Terrain.getTerrainHeight(-38, 0, skillsFlatRadius), 0);
      bench1.rotation.y = Math.PI / 2;
      objects.push(bench1);

      const bench2 = this.createBench();
      bench2.position.set(38, Terrain.getTerrainHeight(38, 0, skillsFlatRadius), 0);
      bench2.rotation.y = -Math.PI / 2;
      objects.push(bench2);

      // Ferns and bushes around the edges
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 38 + Math.random() * 10;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        if (this.isNearPortal(x, z)) continue;

        if (Math.random() < 0.5) {
          const fern = this.createFern();
          fern.position.set(x, Terrain.getTerrainHeight(x, z, skillsFlatRadius), z);
          fern.rotation.y = Math.random() * Math.PI * 2;
          fern.scale.setScalar(0.7 + Math.random() * 0.4);
          objects.push(fern);
        } else {
          const bush = this.createBush();
          bush.position.set(x, Terrain.getTerrainHeight(x, z, skillsFlatRadius), z);
          objects.push(bush);
        }
      }

      // Mushrooms around the edges near trees
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 42 + Math.random() * 8;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        if (this.isNearPortal(x, z)) continue;

        const mushroom = this.createMushroom();
        mushroom.position.set(x, Terrain.getTerrainHeight(x, z, skillsFlatRadius), z);
        objects.push(mushroom);
      }

      // Garden tools (placed safely away from flower beds)
      const gardenTools1 = this.createGardenTools();
      gardenTools1.position.set(-30, Terrain.getTerrainHeight(-30, -20, skillsFlatRadius), -20);
      gardenTools1.rotation.y = 0.5;
      objects.push(gardenTools1);

      const gardenTools2 = this.createGardenTools();
      gardenTools2.position.set(32, Terrain.getTerrainHeight(32, 18, skillsFlatRadius), 18);
      gardenTools2.rotation.y = -0.8;
      objects.push(gardenTools2);

      const gardenTools3 = this.createGardenTools();
      gardenTools3.position.set(-28, Terrain.getTerrainHeight(-28, 22, skillsFlatRadius), 22);
      gardenTools3.rotation.y = 1.2;
      objects.push(gardenTools3);

      const gardenTools4 = this.createGardenTools();
      gardenTools4.position.set(30, Terrain.getTerrainHeight(30, -18, skillsFlatRadius), -18);
      gardenTools4.rotation.y = 2.5;
      objects.push(gardenTools4);

      // Flowers around the edges
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 36 + Math.random() * 12;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        if (this.isNearPortal(x, z)) continue;

        const flower = this.createFlower();
        flower.position.set(x, Terrain.getTerrainHeight(x, z, skillsFlatRadius), z);
        flower.scale.setScalar(0.6 + Math.random() * 0.4);
        objects.push(flower);
      }

      // Aurora in the sky
      const aurora = this.createAurora();
      objects.push(aurora);

      return objects;
    }

    // Articles/Inkwell planet - Library Gallery
    if (planetId === 'articles') {
      // Helper to create a bookshelf with books
      const createBookshelf = (category: string, bookCount: number, shelfColor: number) => {
        const shelf = new THREE.Group();

        // Shelf frame (dark wood)
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 });
        const backMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });

        // Back panel
        const backGeo = new THREE.BoxGeometry(4, 5, 0.1);
        const back = new THREE.Mesh(backGeo, backMat);
        back.position.set(0, 2.5, -0.3);
        shelf.add(back);

        // Side panels
        const sideGeo = new THREE.BoxGeometry(0.15, 5, 0.7);
        const leftSide = new THREE.Mesh(sideGeo, frameMat);
        leftSide.position.set(-2, 2.5, 0);
        shelf.add(leftSide);
        const rightSide = new THREE.Mesh(sideGeo, frameMat);
        rightSide.position.set(2, 2.5, 0);
        shelf.add(rightSide);

        // Top
        const topGeo = new THREE.BoxGeometry(4.3, 0.15, 0.7);
        const top = new THREE.Mesh(topGeo, frameMat);
        top.position.set(0, 5, 0);
        shelf.add(top);

        // Shelves (4 levels)
        const shelfGeo = new THREE.BoxGeometry(3.8, 0.1, 0.6);
        for (let i = 0; i < 4; i++) {
          const shelfBoard = new THREE.Mesh(shelfGeo, frameMat);
          shelfBoard.position.set(0, 0.5 + i * 1.2, 0);
          shelf.add(shelfBoard);

          // Books on each shelf
          const booksOnShelf = Math.min(bookCount - i * 4, 4);
          for (let b = 0; b < booksOnShelf && b < 6; b++) {
            const bookHeight = 0.7 + Math.random() * 0.3;
            const bookWidth = 0.15 + Math.random() * 0.1;
            const bookGeo = new THREE.BoxGeometry(bookWidth, bookHeight, 0.4);
            const bookColors = [0x8b0000, 0x00008b, 0x006400, 0x4b0082, 0x8b4513, 0x2f4f4f, shelfColor];
            const bookMat = new THREE.MeshStandardMaterial({
              color: bookColors[Math.floor(Math.random() * bookColors.length)],
              roughness: 0.7
            });
            const book = new THREE.Mesh(bookGeo, bookMat);
            book.position.set(-1.5 + b * 0.55 + Math.random() * 0.1, 0.55 + i * 1.2 + bookHeight / 2, 0.05);
            book.rotation.z = (Math.random() - 0.5) * 0.1;
            shelf.add(book);
          }
        }

        // Category label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d')!;
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 28px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(category, 128, 32);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture });
        const labelGeo = new THREE.PlaneGeometry(2.5, 0.6);
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, 5.4, 0.8); // Brought forward for easier reading
        shelf.add(label);

        return shelf;
      };

      // Categories with book counts and URLs
      const categories = [
        { name: 'Projects', count: 12, color: 0x50c878, url: 'https://pot.rexchoppers.com/articles.html#projects' },
        { name: 'Code/Tech', count: 11, color: 0x4a90d9, url: 'https://pot.rexchoppers.com/articles.html#codetech' },
        { name: 'Tutorials/Reviews', count: 9, color: 0xcd853f, url: 'https://pot.rexchoppers.com/articles.html#tutorialsreviews' },
        { name: 'Personal', count: 5, color: 0x9966cc, url: 'https://pot.rexchoppers.com/articles.html#personal' },
      ];

      // Offset everything forward from the portal (portal is at z=-18)
      const centerZ = 8; // Push the whole library area forward

      // Arrange bookshelves in a circle surrounding the desk
      // Portal is at (0, -18) in the -Z direction, leave a clear path there
      // 4 shelves at 90 degrees apart, offset by 45 degrees so none block the portal path
      const shelfRadius = 10;
      const numShelves = categories.length;
      const angleStep = (Math.PI * 2) / numShelves; // 90 degrees each
      const offsetAngle = Math.PI / 4; // 45 degree offset - shelves at diagonals, clear path down center

      categories.forEach((cat, index) => {
        const angle = offsetAngle + index * angleStep;
        const x = Math.cos(angle) * shelfRadius;
        const z = Math.sin(angle) * shelfRadius + centerZ;

        const bookshelf = createBookshelf(cat.name, cat.count, cat.color);
        bookshelf.position.set(x, Terrain.getTerrainHeight(x, z), z);
        // Face inward toward the desk (add PI to flip)
        bookshelf.rotation.y = Math.atan2(x, z - centerZ) + Math.PI;
        // Store URL for interaction
        bookshelf.userData.isBookshelf = true;
        bookshelf.userData.categoryName = cat.name;
        bookshelf.userData.url = cat.url;
        objects.push(bookshelf);

        // Add fireflies around each bookshelf
        const fireflyCluster = this.createFireflyCluster(x, z, 15);
        objects.push(fireflyCluster);
      });

      // Central desk with inkwell
      const deskGroup = new THREE.Group();

      // Desk top
      const deskMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.6 });
      const deskTopGeo = new THREE.BoxGeometry(3, 0.15, 1.8);
      const deskTop = new THREE.Mesh(deskTopGeo, deskMat);
      deskTop.position.y = 1;
      deskGroup.add(deskTop);

      // Desk legs
      const legGeo = new THREE.BoxGeometry(0.15, 1, 0.15);
      const legPositions = [[-1.3, 0.5, -0.7], [1.3, 0.5, -0.7], [-1.3, 0.5, 0.7], [1.3, 0.5, 0.7]];
      legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, deskMat);
        leg.position.set(pos[0], pos[1], pos[2]);
        deskGroup.add(leg);
      });

      // Inkwell
      const inkwellGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.15, 8);
      const inkwellMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.3 });
      const inkwell = new THREE.Mesh(inkwellGeo, inkwellMat);
      inkwell.position.set(-0.8, 1.15, 0);
      deskGroup.add(inkwell);

      // Ink inside
      const inkGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8);
      const inkMat = new THREE.MeshStandardMaterial({ color: 0x000033 });
      const ink = new THREE.Mesh(inkGeo, inkMat);
      ink.position.set(-0.8, 1.1, 0);
      deskGroup.add(ink);

      // Quill resting in inkwell
      const quillGroup = new THREE.Group();
      const quillShaftGeo = new THREE.CylinderGeometry(0.01, 0.02, 0.35, 6);
      const quillMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
      const quillShaft = new THREE.Mesh(quillShaftGeo, quillMat);
      quillShaft.position.y = 0.1; // Offset so tip is at bottom
      quillGroup.add(quillShaft);
      const quillTipGeo = new THREE.ConeGeometry(0.012, 0.06, 4);
      const quillTipMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
      const quillTip = new THREE.Mesh(quillTipGeo, quillTipMat);
      quillTip.position.y = -0.1;
      quillGroup.add(quillTip);
      // Position so tip dips into inkwell (inkwell at -0.8, ink surface at ~1.12)
      quillGroup.position.set(-0.8, 1.25, 0);
      quillGroup.rotation.z = 0.4; // Lean to the side
      deskGroup.add(quillGroup);

      // Open book on desk
      const openBookGroup = new THREE.Group();
      const pageMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
      const leftPageGeo = new THREE.BoxGeometry(0.4, 0.02, 0.5);
      const leftPage = new THREE.Mesh(leftPageGeo, pageMat);
      leftPage.position.set(-0.21, 0, 0);
      leftPage.rotation.z = 0.05;
      openBookGroup.add(leftPage);
      const rightPage = new THREE.Mesh(leftPageGeo, pageMat);
      rightPage.position.set(0.21, 0, 0);
      rightPage.rotation.z = -0.05;
      openBookGroup.add(rightPage);
      openBookGroup.position.set(0.5, 1.12, 0);
      deskGroup.add(openBookGroup);

      // Stack of papers
      const paperStackGeo = new THREE.BoxGeometry(0.35, 0.08, 0.45);
      const paperMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0 });
      const paperStack = new THREE.Mesh(paperStackGeo, paperMat);
      paperStack.position.set(1.1, 1.12, 0.3);
      paperStack.rotation.y = 0.15;
      deskGroup.add(paperStack);

      deskGroup.position.set(0, Terrain.getTerrainHeight(0, centerZ), centerZ);
      objects.push(deskGroup);

      // Reading chair
      const createReadingChair = () => {
        const chair = new THREE.Group();
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0x800020, roughness: 0.8 });

        // Seat
        const seatGeo = new THREE.BoxGeometry(0.8, 0.1, 0.7);
        const seat = new THREE.Mesh(seatGeo, cushionMat);
        seat.position.y = 0.5;
        chair.add(seat);

        // Back
        const backGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
        const back = new THREE.Mesh(backGeo, cushionMat);
        back.position.set(0, 0.95, -0.3);
        chair.add(back);

        // Legs
        const chairLegGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6);
        const chairLegPositions = [[-0.3, 0.22, -0.25], [0.3, 0.22, -0.25], [-0.3, 0.22, 0.25], [0.3, 0.22, 0.25]];
        chairLegPositions.forEach(pos => {
          const leg = new THREE.Mesh(chairLegGeo, chairMat);
          leg.position.set(pos[0], pos[1], pos[2]);
          chair.add(leg);
        });

        // Armrests
        const armGeo = new THREE.BoxGeometry(0.08, 0.08, 0.5);
        const leftArm = new THREE.Mesh(armGeo, chairMat);
        leftArm.position.set(-0.4, 0.7, 0);
        chair.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, chairMat);
        rightArm.position.set(0.4, 0.7, 0);
        chair.add(rightArm);

        return chair;
      };

      // Place reading chairs (facing the desk at centerZ)
      const chair1 = createReadingChair();
      const chair1X = -2.5, chair1Z = centerZ + 2;
      chair1.position.set(chair1X, Terrain.getTerrainHeight(chair1X, chair1Z), chair1Z);
      chair1.rotation.y = Math.atan2(-chair1X, -(chair1Z - centerZ)); // Face desk center
      objects.push(chair1);

      const chair2 = createReadingChair();
      const chair2X = 2.5, chair2Z = centerZ + 2;
      chair2.position.set(chair2X, Terrain.getTerrainHeight(chair2X, chair2Z), chair2Z);
      chair2.rotation.y = Math.atan2(-chair2X, -(chair2Z - centerZ)); // Face desk center
      objects.push(chair2);

      // Reading lamps (floor lamps)
      const createFloorLamp = () => {
        const lamp = new THREE.Group();

        const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.8, 8);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 0.9;
        lamp.add(pole);

        const baseGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.1, 8);
        const base = new THREE.Mesh(baseGeo, poleMat);
        base.position.y = 0.05;
        lamp.add(base);

        const shadeGeo = new THREE.ConeGeometry(0.3, 0.4, 8, 1, true);
        const shadeMat = new THREE.MeshStandardMaterial({
          color: 0xfff8dc,
          side: THREE.DoubleSide,
          emissive: 0xffa500,
          emissiveIntensity: 1.5
        });
        const shade = new THREE.Mesh(shadeGeo, shadeMat);
        shade.position.y = 2;
        shade.rotation.x = Math.PI;
        lamp.add(shade);

        // Glowing bulb inside
        const bulbGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const bulbMat = new THREE.MeshStandardMaterial({
          color: 0xffffaa,
          emissive: 0xffaa00,
          emissiveIntensity: 4
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.y = 1.85;
        lamp.add(bulb);

        const light = new THREE.PointLight(0xffa500, 4, 20);
        light.position.y = 1.9;
        lamp.add(light);

        return lamp;
      };

      const lamp1 = createFloorLamp();
      lamp1.position.set(-4, Terrain.getTerrainHeight(-4, centerZ), centerZ);
      objects.push(lamp1);

      const lamp2 = createFloorLamp();
      lamp2.position.set(4, Terrain.getTerrainHeight(4, centerZ), centerZ);
      objects.push(lamp2);

      // Lanterns around the library (outside the bookshelves, avoiding portal at z=-18)
      const lanternPositions = [
        { x: -14, z: centerZ }, { x: 14, z: centerZ },
        { x: -16, z: centerZ - 6 }, { x: 16, z: centerZ - 6 },
        { x: -12, z: centerZ + 8 }, { x: 12, z: centerZ + 8 },
      ];
      lanternPositions.forEach(pos => {
        const lantern = this.createLantern();
        lantern.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        objects.push(lantern);
      });

      // Flowers between portal and bookshelves (z from -14 to -2)
      for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 24; // -12 to 12
        const z = -14 + Math.random() * 12; // -14 to -2

        if (this.isNearPortal(x, z)) continue;

        const flower = this.createFlower();
        flower.position.set(x, Terrain.getTerrainHeight(x, z), z);
        flower.scale.setScalar(0.6 + Math.random() * 0.4);
        objects.push(flower);
      }

      // Some ferns and grass in the path area too
      for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * 20;
        const z = -12 + Math.random() * 10;

        if (this.isNearPortal(x, z)) continue;

        if (Math.random() > 0.5) {
          const fern = this.createFern();
          fern.position.set(x, Terrain.getTerrainHeight(x, z), z);
          fern.rotation.y = Math.random() * Math.PI * 2;
          objects.push(fern);
        } else {
          const grass = this.createTallGrass();
          grass.position.set(x, Terrain.getTerrainHeight(x, z), z);
          grass.rotation.y = Math.random() * Math.PI * 2;
          objects.push(grass);
        }
      }

      // Decorative rug under the desk
      const rugGeo = new THREE.CircleGeometry(3, 32);
      const rugMat = new THREE.MeshStandardMaterial({ color: 0x800020, roughness: 0.9 });
      const rug = new THREE.Mesh(rugGeo, rugMat);
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, Terrain.getTerrainHeight(0, centerZ) + 0.02, centerZ);
      objects.push(rug);

      // Book stacks scattered around (inside the bookshelf circle)
      const bookStackPositions = [
        { x: -3, z: centerZ - 2 }, { x: 3, z: centerZ - 2 },
        { x: -1.5, z: centerZ + 3 }, { x: 1.5, z: centerZ + 3 },
        { x: -5, z: centerZ + 2 }, { x: 5, z: centerZ + 2 },
      ];
      bookStackPositions.forEach(pos => {
        const books = this.createBookStack();
        books.position.set(pos.x, Terrain.getTerrainHeight(pos.x, pos.z), pos.z);
        books.rotation.y = Math.random() * Math.PI;
        objects.push(books);
      });

      // Trees surrounding (like other worlds)
      const minTreeSpacing = 6;
      const treePositions: { x: number; z: number }[] = [];

      const isTooCloseToOtherTrees = (x: number, z: number): boolean => {
        for (const pos of treePositions) {
          const dx = x - pos.x;
          const dz = z - pos.z;
          if (dx * dx + dz * dz < minTreeSpacing * minTreeSpacing) {
            return true;
          }
        }
        return false;
      };

      // Check if near library area (now centered at z=centerZ)
      const isNearLibrary = (x: number, z: number): boolean => {
        const dist = Math.sqrt(x * x + (z - centerZ) * (z - centerZ));
        return dist < 14;
      };

      let treesPlaced = 0;
      let attempts = 0;
      while (treesPlaced < 300 && attempts < 3000) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const distance = 18 + Math.random() * 45;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearLibrary(x, z)) continue;
        if (isTooCloseToOtherTrees(x, z)) continue;

        const scale = 0.7 + Math.random() * 0.8;
        const tree = this.createTree(scale, 0.5 + Math.random() * 0.4);
        tree.position.set(x, Terrain.getTerrainHeight(x, z), z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        treePositions.push({ x, z });
        objects.push(tree);
        treesPlaced++;
      }

      // Ferns
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 18 + Math.random() * 40;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearLibrary(x, z)) continue;

        const fern = this.createFern();
        fern.position.set(x, Terrain.getTerrainHeight(x, z), z);
        fern.rotation.y = Math.random() * Math.PI * 2;
        objects.push(fern);
      }

      // Bushes
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 40;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearLibrary(x, z)) continue;

        const bush = this.createBush();
        bush.position.set(x, Terrain.getTerrainHeight(x, z), z);
        bush.rotation.y = Math.random() * Math.PI * 2;
        objects.push(bush);
      }

      // Flowers
      for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 16 + Math.random() * 45;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearLibrary(x, z)) continue;

        const flower = this.createFlower();
        flower.position.set(x, Terrain.getTerrainHeight(x, z), z);
        flower.scale.setScalar(0.6 + Math.random() * 0.4);
        objects.push(flower);
      }

      // Tall grass
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 18 + Math.random() * 40;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearLibrary(x, z)) continue;

        const grass = this.createTallGrass();
        grass.position.set(x, Terrain.getTerrainHeight(x, z), z);
        grass.rotation.y = Math.random() * Math.PI * 2;
        objects.push(grass);
      }

      // Mushrooms
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 35;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearLibrary(x, z)) continue;

        const mushroom = this.createMushroom();
        mushroom.position.set(x, Terrain.getTerrainHeight(x, z), z);
        mushroom.rotation.y = Math.random() * Math.PI * 2;
        objects.push(mushroom);
      }

      // Rocks
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 22 + Math.random() * 40;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (this.isNearPortal(x, z)) continue;
        if (isNearLibrary(x, z)) continue;

        const rock = this.createRock(0.3 + Math.random() * 0.5);
        rock.position.set(x, Terrain.getTerrainHeight(x, z), z);
        rock.rotation.y = Math.random() * Math.PI * 2;
        objects.push(rock);
      }

      // Text constellation in the sky
      const textConstellation = this.createTextConstellation();
      objects.push(textConstellation);

      return objects;
    }

    // Other planets get their decorations
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 70;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      // Skip portal zone
      if (this.isNearPortal(x, z)) {
        continue;
      }

      let decoration: THREE.Mesh;

      switch (planetId) {
        case 'skills':
          // Floating crystals
          const crystalGeo = new THREE.OctahedronGeometry(1 + Math.random());
          const crystalMat = new THREE.MeshStandardMaterial({
            color: config.lightColor,
            emissive: config.lightColor,
            emissiveIntensity: 0.3,
            metalness: 0.9,
            roughness: 0.1,
          });
          decoration = new THREE.Mesh(crystalGeo, crystalMat);
          decoration.position.y = 2 + Math.random() * 3;
          decoration.rotation.set(Math.random(), Math.random(), Math.random());
          break;

        case 'projects':
          // Anvils/forges (boxes)
          const anvilGeo = new THREE.BoxGeometry(1.5, 1, 2);
          const anvilMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.3,
          });
          decoration = new THREE.Mesh(anvilGeo, anvilMat);
          decoration.position.y = 0.5;
          break;

        default:
          // Generic rocks
          const rockGeo = new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.5, 0);
          const rockMat = new THREE.MeshStandardMaterial({
            color: config.groundColor,
            roughness: 0.9,
            flatShading: true,
          });
          decoration = new THREE.Mesh(rockGeo, rockMat);
          decoration.position.y = 0.3;
          decoration.rotation.set(Math.random(), Math.random(), Math.random());
      }

      const terrainY = Terrain.getTerrainHeight(x, z);
      decoration.position.x = x;
      decoration.position.y += terrainY;
      decoration.position.z = z;
      decoration.castShadow = true;
      objects.push(decoration);
    }

    return objects;
  }
}
