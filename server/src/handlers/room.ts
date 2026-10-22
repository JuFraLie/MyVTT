import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  roomCreateSchema,
  roomJoinSchema,
  type ErrorPayload,
  type RoomCreateAck,
  type RoomJoinResult,
} from '@myvtt/shared';
import {
  createRoom,
  getMembership,
  getRoom,
  getRoomState,
  joinRoom,
  leaveRoom,
} from '../rooms/registry';

const INVALID_CREATE_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload room:create tidak valid',
};

const INVALID_JOIN_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload room:join tidak valid',
};

/** Handler A1 (buat ruang) dan A2 (gabung ruang). */
export function registerRoomHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.ROOM_CREATE, (payload: unknown, ack: (res: RoomCreateAck) => void) => {
      const parsed = roomCreateSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID_CREATE_PAYLOAD);
        return;
      }
      if (typeof ack !== 'function') return;

      const code = createRoom();
      console.log(`[room] created ${code} by ${socket.id}`);
      ack({ code });
    });

    socket.on(CLIENT_EVENTS.ROOM_JOIN, (payload: unknown, ack: (res: RoomJoinResult) => void) => {
      const parsed = roomJoinSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID_JOIN_PAYLOAD);
        return;
      }
      if (typeof ack !== 'function') return;

      const { code, nickname, role } = parsed.data;
      let outcome = joinRoom(socket.id, code, nickname, role);

      // A4: DM yang baru putus bisa jadi belum terproses server (disconnect baru
      // dipanggil setelah ping timeout). Slot DM boleh diambil alih oleh socket
      // dengan nama & peran sama; socket lama diputus paksa.
      if (outcome === 'DM_EXISTS' && role === 'dm') {
        const previousId = getRoom(code)?.dmSocketId ?? null;
        const previousSocket = previousId ? io.sockets.sockets.get(previousId) : undefined;
        if (previousId && previousSocket && getMembership(previousId)?.nickname === nickname) {
          previousSocket.disconnect(true);
          outcome = joinRoom(socket.id, code, nickname, role);
        }
      }

      if (outcome === 'ROOM_NOT_FOUND') {
        ack({
          ok: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Kode ruang tidak ditemukan.' },
        });
        return;
      }
      if (outcome === 'DM_EXISTS') {
        ack({
          ok: false,
          error: { code: 'DM_EXISTS', message: 'Ruang ini sudah punya DM yang tersambung.' },
        });
        return;
      }

      console.log(`[room] ${socket.id} joined ${code} as ${role} (${nickname})`);
      ack({ ok: true, code, nickname, role });

      // A3: ruang = channel Socket.io; seluruh anggota (termasuk yang baru masuk)
      // menerima potret state terbaru dari server.
      socket.join(code);
      const state = getRoomState(code);
      if (state) io.to(code).emit(SERVER_EVENTS.STATE_FULL, state);
    });

    socket.on('disconnect', () => {
      const leftCode = leaveRoom(socket.id);
      if (!leftCode) return;
      const state = getRoomState(leftCode);
      if (state) io.to(leftCode).emit(SERVER_EVENTS.STATE_FULL, state);
    });
  });
}
