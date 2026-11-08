import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  characterSetSchema,
  type CharacterSetResult,
  type ErrorPayload,
} from '@myvtt/shared';
import { getMembership, setCharacter } from '../rooms/registry';

const INVALID_PAYLOAD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload character:set tidak valid',
};

const NOT_IN_ROOM: ErrorPayload = { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' };

/**
 * Handler E1 (lembar karakter): klien mengirim isi lembar LENGKAP (upsert);
 * `owner` selalu diisi server dari nickname sesi sehingga pemain hanya bisa
 * menyimpan lembarnya sendiri. Disiarkan `character:updated` ke seluruh ruang.
 */
export function registerCharacterHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(
      CLIENT_EVENTS.CHARACTER_SET,
      (payload: unknown, ack: (res: CharacterSetResult) => void) => {
        const parsed = characterSetSchema.safeParse(payload);
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

        const character = { owner: membership.nickname, ...parsed.data };
        if (!setCharacter(membership.code, character)) {
          ack({
            ok: false,
            error: { code: 'CHAR_LIMIT', message: 'Batas 20 lembar karakter per ruang tercapai.' },
          });
          return;
        }
        console.log(`[character] ${membership.code} simpan lembar ${character.owner}`);

        io.to(membership.code).emit(SERVER_EVENTS.CHARACTER_UPDATED, { character });
        ack({ ok: true });
      },
    );
  });
}
