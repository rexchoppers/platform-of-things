import { PlanetConfig } from '../config/planets';
import profileImage from '../assets/profile.jpeg';

export class UIManager {
  public readonly instructions = document.getElementById('instructions')!;
  public readonly statsScreen = document.getElementById('stats-screen')!;
  public readonly firePrompt = document.getElementById('fire-prompt')!;
  public readonly getUpPrompt = document.getElementById('get-up-prompt')!;
  public readonly projectorPrompt = document.getElementById('projector-prompt')!;
  public readonly dogPrompt = document.getElementById('dog-prompt')!;
  public readonly dogQuote = document.getElementById('dog-quote')!;
  public readonly creditsPrompt = document.getElementById('credits-prompt')!;
  public readonly linkPrompt = document.getElementById('link-prompt')!;
  private readonly startPrompt = this.instructions.querySelector('.start-prompt')!;
  private readonly planetName = document.getElementById('planet-name')!;
  private readonly sectionName = document.getElementById('section-name')!;
  private readonly planetDescription = document.getElementById('planet-description')!;
  private readonly screenFade = document.getElementById('screen-fade')!;
  private readonly portalName = document.getElementById('portal-name')!;
  private readonly portalNote = document.getElementById('portal-note')!;
  private hasStarted = false;

  constructor() {
    this.statsScreen.querySelector('img')!.src = profileImage;
    this.statsScreen.querySelectorAll<HTMLElement>('[data-years-since]').forEach((element) => {
      element.textContent = String(new Date().getFullYear() - Number(element.dataset.yearsSince));
    });
  }

  public setLoading(isLoading: boolean): void {
    this.startPrompt.textContent = isLoading ? 'Loading' : 'Click to start';
  }

  public setPaused(isPaused: boolean): void {
    document.body.classList.toggle('is-paused', isPaused);
    if (!isPaused) {
      this.hasStarted = true;
    } else if (this.hasStarted) {
      this.startPrompt.textContent = 'Paused. Click to carry on.';
    }
  }

  public showPortalMessage(worldName: string, note: string): void {
    this.portalName.textContent = worldName;
    this.portalNote.textContent = note;
    this.screenFade.classList.add('visible');
  }

  public hidePortalMessage(): void {
    this.screenFade.classList.remove('visible');
  }

  public updatePlanetInfo(config: PlanetConfig): void {
    this.planetName.textContent = config.name;
    this.sectionName.textContent = config.section;
    this.planetDescription.textContent = config.description;
  }
}
