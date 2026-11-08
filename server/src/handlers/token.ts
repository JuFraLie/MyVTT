import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  tokenAddSchema,
  tokenMoveSchema,
  tokenRemoveSchema,
  tokenUpdateSchema,
  type ErrorPayload,
  type TokenAddResult,
  type TokenMoveResult,
  type TokenRemoveResult,
  type TokenUpdateResult,
} from '@myvtt/shared';
import { canEditRoom, canManageToken } from '../rooms/permissions';
import {
  addToken,
  canSetTokenImage,
  getMembership,
  getToken,
  getRoom,
  getRoomState,
  isPlayerInRoom,
  moveToken,
  removeToken,
  updateToken,
} from '../rooms/registry';

const INVALID_ADD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload token:add tidak valid',
};

const INVALID_MOVE: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload token:move tidak valid',
};

const INVALID_UPDATE: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload token:update tidak valid',
};

const INVALID_REMOVE: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload token:remove tidak valid',
};

const NOT_IN_ROOM = { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' } as const;
const TOKEN_MISSING = { code: 'NOT_FOUND', message: 'Token tidak ditemukan.' } as const;

/**
 * Handler token (C1–C3 + A6 + C7 + C9):
 * - token:add   DM saja; `owner` divalidasi ada pemainnya; batas 40 gambar/ruang;
 *               `size` = sisi kotak (1/2/3), spawn dikunci agar muat di peta.
 * - token:move  DM bebas; pemain hanya token miliknya (canManageToken).
 * - token:update HP = DM saja (A6); gambar & ukuran = DM atau pemilik (C7/C9).
 * - token:remove DM saja; disiarkan `token:removed`.
 */
export function registerTokenHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.TOKEN_ADD, (payload: unknown, ack: (res: TokenAddResult) => void) => {
      const parsed = tokenAddSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID_ADD);
        return;
      }
      if (typeof ack !== 'function') return;

      const membership = getMembership(socket.id);
      if (!membership) {
        ack({ ok: false, error: NOT_IN_ROOM });
        return;
      }
      if (!canEditRoom(membership)) {
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

      const owner = parsed.data.owner ?? null;
      if (owner !== null && !isPlayerInRoom(membership.code, owner)) {
        ack({
          ok: false,
          error: { code: 'OWNER_NOT_FOUND', message: 'Pemain pemilik tidak ada di ruang.' },
        });
        return;
      }

      const image = parsed.data.image ?? null;
      if (image !== null && !canSetTokenImage(membership.code, null, image)) {
        ack({
          ok: false,
          error: { code: 'IMAGE_LIMIT', message: 'Batas 40 gambar token per ruang tercapai.' },
        });
        return;
      }

      const size = parsed.data.size ?? 1;
      const token = addToken(
        membership.code,
        parsed.data.name,
        parsed.data.color,
        owner,
        image,
        size,
      );
      if (!token) {
        ack({
          ok: false,
          error: { code: 'NO_MAP', message: 'Unggah peta dulu sebelum menambah token.' },
        });
        return;
      }
      console.log(
        `[token] ${membership.code} +${token.name} @(${token.col},${token.row}) owner=${token.owner ?? 'dm'}`,
      );

      const state = getRoomState(membership.code);
      if (state) io.to(membership.code).emit(SERVER_EVENTS.STATE_FULL, state);
      ack({ ok: true });
    });

    socket.on(CLIENT_EVENTS.TOKEN_MOVE, (payload: unknown, ack: (res: TokenMoveResult) => void) => {
      const parsed = tokenMoveSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, INVALID_MOVE);
        return;
      }
      if (typeof ack !== 'function') return;

      const membership = getMembership(socket.id);
      if (!membership) {
        ack({ ok: false, error: NOT_IN_ROOM });
        return;
      }

      const { id, col, row } = parsed.data;
      const token = getToken(membership.code, id);
      if (!token) {
        ack({ ok: false, error: TOKEN_MISSING });
        return;
      }
      // A6: pemain hanya boleh menggerakkan token miliknya sendiri.
      if (!canManageToken(membership, token)) {
        ack({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Hanya token milikmu yang boleh digerakkan.' },
        });
        return;
      }

      moveToken(membership.code, id, col, row);

      // Disiarkan sebagai token:moved (bukan state:full) agar ringan saat drag sering terjadi.
      io.to(membership.code).emit(SERVER_EVENTS.TOKEN_MOVED, { id, col, row });
      ack({ ok: true });
    });

    socket.on(
      CLIENT_EVENTS.TOKEN_UPDATE,
      (payload: unknown, ack: (res: TokenUpdateResult) => void) => {
        const parsed = tokenUpdateSchema.safeParse(payload);
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

        const { id, hp, image, size } = parsed.data;
        const token = getToken(membership.code, id);
        if (!token) {
          ack({ ok: false, error: TOKEN_MISSING });
          return;
        }
        // A6: HP token hanya DM — pemain hanya diberi hak menggerakkan token.
        if (hp !== undefined && !canEditRoom(membership)) {
          ack({
            ok: false,
            error: { code: 'FORBIDDEN', message: 'Hanya DM yang boleh mengubah HP token.' },
          });
          return;
        }
        // C7/C9: ganti gambar (termasuk menghapus) atau ukuran = DM atau pemilik.
        const manageImage = image !== undefined && image !== token.image;
        const manageSize = size !== undefined && size !== (token.size ?? 1);
        if ((manageImage || manageSize) && !canManageToken(membership, token)) {
          ack({
            ok: false,
            error: { code: 'FORBIDDEN', message: 'Hanya DM atau pemilik token.' },
          });
          return;
        }
        if (manageImage && image !== null && image !== undefined) {
          if (!canSetTokenImage(membership.code, id, image)) {
            ack({
              ok: false,
              error: { code: 'IMAGE_LIMIT', message: 'Batas 40 gambar token per ruang tercapai.' },
            });
            return;
          }
        }

        if (!updateToken(membership.code, id, { hp, image, size })) {
          ack({ ok: false, error: TOKEN_MISSING });
          return;
        }

        // Hanya field terkirim yang ikut disiarkan (undefined terhapus saat serialisasi JSON).
        io.to(membership.code).emit(SERVER_EVENTS.TOKEN_UPDATED, { id, hp, image, size });
        ack({ ok: true });
      },
    );

    socket.on(
      CLIENT_EVENTS.TOKEN_REMOVE,
      (payload: unknown, ack: (res: TokenRemoveResult) => void) => {
        const parsed = tokenRemoveSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit(SERVER_EVENTS.ERROR, INVALID_REMOVE);
          return;
        }
        if (typeof ack !== 'function') return;

        const membership = getMembership(socket.id);
        if (!membership) {
          ack({ ok: false, error: NOT_IN_ROOM });
          return;
        }
        // A6: hanya DM yang boleh menghapus token (termasuk milik pemain lain).
        if (!canEditRoom(membership)) {
          ack({
            ok: false,
            error: { code: 'FORBIDDEN', message: 'Hanya DM yang boleh menghapus token.' },
          });
          return;
        }

        const { id } = parsed.data;
        if (!removeToken(membership.code, id)) {
          ack({ ok: false, error: TOKEN_MISSING });
          return;
        }
        console.log(`[token] ${membership.code} -hapus ${id.slice(0, 8)}…`);

        io.to(membership.code).emit(SERVER_EVENTS.TOKEN_REMOVED, { id });
        ack({ ok: true });
      },
    );
  });
}
