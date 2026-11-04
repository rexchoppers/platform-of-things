/**
 * Footprints the player and Ivy can't walk through, exported from the world's .blend.
 * A circle is [x, z, radius, top]. A box is [x, z, halfWidth, halfDepth, yaw, top].
 * top is the height you can stand on, or null for anything you can't climb.
 */
export type ColliderData = (number | null)[];

interface Collider {
  x: number;
  z: number;
  radius: number;
  halfWidth: number;
  halfDepth: number;
  cos: number;
  sin: number;
  isBox: boolean;
  top: number | null;
}

interface Point {
  x: number;
  z: number;
}

const CELL_SIZE = 6;
const LARGEST_MOVER_RADIUS = 1;
const PASSES = 2; // A second pass settles corners where two colliders meet

// Colliders are filed under every grid cell they could touch, so a lookup only reads one cell.
const cells = new Map<number, Collider[]>();
const cellKey = (cx: number, cz: number): number => (cx + 2048) * 4096 + (cz + 2048);
const cellAt = (x: number, z: number): Collider[] | undefined =>
  cells.get(cellKey(Math.floor(x / CELL_SIZE), Math.floor(z / CELL_SIZE)));

// Reused for every test, so walking around allocates nothing.
const contact = { normalX: 0, normalZ: 0, gap: 0 };

/** Fills contact with the distance from a point to the collider's edge (negative inside) and the way out. */
function measure(collider: Collider, x: number, z: number): void {
  const dx = x - collider.x;
  const dz = z - collider.z;

  if (!collider.isBox) {
    const distance = Math.hypot(dx, dz);
    contact.gap = distance - collider.radius;
    contact.normalX = distance > 0 ? dx / distance : 1;
    contact.normalZ = distance > 0 ? dz / distance : 0;
    return;
  }

  // Box axes come from Blender, where world y is game -z.
  const { cos, sin } = collider;
  const localX = dx * cos - dz * sin;
  const localY = -dx * sin - dz * cos;
  const overX = Math.abs(localX) - collider.halfWidth;
  const overY = Math.abs(localY) - collider.halfDepth;
  let outX: number;
  let outY: number;
  if (overX > 0 || overY > 0) {
    outX = Math.max(overX, 0) * Math.sign(localX);
    outY = Math.max(overY, 0) * Math.sign(localY);
    contact.gap = Math.hypot(outX, outY);
    outX /= contact.gap;
    outY /= contact.gap;
  } else if (overX > overY) {
    outX = Math.sign(localX) || 1;
    outY = 0;
    contact.gap = overX;
  } else {
    outX = 0;
    outY = Math.sign(localY) || 1;
    contact.gap = overY;
  }
  contact.normalX = outX * cos - outY * sin;
  contact.normalZ = -(outX * sin + outY * cos);
}

export class Collisions {
  public static setColliders(data: ColliderData[]): void {
    cells.clear();
    for (const entry of data) {
      const isBox = entry.length === 6;
      const yaw = isBox ? (entry[4] as number) : 0;
      const collider: Collider = {
        x: entry[0] as number,
        z: entry[1] as number,
        radius: isBox ? 0 : (entry[2] as number),
        halfWidth: isBox ? (entry[2] as number) : 0,
        halfDepth: isBox ? (entry[3] as number) : 0,
        cos: Math.cos(yaw),
        sin: Math.sin(yaw),
        isBox,
        top: entry[entry.length - 1],
      };

      const reach = (isBox ? Math.hypot(collider.halfWidth, collider.halfDepth) : collider.radius) + LARGEST_MOVER_RADIUS;
      const firstX = Math.floor((collider.x - reach) / CELL_SIZE);
      const lastX = Math.floor((collider.x + reach) / CELL_SIZE);
      const firstZ = Math.floor((collider.z - reach) / CELL_SIZE);
      const lastZ = Math.floor((collider.z + reach) / CELL_SIZE);
      for (let cx = firstX; cx <= lastX; cx++) {
        for (let cz = firstZ; cz <= lastZ; cz++) {
          const key = cellKey(cx, cz);
          const cell = cells.get(key);
          if (cell) cell.push(collider);
          else cells.set(key, [collider]);
        }
      }
    }
  }

  /** Pushes a round mover out of anything it can't step onto. Sliding along walls follows from this. */
  public static resolve(position: Point, radius: number, feet: number, stepHeight: number): void {
    for (let pass = 0; pass < PASSES; pass++) {
      const cell = cellAt(position.x, position.z);
      if (!cell) return;
      for (const collider of cell) {
        if (collider.top !== null && feet >= collider.top - stepHeight) continue;
        measure(collider, position.x, position.z);
        if (contact.gap < radius) {
          const push = radius - contact.gap;
          position.x += contact.normalX * push;
          position.z += contact.normalZ * push;
        }
      }
    }
  }

  /** The highest thing a mover at this height can stand on here, or -Infinity if there is none. */
  public static surfaceAt(x: number, z: number, feet: number, stepHeight: number): number {
    let surface = -Infinity;
    const cell = cellAt(x, z);
    if (!cell) return surface;
    for (const collider of cell) {
      if (collider.top === null || collider.top <= surface || feet < collider.top - stepHeight) continue;
      measure(collider, x, z);
      if (contact.gap <= 0) surface = collider.top;
    }
    return surface;
  }
}
