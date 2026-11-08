import { randomInt, randomUUID } from 'node:crypto';
import {
  DEFAULT_GRID,
  type GridConfig,
  type Role,
  type RoomFullState,
  type RoomMap,
  type RoomMember,
  type Token,
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
  void saveRoom(code, { map: room.map, grid: room.grid, tokens: room.tokens });
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
  return { code, members, map: room.map, grid: room.grid, tokens: room.tokens };
}

/** Mengganti peta aktif ruang (B1). */
export function setRoomMap(code: string, map: RoomMap): void {
  const room = rooms.get(code);
  if (room) {
    room.map = map;
    persist(code);
  }
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
 * (atau grid bawaan) — mulai dari tengah peta, digeser agar tidak menumpuk.
 * `owner` (A6) = nama panggilan pemain pemilik; null = token DM/monster.
 */
export function addToken(
  code: string,
  name: string,
  color: string,
  owner: string | null,
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
    col: slot % cols,
    row: Math.min(rows - 1, Math.floor(slot / cols)),
    hp: DEFAULT_TOKEN_HP,
    owner,
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

/** Mengubah HP token (C3); false bila id tidak ditemukan. */
export function updateTokenHp(code: string, id: string, hp: number): boolean {
  const token = rooms.get(code)?.tokens.find((item) => item.id === id);
  if (!token) return false;
  token.hp = hp;
  persist(code);
  return true;
}

export function getMembership(
  socketId: string,
): { code: string; nickname: string; role: Role } | undefined {
  return memberships.get(socketId);
}
