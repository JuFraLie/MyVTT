import type { Demographics } from '@myvtt/shared';

/**
 * Penyimpanan lokal consent + demografi partisipan (G1, AGENTS §8):
 * telemetry (G2) hanya boleh aktif setelah record ini ada. Disimpan di
 * localStorage perangkat — tanpa nama asli, hanya UUID acak.
 */
const KEY = 'myvtt.participant.v1';

export interface ParticipantRecord {
  participantId: string;
  consent: true;
  demographics: Demographics;
  /** Waktu persetujuan (ms sejak epoch). */
  agreedAt: number;
}

/** ID partisipan anonim baru (UUID). */
export function createParticipantId(): string {
  return crypto.randomUUID();
}

/** Baca record partisipan; null bila belum pernah setuju. */
export function loadParticipant(): ParticipantRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as ParticipantRecord;
    // Validasi ringan: struktur rusak dianggap belum ada (paksa ulang consent).
    if (
      typeof parsed.participantId !== 'string' ||
      parsed.consent !== true ||
      typeof parsed.demographics?.dndExperience !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveParticipant(record: ParticipantRecord): void {
  localStorage.setItem(KEY, JSON.stringify(record));
}
