import { randomInt } from 'node:crypto';
import type { Role, RoomFullState, RoomMember } from '@myvtt/shared';

// Huruf mirip (0/O, 1/I, L) dihilangkan agar kode mudah diketik ulang dari layar HP.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 20;

interface RoomRecord {
  createdAt: number;
  /** Socket pemegang peran DM; null bila DM belum masuk (A2). */
  dmSocketId: string | null;
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
      rooms.set(code, { createdAt: Date.now(), dmSocketId: null });
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
  if (!rooms.has(code)) return null;
  const members: RoomMember[] = [];
  for (const [socketId, membership] of memberships) {
    if (membership.code === code) {
      members.push({ socketId, nickname: membership.nickname, role: membership.role });
    }
  }
  return { code, members };
}

export function getMembership(
  socketId: string,
): { code: string; nickname: string; role: Role } | undefined {
  return memberships.get(socketId);
}
