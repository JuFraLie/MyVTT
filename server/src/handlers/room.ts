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
import { createRoom, joinRoom, leaveRoom } from '../rooms/registry';

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
      const outcome = joinRoom(socket.id, code, role);
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
    });

    socket.on('disconnect', () => leaveRoom(socket.id));
  });
}
