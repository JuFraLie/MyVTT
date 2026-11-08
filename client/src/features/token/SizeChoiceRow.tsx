interface SizeChoiceRowProps {
  value: 1 | 2 | 3;
  onChange: (size: 1 | 2 | 3) => void;
  label?: string;
}

const SIZES: { label: string; value: 1 | 2 | 3 }[] = [
  { label: 'Medium 1×1', value: 1 },
  { label: 'Large 2×2', value: 2 },
  { label: 'Huge 3×3', value: 3 },
];

/** Baris pilihan ukuran token (C9): Medium/Large/Huge — tanpa logika izin. */
export default function SizeChoiceRow({ value, onChange, label }: SizeChoiceRowProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-slate-400">{label ?? 'Ukuran (kotak grid)'}</span>
      <div className="flex flex-wrap gap-2">
        {SIZES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={value === item.value}
            onClick={() => {
              if (value !== item.value) onChange(item.value);
            }}
            className={`min-h-11 rounded-xl border px-3 text-sm ${
              value === item.value
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                : 'border-slate-700 bg-slate-950 text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
