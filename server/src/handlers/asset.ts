import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  assetAddSchema,
  assetRemoveSchema,
  type AssetAddResult,
  type AssetRemoveResult,
  type ErrorPayload,
} from '@myvtt/shared';
import { canEditRoom } from '../rooms/permissions';
import { addAsset, getMembership, removeAsset } from '../rooms/registry';

const INVALID_ADD: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload asset:add tidak valid',
};

const INVALID_REMOVE: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload asset:remove tidak valid',
};

const NOT_IN_ROOM: ErrorPayload = { code: 'NOT_IN_ROOM', message: 'Kamu belum masuk ruang.' };

/**
 * Handler C8 (pustaka token): DM mendaftarkan gambar unggahan berlabel
 * Pemain/Monster agar bisa dipilih ulang & diklon tanpa unggah lagi.
 * Batas 40 entri per ruang (AGENTS §12); izin memakai `canEditRoom` (A6).
 */
export function registerAssetHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(CLIENT_EVENTS.ASSET_ADD, (payload: unknown, ack: (res: AssetAddResult) => void) => {
      const parsed = assetAddSchema.safeParse(payload);
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
          error: { code: 'FORBIDDEN', message: 'Hanya DM yang boleh mengelola pustaka.' },
        });
        return;
      }

      const entry = addAsset(
        membership.code,
        parsed.data.name,
        parsed.data.type,
        parsed.data.image,
      );
      if (!entry) {
        ack({
          ok: false,
          error: { code: 'IMAGE_LIMIT', message: 'Batas 40 gambar token per ruang tercapai.' },
        });
        return;
      }
      console.log(`[asset] ${membership.code} +pustaka ${entry.name} (${entry.type})`);

      io.to(membership.code).emit(SERVER_EVENTS.ASSET_ADDED, { entry });
      ack({ ok: true });
    });

    socket.on(
      CLIENT_EVENTS.ASSET_REMOVE,
      (payload: unknown, ack: (res: AssetRemoveResult) => void) => {
        const parsed = assetRemoveSchema.safeParse(payload);
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
        if (!canEditRoom(membership)) {
          ack({
            ok: false,
            error: { code: 'FORBIDDEN', message: 'Hanya DM yang boleh mengelola pustaka.' },
          });
          return;
        }

        const { id } = parsed.data;
        if (!removeAsset(membership.code, id)) {
          ack({
            ok: false,
            error: { code: 'NOT_FOUND', message: 'Entri pustaka tidak ditemukan.' },
          });
          return;
        }
        console.log(`[asset] ${membership.code} -pustaka ${id.slice(0, 8)}…`);

        io.to(membership.code).emit(SERVER_EVENTS.ASSET_REMOVED, { id });
        ack({ ok: true });
      },
    );
  });
}
