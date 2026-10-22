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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Lapisan token + drag satu jari (C2). Jari menggerakkan token bebas
 * (posisi optimistik lokal), saat dilepas di-snap ke tengah kotak terdekat
 * lalu dikirim `token:move` (rollback di store bila server menolak).
 * Token menClaim gesture satu jari via stopPropagation — pan/zoom tetap
 * dua jari (B3). Semua koordinat dalam piksel gambar.
 */
export default function TokenLayer({ tokens, grid, scale }: TokenLayerProps) {
  const resolved = resolveGrid(grid);
  const role = useRoomStore((state) => state.role);
  const moveToken = useRoomStore((state) => state.moveToken);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  // Izin peran (A6): sementara hanya DM; kepemilikan token pemain menyusul di C7/C8.
  const canDrag = role === 'dm';

  function startDrag(token: Token, event: PointerEvent<HTMLDivElement>) {
    if (!canDrag || scale <= 0) return;
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

  function handleEnd() {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current) return;
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
              canDrag ? 'cursor-grab active:cursor-grabbing' : ''
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
