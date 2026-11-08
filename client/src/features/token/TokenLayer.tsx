import { useRef, useState, type PointerEvent } from 'react';
import type { GridConfig, Token } from '@myvtt/shared';
import { cellCenterToPixel, resolveGrid } from '../../lib/grid';
import { useRoomStore } from '../room/store';
import TokenView from './TokenView';

interface TokenLayerProps {
  tokens: Token[];
  grid: GridConfig | null;
  /** Skala tampilan viewport (layar→gambar) untuk mengubah delta jari. */
  scale: number;
  /** Dipanggil saat token diketuk tanpa digeser (C3: buka sheet HP). */
  onTapToken: (token: Token) => void;
  /** Mode fog aktif (B4): sentuh token diteruskan ke alat cat, bukan drag. */
  fogMode?: boolean;
}

interface DragState {
  id: string;
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

/** Ambang layar (px) untuk membedakan ketuk vs geser (C3). */
const TAP_THRESHOLD_PX = 8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Lapisan token + drag satu jari (C2). Jari menggerakkan token bebas
 * (posisi optimistik lokal), saat dilepas di-snap ke tengah kotak terdekat
 * lalu dikirim `token:move` (rollback di store bila server menolak).
 * Token menClaim gesture satu jari via stopPropagation — pan/zoom tetap
 * dua jari (B3). Semua koordinat dalam piksel gambar.
 */
export default function TokenLayer({
  tokens,
  grid,
  scale,
  onTapToken,
  fogMode = false,
}: TokenLayerProps) {
  const resolved = resolveGrid(grid);
  const role = useRoomStore((state) => state.role);
  const nickname = useRoomStore((state) => state.nickname);
  const moveToken = useRoomStore((state) => state.moveToken);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  // Izin peran (A6): DM bebas; pemain hanya token miliknya (owner = namanya).
  const canManage = (token: Token): boolean =>
    role === 'dm' || (token.owner !== null && token.owner === nickname);

  function startDrag(token: Token, event: PointerEvent<HTMLDivElement>) {
    // Mode fog: JANGAN stopPropagation — event diteruskan ke viewport untuk meng-cat sel.
    if (fogMode || !canManage(token) || scale <= 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = cellCenterToPixel(token.col, token.row, resolved);
    const next: DragState = {
      id: token.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      x: origin.x,
      y: origin.y,
    };
    dragRef.current = next;
    setDrag(next);
  }

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const current = dragRef.current;
    if (!current || scale <= 0) return;
    const next: DragState = {
      ...current,
      x: current.originX + (event.clientX - current.pointerX) / scale,
      y: current.originY + (event.clientY - current.pointerY) / scale,
    };
    dragRef.current = next;
    setDrag(next);
  }

  function handleEnd(event: PointerEvent<HTMLDivElement>) {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current) return;

    // Ketuk (jarak jari di bawah ambang) = buka sheet HP; gerak = snap & kirim.
    const distance = Math.hypot(event.clientX - current.pointerX, event.clientY - current.pointerY);
    if (distance < TAP_THRESHOLD_PX) {
      const tapped = tokens.find((item) => item.id === current.id);
      if (tapped) onTapToken(tapped);
      return;
    }

    const col = clamp(Math.floor((current.x - resolved.offsetX) / resolved.cellPx), 0, 999);
    const row = clamp(Math.floor((current.y - resolved.offsetY) / resolved.cellPx), 0, 999);
    const token = tokens.find((item) => item.id === current.id);
    if (token && (token.col !== col || token.row !== row)) {
      void moveToken(current.id, col, row);
    }
  }

  const size = resolved.cellPx * 0.9;

  return (
    <div className="absolute inset-0" aria-label="Token di peta">
      {tokens.map((token) => {
        const isDragging = drag?.id === token.id;
        const center =
          isDragging && drag
            ? { x: drag.x, y: drag.y }
            : cellCenterToPixel(token.col, token.row, resolved);
        return (
          <div
            key={token.id}
            className={`absolute touch-none ${
              canManage(token) ? 'cursor-grab active:cursor-grabbing' : ''
            } ${isDragging ? 'z-10' : ''}`}
            style={{
              left: center.x - size / 2,
              top: center.y - size / 2,
              width: size,
              height: size,
            }}
            onPointerDown={(event) => startDrag(token, event)}
            onPointerMove={handleMove}
            onPointerUp={handleEnd}
            onPointerCancel={handleEnd}
          >
            <TokenView token={token} size={size} />
          </div>
        );
      })}
    </div>
  );
}
