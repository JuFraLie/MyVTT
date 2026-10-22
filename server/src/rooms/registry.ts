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

// Huruf mirip (0/O, 1/I, L) dihilangkan agar kode mudah diketik ulang dari layar HP.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 20;

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

// Penyimpanan sementara (A5 menambahkan persistensi MongoDB).
const rooms = new Map<string, RoomRecord>();
const memberships = new Map<string, Membership>();

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
  if (room) room.map = map;
}

/** Mengganti parameter grid ruang (B2). */
export function setRoomGrid(code: string, grid: GridConfig): void {
  const room = rooms.get(code);
  if (room) room.grid = grid;
}

/**
 * Menambah token dasar (C1). Posisi spawn dihitung server dari grid
 * (atau grid bawaan) — mulai dari tengah peta, digeser agar tidak menumpuk.
 */
export function addToken(code: string, name: string, color: string): Token | null {
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
  };
  room.tokens.push(token);
  return token;
}

/** Memindahkan token (C2) ke indeks kotak baru; false bila id tidak ditemukan. */
export function moveToken(code: string, id: string, col: number, row: number): boolean {
  const token = rooms.get(code)?.tokens.find((item) => item.id === id);
  if (!token) return false;
  token.col = col;
  token.row = row;
  return true;
}

export function getMembership(
  socketId: string,
): { code: string; nickname: string; role: Role } | undefined {
  return memberships.get(socketId);
}
