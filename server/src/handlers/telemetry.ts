import type { Server } from 'socket.io';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  telemetryEventSchema,
  type ErrorPayload,
} from '@myvtt/shared';
import { saveTelemetry } from '../db';

const INVALID: ErrorPayload = {
  code: 'INVALID_PAYLOAD',
  message: 'Payload telemetry:event tidak valid',
};

/**
 * Handler G2 (telemetry): setiap event divalidasi zod lalu disimpan — TANPA
 * cek keanggotaan ruang karena event pertama (demographics, G1) dikirim sebelum
 * join. `sync_probe` hanya jangkar pengukuran RTT: di-ack, tidak disimpan.
 * Consent (G1) diverifikasi di klien; server tetap menolak payload rusak.
 */
export function registerTelemetryHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on(
      CLIENT_EVENTS.TELEMETRY_EVENT,
      (payload: unknown, ack?: (res: { ok: true }) => void) => {
        const parsed = telemetryEventSchema.safeParse(payload);
        if (!parsed.success) {
          socket.emit(SERVER_EVENTS.ERROR, INVALID);
          return;
        }
        if (parsed.data.type !== 'sync_probe') {
          console.log(`[telemetry] ${parsed.data.type} oleh ${parsed.data.participantId}`);
          void saveTelemetry(parsed.data);
        }
        if (typeof ack === 'function') ack({ ok: true });
      },
    );
  });
}
