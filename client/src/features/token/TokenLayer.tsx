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
  /** Token yang sedang giliran (C5) — ditandai ring emas di TokenView. */
  activeTokenId?: string | null;
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
 * Pusat kotak token: anchor (kiri-atas) digeser ke sel tengah (n-1)/2 sehingga
 * drag & snap berpusat pada kotak n×n — Medium (n=1) identik dengan sel anchor (C9).
 */
function tokenCenter(token: Token, grid: GridConfig): { x: number; y: number } {
  const n = token.size ?? 1;
  return cellCenterToPixel(token.col + (n - 1) / 2, token.row + (n - 1) / 2, grid);
}

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
  activeTokenId = null,
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
    const origin = tokenCenter(token, resolved);
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

    const token = tokens.find((item) => item.id === current.id);
    const n = token?.size ?? 1;
    // Snap ke kotak terdekat berdasar PUSAT kotak n×n (C9); anchor dijaga
    // agar seluruh kotak tetap dalam rentang kolom/baris 0..999.
    const col = clamp(
      Math.round((current.x - resolved.offsetX) / resolved.cellPx - n / 2),
      0,
      1000 - n,
    );
    const row = clamp(
      Math.round((current.y - resolved.offsetY) / resolved.cellPx - n / 2),
      0,
      1000 - n,
    );
    if (token && (token.col !== col || token.row !== row)) {
      void moveToken(current.id, col, row);
    }
  }

  return (
    <div className="absolute inset-0" aria-label="Token di peta">
      {tokens.map((token) => {
        const n = token.size ?? 1;
        // Kotak sedikit lebih kecil dari sel total agar tetap ada celah visual.
        const box = n * resolved.cellPx - resolved.cellPx * 0.1;
        const isDragging = drag?.id === token.id;
        const center = isDragging && drag ? { x: drag.x, y: drag.y } : tokenCenter(token, resolved);
        return (
          <div
            key={token.id}
            className={`absolute touch-none ${
              canManage(token) ? 'cursor-grab active:cursor-grabbing' : ''
            } ${isDragging ? 'z-10' : ''}`}
            style={{
              left: center.x - box / 2,
              top: center.y - box / 2,
              width: box,
              height: box,
            }}
            onPointerDown={(event) => startDrag(token, event)}
            onPointerMove={handleMove}
            onPointerUp={handleEnd}
            onPointerCancel={handleEnd}
          >
            <TokenView
              token={token}
              size={box}
              cellPx={resolved.cellPx}
              activeTurn={token.id === activeTokenId}
            />
          </div>
        );
      })}
    </div>
  );
}
