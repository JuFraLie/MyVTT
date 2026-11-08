import type { CharacterAbilities } from '@myvtt/shared';
import { abilityModifier, formatModifier } from './ability';

interface AbilityInputsProps {
  abilities: CharacterAbilities;
  onChange: (key: keyof CharacterAbilities, value: number) => void;
}

const KEYS: { key: keyof CharacterAbilities; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

/**
 * Grid enam nilai kemampuan (E1): input angka 0–30 per nilai dengan
 * pratinjau modifier di bawahnya.
 */
export default function AbilityInputs({ abilities, onChange }: AbilityInputsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map(({ key, label }) => (
        <label
          key={key}
          className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-center"
        >
          <span className="block text-xs font-semibold text-slate-400">{label}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            value={abilities[key]}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              onChange(key, Number.isFinite(parsed) ? Math.round(parsed) : 0);
            }}
            className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 text-center text-base tabular-nums text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
          <span className="mt-1 block text-xs tabular-nums text-indigo-300">
            {formatModifier(abilityModifier(abilities[key]))}
          </span>
        </label>
      ))}
    </div>
  );
}
