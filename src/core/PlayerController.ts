import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Collisions } from '../environment/Collisions';
import { Terrain } from '../environment/Terrain';

interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

export class PlayerController {
  private movement: MovementState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  };

  public readonly velocity: THREE.Vector3 = new THREE.Vector3();
  private readonly direction: THREE.Vector3 = new THREE.Vector3();

  private readonly moveSpeed = 50;
  private readonly sprintMultiplier = 2;
  private readonly gravity = 50;
  private readonly jumpForce = 20;
  public readonly playerHeight = 2;
  private readonly bodyRadius = 0.45;
  private readonly stepHeight = 0.35;

  private isOnGround = true;
  private maxDistance = 90;

  private onInteract: (() => void) | null = null;
  private isFrozen = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly controls: PointerLockControls
  ) {
    this.setupKeyboardControls();
  }

  public jump(): void {
    if (this.isOnGround && !this.isFrozen) {
      this.velocity.y = this.jumpForce;
      this.isOnGround = false;
    }
  }

  /** Holds the player still, with mouse look still working, while they sit by the fire. */
  public setFrozen(isFrozen: boolean): void {
    this.isFrozen = isFrozen;
    this.velocity.set(0, 0, 0);
  }

  public setInteractCallback(callback: () => void): void {
    this.onInteract = callback;
  }

  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.movement.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.movement.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.movement.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.movement.right = true;
          break;
        case 'Space':
          this.jump();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.movement.sprint = true;
          break;
        case 'KeyE':
          this.onInteract?.();
          break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.movement.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.movement.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.movement.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.movement.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.movement.sprint = false;
          break;
      }
    });
  }

  public update(delta: number): void {
    if (!this.controls.isLocked || this.isFrozen) return;

    // Friction
    this.velocity.x -= this.velocity.x * 8.0 * delta;
    this.velocity.z -= this.velocity.z * 8.0 * delta;

    // Apply gravity
    this.velocity.y -= this.gravity * delta;

    // Direction
    this.direction.z = Number(this.movement.forward) - Number(this.movement.backward);
    this.direction.x = Number(this.movement.right) - Number(this.movement.left);
    this.direction.normalize();

    const currentSpeed = this.movement.sprint
      ? this.moveSpeed * this.sprintMultiplier
      : this.moveSpeed;

    if (this.movement.forward || this.movement.backward) {
      this.velocity.z -= this.direction.z * currentSpeed * delta;
    }
    if (this.movement.left || this.movement.right) {
      this.velocity.x -= this.direction.x * currentSpeed * delta;
    }

    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);
    this.camera.position.y += this.velocity.y * delta;

    // Keep player in bounds
    const position = this.camera.position;
    const playerDist = Math.hypot(position.x, position.z);
    if (playerDist > this.maxDistance) {
      const scale = this.maxDistance / playerDist;
      position.x *= scale;
      position.z *= scale;
    }

    // Walk into solid things, and stand on anything low enough
    const feet = position.y - this.playerHeight;
    Collisions.resolve(position, this.bodyRadius, feet, this.stepHeight);
    const floor = Math.max(
      Terrain.getHeight(position.x, position.z),
      Collisions.surfaceAt(position.x, position.z, feet, this.stepHeight)
    );
    const groundLevel = floor + this.playerHeight;

    // Always keep player above the floor (handles both falling and walking uphill)
    if (position.y <= groundLevel) {
      position.y = groundLevel;
      this.velocity.y = 0;
      this.isOnGround = true;
    } else {
      // Close enough to the floor counts as on it, so jumping stays reliable
      this.isOnGround = position.y - groundLevel < 0.1;
    }
  }

  public setMaxDistance(distance: number): void {
    this.maxDistance = distance;
  }

  public resetPosition(x: number, z: number, facingAngle: number): void {
    this.camera.position.set(x, Terrain.getHeight(x, z) + this.playerHeight, z);
    this.camera.rotation.set(0, facingAngle, 0);
    this.velocity.set(0, 0, 0);
    this.isOnGround = true;
  }
}
