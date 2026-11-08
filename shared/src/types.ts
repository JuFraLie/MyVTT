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
  /** HP token (C3); default diisi server, diubah lewat `token:update`. */
  hp: number;
  /**
   * Nama panggilan pemain pemilik (A6); null = token DM/monster.
   * Pemain hanya boleh menggerakkan token miliknya sendiri.
   */
  owner: string | null;
  /**
   * URL gambar token hasil unggah bulat 256x256 WebP (C7);
   * hilang/null = token memakai fallback warna + inisial (C1).
   */
  image?: string | null;
  /**
   * Sisi token dalam kotak grid (C9): 1 = Medium, 2 = Large, 3 = Huge.
   * Hilang = Medium (dokumen lama); anchor (col,row) = kotak kiri-atas.
   */
  size?: 1 | 2 | 3;
}

/** Payload bawaan event server→klien `error`. */
export interface ErrorPayload {
  code: string;
  message: string;
}

/** Tipe label entri pustaka token (C8): pemain atau monster. */
export type TokenType = 'pemain' | 'monster';

/** Entri pustaka token ruang (C8): satu gambar unggahan yang bisa dipakai ulang. */
export interface AssetEntry {
  id: string;
  name: string;
  type: TokenType;
  image: string;
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
  /** Sel grid yang tertutup fog, kunci "col,row" (B4); [] = tidak ada fog. */
  fog: string[];
  /** Pustaka token ruang (C8); daftar gambar unggahan yang bisa diklon. */
  library: AssetEntry[];
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

/** Payload event server→klien `token:moved` (C2): posisi token tersinkron. */
export interface TokenMovedPayload {
  id: string;
  col: number;
  row: number;
}

/** Hasil acknowledgment event `token:move` (C2). */
export type TokenMoveResult = { ok: true } | { ok: false; error: ErrorPayload };

/**
 * Payload event server→klien `token:updated` (C3/C7/C9): HP, gambar, dan/atau
 * ukuran token tersinkron. Hanya field yang dikirim yang berubah.
 */
export interface TokenUpdatedPayload {
  id: string;
  hp?: number;
  image?: string | null;
  size?: 1 | 2 | 3;
}

/** Hasil acknowledgment event `token:update` (C3). */
export type TokenUpdateResult = { ok: true } | { ok: false; error: ErrorPayload };

/** Payload event server→klien `token:removed` (A6): token dihapus dari ruang. */
export interface TokenRemovedPayload {
  id: string;
}

/** Hasil acknowledgment event `token:remove` (A6). */
export type TokenRemoveResult = { ok: true } | { ok: false; error: ErrorPayload };

/** Hasil acknowledgment event `fog:set` (B4). */
export type FogSetResult = { ok: true } | { ok: false; error: ErrorPayload };

/** Payload event server→klien `fog:updated` (B4): daftar sel tertutup (replace penuh). */
export interface FogUpdatedPayload {
  cells: string[];
}

/** Payload event server→klien `asset:added` (C8): entri baru di pustaka. */
export interface AssetAddedPayload {
  entry: AssetEntry;
}

/** Payload event server→klien `asset:removed` (C8): entri keluar dari pustaka. */
export interface AssetRemovedPayload {
  id: string;
}

/** Tipe dadu yang didukung (D1). */
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

/** Payload event server→klien `dice:rolled` (D1): hasil lemparan anggota ruang. */
export interface DiceRolledPayload {
  dice: DiceType;
  count: number;
  /** Nilai mentah tiap dadu (tanpa modifier), berurutan sesuai lemparan. */
  rolls: number[];
  modifier: number;
  /** total = sum(rolls) + modifier — dihitung di server agar adil (D1). */
  total: number;
  /** Nama panggilan pemilik lemparan. */
  nickname: string;
}

/** Hasil acknowledgment event `dice:roll` (D1). */
export type DiceRollResult = { ok: true } | { ok: false; error: ErrorPayload };

/** Hasil acknowledgment event `asset:add` (C8). */
export type AssetAddResult = { ok: true } | { ok: false; error: ErrorPayload };

/** Hasil acknowledgment event `asset:remove` (C8). */
export type AssetRemoveResult = { ok: true } | { ok: false; error: ErrorPayload };
