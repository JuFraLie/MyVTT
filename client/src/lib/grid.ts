import { DEFAULT_GRID, type GridConfig } from '@myvtt/shared';

/** Grid yang dipakai render bila DM belum mengatur grid (B2). */
export function resolveGrid(grid: GridConfig | null): GridConfig {
  return grid ?? DEFAULT_GRID;
}

/**
 * (col,row) indeks kotak → pusat kotak dalam koordinat piksel gambar.
 * Konversi ke piksel hanya terjadi saat render (AGENTS.md §5).
 */
export function cellCenterToPixel(
  col: number,
  row: number,
  grid: GridConfig,
): { x: number; y: number } {
  return {
    x: grid.offsetX + (col + 0.5) * grid.cellPx,
    y: grid.offsetY + (row + 0.5) * grid.cellPx,
  };
}
