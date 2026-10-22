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
}

/** Peta aktif ruang (B1); dimensi dalam piksel gambar hasil kompresi. */
export interface RoomMap {
  url: string;
  width: number;
  height: number;
}

/** Hasil acknowledgment event `map:set` (B1). */
export type MapSetResult = { ok: true } | { ok: false; error: ErrorPayload };
