import { PlanetConfig } from '../config/planets';
import profileImage from '../assets/profile.jpeg';

export class UIManager {
  public readonly instructions: HTMLElement;
  public readonly planetName: HTMLElement;
  public readonly sectionName: HTMLElement;
  public readonly planetDescription: HTMLElement;
  public readonly hologramPanel: HTMLElement;
  public readonly dogPrompt: HTMLElement;
  public readonly dogQuote: HTMLElement;
  public readonly slidePrompt: HTMLElement;
  public readonly creditsPrompt: HTMLElement;
  public readonly screenFade: HTMLElement;
  public readonly bookshelfPrompt: HTMLElement;

  private isTransitioning = false;

  constructor() {
    this.instructions = document.getElementById('instructions')!;
    this.planetName = document.getElementById('planet-name')!;
    this.sectionName = document.getElementById('section-name')!;
    this.planetDescription = document.getElementById('planet-description')!;
    this.hologramPanel = document.getElementById('hologram-panel')!;
    this.dogPrompt = document.getElementById('dog-prompt')!;
    this.dogQuote = document.getElementById('dog-quote')!;
    this.slidePrompt = document.getElementById('slide-prompt')!;
    this.creditsPrompt = document.getElementById('credits-prompt')!;
    this.screenFade = document.getElementById('screen-fade')!;
    this.bookshelfPrompt = document.getElementById('bookshelf-prompt')!;

    // Set profile image
    const avatarImg = this.hologramPanel.querySelector('.hologram-avatar img') as HTMLImageElement;
    if (avatarImg) {
      avatarImg.src = profileImage;
    }
  }

  public updatePlanetInfo(config: PlanetConfig): void {
    this.planetName.textContent = config.name;
    this.sectionName.textContent = config.section;
    this.planetDescription.textContent = config.description;
  }

  public showHologramPanel(): void {
    this.hologramPanel.classList.add('visible');
  }

  public hideHologramPanel(): void {
    this.hologramPanel.classList.remove('visible');
  }

  public showInstructions(): void {
    this.instructions.style.display = 'flex';
  }

  public hideInstructions(): void {
    this.instructions.style.display = 'none';
  }

  public showDogPrompt(): void {
    this.dogPrompt.classList.add('visible');
  }

  public hideDogPrompt(): void {
    this.dogPrompt.classList.remove('visible');
  }

  public showDogQuote(): void {
    this.dogQuote.classList.add('visible');
  }

  public hideDogQuote(): void {
    this.dogQuote.classList.remove('visible');
  }

  public showSlidePrompt(): void {
    this.slidePrompt.classList.add('visible');
  }

  public hideSlidePrompt(): void {
    this.slidePrompt.classList.remove('visible');
  }

  public showCreditsPrompt(): void {
    this.creditsPrompt.classList.add('visible');
  }

  public hideCreditsPrompt(): void {
    this.creditsPrompt.classList.remove('visible');
  }

  public showBookshelfPrompt(categoryName: string): void {
    const p = this.bookshelfPrompt.querySelector('p');
    if (p) {
      p.innerHTML = `Press <strong>E</strong> to browse ${categoryName}`;
    }
    this.bookshelfPrompt.classList.add('visible');
  }

  public hideBookshelfPrompt(): void {
    this.bookshelfPrompt.classList.remove('visible');
  }

  public isInTransition(): boolean {
    return this.isTransitioning;
  }

  public fadeTransition(onMidpoint: () => void): void {
    if (this.isTransitioning) return;

    this.isTransitioning = true;

    // Fade out
    this.screenFade.classList.add('active');

    // At midpoint (when fully black), execute callback and fade back in
    setTimeout(() => {
      onMidpoint();

      // Fade back in
      setTimeout(() => {
        this.screenFade.classList.remove('active');

        // Transition complete
        setTimeout(() => {
          this.isTransitioning = false;
        }, 400);
      }, 100);
    }, 400);
  }
}
