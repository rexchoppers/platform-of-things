import * as THREE from 'three';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ&§¶†‡※αβγδεζηθλμπσφψω';
const STARS = '★✦✧☆∞';
const LETTER_COUNT = 150;
const STAR_COUNT = 20;
const SKY_REACH = 140;
const BAND_HEIGHT = 50;
const GRID = 8; // Cells per side of the image the glyphs are drawn on
const CELL = 64;
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";

// Ink blues and purples, as the screen shows them, with gold kept for the stars.
const INKS = [
  [0.56, 0.66, 0.91],
  [0.56, 0.59, 0.91],
  [0.65, 0.56, 0.91],
  [0.75, 0.56, 0.91],
];
const GOLD = [0.91, 0.82, 0.56];

/** Glowing letters drifting high over Inkwell, from the Constellation marker in the .blend. One draw call. */
export class Constellation {
  public readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;

  constructor(centre: number[]) {
    const total = LETTER_COUNT + STAR_COUNT;
    const positions = new Float32Array(total * 3);
    const cells = new Float32Array(total * 2);
    const seeds = new Float32Array(total * 3);
    const tints = new Float32Array(total * 3);
    const sizes = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const isStar = i >= LETTER_COUNT;
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * SKY_REACH;
      const height = centre[1] + (Math.random() - 0.5) * BAND_HEIGHT;
      positions.set([centre[0] + Math.cos(angle) * distance, height, centre[2] + Math.sin(angle) * distance], i * 3);

      const glyph = isStar
        ? [...LETTERS].length + Math.floor(Math.random() * [...STARS].length)
        : Math.floor(Math.random() * [...LETTERS].length);
      cells.set([glyph % GRID, Math.floor(glyph / GRID)], i * 2);
      seeds.set([Math.random() * Math.PI * 2, 0.4 + Math.random() * 1.2, isStar ? 0.55 : 0.32], i * 3);
      tints.set(isStar ? GOLD : INKS[Math.floor(Math.random() * INKS.length)], i * 3);
      sizes[i] = isStar ? 4 + Math.random() * 3 : 2 + Math.random() * 4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('cell', new THREE.BufferAttribute(cells, 2));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute('tint', new THREE.BufferAttribute(tints, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelsPerUnit: { value: 1000 },
        glyphs: { value: this.drawGlyphs([...LETTERS, ...STARS]) },
      },
      vertexShader: `
        uniform float time;
        uniform float pixelsPerUnit;
        attribute vec2 cell;
        attribute vec3 seed;
        attribute vec3 tint;
        attribute float size;
        varying vec2 vCell;
        varying vec3 vTint;
        void main() {
          vec3 p = position;
          p.y += sin(time * 0.3 + seed.x) * 2.0;
          vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = size * pixelsPerUnit / -viewPosition.z;
          vCell = cell;
          vTint = tint * (seed.z + sin(time * seed.y + seed.x) * 0.14);
        }
      `,
      fragmentShader: `
        uniform sampler2D glyphs;
        varying vec2 vCell;
        varying vec3 vTint;
        void main() {
          float shape = texture2D(glyphs, (vCell + gl_PointCoord) / ${GRID.toFixed(1)}).a;
          gl_FragColor = vec4(vTint * shape, 1.0);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  /** Every glyph, white with a soft glow, in a grid. Only its alpha is used, and the top row is cell row 0. */
  private drawGlyphs(glyphs: string[]): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = GRID * CELL;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#fff';
    context.shadowColor = '#fff';
    context.shadowBlur = 8;
    context.font = `48px ${SERIF}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    glyphs.forEach((glyph, index) => {
      context.fillText(glyph, (index % GRID) * CELL + CELL / 2, Math.floor(index / GRID) * CELL + CELL / 2);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    return texture;
  }

  public update(time: number, pixelsPerUnit: number): void {
    this.material.uniforms.time.value = time;
    this.material.uniforms.pixelsPerUnit.value = pixelsPerUnit;
  }
}
