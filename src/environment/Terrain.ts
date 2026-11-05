/** Ground heights exported from Blender. Row is game z, column is game x. */
export interface Heightfield {
  size: number;
  resolution: number;
  data: Float32Array;
}

export class Terrain {
  private static field: Heightfield | null = null;

  public static setHeightfield(field: Heightfield | null): void {
    this.field = field;
  }

  /** Ground height at a world position, clamped to the edge of the heightfield. */
  public static getHeight(x: number, z: number): number {
    const field = this.field;
    if (!field) return 0;

    const last = field.resolution - 1;
    const scale = last / field.size;
    const column = Math.min(Math.max((x + field.size / 2) * scale, 0), last);
    const row = Math.min(Math.max((z + field.size / 2) * scale, 0), last);
    const c0 = Math.min(Math.floor(column), last - 1);
    const r0 = Math.min(Math.floor(row), last - 1);
    const fc = column - c0;
    const fr = row - r0;
    const at = (r: number, c: number): number => field.data[r * field.resolution + c];
    const near = at(r0, c0) * (1 - fc) + at(r0, c0 + 1) * fc;
    const far = at(r0 + 1, c0) * (1 - fc) + at(r0 + 1, c0 + 1) * fc;
    return near * (1 - fr) + far * fr;
  }
}
