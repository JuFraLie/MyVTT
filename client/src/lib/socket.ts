import { io, type Socket } from 'socket.io-client';

/** URL backend; kosong = memakai proxy Vite saat dev (lihat vite.config.ts). */
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';

let socket: Socket | null = null;

/**
 * Satu instance koneksi Socket.io untuk seluruh aplikasi (AGENTS.md §4).
 * Koneksi sengaja tidak dibuka otomatis: diaktifkan fitur A3 (sinkronisasi)
 * agar scaffold tidak bergantung pada server yang berjalan.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: false });
  }
  return socket;
}
