import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  initiativeNextSchema,
  initiativeUpdateSchema,
  type ErrorPayload,
  type InitiativeResult,
} from '@myvtt/shared';
import { canEditRoom } from '../rooms/permissions';
import {
  advanceInitiative,
  appendLog,
  getMembership,
  getToken,
  getRoom,
  setInitiative,
} from '../rooms/registry';

const INVALID_UPDATE: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload initiative:update tidak valid',
};

const INVALID_NEXT: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload initiative:next tidak valid',
};

const NOT_IN_ROOM: ErrorPayload = { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' };
const FORBIDDEN: ErrorPayload = {
  code: 'FORBIDDEN',
  message: 'Hanya DM yang boleh mengatur inisiatif.',
};

/**
 * Handler pelacak inisiatif (C5):
 * - initiative:update DM saja; tokenId divalidasi ada di ruang; server
 *   mengurutkan & dedupe lalu menyiar `initiative:updated` ke seluruh ruang.
 * - initiative:next  DM saja; maju satu giliran (berputar) dan mencatat
 *   entri log `turn` (D3) agar riwayat pergantian giliran tersimpan.
 */
export function registerInitiativeHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(
      CLIENT_EVENTS.INITIATIVE_UPDATE,
      (payload: unknown, ack: (res: InitiativeResult) => void) => {
        const parsed = initiativeUpdateSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit(SERVER_EVENTS.ERROR, INVALID_UPDATE);
          return;
        }
        if (typeof ack !== 'function') return;

        const membership = getMembership(socket.id);
        if (!membership) {
          ack({ ok: false, error: NOT_IN_ROOM });
          return;
        }
        if (!canEditRoom(membership)) {
          ack({ ok: false, error: FORBIDDEN });
          return;
        }

        const room = getRoom(membership.code);
        if (!room) {
          ack({ ok: false, error: NOT_IN_ROOM });
          return;
        }
        const tokenIds = new Set(room.tokens.map((token) => token.id));
        if (parsed.data.entries.some((entry) => !tokenIds.has(entry.tokenId))) {
          ack({
            ok: false,
            error: { code: 'NOT_FOUND', message: 'Token di daftar inisiatif tidak ada di ruang.' },
          });
          return;
        }

        const state = setInitiative(membership.code, parsed.data.entries);
        if (!state) {
          ack({ ok: false, error: NOT_IN_ROOM });
          return;
        }
        io.to(membership.code).emit(SERVER_EVENTS.INITIATIVE_UPDATED, state);
        ack({ ok: true });
      },
    );

    socket.on(
      CLIENT_EVENTS.INITIATIVE_NEXT,
      (payload: unknown, ack: (res: InitiativeResult) => void) => {
        const parsed = initiativeNextSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit(SERVER_EVENTS.ERROR, INVALID_NEXT);
          return;
        }
        if (typeof ack !== 'function') return;

        const membership = getMembership(socket.id);
        if (!membership) {
          ack({ ok: false, error: NOT_IN_ROOM });
          return;
        }
        if (!canEditRoom(membership)) {
          ack({ ok: false, error: FORBIDDEN });
          return;
        }

        const state = advanceInitiative(membership.code);
        if (!state) {
          ack({ ok: false, error: NOT_IN_ROOM });
          return;
        }
        io.to(membership.code).emit(SERVER_EVENTS.INITIATIVE_UPDATED, state);

        // D3: catat pergantian giliran bila ada token aktif berikutnya.
        if (state.activeTokenId) {
          const token = getToken(membership.code, state.activeTokenId);
          if (token) {
            const entry = appendLog(membership.code, {
              type: 'turn',
              actor: membership.nickname,
              text: `Giliran: ${token.name}`,
            });
            if (entry) io.to(membership.code).emit(SERVER_EVENTS.LOG_APPENDED, { entry });
          }
        }
        ack({ ok: true });
      },
    );
  });
}
