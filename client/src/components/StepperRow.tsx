interface StepperRowProps {
  label: string;
  /** Nilai tampil; boleh berformat sendiri (mis. "+5"). */
  display: string;
  onDec: () => void;
  onInc: () => void;
}

/**
 * Baris stepper −/+ (target sentuh ≥ 44 px, zona jempol — AGENTS §7).
 * Dipakai layar Dadu (D1) dan lembar karakter (E1).
 */
export default function StepperRow({ label, display, onDec, onInc }: StepperRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Kurangi ${label}`}
          onClick={onDec}
          className="h-11 w-11 rounded-lg bg-slate-800 text-lg text-slate-100 active:bg-slate-700"
        >
          −
        </button>
        <span className="min-w-16 text-center text-base font-semibold tabular-nums text-slate-100">
          {display}
        </span>
        <button
          type="button"
          aria-label={`Tambah ${label}`}
          onClick={onInc}
          className="h-11 w-11 rounded-lg bg-slate-800 text-lg text-slate-100 active:bg-slate-700"
        >
          +
        </button>
      </div>
    </div>
  );
}
