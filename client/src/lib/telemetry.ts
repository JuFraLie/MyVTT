import { CLIENT_EVENTS } from '@myvtt/shared';
import type { TelemetryEventType, TelemetryMetadata } from '@myvtt/shared';
import { loadParticipant } from './participant';
import { getSocket } from './socket';

const RTT_INTERVAL_MS = 30_000;
const PROBE_TIMEOUT_MS = 5000;

/** ID sesi per pemuatan halaman (tab) — acak, bukan data pribadi. */
const SESSION_ID = crypto.randomUUID();

let initialized = false;

/**
 * Catat satu event telemetry (G2, AGENTS §8). Tanpa record consent (G1)
 * fungsi ini no-op — telemetry hanya aktif setelah partisipan setuju.
 * Emit sebelum koneksi Socket.io terbuka akan ter-buffer dan flush saat
 * connect pertama (join ruang).
 */
export function logTelemetry(type: TelemetryEventType, metadata: TelemetryMetadata = {}): void {
  const participant = loadParticipant();
  if (!participant) return;
  getSocket().emit(CLIENT_EVENTS.TELEMETRY_EVENT, {
    participantId: participant.participantId,
    sessionId: SESSION_ID,
    type,
    at: Date.now(),
    metadata,
  });
}

/** Jangkar RTT: ping-pong lewat ack `telemetry:event` (sync_probe tidak disimpan). */
function probeRtt(): void {
  const participant = loadParticipant();
  if (!participant) return;
  const t0 = performance.now();
  getSocket()
    .timeout(PROBE_TIMEOUT_MS)
    .emit(
      CLIENT_EVENTS.TELEMETRY_EVENT,
      {
        participantId: participant.participantId,
        sessionId: SESSION_ID,
        type: 'sync_probe',
        at: Date.now(),
        metadata: {},
      },
      (error: Error | null) => {
        if (error) return; // jaringan putus: lewati sampel ini
        const rttMs = Math.round((performance.now() - t0) * 10) / 10;
        logTelemetry('sync_rtt', { rttMs });
      },
    );
}

/**
 * Pasang listener koneksi + sampler RTT — panggil sekali dari App (G2).
 * connect pertama = session_start, connect berikutnya = reconnect (A4).
 */
export function initTelemetry(): void {
  if (initialized) return;
  initialized = true;
  const socket = getSocket();
  let connectCount = 0;
  socket.on('connect', () => {
    connectCount += 1;
    if (connectCount === 1) {
      logTelemetry('session_start', { reconnects: 0 });
      probeRtt();
      window.setInterval(probeRtt, RTT_INTERVAL_MS);
    } else {
      logTelemetry('reconnect', { reconnects: connectCount - 1 });
    }
  });
  socket.on('disconnect', (reason: string) => {
    logTelemetry('disconnect', { reason });
  });
}
