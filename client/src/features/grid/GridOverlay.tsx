import type { GridConfig } from '@myvtt/shared';

interface GridOverlayProps {
  /** Ukuran kotak gambar di layar (px). */
  width: number;
  height: number;
  /** Skala tampilan: piksel gambar → piksel layar. */
  scale: number;
  grid: GridConfig;
}

/**
 * Garis grid dirender dengan gradient dalam koordinat piksel gambar
 * (offset & cellPx × skala), sehingga tetap pas saat zoom/resize layar.
 */
export default function GridOverlay({ width, height, scale, grid }: GridOverlayProps) {
  const cell = grid.cellPx * scale;
  if (cell <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0"
      style={{
        width,
        height,
        opacity: grid.opacity,
        backgroundColor: 'transparent',
        backgroundImage: `repeating-linear-gradient(to right, ${grid.color} 0 1px, transparent 1px ${cell}px), repeating-linear-gradient(to bottom, ${grid.color} 0 1px, transparent 1px ${cell}px)`,
        backgroundPosition: `${grid.offsetX * scale}px ${grid.offsetY * scale}px`,
        backgroundSize: `${cell}px ${cell}px`,
      }}
    />
  );
}
