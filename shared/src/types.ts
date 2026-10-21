/** Tipe domain bersama klien dan server (AGENTS.md §5). */

export type Role = 'dm' | 'player';

/** Ukuran token dalam satuan kotak grid: Medium 1, Large 2, Huge 3. */
export type TokenSize = 1 | 2 | 3;

/**
 * Parameter grid dalam koordinat piksel gambar peta (bukan piksel layar),
 * agar tidak bergeser saat zoom atau resize (AGENTS.md §12).
 */
export interface GridConfig {
  cellPx: number;
  offsetX: number;
  offsetY: number;
  locked: boolean;
  color: string;
  opacity: number;
}

/** Payload bawaan event server→klien `error`. */
export interface ErrorPayload {
  code: string;
  message: string;
}

/**
 * Hasil acknowledgment event `room:create` (A1).
 * Kode 6 karakter unik di server, dibagikan ke pemain lewat fitur A2.
 */
export interface RoomCreateAck {
  code: string;
}
