import { create } from 'zustand';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type Role,
  type RoomCreateAck,
  type RoomFullState,
  type RoomJoinResult,
  type RoomMember,
} from '@myvtt/shared';
import { getSocket } from '../../lib/socket';

export interface JoinParams {
  code: string;
  nickname: string;
  role: Role;
}

interface RoomState {
  /** Kode ruang; null = belum membuat ruang. */
  code: string | null;
  /** Nama panggilan; null = belum masuk ruang (belum diizinkan membuka tab). */
  nickname: string | null;
  role: Role | null;
  /** Anggota ruang menurut server (A3); diperbarui hanya oleh event state:full. */
  members: RoomMember[];
  /** Status koneksi socket (A4); auto-reconnect aktif secara bawaan. */
  isConnected: boolean;
  status: 'idle' | 'creating' | 'joining' | 'error';
  errorMessage: string | null;
  createRoom: () => void;
  joinRoom: (params: JoinParams) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  code: null,
  nickname: null,
  role: null,
  members: [],
  isConnected: false,
  status: 'idle',
  errorMessage: null,
  createRoom: () => {
    if (get().status !== 'idle') return;
    set({ status: 'creating', errorMessage: null });

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket
      .timeout(5000)
      .emit(CLIENT_EVENTS.ROOM_CREATE, {}, (err: Error | null, res?: RoomCreateAck) => {
        if (err || !res) {
          set({
            status: 'error',
            errorMessage: 'Gagal membuat ruang. Periksa koneksi lalu coba lagi.',
          });
          return;
        }
        set({ code: res.code, status: 'idle' });
      });
  },
  joinRoom: ({ code, nickname, role }: JoinParams) => {
    if (get().status !== 'idle') return;
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-HJ-NP-TV-Z2-9]{6}$/.test(cleanCode) || nickname.trim().length === 0) {
      set({ status: 'error', errorMessage: 'Isi kode 6 karakter dan nama panggilan.' });
      return;
    }
    set({ status: 'joining', errorMessage: null });

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket
      .timeout(5000)
      .emit(
        CLIENT_EVENTS.ROOM_JOIN,
        { code: cleanCode, nickname: nickname.trim(), role },
        (err: Error | null, res?: RoomJoinResult) => {
          if (err || !res) {
            set({
              status: 'error',
              errorMessage: 'Gagal bergabung. Periksa koneksi lalu coba lagi.',
            });
            return;
          }
          if (!res.ok) {
            set({ status: 'error', errorMessage: res.error.message });
            return;
          }
          set({
            code: res.code,
            nickname: res.nickname,
            role: res.role,
            status: 'idle',
            errorMessage: null,
          });
        },
      );
  },
}));

// A3: satu-satunya sumber state bersama; klien tidak mengubahnya secara lokal.
const socket = getSocket();

socket.on(SERVER_EVENTS.STATE_FULL, (state: RoomFullState) => {
  useRoomStore.setState({ members: state.members });
});

// A4: setelah koneksi pulih, join ulang dengan kredensial tersimpan.
// Server membalas state:full sehingga state pulih tanpa refresh halaman.
socket.on('connect', () => {
  useRoomStore.setState({ isConnected: true });
  const { code, nickname, role } = useRoomStore.getState();
  if (!code || !nickname || !role) return;
  socket
    .timeout(5000)
    .emit(
      CLIENT_EVENTS.ROOM_JOIN,
      { code, nickname, role },
      (err: Error | null, res?: RoomJoinResult) => {
        if (err) return; // server belum siap; percobaan berikutnya saat reconnect lagi
        if (res && !res.ok) {
          // Ruang hilang (mis. server restart) — kembali ke gerbang dengan pesan.
          useRoomStore.setState({
            code: null,
            nickname: null,
            role: null,
            members: [],
            status: 'error',
            errorMessage: res.error.message,
          });
        }
      },
    );
});

socket.on('disconnect', () => {
  useRoomStore.setState({ isConnected: false });
});
