import * as THREE from 'three';

export interface SlideContent {
  title: string;
  text?: string;
  image?: string; // URL or imported image path
  layout?: 'text-only' | 'image-only' | 'image-left' | 'image-right' | 'image-top';
  isIntro?: boolean; // Intro slides don't show in slide count
}

export class SlideRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  // Canvas dimensions (high res for quality)
  private readonly width = 1024;
  private readonly height = 614; // ~16:9.6 ratio to match screen proportions

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    // This texture lives for the whole session and is shared by the projector
    // screen each time the story planet loads, so scene teardown must not dispose it.
    this.texture.userData.shared = true;
  }

  public getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  public async preloadImages(slides: SlideContent[]): Promise<void> {
    const imageUrls = slides
      .filter(s => s.image)
      .map(s => s.image!);

    await Promise.all(imageUrls.map(url => this.loadImage(url)));
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.imageCache.has(url)) {
        resolve(this.imageCache.get(url)!);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  public renderSlide(slide: SlideContent, slideIndex: number, totalSlides: number, introCount: number = 0): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear with rich dark background
    ctx.fillStyle = '#12121f';
    ctx.fillRect(0, 0, w, h);

    // Subtle gradient overlay for depth
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(60, 40, 80, 0.3)');
    gradient.addColorStop(1, 'rgba(20, 20, 40, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const layout = slide.layout || (slide.image ? 'image-top' : 'text-only');
    const padding = 60;
    const image = slide.image ? this.imageCache.get(slide.image) : null;

    const imageOrNull = image ?? null;

    switch (layout) {
      case 'text-only':
        this.renderTextOnly(slide, padding);
        break;
      case 'image-only':
        if (imageOrNull) this.renderImageOnly(imageOrNull, padding);
        break;
      case 'image-top':
        this.renderImageTop(slide, imageOrNull, padding);
        break;
      case 'image-left':
        this.renderImageLeft(slide, imageOrNull, padding);
        break;
      case 'image-right':
        this.renderImageRight(slide, imageOrNull, padding);
        break;
    }

    // Slide counter at bottom - only show for non-intro slides
    if (!slide.isIntro) {
      const adjustedIndex = slideIndex - introCount;
      const adjustedTotal = totalSlides - introCount;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${adjustedIndex + 1} / ${adjustedTotal}`, w / 2, h - 30);
    }

    // Update texture
    this.texture.needsUpdate = true;
  }

  private renderTextOnly(slide: SlideContent, padding: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const contentWidth = w - padding * 2;

    // Title - bright and bold
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(180, 140, 220, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText(slide.title, w / 2, padding + 80);
    ctx.shadowBlur = 0;

    // Decorative line under title - brighter
    ctx.strokeStyle = 'rgba(200, 160, 240, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 120, padding + 110);
    ctx.lineTo(w / 2 + 120, padding + 110);
    ctx.stroke();

    // Body text - larger and brighter
    if (slide.text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px "Segoe UI", sans-serif';
      this.wrapText(slide.text, w / 2, padding + 180, contentWidth, 48);
    }
  }

  private renderImageOnly(image: HTMLImageElement, padding: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const maxW = w - padding * 2;
    const maxH = h - padding * 2;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const imgW = image.width * scale;
    const imgH = image.height * scale;

    ctx.drawImage(image, (w - imgW) / 2, (h - imgH) / 2, imgW, imgH);
  }

  private renderImageTop(slide: SlideContent, image: HTMLImageElement | null, padding: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    let textStartY = padding + 60;

    if (image) {
      const imgMaxH = h * 0.45;
      const imgMaxW = w - padding * 2;
      const scale = Math.min(imgMaxW / image.width, imgMaxH / image.height);
      const imgW = image.width * scale;
      const imgH = image.height * scale;

      ctx.drawImage(image, (w - imgW) / 2, padding, imgW, imgH);
      textStartY = padding + imgH + 30;
    }

    // Title - bright
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(180, 140, 220, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(slide.title, w / 2, textStartY + 40);
    ctx.shadowBlur = 0;

    // Body text - bright
    if (slide.text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px "Segoe UI", sans-serif';
      this.wrapText(slide.text, w / 2, textStartY + 90, w - padding * 2, 40);
    }
  }

  private renderImageLeft(slide: SlideContent, image: HTMLImageElement | null, padding: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const halfW = w / 2;

    if (image) {
      const imgMaxW = halfW - padding * 1.5;
      const imgMaxH = h - padding * 2;
      const scale = Math.min(imgMaxW / image.width, imgMaxH / image.height);
      const imgW = image.width * scale;
      const imgH = image.height * scale;

      ctx.drawImage(image, padding, (h - imgH) / 2, imgW, imgH);
    }

    // Title on right - bright
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(180, 140, 220, 0.6)';
    ctx.shadowBlur = 10;
    const textCenterX = halfW + halfW / 2;
    ctx.fillText(slide.title, textCenterX, padding + 90);
    ctx.shadowBlur = 0;

    // Body text on right - bright
    if (slide.text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '26px "Segoe UI", sans-serif';
      this.wrapText(slide.text, textCenterX, padding + 150, halfW - padding * 1.5, 38);
    }
  }

  private renderImageRight(slide: SlideContent, image: HTMLImageElement | null, padding: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const halfW = w / 2;

    if (image) {
      const imgMaxW = halfW - padding * 1.5;
      const imgMaxH = h - padding * 2;
      const scale = Math.min(imgMaxW / image.width, imgMaxH / image.height);
      const imgW = image.width * scale;
      const imgH = image.height * scale;

      ctx.drawImage(image, halfW + padding / 2, (h - imgH) / 2, imgW, imgH);
    }

    // Title on left - bright
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(180, 140, 220, 0.6)';
    ctx.shadowBlur = 10;
    const textCenterX = halfW / 2;
    ctx.fillText(slide.title, textCenterX, padding + 90);
    ctx.shadowBlur = 0;

    // Body text on left - bright
    if (slide.text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '26px "Segoe UI", sans-serif';
      this.wrapText(slide.text, textCenterX, padding + 150, halfW - padding * 1.5, 38);
    }
  }

  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const ctx = this.ctx;
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }

  public renderIdleScreen(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Rich dark background
    ctx.fillStyle = '#12121f';
    ctx.fillRect(0, 0, w, h);

    // Subtle gradient
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.5);
    gradient.addColorStop(0, 'rgba(80, 60, 120, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Title - bright
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(180, 140, 220, 0.6)';
    ctx.shadowBlur = 15;
    ctx.fillText('My Journey', w / 2, h / 2 - 20);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillText('Walk closer to view', w / 2, h / 2 + 30);

    this.texture.needsUpdate = true;
  }
}
