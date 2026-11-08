import { SUS_LABELS, SUS_STATEMENTS } from './questionnaire';

interface SusSectionProps {
  answers: (number | null)[];
  onChange: (index: number, value: number) => void;
}

/**
 * Bagian SUS (G4): 10 pernyataan, Limert 1–5. Tombol angka berlabel penuh
 * (aria-label) agar ringkas namun tetap jelas bagi pembaca layar.
 */
export default function SusSection({ answers, onChange }: SusSectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-200">SUS — Skala Kemudahan Pemakaian</h2>
      <p className="text-xs text-slate-500">
        1 = {SUS_LABELS[0]} · 5 = {SUS_LABELS[4]}
      </p>
      <ol className="space-y-2">
        {SUS_STATEMENTS.map((statement, index) => (
          <li key={statement.text} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <p className="text-sm text-slate-200">
              <span className="mr-1 text-slate-500">{index + 1}.</span>
              {statement.text}
            </p>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} — ${SUS_LABELS[value - 1] ?? ''}`}
                  aria-pressed={answers[index] === value}
                  onClick={() => onChange(index, value)}
                  className={`h-11 flex-1 rounded-lg border text-sm font-semibold ${
                    answers[index] === value
                      ? 'border-indigo-400 bg-indigo-500/30 text-indigo-100'
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
