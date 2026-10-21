import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  roomCreateSchema,
  type ErrorPayload,
  type RoomCreateAck,
} from '@myvtt/shared';
import { createRoom } from '../rooms/registry';

const INVALID_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload room:create tidak valid',
};

/** Handler A1: DM membuat ruang, server membalas kode 6 karakter lewat acknowledgment. */
export function registerRoomHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.ROOM_CREATE, (payload: unknown, ack: (res: RoomCreateAck) => void) => {
      const parsed = roomCreateSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID_PAYLOAD);
        return;
      }
      if (typeof ack !== 'function') return;

      const code = createRoom();
      console.log(`[room] created ${code} by ${socket.id}`);
      ack({ code });
    });
  });
}
