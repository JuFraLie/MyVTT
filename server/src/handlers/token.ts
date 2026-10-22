import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  tokenAddSchema,
  type ErrorPayload,
  type TokenAddResult,
} from '@myvtt/shared';
import { addToken, getMembership, getRoom, getRoomState } from '../rooms/registry';

const INVALID_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload token:add tidak valid',
};

/** Handler C1: DM menambah token dasar (warna + inisial); disiarkan lewat state:full. */
export function registerTokenHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.TOKEN_ADD, (payload: unknown, ack: (res: TokenAddResult) => void) => {
      const parsed = tokenAddSchema.safeParse(payload);
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
      // Izin peran (A6): hanya DM yang boleh menambah token (pemetaan pemain menyusul di C7/C8).
      if (membership.role !== 'dm') {
        ack({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Hanya DM yang boleh menambah token.' },
        });
        return;
      }
      if (!getRoom(membership.code)?.map) {
        ack({
          ok: false,
          error: { code: 'NO_MAP', message: 'Unggah peta dulu sebelum menambah token.' },
        });
        return;
      }

      const token = addToken(membership.code, parsed.data.name, parsed.data.color);
      if (!token) {
        ack({
          ok: false,
          error: { code: 'NO_MAP', message: 'Unggah peta dulu sebelum menambah token.' },
        });
        return;
      }
      console.log(`[token] ${membership.code} +${token.name} @(${token.col},${token.row})`);

      const state = getRoomState(membership.code);
      if (state) io.to(membership.code).emit(SERVER_EVENTS.STATE_FULL, state);
      ack({ ok: true });
    });
  });
}
