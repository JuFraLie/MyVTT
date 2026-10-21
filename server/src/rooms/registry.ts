import { randomInt } from 'node:crypto';

// Huruf mirip (0/O, 1/I, L) dihilangkan agar kode mudah diketik ulang dari layar HP.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 20;

interface RoomRecord {
  createdAt: number;
}

// Penyimpanan sementara (A5 menambahkan persistensi MongoDB).
const rooms = new Map<string, RoomRecord>();

/** Membuat ruang baru dan mengembalikan kode 6 karakter yang unik di server ini. */
export function createRoom(): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
    }
    if (!rooms.has(code)) {
      rooms.set(code, { createdAt: Date.now() });
      return code;
    }
  }
  throw new Error('Gagal menghasilkan kode ruang unik');
}
