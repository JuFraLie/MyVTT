import { useRef, useState, type PointerEvent } from 'react';
import type { GridConfig, RoomMap, Token } from '@myvtt/shared';
import { logTelemetry } from '../../lib/telemetry';
import FogOverlay from '../fog/FogOverlay';
import { useFogPaint } from '../fog/useFogPaint';
import GridOverlay from '../grid/GridOverlay';
import { useElementSize } from '../grid/useFitScale';
import TokenLayer from '../token/TokenLayer';

interface MapViewportProps {
  map: RoomMap;
  grid: GridConfig | null;
  tokens: Token[];
  /** Diteruskan ke TokenLayer: ketuk token (tanpa geser) = buka sheet HP. */
  onTapToken: (token: Token) => void;
  /** Sel grid tertutup fog (B4). */
  fog: string[];
  /** Mode alat fog (B4): satu jari meng-cat sel, dua jari tetap pan/zoom. */
  fogMode: boolean;
  /** Commit hasil cat — disambungkan ke store.setFog (niat `fog:set`). */
  onFogChange: (cells: string[]) => void;
}

interface View {
  x: number;
  y: number;
  s: number;
}

interface PinchState {
  dist: number;
  midX: number;
  midY: number;
  view: View;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 6;

// Ambang telemetry (G2): geser >8 px = pan nyata; ketukan <10 px & <500 ms = tap.
const PAN_THRESHOLD_PX = 8;
const TAP_SLOP_PX = 10;
const TAP_MAX_MS = 500;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Peta + grid dengan gesture sendiri (B3, AGENTS §7):
 * satu jari DISIHKAN untuk aksi alat (token/fog/ruler — C2/B4/B5),
 * dua jari = pan + pinch-zoom, mouse (desktop) = drag-pan.
 * Semua posisi dalam koordinat piksel gambar; kanvas memakai touch-action: none.
 */
export default function MapViewport({
  map,
  grid,
  tokens,
  onTapToken,
  fog,
  fogMode,
  onFogChange,
}: MapViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const fogPaint = useFogPaint({ enabled: fogMode, map, grid, fog, onCommit: onFogChange });
  const fit =
    size.width > 0 && size.height > 0 && map.width > 0 && map.height > 0
      ? Math.min(size.width / map.width, size.height / map.height)
      : 0;

  const [view, setViewState] = useState<View | null>(null);
  const [hint, setHint] = useState(true);
  const viewRef = useRef<View | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<PinchState | null>(null);
  const panRef = useRef<{ x: number; y: number; view: View } | null>(null);
  const tapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  function setView(next: View | null) {
    viewRef.current = next;
    setViewState(next);
  }

  // Tampilan awal: gambar pas (fit) di tengah; berubah hanya setelah digeser/dicubit.
  const renderView: View =
    view ??
    (fit > 0
      ? { x: (size.width - map.width * fit) / 2, y: (size.height - map.height * fit) / 2, s: fit }
      : { x: 0, y: 0, s: 1 });

  const resolveView = (): View => viewRef.current ?? renderView;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (fit <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();

    if (event.pointerType === 'mouse') {
      if ((event.target as HTMLElement).closest('button')) return;
      // Mode fog: mouse ikut meng-cat; di luar gambar → gagal → jatuh ke pan biasa.
      if (fogPaint.begin(event, rect, resolveView())) {
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      panRef.current = { x: event.clientX, y: event.clientY, view: resolveView() };
      return;
    }

    // Sentuh: catat jari; gestur dijalankan hanya saat dua jari aktif.
    pointersRef.current.set(event.pointerId, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    if (pointersRef.current.size === 2) {
      // Jari kedua mengalahkan cat: goresan parsial tetap dikomit, lalu pinch.
      fogPaint.abort();
      tapRef.current = null; // bukan ketukan: dua jari = gesture, bukan tap
      const points = [...pointersRef.current.values()];
      const a = points[0];
      const b = points[1];
      if (!a || !b) return;
      pinchRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        view: resolveView(),
      };
      setHint(false);
      return;
    }
    if (pointersRef.current.size > 2) return;
    // Mode fog: sentuh satu jari diarahkan ke alat cat; selain itu no-op (B3).
    if (fogPaint.begin(event, rect, resolveView())) {
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    // Ketukan satu jari tanpa alat: dicatat sebagai kandidat ketukan salah (G2).
    tapRef.current = { t: performance.now(), x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (panRef.current) {
      const start = panRef.current;
      setView({
        ...start.view,
        x: start.view.x + (event.clientX - start.x),
        y: start.view.y + (event.clientY - start.y),
      });
      return;
    }
    if (fogPaint.isActive()) {
      fogPaint.move(event);
      return;
    }
    if (!pointersRef.current.has(event.pointerId)) return;

    const rect = event.currentTarget.getBoundingClientRect();
    pointersRef.current.set(event.pointerId, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });

    const pinch = pinchRef.current;
    if (!pinch || pointersRef.current.size < 2 || pinch.dist < 1) return;

    const points = [...pointersRef.current.values()];
    const a = points[0];
    const b = points[1];
    if (!a || !b) return;

    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const s = clamp((pinch.view.s * dist) / pinch.dist, fit * MIN_ZOOM, fit * MAX_ZOOM);

    // Titik konten di bawah midpoint awal tetap terjepit di midpoint sekarang (zoom ke arah jari).
    const contentX = (pinch.midX - pinch.view.x) / pinch.view.s;
    const contentY = (pinch.midY - pinch.view.y) / pinch.view.s;
    setView({ x: midX - contentX * s, y: midY - contentY * s, s });
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    fogPaint.end(); // no-op bila tidak sedang meng-cat; komit goresan selesai
    const pinchStart = pinchRef.current;
    const panStart = panRef.current;
    const pinchEnding = pinchStart !== null && pointersRef.current.size === 2;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    panRef.current = null;

    // Telemetry G2: akhir gesture → catat zoom/pan hanya bila tampilan berubah.
    const end = viewRef.current;
    if (end && pinchEnding && pinchStart) {
      if (Math.abs(end.s - pinchStart.view.s) > 1e-4) {
        logTelemetry('map_zoom', { from: round3(pinchStart.view.s), to: round3(end.s) });
      }
      const movedX = end.x - pinchStart.view.x;
      const movedY = end.y - pinchStart.view.y;
      if (Math.hypot(movedX, movedY) > PAN_THRESHOLD_PX) {
        logTelemetry('map_pan', { dx: Math.round(movedX), dy: Math.round(movedY) });
      }
    }
    if (end && panStart && event.pointerType === 'mouse') {
      const movedX = end.x - panStart.view.x;
      const movedY = end.y - panStart.view.y;
      if (Math.hypot(movedX, movedY) > PAN_THRESHOLD_PX) {
        logTelemetry('map_pan', { dx: Math.round(movedX), dy: Math.round(movedY) });
      }
    }

    // Ketukan salah (G2): tap diam di peta tanpa alat & tanpa efek apa pun.
    // Token sudah stopPropagation (bukan bagian viewport) & mode fog memakai
    // alat cat — keduanya tidak masuk hitungan ini.
    const tap = tapRef.current;
    tapRef.current = null;
    if (tap && pointersRef.current.size === 0 && event.pointerType !== 'mouse') {
      const moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y);
      if (moved < TAP_SLOP_PX && performance.now() - tap.t < TAP_MAX_MS) {
        logTelemetry('mis_tap', {});
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        className="absolute left-0 top-0 will-change-transform"
        style={{
          width: map.width,
          height: map.height,
          transformOrigin: 'top left',
          transform: `translate(${renderView.x}px, ${renderView.y}px) scale(${renderView.s})`,
        }}
      >
        <img
          src={map.url}
          alt="Peta ruang"
          draggable={false}
          className="absolute inset-0 h-full w-full"
        />
        {grid && <GridOverlay width={map.width} height={map.height} scale={1} grid={grid} />}
        <TokenLayer
          tokens={tokens}
          grid={grid}
          scale={renderView.s}
          onTapToken={onTapToken}
          fogMode={fogMode}
        />
        <FogOverlay map={map} grid={grid} cells={fog} preview={fogPaint.preview} />
      </div>

      {fogMode ? (
        <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-indigo-900/90 px-3 py-1.5 text-xs text-indigo-200">
          Ketuk sel = buka/tutup · seret = tutup area
        </p>
      ) : (
        hint && (
          <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs text-slate-300">
            Dua jari untuk geser · cubit untuk zoom
          </p>
        )
      )}
    </div>
  );
}
