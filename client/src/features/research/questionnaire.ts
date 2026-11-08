/**
 * Data & penyimpanan kuesioner in-app (G4): SUS (10 butir Likert 1–5)
 * dan UEQ-S (8 butir diferensial semantik 1–7). Jawaban mentah dikirim
 * sebagai event telemetry `questionnaire` (metadata string CSV) agar G5
 * bisa mengekspornya bersama log.
 */

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

/** Label Likert SUS (indeks jawaban − 1). */
export const SUS_LABELS = [
  'Sangat Tidak Setuju',
  'Tidak Setuju',
  'Netral',
  'Setuju',
  'Sangat Setuju',
];

/** 10 butir SUS; `negative` = skor dibalik saat perhitungan (G5). */
export const SUS_STATEMENTS: { text: string; negative: boolean }[] = [
  { text: 'Saya ingin sering menggunakan sistem ini.', negative: false },
  { text: 'Saya menemukan sistem ini terlalu rumit.', negative: true },
  { text: 'Saya merasa sistem ini mudah digunakan.', negative: false },
  {
    text: 'Saya perlu bantuan orang teknis untuk bisa memakai sistem ini.',
    negative: true,
  },
  { text: 'Saya menemukan fungsi-fungsi sistem ini terintegrasi dengan baik.', negative: false },
  { text: 'Saya menemukan banyak ketidakkonsistenan dalam sistem ini.', negative: true },
  { text: 'Saya yakin kebanyakan orang cepat belajar memakai sistem ini.', negative: false },
  { text: 'Saya menemukan sistem ini merepotkan untuk digunakan.', negative: true },
  { text: 'Saya merasa sangat percaya diri memakai sistem ini.', negative: false },
  {
    text: 'Saya perlu mempelajari banyak hal sebelum bisa mulai memakai sistem ini.',
    negative: true,
  },
];

/**
 * 8 butir UEQ-S: tiap pasang disusun negatif → positif sehingga jawaban
 * 1..7 bisa dikonversi mentah −3..+3 (jawaban − 4) tanpa pembalasan arah.
 */
export const UEQ_PAIRS: { neg: string; pos: string }[] = [
  { neg: 'menjengkelkan', pos: 'menyenangkan' },
  { neg: 'sulit dipelajari', pos: 'mudah dipelajari' },
  { neg: 'tidak efisien', pos: 'efisien' },
  { neg: 'membingungkan', pos: 'mudah dipahami' },
  { neg: 'membosankan', pos: 'seru' },
  { neg: 'tidak menarik', pos: 'menarik' },
  { neg: 'tidak dapat diprediksi', pos: 'dapat diprediksi' },
  { neg: 'lambat', pos: 'cepat' },
];
