import { useState } from 'react';
import { demographicsSchema, type Demographics } from '@myvtt/shared';

interface DemographicsScreenProps {
  onDone: (demographics: Demographics) => void;
}

const EXPERIENCE: { value: Demographics['dndExperience']; label: string }[] = [
  { value: 'belum', label: 'Belum pernah' },
  { value: 'pernah', label: 'Pernah mencoba' },
  { value: '1-2', label: '1–2 tahun' },
  { value: 'lebih-2', label: 'Lebih dari 2 tahun' },
];

const DEVICES: { value: Demographics['device']; label: string }[] = [
  { value: 'ponsel', label: 'Ponsel' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'laptop', label: 'Laptop' },
];

/**
 * Form data demografi singkat (G1): pengalaman D&D, perangkat, ukuran layar.
 * Divalidasi zod yang sama dengan kontrak bersama; layar ikut dicatat (px + DPR)
 * sebagai metadata tambahan saat G2 mengirim telemetry.
 */
export default function DemographicsScreen({ onDone }: DemographicsScreenProps) {
  const [dndExperience, setDndExperience] = useState<Demographics['dndExperience'] | null>(null);
  const [device, setDevice] = useState<Demographics['device'] | null>(null);
  const [screenInches, setScreenInches] = useState('');

  const parsedInches = Number(screenInches);
  const ready =
    dndExperience !== null &&
    device !== null &&
    Number.isFinite(parsedInches) &&
    screenInches !== '';

  function handleSubmit() {
    if (!ready || dndExperience === null || device === null) return;
    const result = demographicsSchema.safeParse({
      dndExperience,
      device,
      screenInches: parsedInches,
    });
    if (!result.success) return;
    onDone(result.data);
  }

  function choiceRow<T extends string>(
    label: string,
    options: { value: T; label: string }[],
    selected: T | null,
    onSelect: (value: T) => void,
  ) {
    return (
      <div>
        <span className="text-xs text-slate-400">{label}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected === option.value}
              onClick={() => onSelect(option.value)}
              className={`min-h-11 rounded-xl border px-3 text-sm ${
                selected === option.value
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700 bg-slate-950 text-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const screenInfo =
    typeof window === 'undefined'
      ? null
      : `${window.screen.width}×${window.screen.height} px (${window.devicePixelRatio}×)`;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div>
        <p className="text-xs font-semibold tracking-wide text-indigo-300">LANGKAH 2 DARI 2</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-100">Data Demografi Singkat</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tiga pertanyaan berikut membantu menganalisis hasil studi.
        </p>
      </div>

      {choiceRow('Pengalaman bermain D&D', EXPERIENCE, dndExperience, setDndExperience)}
      {choiceRow('Perangkat utama', DEVICES, device, setDevice)}

      <label className="block">
        <span className="text-xs text-slate-400">Perkiraan ukuran layar (inci diagonal)</span>
        <input
          type="number"
          inputMode="decimal"
          min={3}
          max={30}
          step={0.1}
          placeholder="mis. 6.1"
          value={screenInches}
          onChange={(event) => setScreenInches(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
        />
        {screenInfo && (
          <span className="mt-1 block text-xs text-slate-500">Layar terdeteksi: {screenInfo}</span>
        )}
      </label>

      <button
        type="button"
        disabled={!ready}
        onClick={handleSubmit}
        className="mt-auto min-h-14 rounded-2xl bg-indigo-500 text-base font-semibold text-white active:bg-indigo-400 disabled:opacity-50"
      >
        Mulai Sesi
      </button>
    </div>
  );
}
