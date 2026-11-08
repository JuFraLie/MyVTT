/**
 * Data & skoring kuesioner riset (G4/G5): SUS (10 butir Likert 1–5) dan
 * UEQ-S (8 butir diferensial semantik 1–7). Berada di /shared agar UI klien
 * dan ekspor peneliti (server) memakai butir serta urutan yang persis sama.
 */

/** Label Likert SUS (indeks jawaban − 1). */
export const SUS_LABELS = [
  'Sangat Tidak Setuju',
  'Tidak Setuju',
  'Netral',
  'Setuju',
  'Sangat Setuju',
];

/** 10 butir SUS; `negative` = skor butir dibalik saat perhitungan. */
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

/** Skor SUS 0–100; null bila jumlah/range jawaban tidak 10 butir 1–5. */
export function scoreSus(answers: number[]): number | null {
  if (answers.length !== SUS_STATEMENTS.length) return null;
  let total = 0;
  for (let index = 0; index < answers.length; index += 1) {
    const answer = answers[index];
    if (answer === undefined || answer < 1 || answer > 5) return null;
    total += SUS_STATEMENTS[index]?.negative === true ? 5 - answer : answer - 1;
  }
  return Math.round(total * 2.5 * 100) / 100;
}

/**
 * Skor UEQ-S dua skala standar: Pragmatic Quality (butir 2,3,4,8) dan
 * Hedonic Quality Impression (butir 1,5,6,7) — rata-rata mentah −3..+3.
 */
export function scoreUeq(answers: number[]): { pq: number | null; hqi: number | null } {
  const empty = { pq: null, hqi: null } as const;
  if (answers.length !== UEQ_PAIRS.length) return empty;
  if (answers.some((answer) => answer < 1 || answer > 7)) return empty;
  const t = answers.map((answer) => answer - 4);
  const mean = (indexes: number[]): number | null => {
    const values = indexes.map((index) => t[index]).filter((v): v is number => v !== undefined);
    if (values.length === 0) return null;
    return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
  };
  return { pq: mean([1, 2, 3, 7]), hqi: mean([0, 4, 5, 6]) };
}
