import { useState } from 'react';

interface ConsentScreenProps {
  onNext: () => void;
}

/**
 * Halaman persetujuan partisipan (G1): ringkasan studi, sifat sukarela,
 * dan data anonim. Tombol lanjut aktif hanya setelah kotak persetujuan dicentang.
 */
export default function ConsentScreen({ onNext }: ConsentScreenProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div>
        <p className="text-xs font-semibold tracking-wide text-indigo-300">STUDI PENELITIAN</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-100">Persetujuan Partisipan</h1>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-300">
        <p>
          Anda diundang mengikuti penelitian akademik tentang kemudahan penggunaan aplikasi Virtual
          Tabletop (VTT) D&amp;D di layar ponsel. Partisipasi bersifat <b>sukarela</b> dan Anda
          boleh berhenti kapan saja tanpa konsekuensi.
        </p>
        <p>
          Selama sesi, aplikasi mencatat interaksi (ketukan, waktu tugas, lemparan dadu, dan latensi
          sinkronisasi) secara otomatis untuk analisis usability.
        </p>
        <p>
          Data bersifat <b>anonim</b>: hanya memakai ID partisipan acak — tanpa nama asli, email,
          atau IP. Data disimpan hanya untuk keperluan penelitian ini.
        </p>
        <p className="text-slate-400">
          Dengan menekan tombol di bawah, Anda menyatakan usia minimal 18 tahun dan setuju menjadi
          partisipan.
        </p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="h-6 w-6 shrink-0 accent-indigo-500"
        />
        <span>Saya setuju berpartisipasi dalam penelitian ini.</span>
      </label>

      {/* Tombol utama menempel di bawah (zona jempol). */}
      <button
        type="button"
        disabled={!agreed}
        onClick={onNext}
        className="mt-auto min-h-14 rounded-2xl bg-indigo-500 text-base font-semibold text-white active:bg-indigo-400 disabled:opacity-50"
      >
        Lanjut ke Data Demografi
      </button>
    </div>
  );
}
