/** Tujuh tugas terskrip studi (G3) — urutan tetap, instruksi untuk partisipan. */
export interface ScriptedTask {
  /** ID stabil untuk metadata telemetry. */
  id: string;
  instruction: string;
}

export const TASKS: ScriptedTask[] = [
  {
    id: 'join',
    instruction: 'Buat ruang baru (atau gabung memakai kode), lalu masuk dengan nama panggilan.',
  },
  {
    id: 'map_grid',
    instruction:
      'Sebagai DM: unggah peta berformat JPG/PNG/WebP, lalu atur dan kunci grid agar pas.',
  },
  {
    id: 'token_place',
    instruction: 'Unggah gambar token (dipotong lingkaran), lalu letakkan tokoh itu di peta.',
  },
  {
    id: 'move_target',
    instruction: 'Seret satu token sampai masuk kotak target berwarna hijau di peta.',
  },
  {
    id: 'hp_change',
    instruction: 'Ubah HP salah satu token lewat sheet HP (mis. 25 menjadi 20).',
  },
  {
    id: 'roll_d20',
    instruction: 'Buka tab Dadu, lalu lempar 1d20 dengan modifier (mis. +3).',
  },
  {
    id: 'ruler',
    instruction:
      'Tekan-tahan area peta sekitar setengah detik, lalu seret untuk mengukur jarak antar kotak.',
  },
];
