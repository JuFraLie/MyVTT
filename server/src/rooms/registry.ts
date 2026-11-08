import { randomInt, randomUUID } from 'node:crypto';
import {
  DEFAULT_GRID,
  type AssetEntry,
  type GridConfig,
  type LogEntry,
  type Role,
  type RoomFullState,
  type RoomMap,
  type RoomMember,
  type Token,
  type TokenType,
} from '@myvtt/shared';
import { loadRoom, saveRoom } from '../db';

// Huruf mirip (0/O, 1/I, L) dihilangkan agar kode mudah diketik ulang dari layar HP.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 20;
// HP awal token baru (C3); DM mengubahnya lewat bottom sheet setelah diletakkan.
const DEFAULT_TOKEN_HP = 10;

interface RoomRecord {
  createdAt: number;
  /** Socket pemegang peran DM; null bila DM belum masuk (A2). */
  dmSocketId: string | null;
  /** Peta aktif (B1); satu peta per ruang. */
  map: RoomMap | null;
  /** Parameter grid dalam koordinat gambar (B2). */
  grid: GridConfig | null;
  /** Daftar token dasar ruang (C1). */
  tokens: Token[];
  /** Sel grid tertutup fog, kunci "col,row" (B4). */
  fog: string[];
  /** Pustaka token ruang (C8): unggahan gambar yang bisa diklon. */
  library: AssetEntry[];
  /** Log aksi bersama (D3): dadu, HP, giliran — urut waktu. */
  log: LogEntry[];
}

interface Membership {
  code: string;
  nickname: string;
  role: Role;
}

// Penyimpanan sementara; A5 menambahkan write-through ke MongoDB.
const rooms = new Map<string, RoomRecord>();
const memberships = new Map<string, Membership>();

/** Simpan state ruang ke DB setelah mutasi (fire-and-forget, A5). */
function persist(code: string): void {
  const room = rooms.get(code);
  if (!room) return;
  void saveRoom(code, {
    map: room.map,
    grid: room.grid,
    tokens: room.tokens,
    fog: room.fog,
    library: room.library,
    log: room.log,
  });
}

/**
 * Pastikan ruang ada di memori; bila tidak, pulihkan dari database (A5)
 * agar sesi bisa dilanjutkan setelah server restart atau hari berikutnya.
 * Mengembalikan false bila tidak ada di memori maupun di DB.
 */
export async function hydrateRoom(code: string): Promise<boolean> {
  if (rooms.has(code)) return true;
  const persisted = await loadRoom(code);
  if (!persisted) return false;
  rooms.set(code, { createdAt: Date.now(), dmSocketId: null, ...persisted });
  console.log(`[room] ${code} dipulihkan dari database`);
  return true;
}

/** Membuat ruang baru dan mengembalikan kode 6 karakter yang unik di server ini. */
export function createRoom(): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
    }
    if (!rooms.has(code)) {
      rooms.set(code, {
        createdAt: Date.now(),
        dmSocketId: null,
        map: null,
        grid: null,
        tokens: [],
        fog: [],
        library: [],
        log: [],
      });
      persist(code);
      return code;
    }
  }
  throw new Error('Gagal menghasilkan kode ruang unik');
}

export function getRoom(code: string): RoomRecord | undefined {
  return rooms.get(code);
}

export type JoinOutcome = 'ok' | 'ROOM_NOT_FOUND' | 'DM_EXISTS';

/**
 * Mencatat keanggotaan socket pada sebuah ruang (A2).
 * Peran DM hanya boleh satu socket tersambung agar izin A6 nanti tidak ambigu;
 * DM lama otomatis terlepas saat koneksi putus (disconnect).
 */
export function joinRoom(
  socketId: string,
  code: string,
  nickname: string,
  role: Role,
): JoinOutcome {
  const room = rooms.get(code);
  if (!room) return 'ROOM_NOT_FOUND';
  if (role === 'dm' && room.dmSocketId !== null && room.dmSocketId !== socketId) {
    return 'DM_EXISTS';
  }
  if (role === 'dm') room.dmSocketId = socketId;
  memberships.set(socketId, { code, nickname, role });
  return 'ok';
}

/**
 * Melepas keanggotaan socket saat koneksi terputus.
 * Mengembalikan kode ruang yang ditinggalkan (atau null) agar handler
 * dapat menyiarkan `state:full` terbaru ke ruang tersebut.
 */
export function leaveRoom(socketId: string): string | null {
  const membership = memberships.get(socketId);
  if (!membership) return null;
  memberships.delete(socketId);
  const room = rooms.get(membership.code);
  if (room && membership.role === 'dm' && room.dmSocketId === socketId) {
    room.dmSocketId = null;
  }
  return membership.code;
}

/** Potret state ruang untuk event `state:full` (A3). */
export function getRoomState(code: string): RoomFullState | null {
  const room = rooms.get(code);
  if (!room) return null;
  const members: RoomMember[] = [];
  for (const [socketId, membership] of memberships) {
    if (membership.code === code) {
      members.push({ socketId, nickname: membership.nickname, role: membership.role });
    }
  }
  return {
    code,
    members,
    map: room.map,
    grid: room.grid,
    tokens: room.tokens,
    fog: room.fog,
    library: room.library,
    log: room.log,
  };
}

/** Mengganti peta aktif ruang (B1). */
export function setRoomMap(code: string, map: RoomMap): void {
  const room = rooms.get(code);
  if (room) {
    room.map = map;
    persist(code);
  }
}

/** Mengganti seluruh daftar sel tertutup fog (B4, replace penuh). */
export function setRoomFog(code: string, cells: string[]): void {
  const room = rooms.get(code);
  if (room) {
    room.fog = cells;
    persist(code);
  }
}

// Batas entri pustaka per ruang (AGENTS §12: maks 40 gambar token).
const ASSET_LIMIT = 40;

/** Menambah entri pustaka (C8); null bila ruang tak ada atau batas 40 tercapai. */
export function addAsset(
  code: string,
  name: string,
  type: TokenType,
  image: string,
): AssetEntry | null {
  const room = rooms.get(code);
  if (!room || room.library.length >= ASSET_LIMIT) return null;
  const entry: AssetEntry = { id: randomUUID(), name, type, image };
  room.library.push(entry);
  persist(code);
  return entry;
}

/**
 * Menghapus entri pustaka (C8); false bila id tidak ditemukan.
 * Token yang memakai URL yang sama TIDAK ikut dihapus.
 */
export function removeAsset(code: string, id: string): boolean {
  const room = rooms.get(code);
  if (!room) return false;
  const index = room.library.findIndex((entry) => entry.id === id);
  if (index < 0) return false;
  room.library.splice(index, 1);
  persist(code);
  return true;
}

// Kapasitas log per ruang (D3): entri terlama dibuang agar state tetap ringan.
const LOG_LIMIT = 200;

/**
 * Menambah satu entri log bersama (D3) lalu persist; mengembalikan entri
 * lengkap (id + waktu server) untuk disiarkan `log:appended`.
 */
export function appendLog(
  code: string,
  entry: { type: LogEntry['type']; actor: string; text: string },
): LogEntry | null {
  const room = rooms.get(code);
  if (!room) return null;
  const full: LogEntry = { id: randomUUID(), at: Date.now(), ...entry };
  room.log.push(full);
  if (room.log.length > LOG_LIMIT) room.log.splice(0, room.log.length - LOG_LIMIT);
  persist(code);
  return full;
}

/** Mengganti parameter grid ruang (B2). */
export function setRoomGrid(code: string, grid: GridConfig): void {
  const room = rooms.get(code);
  if (room) {
    room.grid = grid;
    persist(code);
  }
}

/**
 * Menambah token dasar (C1). Posisi spawn dihitung server dari grid
 * (atau grid bawaan) — mulai dari tengah peta, digeser agar tidak menumpuk;
 * untuk ukuran >1 kotak (C9) anchor dikunci agar kotak muat di dalam peta.
 * `owner` (A6) = nama panggilan pemain pemilik; null = token DM/monster.
 * `image` (C7) = URL hasil crop lingkaran; null = warna + inisial.
 */
export function addToken(
  code: string,
  name: string,
  color: string,
  owner: string | null,
  image: string | null,
  size: 1 | 2 | 3,
): Token | null {
  const room = rooms.get(code);
  if (!room || !room.map) return null;
  const grid = room.grid ?? DEFAULT_GRID;
  const cols = Math.max(1, Math.floor((room.map.width - grid.offsetX) / grid.cellPx));
  const rows = Math.max(1, Math.floor((room.map.height - grid.offsetY) / grid.cellPx));
  const slot = Math.floor(rows / 2) * cols + Math.floor(cols / 2) + room.tokens.length;
  const token: Token = {
    id: randomUUID(),
    name,
    color,
    col: Math.max(0, Math.min(slot % cols, cols - size)),
    row: Math.max(0, Math.min(Math.min(rows - 1, Math.floor(slot / cols)), rows - size)),
    hp: DEFAULT_TOKEN_HP,
    owner,
    image,
    size,
  };
  room.tokens.push(token);
  persist(code);
  return token;
}

/** Ambil token by id (A6: izin dihitung per token). */
export function getToken(code: string, id: string): Token | undefined {
  return rooms.get(code)?.tokens.find((item) => item.id === id);
}

/** Menghapus token (A6); false bila id tidak ditemukan. */
export function removeToken(code: string, id: string): boolean {
  const room = rooms.get(code);
  if (!room) return false;
  const index = room.tokens.findIndex((item) => item.id === id);
  if (index < 0) return false;
  room.tokens.splice(index, 1);
  persist(code);
  return true;
}

/** Apakah ada pemain (role player) dengan nama itu di ruang? (validasi owner A6) */
export function isPlayerInRoom(code: string, nickname: string): boolean {
  for (const membership of memberships.values()) {
    if (
      membership.code === code &&
      membership.role === 'player' &&
      membership.nickname === nickname
    ) {
      return true;
    }
  }
  return false;
}

/** Memindahkan token (C2) ke indeks kotak baru; false bila id tidak ditemukan. */
export function moveToken(code: string, id: string, col: number, row: number): boolean {
  const token = rooms.get(code)?.tokens.find((item) => item.id === id);
  if (!token) return false;
  token.col = col;
  token.row = row;
  persist(code);
  return true;
}

/** Mengubah HP dan/atau gambar & ukuran token (C3/C7/C9); false bila id tak ada. */
export function updateToken(
  code: string,
  id: string,
  patch: { hp?: number; image?: string | null; size?: 1 | 2 | 3 },
): boolean {
  const token = rooms.get(code)?.tokens.find((item) => item.id === id);
  if (!token) return false;
  if (patch.hp !== undefined) token.hp = patch.hp;
  if (patch.image !== undefined) token.image = patch.image;
  if (patch.size !== undefined) token.size = patch.size;
  persist(code);
  return true;
}

// Batas gambar token berbeda per ruang (AGENTS.md §12).
const TOKEN_IMAGE_LIMIT = 40;

/**
 * Apakah menyetel `image` pada token masih dalam batas 40 gambar per ruang?
 * `tokenId` null = token baru. Gambar lama token yang sama dihitung ulang
 * (ganti gambar tidak menambah jumlah), dan URL identik tidak dihitung ganda.
 */
export function canSetTokenImage(code: string, tokenId: string | null, image: string): boolean {
  const room = rooms.get(code);
  if (!room) return false;
  const urls = new Set<string>();
  for (const token of room.tokens) {
    if (token.id !== tokenId && token.image) urls.add(token.image);
  }
  urls.add(image);
  return urls.size <= TOKEN_IMAGE_LIMIT;
}

export function getMembership(
  socketId: string,
): { code: string; nickname: string; role: Role } | undefined {
  return memberships.get(socketId);
}
