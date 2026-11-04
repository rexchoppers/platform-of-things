import * as THREE from 'three';
import { Dog } from '../objects/Dog';
import { PlayerController } from '../core/PlayerController';
import { UIManager } from '../ui/UIManager';

const DOG_RANGE = 3;
const CREDITS_RANGE = 3;
const FIRE_RANGE = 5;
const CREDITS_URL = 'https://github.com/rexchoppers/platform-of-things/blob/master/CREDITS.md';

interface Target {
  position: THREE.Vector3;
  range: number;
  prompt: HTMLElement;
  use: () => void;
}

/** Prompts and E-key actions. With several things in reach, E uses the one you're looking at. */
export class Interactions {
  private readonly targets: Target[];
  private readonly forward = new THREE.Vector3();
  private current: Target | null = null;
  private isShowingQuote = false;
  private isSitting = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly dog: Dog,
    private readonly ui: UIManager,
    private readonly player: PlayerController,
    signPosition: THREE.Vector3,
    firePosition: THREE.Vector3
  ) {
    this.targets = [
      { position: firePosition, range: FIRE_RANGE, prompt: ui.firePrompt, use: () => this.setSitting(true) },
      { position: signPosition, range: CREDITS_RANGE, prompt: ui.creditsPrompt, use: () => window.open(CREDITS_URL, '_blank') },
      {
        position: dog.mesh.position,
        range: DOG_RANGE,
        prompt: ui.dogPrompt,
        use: () => {
          dog.pet();
          this.setQuote(true);
        },
      },
    ];
    player.setInteractCallback(() => this.interact());
  }

  private interact(): void {
    if (this.isSitting) this.setSitting(false);
    else if (this.isShowingQuote) this.setQuote(false);
    else this.current?.use();
  }

  private setSitting(isSitting: boolean): void {
    this.isSitting = isSitting;
    this.player.setFrozen(isSitting);
    this.ui.statsScreen.classList.toggle('visible', isSitting);
    this.ui.getUpPrompt.classList.toggle('visible', isSitting);
  }

  private setQuote(isShowing: boolean): void {
    this.isShowingQuote = isShowing;
    this.ui.dogQuote.classList.toggle('visible', isShowing);
  }

  private pickTarget(): Target | null {
    const player = this.camera.position;
    this.camera.getWorldDirection(this.forward);
    const lookLength = Math.hypot(this.forward.x, this.forward.z) || 1;

    let best: Target | null = null;
    let bestAim = -Infinity;
    for (const target of this.targets) {
      const dx = target.position.x - player.x;
      const dz = target.position.z - player.z;
      const distance = Math.hypot(dx, dz);
      if (distance > target.range) continue;
      const aim = distance > 0.01 ? (this.forward.x * dx + this.forward.z * dz) / (lookLength * distance) : 1;
      if (aim > bestAim) {
        bestAim = aim;
        best = target;
      }
    }
    return best;
  }

  public update(): void {
    if (this.isShowingQuote && this.dog.getDistanceToPlayer(this.camera.position) > DOG_RANGE) {
      this.setQuote(false);
    }
    this.current = this.isSitting || this.isShowingQuote ? null : this.pickTarget();
    for (const target of this.targets) {
      target.prompt.classList.toggle('visible', target === this.current);
    }
  }
}
