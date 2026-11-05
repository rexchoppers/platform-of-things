import * as THREE from 'three';
import { Slide, slides } from '../config/slides';

/** Where the slides show, from the Screen marker in the world's .blend. Its front faces (sin yaw, cos yaw). */
export interface ScreenData {
  position: number[];
  yaw: number;
  width: number;
  height: number;
}

const CANVAS_WIDTH = 1536;
const CANVAS_HEIGHT = 922;
const PADDING = 80;
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";
const CREAM = '#f0e8d6';
const CREAM_SOFT = 'rgba(240, 232, 214, 0.78)';
const FIRELIGHT = '#f2c283';

/** The story, drawn on the cinema screen. E at the projector moves forward, and [ and ] step either way. */
export class Slideshow {
  public readonly mesh: THREE.Mesh;
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly introCount = slides.filter((slide) => slide.isIntro).length;
  private current = 0;
  private isActive = false;

  constructor(screen: ScreenData) {
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.context = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.anisotropy = 4;

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(screen.width, screen.height),
      new THREE.MeshBasicMaterial({ map: this.texture, fog: false })
    );
    this.mesh.position.fromArray(screen.position);
    this.mesh.rotation.y = screen.yaw;

    this.draw();
    for (const slide of slides) {
      if (slide.image) this.loadImage(slide.image);
    }

    document.addEventListener('keydown', (event) => {
      if (!this.isActive) return;
      if (event.code === 'BracketRight') this.next();
      if (event.code === 'BracketLeft') this.previous();
    });
  }

  public setActive(isActive: boolean): void {
    this.isActive = isActive;
  }

  private loadImage(url: string): void {
    const image = new Image();
    image.onload = () => {
      this.images.set(url, image);
      if (slides[this.current].image === url) this.draw();
    };
    image.onerror = () => console.error(`Failed to load slide image ${url}`);
    image.src = url;
  }

  public next(): void {
    this.current = (this.current + 1) % slides.length;
    this.draw();
  }

  public previous(): void {
    this.current = (this.current - 1 + slides.length) % slides.length;
    this.draw();
  }

  private draw(): void {
    const slide = slides[this.current];
    const context = this.context;
    context.fillStyle = '#14110c';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';

    const image = slide.image ? this.images.get(slide.image) : undefined;
    if (image) this.drawWithImage(slide, image);
    else this.drawTextOnly(slide);

    if (!slide.isIntro) {
      context.fillStyle = CREAM_SOFT;
      context.font = `italic 34px ${SERIF}`;
      context.textAlign = 'right';
      const total = slides.length - this.introCount;
      context.fillText(`${this.current - this.introCount + 1} / ${total}`, CANVAS_WIDTH - PADDING, CANVAS_HEIGHT - 52);
    }

    this.texture.needsUpdate = true;
  }

  private drawTextOnly(slide: Slide): void {
    const middle = CANVAS_WIDTH / 2;
    this.context.fillStyle = CREAM;
    this.context.font = `120px ${SERIF}`;
    this.context.fillText(slide.title, middle, CANVAS_HEIGHT * 0.44);
    this.context.fillStyle = FIRELIGHT;
    this.context.font = `italic 50px ${SERIF}`;
    this.wrapText(slide.text, middle, CANVAS_HEIGHT * 0.44 + 96, CANVAS_WIDTH - PADDING * 3, 66);
  }

  private drawWithImage(slide: Slide, image: HTMLImageElement): void {
    const middle = CANVAS_WIDTH / 2;
    const maxWidth = CANVAS_WIDTH - PADDING * 2;
    const maxHeight = CANVAS_HEIGHT * 0.56;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    this.context.drawImage(image, middle - width / 2, PADDING - 20, width, height);

    const textTop = PADDING - 20 + height + 92;
    this.context.fillStyle = CREAM;
    this.context.font = `82px ${SERIF}`;
    this.context.fillText(slide.title, middle, textTop);
    this.context.fillStyle = FIRELIGHT;
    this.context.font = `italic 42px ${SERIF}`;
    this.wrapText(slide.text, middle, textTop + 66, CANVAS_WIDTH - PADDING * 3, 56);
  }

  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    let line = '';
    let lineY = y;
    for (const word of text.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && this.context.measureText(candidate).width > maxWidth) {
        this.context.fillText(line, x, lineY);
        line = word;
        lineY += lineHeight;
      } else {
        line = candidate;
      }
    }
    this.context.fillText(line, x, lineY);
  }
}
