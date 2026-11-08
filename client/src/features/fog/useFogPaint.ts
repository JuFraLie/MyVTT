import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GridConfig, RoomMap } from '@myvtt/shared';
import { resolveGrid } from '../../lib/grid';

/** Transform tampilan viewport (layar → konten), sama dengan View di MapViewport. */
interface View {
  x: number;
  y: number;
  s: number;
}

interface StrokeState {
  /** cover = goresan menutup sel; open = goresan membuka sel (dari sel awal). */
  mode: 'cover' | 'open';
  cells: Set<string>;
  lastKey: string | null;
  dirty: boolean;
  rect: { left: number; top: number };
  view: View;
}

interface FogPaintOptions {
  enabled: boolean;
  map: RoomMap;
  grid: GridConfig | null;
  fog: string[];
  /** Commit akhir goresan (replace penuh) — disambungkan ke store.setFog. */
  onCommit: (cells: string[]) => void;
}

export interface FogPainter {
  /** Pratinjau selama stroke berlangsung; null = pakai `fog` tersimpan. */
  preview: Set<string> | null;
  isActive: () => boolean;
  begin: (event: ReactPointerEvent<HTMLDivElement>, rect: DOMRect, view: View) => boolean;
  move: (event: ReactPointerEvent<HTMLDivElement>) => void;
  end: () => void;
  /** Hentikan stroke lebih awal (jari kedua masuk) — tetap mengkomit goresan sejauh ini. */
  abort: () => void;
}

/**
 * Alat cat fog (B4): satu jari di MapViewport diarahkan ke sini saat mode fog.
 * Ketuk = toggle sel; seret = memperpanjang mode sel awal (mulai di sel tertutup
 * → membuka; mulai di sel terbuka → menutup). Sel dikerjakan dalam koordinat
 * piksel gambar; daftar final baru dikirim saat jari diangkat (optimistik di store).
 */
export function useFogPaint(options: FogPaintOptions): FogPainter {
  const { enabled, map, grid, fog, onCommit } = options;
  const strokeRef = useRef<StrokeState | null>(null);
  const [preview, setPreview] = useState<Set<string> | null>(null);

  function cellAt(
    clientX: number,
    clientY: number,
    rect: { left: number; top: number },
    view: View,
  ): string | null {
    const resolved = resolveGrid(grid);
    const contentX = (clientX - rect.left - view.x) / view.s;
    const contentY = (clientY - rect.top - view.y) / view.s;
    const col = Math.floor((contentX - resolved.offsetX) / resolved.cellPx);
    const row = Math.floor((contentY - resolved.offsetY) / resolved.cellPx);
    // Batas = kotak yang benar-benar ada di atas gambar (di luar itu diabaikan).
    const maxCol = Math.floor((map.width - resolved.offsetX) / resolved.cellPx) - 1;
    const maxRow = Math.floor((map.height - resolved.offsetY) / resolved.cellPx) - 1;
    if (col < 0 || row < 0 || col > maxCol || row > maxRow) return null;
    return `${col},${row}`;
  }

  function apply(stroke: StrokeState, key: string) {
    if (key === stroke.lastKey) return;
    stroke.lastKey = key;
    if (stroke.mode === 'cover') stroke.cells.add(key);
    else stroke.cells.delete(key);
    stroke.dirty = true;
    setPreview(new Set(stroke.cells));
  }

  function commit() {
    const stroke = strokeRef.current;
    strokeRef.current = null;
    setPreview(null);
    if (stroke?.dirty) onCommit([...stroke.cells]);
  }

  return {
    preview,
    isActive: () => strokeRef.current !== null,
    begin(event, rect, view) {
      if (!enabled || strokeRef.current) return false;
      const cells = new Set(fog);
      const key = cellAt(event.clientX, event.clientY, rect, view);
      if (key === null) return false;
      strokeRef.current = {
        mode: cells.has(key) ? 'open' : 'cover',
        cells,
        lastKey: null,
        dirty: false,
        rect: { left: rect.left, top: rect.top },
        view,
      };
      apply(strokeRef.current, key);
      return true;
    },
    move(event) {
      const stroke = strokeRef.current;
      if (!stroke) return;
      const key = cellAt(event.clientX, event.clientY, stroke.rect, stroke.view);
      if (key !== null) apply(stroke, key);
    },
    end: commit,
    abort: commit,
  };
}
