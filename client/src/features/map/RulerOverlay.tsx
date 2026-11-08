import type { GridConfig, RoomMap, RulerState } from '@myvtt/shared';
import { cellCenterToPixel, resolveGrid } from '../../lib/grid';

interface RulerOverlayProps {
  map: RoomMap;
  grid: GridConfig | null;
  rulers: Record<string, RulerState>;
  /** Skala tampilan — ukuran garis/teks dikalikan 1/supaya konstan di layar. */
  scale: number;
}

/**
 * Overlay penggaris jarak (B5): garis antar pusat kotak + jarak Euclidean
 * dalam kotak dan kaki (1 kotak = 5 kaki). Digambar dalam koordinat piksel
 * gambar agar ikut transform peta; label memakai counter-scale zoom.
 */
export default function RulerOverlay({ map, grid, rulers, scale }: RulerOverlayProps) {
  const entries = Object.entries(rulers);
  if (entries.length === 0) return null;

  const resolved = resolveGrid(grid);
  const inv = 1 / scale;
  const fontSize = 12 * inv;
  const halo = 2 * inv;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={map.width}
      height={map.height}
      aria-hidden="true"
    >
      {entries.map(([owner, ruler]) => {
        const a = cellCenterToPixel(ruler.from.col, ruler.from.row, resolved);
        const b = cellCenterToPixel(ruler.to.col, ruler.to.row, resolved);
        const cells = Math.hypot(b.x - a.x, b.y - a.y) / resolved.cellPx;
        const feet = Math.round(cells * 5);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        return (
          <g key={owner}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#a5b4fc"
              strokeWidth={2 * inv}
              strokeDasharray={`${8 * inv} ${6 * inv}`}
            />
            <circle cx={a.x} cy={a.y} r={5 * inv} fill="#a5b4fc" />
            <circle
              cx={b.x}
              cy={b.y}
              r={5 * inv}
              fill="#f8fafc"
              stroke="#6366f1"
              strokeWidth={2 * inv}
            />
            <text
              x={midX}
              y={midY - 10 * inv}
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight={700}
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth={halo}
              style={{ paintOrder: 'stroke' }}
            >
              {`${cells.toFixed(1)} kotak · ${feet} kaki`}
            </text>
            <text
              x={a.x}
              y={a.y + 18 * inv}
              textAnchor="middle"
              fontSize={fontSize * 0.85}
              fill="#e2e8f0"
              stroke="#0f172a"
              strokeWidth={halo}
              style={{ paintOrder: 'stroke' }}
            >
              {owner}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
