import type { Server } from 'socket.io';
import { registerRoomHandlers } from './room';
import { registerMapHandlers } from './map';
import { registerGridHandlers } from './grid';
import { registerTokenHandlers } from './token';

/**
 * Pendaftaran seluruh handler event per grup (AGENTS.md §6).
 * Satu file per grup, sebagaimana direncanakan di struktur folder:
 * room.ts, map.ts, asset.ts, token.ts, fog.ts, dice.ts, initiative.ts, telemetry.ts.
 *
 * Setiap handler WAJIB memvalidasi payload dengan zod sebelum memutasi state
 * dan membalas event `error` (SERVER_EVENTS.ERROR) bila payload tidak valid.
 */
export function registerHandlers(io: Server): void {
  registerRoomHandlers(io);
  registerMapHandlers(io);
  registerGridHandlers(io);
  registerTokenHandlers(io);
}
