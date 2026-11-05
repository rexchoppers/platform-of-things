import * as THREE from 'three';
import { Collisions } from '../environment/Collisions';
import { Terrain } from '../environment/Terrain';

interface Leg {
  group: THREE.Group;
  upper: THREE.Group;
  lower: THREE.Group;
  paw: THREE.Mesh;
}

export class Dog {
  private static readonly BODY_RADIUS = 0.5;
  private static readonly STEP_HEIGHT = 0.35;
  private static readonly CATCH_UP_DISTANCE = 30;

  // Following. The player walks at about 6 and sprints at about 12.5.
  private static readonly START_FOLLOWING = 5.5;
  private static readonly STOP_FOLLOWING = 3.4;
  private static readonly TROT_SPEED = 6.5;
  private static readonly RUN_SPEED = 15;
  private static readonly ACCELERATION = 14;
  private static readonly BRAKING = 18;
  private static readonly SIT_AFTER_SECONDS = 3.5;

  public mesh: THREE.Group;
  public name: string;

  // Body parts for animation
  //@ts-ignore
  private body: THREE.Group;
  //@ts-ignore
  private spine: THREE.Group;
  //@ts-ignore
  private tail: THREE.Group;
  //@ts-ignore
  private tailTip: THREE.Mesh;
  //@ts-ignore
  private frontLeftLeg: Leg;
  //@ts-ignore
  private frontRightLeg: Leg;
  //@ts-ignore
  private backLeftLeg: Leg;
  //@ts-ignore
  private backRightLeg: Leg;
  //@ts-ignore
  private head: THREE.Group;
  //@ts-ignore
  private neck: THREE.Group;

  // Animation state
  private isMoving: boolean = false;
  private walkCycle: number = 0;
  private animationBlend: number = 0;
  private tailWag: number = 0;
  private currentSpeed: number = 0;

  private runBlend: number = 0;
  private sitBlend: number = 0;
  private idleSeconds: number = 0;
  private isFollowing: boolean = false;
  private isTurningOnTheSpot: boolean = false;

  // Interaction state
  private isPetted: boolean = false;
  private pettedTimer: number = 0;

  constructor(name: string = 'Ivy') {
    this.name = name;
    this.mesh = new THREE.Group();
    this.mesh.name = name;

    this.createDog();
  }

  private createDog(): void {
    // Golden retriever colors
    const furColor = 0xd4a55a;
    const darkFurColor = 0xb8934d;
    const noseColor = 0x1a1a1a;

    const furMaterial = new THREE.MeshStandardMaterial({
      color: furColor,
      roughness: 0.9,
      flatShading: true
    });

    const darkFurMaterial = new THREE.MeshStandardMaterial({
      color: darkFurColor,
      roughness: 0.9,
      flatShading: true
    });

    const noseMaterial = new THREE.MeshStandardMaterial({
      color: noseColor,
      roughness: 0.5
    });

    // Main body group (for overall movement)
    this.body = new THREE.Group();
    this.mesh.add(this.body);

    // Spine group (for flex animation)
    this.spine = new THREE.Group();
    this.body.add(this.spine);

    // Main body mesh
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 1.8);
    const bodyMesh = new THREE.Mesh(bodyGeo, furMaterial);
    bodyMesh.position.y = 0.9;
    this.spine.add(bodyMesh);

    // Chest/shoulders
    const chestGeo = new THREE.BoxGeometry(1.1, 0.75, 0.6);
    const chest = new THREE.Mesh(chestGeo, furMaterial);
    chest.position.set(0, 0.88, 0.85);
    this.spine.add(chest);

    // Hips
    const hipsGeo = new THREE.BoxGeometry(1.0, 0.7, 0.5);
    const hips = new THREE.Mesh(hipsGeo, darkFurMaterial);
    hips.position.set(0, 0.85, -0.85);
    this.spine.add(hips);

    // Neck group
    this.neck = new THREE.Group();
    this.neck.position.set(0, 1.1, 1.1);
    this.spine.add(this.neck);

    const neckGeo = new THREE.BoxGeometry(0.5, 0.5, 0.4);
    const neckMesh = new THREE.Mesh(neckGeo, furMaterial);
    neckMesh.position.set(0, 0.1, 0.1);
    this.neck.add(neckMesh);

    // Head group
    this.head = new THREE.Group();
    this.head.position.set(0, 0.3, 0.4);
    this.neck.add(this.head);

    // Head mesh
    const headGeo = new THREE.BoxGeometry(0.8, 0.65, 0.75);
    const headMesh = new THREE.Mesh(headGeo, furMaterial);
    this.head.add(headMesh);

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.45, 0.35, 0.55);
    const snout = new THREE.Mesh(snoutGeo, furMaterial);
    snout.position.set(0, -0.08, 0.5);
    this.head.add(snout);

    // Nose
    const noseGeo = new THREE.BoxGeometry(0.18, 0.12, 0.08);
    const nose = new THREE.Mesh(noseGeo, noseMaterial);
    nose.position.set(0, -0.02, 0.78);
    this.head.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.07, 6, 4);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2314 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(-0.2, 0.22, 0.32);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(0.2, 0.22, 0.32);
    this.head.add(rightEye);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.22, 0.35, 0.12);

    const leftEar = new THREE.Mesh(earGeo, darkFurMaterial);
    leftEar.position.set(-0.35, 0.08, -0.1);
    leftEar.rotation.z = 0.25;
    this.head.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, darkFurMaterial);
    rightEar.position.set(0.35, 0.08, -0.1);
    rightEar.rotation.z = -0.25;
    this.head.add(rightEar);

    // Tail (single piece)
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.95, -0.85);
    this.spine.add(this.tail);

    const tailGeo = new THREE.BoxGeometry(0.16, 0.16, 0.7);
    this.tailTip = new THREE.Mesh(tailGeo, darkFurMaterial);
    this.tailTip.position.set(0, 0.2, -0.35);
    this.tailTip.rotation.x = -0.5;
    this.tail.add(this.tailTip);

    // Create articulated legs
    this.frontLeftLeg = this.createArticulatedLeg(furMaterial, true);
    this.frontLeftLeg.group.position.set(-0.4, 0.55, 0.6);
    this.spine.add(this.frontLeftLeg.group);

    this.frontRightLeg = this.createArticulatedLeg(furMaterial, true);
    this.frontRightLeg.group.position.set(0.4, 0.55, 0.6);
    this.spine.add(this.frontRightLeg.group);

    this.backLeftLeg = this.createArticulatedLeg(furMaterial, false);
    this.backLeftLeg.group.position.set(-0.4, 0.55, -0.6);
    this.spine.add(this.backLeftLeg.group);

    this.backRightLeg = this.createArticulatedLeg(furMaterial, false);
    this.backRightLeg.group.position.set(0.4, 0.55, -0.6);
    this.spine.add(this.backRightLeg.group);

    // Scale the whole dog
    this.mesh.scale.set(0.62, 0.62, 0.62);

    this.mesh.add(this.createContactShadow());
  }

  // The world's shadow map is drawn once, so anything that moves brings its own soft shadow.
  private createContactShadow(): THREE.Mesh {
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          void main() {
            float fade = 1.0 - smoothstep(0.2, 1.0, length(vUv - 0.5) * 2.0);
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.5 * fade);
          }
        `,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(0.95, 1.5, 1);
    shadow.position.y = 0.04;
    return shadow;
  }

  //@ts-ignore
  private createArticulatedLeg(material: THREE.Material, isFront: boolean): Leg {
    const group = new THREE.Group();

    // Upper leg (thigh) - pivots at hip
    const upper = new THREE.Group();
    group.add(upper);

    const upperGeo = new THREE.BoxGeometry(0.22, 0.45, 0.22);
    const upperMesh = new THREE.Mesh(upperGeo, material);
    upperMesh.position.y = -0.22;
    upper.add(upperMesh);

    // Lower leg (shin) - pivots at knee
    const lower = new THREE.Group();
    lower.position.y = -0.4;
    upper.add(lower);

    const lowerGeo = new THREE.BoxGeometry(0.18, 0.4, 0.18);
    const lowerMesh = new THREE.Mesh(lowerGeo, material);
    lowerMesh.position.y = -0.2;
    lower.add(lowerMesh);

    // Paw
    const pawGeo = new THREE.BoxGeometry(0.22, 0.1, 0.28);
    const paw = new THREE.Mesh(pawGeo, material);
    paw.position.set(0, -0.42, 0.03);
    lower.add(paw);

    return { group, upper, lower, paw };
  }

  public setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z);
  }

  public getDistanceToPlayer(playerPosition: THREE.Vector3): number {
    const dogFlat = new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z);
    const playerFlat = new THREE.Vector3(playerPosition.x, 0, playerPosition.z);
    return dogFlat.distanceTo(playerFlat);
  }

  public pet(): void {
    this.isPetted = true;
    this.pettedTimer = 2; // 2 seconds of happy response
  }

  public update(delta: number, playerPosition: THREE.Vector3): void {
    const position = this.mesh.position;

    // She has no pathfinding, so if something big traps her she catches up on her own.
    if (Math.hypot(playerPosition.x - position.x, playerPosition.z - position.z) > Dog.CATCH_UP_DISTANCE) {
      position.x = playerPosition.x + 2;
      position.z = playerPosition.z + 2;
      this.currentSpeed = 0;
    }

    const toPlayerX = playerPosition.x - position.x;
    const toPlayerZ = playerPosition.z - position.z;
    const distance = Math.hypot(toPlayerX, toPlayerZ);

    // Separate start and stop distances keep her from flickering between walking and standing.
    if (distance > Dog.START_FOLLOWING) this.isFollowing = true;
    else if (distance < Dog.STOP_FOLLOWING) this.isFollowing = false;

    let turn = Math.atan2(toPlayerX, toPlayerZ) - this.mesh.rotation.y;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;

    // She gets up before she moves, keeps up with the player, eases off on arrival,
    // and slows for sharp turns instead of sliding sideways.
    let targetSpeed = 0;
    if (this.isFollowing && this.sitBlend < 0.25) {
      const pace = Math.min(Dog.RUN_SPEED, Dog.TROT_SPEED + Math.max(0, distance - 7) * 1.6);
      const arriving = (distance - Dog.STOP_FOLLOWING) * 2.5 + 1;
      const alignment = Math.max(0.3, Math.cos(Math.min(Math.abs(turn), Math.PI / 2)));
      targetSpeed = Math.min(pace, arriving) * alignment;
    }
    const change = targetSpeed - this.currentSpeed;
    const maxChange = (change > 0 ? Dog.ACCELERATION : Dog.BRAKING) * delta;
    this.currentSpeed += THREE.MathUtils.clamp(change, -maxChange, maxChange);
    this.isMoving = this.currentSpeed > 0.3;

    // When standing still she only shuffles round once the player has moved well out of view.
    const turnLimit = this.sitBlend > 0.5 ? 1.7 : 0.9;
    if (Math.abs(turn) > turnLimit) this.isTurningOnTheSpot = !this.isFollowing;
    else if (Math.abs(turn) < 0.2 || this.isFollowing) this.isTurningOnTheSpot = false;

    if (this.isFollowing || this.isMoving || this.isTurningOnTheSpot) {
      const turnRate = this.isTurningOnTheSpot ? 2.5 : this.currentSpeed > 9 ? 3.5 : 5;
      this.mesh.rotation.y += THREE.MathUtils.clamp(turn, -turnRate * delta, turnRate * delta);
    }

    // She moves the way she faces.
    position.x += Math.sin(this.mesh.rotation.y) * this.currentSpeed * delta;
    position.z += Math.cos(this.mesh.rotation.y) * this.currentSpeed * delta;

    Collisions.resolve(position, Dog.BODY_RADIUS, position.y, Dog.STEP_HEIGHT);
    position.y = Math.max(
      Terrain.getHeight(position.x, position.z),
      Collisions.surfaceAt(position.x, position.z, position.y, Dog.STEP_HEIGHT)
    );

    // Sits down after a few seconds of standing still.
    const isIdle = !this.isFollowing && !this.isMoving && !this.isTurningOnTheSpot;
    this.idleSeconds = isIdle ? this.idleSeconds + delta : 0;
    const sitTarget = this.idleSeconds > Dog.SIT_AFTER_SECONDS ? 1 : 0;
    const sitRate = sitTarget > this.sitBlend ? 2.5 : 5;
    this.sitBlend += THREE.MathUtils.clamp(sitTarget - this.sitBlend, -sitRate * delta, sitRate * delta);

    // Legs follow her actual speed, so they never run ahead of her body.
    const legTarget = Math.max(Math.min(this.currentSpeed / 2.5, 1), this.isTurningOnTheSpot ? 0.4 : 0);
    this.animationBlend += (legTarget - this.animationBlend) * Math.min(delta * 8, 1);
    this.runBlend = THREE.MathUtils.smoothstep(this.currentSpeed, 7, 12);

    // Update petted timer
    if (this.isPetted) {
      this.pettedTimer -= delta;
      if (this.pettedTimer <= 0) {
        this.isPetted = false;
        this.pettedTimer = 0;
      }
    }

    // Run all animations
    this.animateWalk(delta);
    this.animateBody();
    this.animateTail(delta);
    this.animateHead(delta, playerPosition);
  }

  private animateWalk(delta: number): void {
    this.walkCycle += delta * (6 + this.currentSpeed * 0.9) * Math.min(this.animationBlend * 2, 1);

    const phase = this.walkCycle;
    const run = this.runBlend;

    // Walking moves diagonal pairs together. Running gathers front legs and back legs into a bound.
    this.animateLeg(this.frontLeftLeg, phase, true);
    this.animateLeg(this.frontRightLeg, phase + THREE.MathUtils.lerp(Math.PI, 0.5, run), true);
    this.animateLeg(this.backLeftLeg, phase + Math.PI, false);
    this.animateLeg(this.backRightLeg, phase + THREE.MathUtils.lerp(0, Math.PI + 0.5, run), false);
  }

  private animateLeg(leg: Leg, phase: number, isFront: boolean): void {
    const blend = this.animationBlend;
    const stride = THREE.MathUtils.lerp(0.42, 0.85, this.runBlend);

    // The hip swings the leg forward while the knee lifts it, then pushes back with the leg straight.
    const lift = Math.max(0, -Math.cos(phase));
    const push = Math.max(0, -Math.sin(phase));
    let hip = Math.sin(phase) * stride * blend + 0.05 * (1 - blend);
    let knee = lift * THREE.MathUtils.lerp(0.65, 1.05, this.runBlend) * blend - push * 0.15 * blend + 0.15 * (1 - blend);
    if (!isFront) {
      hip *= 0.9;
      knee += 0.1 * blend;
    }

    // Sitting: front legs stay straight under the chest, back legs fold beneath her.
    const sit = this.sitBlend;
    leg.upper.rotation.x = THREE.MathUtils.lerp(hip, isFront ? 0.55 : -1.25, sit);
    leg.lower.rotation.x = THREE.MathUtils.lerp(knee, isFront ? 0 : 1.6, sit);
    leg.upper.rotation.z = Math.max(0, Math.cos(phase)) * 0.08 * blend * (leg.group.position.x > 0 ? -1 : 1);
  }

  private animateBody(): void {
    const blend = this.animationBlend;
    const run = this.runBlend;
    const sit = this.sitBlend;

    // Bobs with each step, and more on a run. A petted dog bounces.
    const bobPhase = this.walkCycle * (run > 0.5 ? 1 : 2);
    const happyBounce = this.isPetted ? Math.abs(Math.sin(this.tailWag * 0.5)) * 0.06 : 0;
    this.body.position.y = Math.abs(Math.sin(bobPhase)) * THREE.MathUtils.lerp(0.03, 0.12, run) * blend + happyBounce;
    this.body.position.x = Math.sin(this.walkCycle) * 0.02 * blend * (1 - run);
    this.body.rotation.z = Math.sin(this.walkCycle) * 0.03 * blend * (1 - run);

    // Her spine sways on a walk and flexes on a run. Sitting tips her back onto her haunches.
    this.spine.rotation.y = Math.sin(this.walkCycle) * 0.04 * blend * (1 - run);
    const flex = Math.sin(this.walkCycle) * THREE.MathUtils.lerp(0.02, 0.13, run) * blend;
    this.spine.rotation.x = THREE.MathUtils.lerp(flex, -0.55, sit);
    this.spine.position.z = sit * 0.5;
  }

  private animateTail(delta: number): void {
    // Wag faster when being petted
    const wagSpeed = this.isPetted ? 18 : (this.isMoving ? 10 : 6);
    this.tailWag += delta * wagSpeed;

    // Wag intensity - extra enthusiastic when petted
    const wagIntensity = this.isPetted ? 0.8 : (this.isMoving ? 0.4 : 0.6);

    // Main tail wag (side to side)
    this.tail.rotation.y = Math.sin(this.tailWag) * wagIntensity;

    // Tail up when happy/alert, even higher when petted
    const baseAngle = this.isPetted ? -0.7 : (this.isMoving ? -0.3 : -0.5);
    this.tail.rotation.x = baseAngle + Math.sin(this.tailWag * 0.7) * 0.15;

    // Tip has extra wag
    const tipIntensity = this.isPetted ? 0.5 : 0.3;
    this.tailTip.rotation.y = Math.sin(this.tailWag * 1.3) * tipIntensity;
    this.tailTip.rotation.x = Math.sin(this.tailWag * 0.8) * 0.2;
  }

  private animateHead(delta: number, playerPosition: THREE.Vector3): void {
    const blend = this.animationBlend;

    // Head bob while walking
    const headBob = Math.sin(this.walkCycle * 2 + 0.5) * 0.04 * blend;
    this.neck.position.y = 1.1 + headBob;

    // Neck extends forward slightly when moving
    const neckForward = blend * 0.1;
    this.neck.position.z = 1.1 + neckForward;
    this.neck.rotation.x = blend * 0.15 + this.sitBlend * 0.55;

    if (!this.isMoving) {
      // Look at player when idle
      const lookDir = new THREE.Vector3()
        .subVectors(playerPosition, this.mesh.position);

      const localLook = lookDir.clone();
      localLook.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.mesh.rotation.y);

      const targetYaw = Math.atan2(localLook.x, localLook.z) * 0.4;
      const targetPitch = Math.atan2(localLook.y, localLook.length()) * 0.2;

      this.head.rotation.y += (targetYaw - this.head.rotation.y) * delta * 2;
      this.head.rotation.x += (targetPitch - this.head.rotation.x) * delta * 2;

      // Cute head tilt
      const tiltTarget = Math.sin(this.tailWag * 0.3) * 0.08;
      this.head.rotation.z += (tiltTarget - this.head.rotation.z) * delta * 3;
    } else {
      // Face forward when moving, with slight movement
      const lookAhead = Math.sin(this.walkCycle * 0.5) * 0.05;
      this.head.rotation.y += (lookAhead - this.head.rotation.y) * delta * 4;
      this.head.rotation.x *= 0.95;
      this.head.rotation.z *= 0.95;
    }
  }
}
