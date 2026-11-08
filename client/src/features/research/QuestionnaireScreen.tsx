import { useEffect, useRef, useState } from 'react';
import { logTelemetry } from '../../lib/telemetry';
import SusSection from './SusSection';
import UeqSection from './UeqSection';
import { markQuestionnaireDone } from './questionnaire';

interface QuestionnaireScreenProps {
  onDone: () => void;
}

/**
 * Kuesioner in-app (G4): SUS (10 butir) + UEQ-S (8 butir) tampil setelah
 * tugas studi selesai. Jawaban mentah dikirim sebagai dua event telemetry
 * `questionnaire` (CSV per instrumen) lalu disimpan lokal agar tidak muncul
 * ulang; ekspor CSV oleh peneliti menyusul di G5.
 */
export default function QuestionnaireScreen({ onDone }: QuestionnaireScreenProps) {
  const [sus, setSus] = useState<(number | null)[]>(() => Array<number | null>(10).fill(null));
  const [ueq, setUeq] = useState<(number | null)[]>(() => Array<number | null>(8).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const startRef = useRef(0);

  // Durasi pengisian: diukur di effect, bukan saat render (aturan purity).
  useEffect(() => {
    startRef.current = performance.now();
  }, []);

  const ready = sus.every((value) => value !== null) && ueq.every((value) => value !== null);

  function handleSubmit() {
    if (!ready || submitted) return;
    const durationMs = Math.round(performance.now() - startRef.current);
    logTelemetry('questionnaire', {
      instrument: 'sus',
      answers: sus.join(','),
      durationMs,
    });
    logTelemetry('questionnaire', { instrument: 'ueqs', answers: ueq.join(',') });
    markQuestionnaireDone();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
        <p className="text-4xl" aria-hidden="true">
          🙏
        </p>
        <p className="text-base text-slate-100">Terima kasih — jawaban Anda tersimpan.</p>
        <button
          type="button"
          onClick={onDone}
          className="min-h-14 w-full max-w-sm rounded-2xl bg-indigo-500 text-base font-semibold text-white active:bg-indigo-400"
        >
          Selesai
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-5 p-4 pb-28">
        <header>
          <p className="text-xs font-semibold tracking-wide text-indigo-300">LANGKAH TERAKHIR</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-100">Kuesioner Studi</h1>
          <p className="mt-1 text-sm text-slate-400">
            Dua kuesioner singkat: 10 butir SUS lalu 8 butir UEQ-S. Tidak ada jawaban benar atau
            salah.
          </p>
        </header>

        <SusSection
          answers={sus}
          onChange={(index, value) =>
            setSus((prev) => prev.map((item, i) => (i === index ? value : item)))
          }
        />
        <UeqSection
          answers={ueq}
          onChange={(index, value) =>
            setUeq((prev) => prev.map((item, i) => (i === index ? value : item)))
          }
        />
      </div>

      {/* Tombol kirim menempel di bawah layar (zona jempol). */}
      <div className="fixed inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-md border-t border-slate-800 bg-slate-950/95 p-3">
        <button
          type="button"
          disabled={!ready}
          onClick={handleSubmit}
          className="min-h-14 w-full rounded-2xl bg-indigo-500 text-base font-semibold text-white active:bg-indigo-400 disabled:opacity-50"
        >
          {ready
            ? 'Kirim Kuesioner'
            : `Isi semua butir (${sus.filter((v) => v !== null).length + ueq.filter((v) => v !== null).length}/18)`}
        </button>
      </div>
    </div>
  );
}
