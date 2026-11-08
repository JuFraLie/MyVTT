import { UEQ_PAIRS } from './questionnaire';

interface UeqSectionProps {
  answers: (number | null)[];
  onChange: (index: number, value: number) => void;
}

/**
 * Bagian UEQ-S (G4): 8 pasang diferensial semantik 1–7 (negatif → positif).
 * Label kedua kutub di atas deretan tombol agar muat di layar 360 px.
 */
export default function UeqSection({ answers, onChange }: UeqSectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-200">UEQ-S — Pengalaman Pengguna</h2>
      <p className="text-xs text-slate-500">Pilih 1 (kiri) sampai 7 (kanan).</p>
      <ol className="space-y-3">
        {UEQ_PAIRS.map((pair, index) => (
          <li key={pair.neg} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>{pair.neg}</span>
              <span>{pair.pos}</span>
            </div>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} — ${value <= 4 ? pair.neg : pair.pos}`}
                  aria-pressed={answers[index] === value}
                  onClick={() => onChange(index, value)}
                  className={`h-11 min-w-0 flex-1 rounded-lg border text-sm font-semibold ${
                    answers[index] === value
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
