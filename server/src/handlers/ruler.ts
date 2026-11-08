import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  rulerSetSchema,
  type ErrorPayload,
  type RulerSetResult,
} from '@myvtt/shared';
import { getMembership } from '../rooms/registry';

const INVALID: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload ruler:set tidak valid',
};

const NOT_IN_ROOM: ErrorPayload = { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' };

/**
 * Handler B5 (penggaris jarak): relay murni — klien mengirim dua ujung
 * (indeks kotak), server memvalidasi lalu menyiar-kan `ruler:updated` ke
 * seluruh ruang. Tidak dipersistensi (transien, layaknya gesture hidup).
 */
export function registerRulerHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.RULER_SET, (payload: unknown, ack: (res: RulerSetResult) => void) => {
      const parsed = rulerSetSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID);
        return;
      }
      if (typeof ack !== 'function') return;

      const membership = getMembership(socket.id);
      if (!membership) {
        ack({ ok: false, error: NOT_IN_ROOM });
        return;
      }

      const { from, to } = parsed.data;
      const ruler = from && to ? { from, to } : null;
      io.to(membership.code).emit(SERVER_EVENTS.RULER_UPDATED, {
        owner: membership.nickname,
        ruler,
      });
      ack({ ok: true });
    });
  });
}
