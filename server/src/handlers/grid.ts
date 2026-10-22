import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  gridSetSchema,
  type ErrorPayload,
  type GridSetResult,
} from '@myvtt/shared';
import { getMembership, getRoom, getRoomState, setRoomGrid } from '../rooms/registry';

const INVALID_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload grid:set tidak valid',
};

/** Handler B2: DM mengatur grid peta; hasil disiarkan lewat state:full. */
export function registerGridHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.GRID_SET, (payload: unknown, ack: (res: GridSetResult) => void) => {
      const parsed = gridSetSchema.safeParse(payload);
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
      // Izin peran (A6): hanya DM yang boleh mengatur grid.
      if (membership.role !== 'dm') {
        ack({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Hanya DM yang boleh mengatur grid.' },
        });
        return;
      }
      if (!getRoom(membership.code)?.map) {
        ack({
          ok: false,
          error: { code: 'NO_MAP', message: 'Unggah peta dulu sebelum mengatur grid.' },
        });
        return;
      }

      setRoomGrid(membership.code, parsed.data);
      console.log(
        `[grid] ${membership.code} cell=${parsed.data.cellPx}px locked=${parsed.data.locked}`,
      );

      const state = getRoomState(membership.code);
      if (state) io.to(membership.code).emit(SERVER_EVENTS.STATE_FULL, state);
      ack({ ok: true });
    });
  });
}
