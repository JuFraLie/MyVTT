import type { GridConfig } from '@myvtt/shared';

interface GridControlsProps {
  draft: GridConfig;
  showGrid: boolean;
  saving: boolean;
  onToggleShow: () => void;
  onChange: (patch: Partial<GridConfig>) => void;
  onSave: (locked: boolean) => void;
}

const numberInputClass =
  'min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100 focus:border-indigo-500 focus:outline-none';

interface FieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** Satu baris: input angka + slider halus (AGENTS/GDD B2 butir 2 & 3). */
function NumericField({ label, value, min, max, onChange }: FieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) {
              onChange(Math.min(max, Math.max(min, Math.round(next))));
            }
          }}
          className={numberInputClass}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 flex-1 accent-indigo-400"
          aria-label={`${label} (slider halus)`}
        />
      </div>
    </label>
  );
}

/** Panel kontrol kalibrasi (B2): angka, slider, warna, transparansi, simpan/kunci. */
export default function GridControls({
  draft,
  showGrid,
  saving,
  onToggleShow,
  onChange,
  onSave,
}: GridControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <label className="flex min-h-11 flex-1 items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={onToggleShow}
            className="h-5 w-5 accent-indigo-400"
          />
          Tampilkan grid
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Warna</span>
          <input
            type="color"
            value={draft.color}
            onChange={(event) => onChange({ color: event.target.value })}
            className="h-11 w-16 rounded-xl border border-slate-700 bg-slate-900"
            aria-label="Warna garis grid"
          />
        </label>
        <label className="block flex-1 space-y-1">
          <span className="text-xs text-slate-400">
            Transparansi {Math.round(draft.opacity * 100)}%
          </span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={draft.opacity}
            onChange={(event) => onChange({ opacity: Number(event.target.value) })}
            className="h-11 w-full accent-indigo-400"
          />
        </label>
      </div>

      <NumericField
        label="Piksel per kotak"
        value={draft.cellPx}
        min={8}
        max={4096}
        onChange={(cellPx) => onChange({ cellPx })}
      />
      <NumericField
        label="Offset X"
        value={draft.offsetX}
        min={0}
        max={4096}
        onChange={(offsetX) => onChange({ offsetX })}
      />
      <NumericField
        label="Offset Y"
        value={draft.offsetY}
        min={0}
        max={4096}
        onChange={(offsetY) => onChange({ offsetY })}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(false)}
          className="min-h-11 rounded-xl bg-slate-800 text-sm font-medium text-slate-100 active:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(true)}
          className="min-h-11 rounded-xl bg-indigo-500 text-sm font-medium text-white active:bg-indigo-400 disabled:opacity-50"
        >
          Kunci Grid
        </button>
      </div>
    </div>
  );
}
