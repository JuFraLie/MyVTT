import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  mapSetSchema,
  type ErrorPayload,
  type MapSetResult,
} from '@myvtt/shared';
import { getMembership, getRoomState, setRoomMap } from '../rooms/registry';

const INVALID_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload map:set tidak valid',
};

/** Handler B1: DM mengganti peta aktif ruang; hasil disiarkan lewat state:full. */
export function registerMapHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.MAP_SET, (payload: unknown, ack: (res: MapSetResult) => void) => {
      const parsed = mapSetSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID_PAYLOAD);
        return;
      }
      if (typeof ack !== 'function') return;

      const membership = getMembership(socket.id);
      if (!membership) {
        ack({ ok: false, error: { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' } });
        return;
      }
      // Izin peran (A6): hanya DM yang boleh mengganti peta.
      if (membership.role !== 'dm') {
        ack({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Hanya DM yang boleh mengganti peta.' },
        });
        return;
      }

      setRoomMap(membership.code, parsed.data);
      console.log(`[map] ${membership.code} updated by ${socket.id}`);

      const state = getRoomState(membership.code);
      if (state) io.to(membership.code).emit(SERVER_EVENTS.STATE_FULL, state);
      ack({ ok: true });
    });
  });
}
