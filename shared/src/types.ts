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

/** Warna preset token (C1): dipilih klien, divalidasi server lewat skema. */
export const TOKEN_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#6366f1',
  '#a855f7',
  '#ec4899',
] as const;

/** Grid bawaan sebelum DM mengatur grid (B2); dipakai hitungan server & render. */
export const DEFAULT_GRID: GridConfig = {
  cellPx: 70,
  offsetX: 0,
  offsetY: 0,
  locked: false,
  color: '#3b82f6',
  opacity: 0.6,
};

/**
 * Token dasar (C1): warna + inisial bawaan (bila belum/gagal punya gambar).
 * Posisi disimpan sebagai indeks kotak grid (col,row), bukan piksel (AGENTS.md §5).
 */
export interface Token {
  id: string;
  name: string;
  col: number;
  row: number;
  color: string;
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

/**
 * Hasil acknowledgment event `room:join` (A2).
 * Kegagalan domain (kode salah, DM sudah ada) memakai `ok: false` agar
 * bisa ditampilkan langsung ke pengguna.
 */
export type RoomJoinResult =
  { ok: true; code: string; nickname: string; role: Role } | { ok: false; error: ErrorPayload };

export interface RoomMember {
  socketId: string;
  nickname: string;
  role: Role;
}

/**
 * Payload event `state:full` (A3): potret state ruang dari server,
 * satu-satunya sumber kebenaran klien. Bidang baru (token, fog, log)
 * ditambahkan bersama fiturnya.
 */
export interface RoomFullState {
  code: string;
  members: RoomMember[];
  map: RoomMap | null;
  grid: GridConfig | null;
  tokens: Token[];
}

/** Peta aktif ruang (B1); dimensi dalam piksel gambar hasil kompresi. */
export interface RoomMap {
  url: string;
  width: number;
  height: number;
}

/** Hasil acknowledgment event `map:set` (B1). */
export type MapSetResult = { ok: true } | { ok: false; error: ErrorPayload };

/** Hasil acknowledgment event `grid:set` (B2). */
export type GridSetResult = { ok: true } | { ok: false; error: ErrorPayload };

/** Hasil acknowledgment event `token:add` (C1). */
export type TokenAddResult = { ok: true } | { ok: false; error: ErrorPayload };
