import * as THREE from 'three';
import { Terrain } from '../environment/Terrain';

interface Leg {
  group: THREE.Group;
  upper: THREE.Group;
  lower: THREE.Group;
  paw: THREE.Mesh;
}

export class Dog {
  public mesh: THREE.Group;
  public name: string;

  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private velocity: THREE.Vector3 = new THREE.Vector3();

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
  //@ts-ignore
  private targetWalkCycle: number = 0;
  private animationBlend: number = 0;
  private tailWag: number = 0;
  private currentSpeed: number = 0;

  // Movement settings
  private followDistance: number = 4;
  private moveSpeed: number = 35;
  private runSpeed: number = 55;

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
    bodyMesh.castShadow = true;
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
    headMesh.castShadow = true;
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
    this.mesh.scale.set(0.7, 0.7, 0.7);
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

  public update(delta: number, playerPosition: THREE.Vector3, flatRadius: number = 40): void {
    // Calculate direction to player
    this.targetPosition.copy(playerPosition);
    this.targetPosition.y = 0;

    const currentFlat = new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z);
    const distanceToPlayer = currentFlat.distanceTo(this.targetPosition);

    // Determine movement state
    const shouldMove = distanceToPlayer > this.followDistance;
    const shouldRun = distanceToPlayer > this.followDistance * 2.5;

    // Smooth animation blend
    const targetBlend = shouldMove ? 1 : 0;
    this.animationBlend += (targetBlend - this.animationBlend) * delta * 5;

    if (shouldMove) {
      this.isMoving = true;

      const direction = new THREE.Vector3()
        .subVectors(this.targetPosition, currentFlat)
        .normalize();

      // Smooth speed transitions
      const targetSpeed = shouldRun ? this.runSpeed : this.moveSpeed;
      this.currentSpeed += (targetSpeed - this.currentSpeed) * delta * 3;

      // Apply movement
      this.velocity.x = direction.x * this.currentSpeed;
      this.velocity.z = direction.z * this.currentSpeed;

      this.mesh.position.x += this.velocity.x * delta;
      this.mesh.position.z += this.velocity.z * delta;

      // Smooth rotation
      const targetAngle = Math.atan2(direction.x, direction.z);
      let angleDiff = targetAngle - this.mesh.rotation.y;

      // Normalize angle difference
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      this.mesh.rotation.y += angleDiff * delta * 6;
    } else {
      this.isMoving = false;
      this.currentSpeed *= 0.9;
      this.velocity.x *= 0.9;
      this.velocity.z *= 0.9;
    }

    // Update Y position based on terrain
    const terrainY = Terrain.getTerrainHeight(this.mesh.position.x, this.mesh.position.z, flatRadius);
    this.mesh.position.y = terrainY;

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
    this.animateBody(delta);
    this.animateTail(delta);
    this.animateHead(delta, playerPosition);
  }

  private animateWalk(delta: number): void {
    // Animation speed based on movement speed
    const cycleSpeed = 8 + (this.currentSpeed / this.moveSpeed) * 6;
    this.walkCycle += delta * cycleSpeed * this.animationBlend;

    // Gait phases - diagonal pairs move together
    const phase = this.walkCycle;
    const blend = this.animationBlend;

    // Front left & Back right (diagonal pair 1)
    this.animateLeg(this.frontLeftLeg, phase, blend, true);
    this.animateLeg(this.backRightLeg, phase, blend, false);

    // Front right & Back left (diagonal pair 2, offset by half cycle)
    this.animateLeg(this.frontRightLeg, phase + Math.PI, blend, true);
    this.animateLeg(this.backLeftLeg, phase + Math.PI, blend, false);
  }

  private animateLeg(leg: Leg, phase: number, blend: number, isFront: boolean): void {
    // Create a more natural stepping motion
    const sinPhase = Math.sin(phase);
    const cosPhase = Math.cos(phase);

    // Upper leg (hip rotation)
    // Forward swing when sin is positive, backward when negative
    const hipSwing = sinPhase * 0.35 * blend;

    // Add slight lift during forward swing
    const hipLift = Math.max(0, cosPhase) * 0.1 * blend;

    leg.upper.rotation.x = hipSwing;
    leg.upper.rotation.z = hipLift * (leg.group.position.x > 0 ? -1 : 1);

    // Lower leg (knee bend)
    // Bend more during the lift phase of the stride
    const liftPhase = Math.max(0, -cosPhase);
    const kneeBend = liftPhase * 0.6 * blend;

    // Add slight extension during push-off
    const pushOff = Math.max(0, -sinPhase) * 0.15 * blend;

    leg.lower.rotation.x = kneeBend - pushOff;

    // Back legs have slightly different mechanics
    if (!isFront) {
      leg.upper.rotation.x *= 0.9;
      leg.lower.rotation.x += 0.1 * blend; // Back legs stay slightly more bent
    }

    // Idle pose - slight natural bend
    const idleBlend = 1 - blend;
    leg.upper.rotation.x += 0.05 * idleBlend;
    leg.lower.rotation.x += 0.15 * idleBlend;
  }

  //@ts-ignore
  private animateBody(delta: number): void {
    const blend = this.animationBlend;

    // Body bob - twice per walk cycle (each step)
    const bobPhase = this.walkCycle * 2;
    const bob = Math.abs(Math.sin(bobPhase)) * 0.03 * blend;
    this.body.position.y = bob;

    // Subtle side-to-side sway
    const sway = Math.sin(this.walkCycle) * 0.02 * blend;
    this.body.position.x = sway;

    // Spine flex - subtle s-curve motion
    const spinePhase = this.walkCycle;
    this.spine.rotation.y = Math.sin(spinePhase) * 0.04 * blend;

    // Slight pitch during movement
    const pitch = Math.sin(bobPhase) * 0.02 * blend;
    this.spine.rotation.x = pitch;

    // Body roll with steps
    const roll = Math.sin(this.walkCycle) * 0.03 * blend;
    this.body.rotation.z = roll;
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
    this.neck.rotation.x = blend * 0.15;

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
