import { useEffect, useMemo, useRef } from 'react';
import type { GridConfig, RoomMap } from '@myvtt/shared';
import { resolveGrid } from '../../lib/grid';
import { useRoomStore } from '../room/store';

interface FogOverlayProps {
  map: RoomMap;
  grid: GridConfig | null;
  /** Sel tertutup tersimpan ("col,row"); diganti bila `preview` ada. */
  cells: string[];
  /** Pratinjau selama stroke fog berlangsung; null = pakai `cells`. */
  preview: Set<string> | null;
}

/**
 * Overlay fog (B4): SATU canvas seukuran gambar — sel tertutup diisi hitam,
 * jauh lebih ringan di HP ketimbang ratusan div. Pemain melihat tertutup penuh,
 * DM melihat redup agar tetap tahu area mana yang disembunyikan.
 */
export default function FogOverlay({ map, grid, cells, preview }: FogOverlayProps) {
  const role = useRoomStore((state) => state.role);
  const resolved = resolveGrid(grid);
  const active = useMemo(() => preview ?? new Set(cells), [preview, cells]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, map.width, map.height);
    if (active.size === 0) return;
    ctx.fillStyle = '#020617'; // slate-950: menutup penuh di layar HP
    for (const key of active) {
      const comma = key.indexOf(',');
      const col = Number(key.slice(0, comma));
      const row = Number(key.slice(comma + 1));
      if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
      ctx.fillRect(
        resolved.offsetX + col * resolved.cellPx,
        resolved.offsetY + row * resolved.cellPx,
        resolved.cellPx,
        resolved.cellPx,
      );
    }
  }, [active, resolved, map.width, map.height]);

  if (active.size === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ opacity: role === 'dm' ? 0.4 : 1 }}
    >
      <canvas ref={canvasRef} width={map.width} height={map.height} className="h-full w-full" />
    </div>
  );
}
