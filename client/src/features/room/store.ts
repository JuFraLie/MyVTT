import { create } from 'zustand';
import { CLIENT_EVENTS, type RoomCreateAck } from '@myvtt/shared';
import { getSocket } from '../../lib/socket';

interface RoomState {
  /** Kode ruang yang sedang dibuka; null = belum membuat ruang. */
  code: string | null;
  status: 'idle' | 'creating' | 'error';
  errorMessage: string | null;
  createRoom: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  code: null,
  status: 'idle',
  errorMessage: null,
  createRoom: () => {
    if (get().status === 'creating') return;
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
}));
