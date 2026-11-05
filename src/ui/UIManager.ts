import { PlanetConfig } from '../config/planets';
import profileImage from '../assets/profile.jpeg';

// Stops at 99%, because everything has to be ready before this text goes away.
const loadingText = (arrived: number): string =>
  arrived > 0 ? `Loading ${Math.min(Math.floor(arrived * 100), 99)}%` : 'Loading';

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

  public setLoading(arrived: number): void {
    this.startPrompt.textContent = loadingText(arrived);
  }

  public setReady(): void {
    this.startPrompt.textContent = 'Click to start';
  }

  public setPaused(isPaused: boolean): void {
    document.body.classList.toggle('is-paused', isPaused);
    if (!isPaused) {
      this.hasStarted = true;
    } else if (this.hasStarted) {
      this.startPrompt.textContent = 'Paused. Click to carry on.';
    }
  }

  public showPortalMessage(worldName: string): void {
    this.portalName.textContent = worldName;
    this.portalNote.textContent = '';
    this.screenFade.classList.add('visible');
  }

  public setPortalLoading(arrived: number): void {
    this.portalNote.textContent = loadingText(arrived);
  }

  public setPortalNote(note: string): void {
    this.portalNote.textContent = note;
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
