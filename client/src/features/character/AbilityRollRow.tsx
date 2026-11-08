import { useState } from 'react';
import type { CharacterAbilities } from '@myvtt/shared';
import { useRoomStore } from '../room/store';
import { ABILITY_LIST, abilityModifier, formatModifier } from './ability';

interface AbilityRollRowProps {
  abilities: CharacterAbilities;
}

/**
 * Baris tap-to-roll kemampuan (E2): ketuk STR/DEX/… → `dice:roll` d20 +
 * modifier dihitung server (D1), hasilnya masuk log bersama (D3) dan tampil
 * inline di bawah baris.
 */
export default function AbilityRollRow({ abilities }: AbilityRollRowProps) {
  const rollDice = useRoomStore((state) => state.rollDice);
  const lastRoll = useRoomStore((state) => state.lastRoll);
  const [rolling, setRolling] = useState(false);
  const [rolledLabel, setRolledLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRoll(label: string, modifier: number) {
    if (rolling) return;
    setRolling(true);
    setErrorMessage(null);
    setRolledLabel(label);
    try {
      const result = await rollDice('d20', 1, modifier);
      if (!result.ok) throw new Error(result.error.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal melempar dadu.');
    } finally {
      setRolling(false);
    }
  }

  const showResult =
    rolledLabel !== null && lastRoll !== null && lastRoll.dice === 'd20' && lastRoll.count === 1;

  return (
    <div>
      <span className="text-xs text-slate-400">Tap-to-roll (d20 + modifier)</span>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {ABILITY_LIST.map(({ key, label }) => {
          const modifier = abilityModifier(abilities[key]);
          return (
            <button
              key={key}
              type="button"
              disabled={rolling}
              aria-label={`Lempar ${label}, d20 ${formatModifier(modifier)}`}
              onClick={() => handleRoll(label, modifier)}
              className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-200 active:bg-slate-800 disabled:opacity-50"
            >
              {label}{' '}
              <span className="tabular-nums text-indigo-300">{formatModifier(modifier)}</span>
            </button>
          );
        })}
      </div>

      {showResult && lastRoll && rolledLabel && (
        <p aria-live="polite" className="mt-2 text-center text-sm text-slate-300">
          {rolledLabel}: d20{formatModifier(lastRoll.modifier)} →{' '}
          <span className="font-bold tabular-nums text-indigo-300">{lastRoll.total}</span>{' '}
          <span className="text-xs text-slate-500">({lastRoll.rolls.join(', ')})</span>
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="mt-2 text-center text-sm text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
