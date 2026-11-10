import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  undoRequestSchema,
  type ErrorPayload,
  type UndoResult,
} from '@myvtt/shared';
import {
  getMembership,
  getToken,
  popOwnUndo,
  moveToken,
  updateToken,
  appendLog,
} from '../rooms/registry';

const INVALID: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload undo:request tidak valid',
};

const NOT_IN_ROOM: ErrorPayload = { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' };
const NOTHING: ErrorPayload = {
  code: 'NOT_FOUND',
  message: 'Tidak ada langkah yang bisa dibatalkan.',
};

/**
 * Handler C6 (undo langkah terakhir): pengirim membatalkan aksi TERAKHIR
 * miliknya sendiri — gerakan token (C2) atau perubahan HP (C3). Server
 * memulihkan nilai sebelumnya lalu menyiar ulang `token:moved` /
 * `token:updated` (dan entri log hp) ke seluruh ruang; state tetap
 * server-authoritative (AGENTS §6).
 */
export function registerUndoHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.UNDO_REQUEST, (payload: unknown, ack: (res: UndoResult) => void) => {
      const parsed = undoRequestSchema.safeParse(payload);
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

      // Hanya langkah milik pengirim yang bisa ditarik (A6 turunan).
      const entry = popOwnUndo(membership.code, membership.nickname);
      if (!entry) {
        ack({ ok: false, error: NOTHING });
        return;
      }
      const token = getToken(membership.code, entry.tokenId);
      if (!token) {
        ack({ ok: false, error: { code: 'NOT_FOUND', message: 'Token sudah tidak ada.' } });
        return;
      }

      if (entry.type === 'move') {
        moveToken(membership.code, token.id, entry.from.col, entry.from.row);
        io.to(membership.code).emit(SERVER_EVENTS.TOKEN_MOVED, {
          id: token.id,
          col: entry.from.col,
          row: entry.from.row,
        });
        ack({ ok: true });
        return;
      }

      const hpBefore = token.hp;
      updateToken(membership.code, token.id, { hp: entry.from.hp });
      io.to(membership.code).emit(SERVER_EVENTS.TOKEN_UPDATED, {
        id: token.id,
        hp: entry.from.hp,
      });
      // D3: catat pembatalan sebagai perubahan HP agar riwayat tetap jujur.
      if (hpBefore !== entry.from.hp) {
        const log = appendLog(membership.code, {
          type: 'hp',
          actor: membership.nickname,
          text: `HP ${token.name}: ${hpBefore} → ${entry.from.hp} (undo)`,
        });
        if (log) io.to(membership.code).emit(SERVER_EVENTS.LOG_APPENDED, { entry: log });
      }
      ack({ ok: true });
    });
  });
}
