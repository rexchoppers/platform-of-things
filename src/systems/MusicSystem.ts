import musicAsset from '../assets/music.mp3?url';

export class MusicSystem {
  private audio: HTMLAudioElement;
  private started = false;
  private muted = false;
  private muteButton: HTMLButtonElement;

  // SVG icons for sound on/off
  private readonly soundOnIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
  </svg>`;

  private readonly soundOffIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <line x1="23" y1="9" x2="17" y2="15"></line>
    <line x1="17" y1="9" x2="23" y2="15"></line>
  </svg>`;

  constructor() {
    this.audio = new Audio(musicAsset);
    this.audio.loop = true;
    this.audio.volume = 0.3;

    this.muteButton = this.createMuteButton();
    document.body.appendChild(this.muteButton);
  }

  private createMuteButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'mute-button';
    button.className = 'corner-button';
    button.title = 'Sound on or off';
    button.setAttribute('aria-label', 'Sound on or off');
    button.innerHTML = this.soundOnIcon;
    button.addEventListener('click', () => {
      this.toggleMute();
    });

    return button;
  }

  public start(): void {
    if (!this.started) {
      this.audio.play().catch((e) => {
        console.log('Music autoplay blocked:', e);
      });
      this.started = true;
    }
  }

  public toggleMute(): void {
    this.muted = !this.muted;
    this.audio.muted = this.muted;
    this.muteButton.innerHTML = this.muted ? this.soundOffIcon : this.soundOnIcon;
  }

  public isMuted(): boolean {
    return this.muted;
  }
}
