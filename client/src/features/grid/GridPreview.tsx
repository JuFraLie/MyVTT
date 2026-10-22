import { useRef, useState, type PointerEvent } from 'react';
import type { GridConfig, RoomMap } from '@myvtt/shared';
import GridOverlay from './GridOverlay';
import { useFitScale } from './useFitScale';

interface GridPreviewProps {
  map: RoomMap;
  grid: GridConfig;
  showGrid: boolean;
  onChange: (patch: Partial<GridConfig>) => void;
}

const MIN_CELL = 8;
const MAX_CELL = 4096;
const ZOOM_STEPS = [0.5, 1, 1.5, 2, 3, 4, 6];

interface DragState {
  mode: 'pan' | 'move' | 'resize';
  pointerX: number;
  pointerY: number;
  panX: number;
  panY: number;
  offsetX: number;
  offsetY: number;
  cellPx: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Pratinjau peta + grid (B2): seret kotak contoh untuk geser offset,
 * tarik pegangan sudut untuk ubah ukuran kotak, seret latar untuk pan,
 * tombol +/− untuk pratinjau zoom. Semua nilai dalam koordinat piksel gambar.
 */
export default function GridPreview({ map, grid, showGrid, onChange }: GridPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fit = useFitScale(containerRef, map.width, map.height);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<DragState | null>(null);

  const scale = fit * zoom;
  const displayW = map.width * scale;
  const displayH = map.height * scale;

  function beginDrag(mode: DragState['mode'], event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      offsetX: grid.offsetX,
      offsetY: grid.offsetY,
      cellPx: grid.cellPx,
    };
  }

  function handleMove(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.pointerX) / scale;
    const dy = (event.clientY - drag.pointerY) / scale;

    if (drag.mode === 'pan') {
      setPan({
        x: drag.panX + (event.clientX - drag.pointerX),
        y: drag.panY + (event.clientY - drag.pointerY),
      });
      return;
    }
    if (drag.mode === 'move') {
      onChange({
        offsetX: clamp(Math.round(drag.offsetX + dx), 0, MAX_CELL),
        offsetY: clamp(Math.round(drag.offsetY + dy), 0, MAX_CELL),
      });
      return;
    }
    onChange({ cellPx: clamp(drag.cellPx + Math.max(dx, dy), MIN_CELL, MAX_CELL) });
  }

  function endDrag() {
    dragRef.current = null;
  }

  function changeZoom(index: number) {
    const next = ZOOM_STEPS[clamp(index, 0, ZOOM_STEPS.length - 1)];
    if (next) setZoom(next);
  }

  const zoomIndex = ZOOM_STEPS.indexOf(zoom);

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 touch-none overflow-hidden bg-slate-950 select-none"
      onPointerDown={(event) => {
        if (
          event.target === event.currentTarget ||
          event.target === event.currentTarget.firstChild
        ) {
          beginDrag('pan', event);
        }
      }}
      onPointerMove={handleMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          width: displayW,
          height: displayH,
        }}
      >
        <img src={map.url} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
        {showGrid && <GridOverlay width={displayW} height={displayH} scale={scale} grid={grid} />}
        {/* Kotak contoh: satu sel grid yang bisa digeser */}
        <div
          className="absolute touch-none border-2 border-amber-400/90"
          style={{
            left: grid.offsetX * scale,
            top: grid.offsetY * scale,
            width: Math.max(grid.cellPx * scale, 16),
            height: Math.max(grid.cellPx * scale, 16),
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
          }}
          onPointerDown={(event) => beginDrag('move', event)}
        >
          {/* Pegangan sudut: tarik untuk mengubah ukuran sel */}
          <div
            className="absolute -bottom-4 -right-4 h-9 w-9 rounded-full border-2 border-amber-400 bg-slate-900"
            onPointerDown={(event) => beginDrag('resize', event)}
          />
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <button
          type="button"
          aria-label="Perbesar pratinjau"
          className="h-11 w-11 rounded-xl border border-slate-700 bg-slate-900 text-lg text-slate-100"
          onClick={() => changeZoom(zoomIndex + 1)}
        >
          +
        </button>
        <button
          type="button"
          className="h-11 w-11 rounded-xl border border-slate-700 bg-slate-900 text-xs text-slate-300"
          onClick={() => changeZoom(zoomIndex - 1)}
        >
          −
        </button>
      </div>
      <p className="absolute left-3 top-2 rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-400">
        Seret kotak kuning = geser · tarik lingkaran = ubah ukuran
      </p>
    </div>
  );
}
