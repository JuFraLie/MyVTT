import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  fogSetSchema,
  type ErrorPayload,
  type FogSetResult,
} from '@myvtt/shared';
import { canEditRoom } from '../rooms/permissions';
import { getMembership, getRoom, setRoomFog } from '../rooms/registry';

const INVALID_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload fog:set tidak valid',
};

const NOT_IN_ROOM: ErrorPayload = { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' };

/**
 * Handler B4 (fog berbasis kotak): DM mengirim daftar sel tertutup SELURUHNYA
 * (replace penuh). Server menormalkan (dedupe + urut) lalu menyiar-kan
 * `fog:updated` sebagai sumber kebenaran; pemain hanya menerima.
 */
export function registerFogHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.FOG_SET, (payload: unknown, ack: (res: FogSetResult) => void) => {
      const parsed = fogSetSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID_PAYLOAD);
        return;
      }
      if (typeof ack !== 'function') return;

      const membership = getMembership(socket.id);
      if (!membership) {
        ack({ ok: false, error: NOT_IN_ROOM });
        return;
      }
      // Izin peran (A6): hanya DM yang boleh mengatur fog.
      if (!canEditRoom(membership)) {
        ack({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Hanya DM yang boleh mengatur fog.' },
        });
        return;
      }
      if (!getRoom(membership.code)?.map) {
        ack({
          ok: false,
          error: { code: 'NO_MAP', message: 'Unggah peta dulu sebelum mengatur fog.' },
        });
        return;
      }

      const cells = [...new Set(parsed.data.cells)];
      setRoomFog(membership.code, cells);

      io.to(membership.code).emit(SERVER_EVENTS.FOG_UPDATED, { cells });
      ack({ ok: true });
    });
  });
}
