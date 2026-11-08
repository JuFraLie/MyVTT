/**
 * Penyimpanan lokal kuesioner in-app (G4). Butir SUS/UEQ-S dan skoringnya
 * berada di /shared (research.ts) agar UI klien dan ekspor G5 satu suara.
 */

export { SUS_LABELS, SUS_STATEMENTS, UEQ_PAIRS } from '@myvtt/shared';

const DONE_KEY = 'myvtt.questionnaire.done.v1';

export function questionnaireDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return true; // localStorage rusak → jangan paksa ulang
  }
}

export function markQuestionnaireDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    // abaikan
  }
}
