import { create } from 'zustand';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type GridConfig,
  type GridSetResult,
  type MapSetResult,
  type Role,
  type RoomCreateAck,
  type RoomFullState,
  type RoomJoinResult,
  type RoomMap,
  type RoomMember,
  type Token,
  type TokenAddResult,
  type TokenMoveResult,
  type TokenMovedPayload,
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
  /** Peta aktif (B1); diperbarui hanya oleh event state:full. */
  map: RoomMap | null;
  /** Parameter grid (B2); diperbarui hanya oleh event state:full. */
  grid: GridConfig | null;
  /** Token ruang (C1); diperbarui hanya oleh event state:full. */
  tokens: Token[];
  /** Status koneksi socket (A4); auto-reconnect aktif secara bawaan. */
  isConnected: boolean;
  status: 'idle' | 'creating' | 'joining' | 'error';
  errorMessage: string | null;
  createRoom: () => void;
  joinRoom: (params: JoinParams) => void;
  /** Niat `map:set` (B1): hanya berhasil jika pemanggil DM (divalidasi server). */
  setMap: (map: RoomMap) => Promise<MapSetResult>;
  /** Niat `grid:set` (B2): hanya berhasil jika pemanggil DM. */
  setGrid: (grid: GridConfig) => Promise<GridSetResult>;
  /** Niat `token:add` (C1): hanya berhasil jika pemanggil DM; posisi dihitung server. */
  addToken: (name: string, color: string) => Promise<TokenAddResult>;
  /**
   * Niat `token:move` (C2): snap hasil drag. Update optimistik dulu,
   * rollback bila server menolak (AGENTS.md §6).
   */
  moveToken: (id: string, col: number, row: number) => Promise<TokenMoveResult>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  code: null,
  nickname: null,
  role: null,
  members: [],
  map: null,
  grid: null,
  tokens: [],
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
  setMap: (map: RoomMap) => {
    const socket = getSocket();
    return new Promise<MapSetResult>((resolve, reject) => {
      socket
        .timeout(5000)
        .emit(CLIENT_EVENTS.MAP_SET, map, (err: Error | null, res?: MapSetResult) => {
          if (err || !res) reject(err ?? new Error('tanpa acknowledgment'));
          else resolve(res);
        });
    });
  },
  setGrid: (grid: GridConfig) => {
    const socket = getSocket();
    return new Promise<GridSetResult>((resolve, reject) => {
      socket
        .timeout(5000)
        .emit(CLIENT_EVENTS.GRID_SET, grid, (err: Error | null, res?: GridSetResult) => {
          if (err || !res) reject(err ?? new Error('tanpa acknowledgment'));
          else resolve(res);
        });
    });
  },
  addToken: (name: string, color: string) => {
    const socket = getSocket();
    return new Promise<TokenAddResult>((resolve, reject) => {
      socket
        .timeout(5000)
        .emit(
          CLIENT_EVENTS.TOKEN_ADD,
          { name, color },
          (err: Error | null, res?: TokenAddResult) => {
            if (err || !res) reject(err ?? new Error('tanpa acknowledgment'));
            else resolve(res);
          },
        );
    });
  },
  moveToken: (id: string, col: number, row: number) => {
    const socket = getSocket();
    // Snapshot posisi sebelum update optimistik; dipakai rollback bila server menolak.
    const previous = get().tokens.find((token) => token.id === id);
    if (previous) {
      set({
        tokens: get().tokens.map((token) => (token.id === id ? { ...token, col, row } : token)),
      });
    }
    return new Promise<TokenMoveResult>((resolve, reject) => {
      socket
        .timeout(5000)
        .emit(
          CLIENT_EVENTS.TOKEN_MOVE,
          { id, col, row },
          (err: Error | null, res?: TokenMoveResult) => {
            const rollback = () => {
              if (!previous) return;
              set({
                tokens: get().tokens.map((token) =>
                  token.id === id ? { ...token, col: previous.col, row: previous.row } : token,
                ),
              });
            };
            if (err || !res) {
              rollback();
              reject(err ?? new Error('tanpa acknowledgment'));
              return;
            }
            if (!res.ok) rollback();
            resolve(res);
          },
        );
    });
  },
}));

// A3: satu-satunya sumber state bersama; klien tidak mengubahnya secara lokal.
const socket = getSocket();

socket.on(SERVER_EVENTS.STATE_FULL, (state: RoomFullState) => {
  useRoomStore.setState({
    members: state.members,
    map: state.map,
    grid: state.grid,
    tokens: state.tokens,
  });
});

socket.on(SERVER_EVENTS.TOKEN_MOVED, (payload: TokenMovedPayload) => {
  useRoomStore.setState((state) => ({
    tokens: state.tokens.map((token) =>
      token.id === payload.id ? { ...token, col: payload.col, row: payload.row } : token,
    ),
  }));
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
            map: null,
            grid: null,
            tokens: [],
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
