import { useState } from 'react';
import type { DiceRollMode, DiceType } from '@myvtt/shared';
import StepperRow from '../../components/StepperRow';
import { useRoomStore } from '../room/store';

const DICE: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const MODES: { value: DiceRollMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'advantage', label: 'Advantage' },
  { value: 'disadvantage', label: 'Disadvantage' },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Layar Dadu (D1 + D2): pilih tipe/jumlah/modifier lalu `dice:roll` — angka
 * dadu dan total dihitung server, semua klien menerima `dice:rolled`.
 * Mode advantage/disadvantage (D2) hanya untuk 1d20: server melempar 2d20
 * lalu mengambil tertinggi/terendah; chip yang dipakai ditandai cincin hijau.
 */
export default function DiceScreen() {
  const lastRoll = useRoomStore((state) => state.lastRoll);
  const rollDice = useRoomStore((state) => state.rollDice);
  const [dice, setDice] = useState<DiceType>('d20');
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<DiceRollMode>('normal');
  const [rolling, setRolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function pickDice(item: DiceType) {
    setDice(item);
    if (item !== 'd20') setMode('normal');
  }

  function pickMode(value: DiceRollMode) {
    setMode(value);
    if (value !== 'normal') setCount(1); // adv/dis selalu 1d20
  }

  async function handleRoll() {
    if (rolling) return;
    setRolling(true);
    setErrorMessage(null);
    try {
      const result = await rollDice(dice, count, modifier, mode === 'normal' ? undefined : mode);
      if (!result.ok) throw new Error(result.error.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal melempar dadu.');
    } finally {
      setRolling(false);
    }
  }

  const isCheck = mode !== 'normal';
  const notation = isCheck
    ? `2d20 ${mode === 'advantage' ? 'adv' : 'dis'}${modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : modifier}`
    : `${count}${dice}${modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : modifier}`;

  // Chip yang dipakai server untuk adv/dis (D2): tertinggi/terendah dari dua dadu.
  const keptValue =
    lastRoll && lastRoll.mode === 'advantage'
      ? Math.max(...lastRoll.rolls)
      : lastRoll && lastRoll.mode === 'disadvantage'
        ? Math.min(...lastRoll.rolls)
        : null;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto p-4">
      <span className="text-xs text-slate-400">Jenis dadu</span>
      <div className="grid grid-cols-3 gap-2">
        {DICE.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={dice === item}
            onClick={() => pickDice(item)}
            className={`min-h-11 rounded-xl border text-sm font-semibold ${
              dice === item
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                : 'border-slate-700 bg-slate-950 text-slate-300'
            }`}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>

      {dice === 'd20' && (
        <>
          <span className="text-xs text-slate-400">Mode d20 (D2)</span>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={mode === item.value}
                aria-label={item.label}
                onClick={() => pickMode(item.value)}
                className={`min-h-11 rounded-xl border px-1 text-xs font-semibold ${
                  mode === item.value
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                    : 'border-slate-700 bg-slate-950 text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      <StepperRow
        label="Jumlah dadu"
        display={String(count)}
        disabled={isCheck}
        onDec={() => setCount((value) => clamp(value - 1, 1, 20))}
        onInc={() => setCount((value) => clamp(value + 1, 1, 20))}
      />
      <StepperRow
        label="Modifier"
        display={modifier > 0 ? `+${modifier}` : String(modifier)}
        onDec={() => setModifier((value) => clamp(value - 1, -99, 99))}
        onInc={() => setModifier((value) => clamp(value + 1, -99, 99))}
      />

      {/* Hasil terakhir dari broadcast server; aria-live agar pembaca layar mengumumkan. */}
      <div
        aria-live="polite"
        className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center"
      >
        {lastRoll ? (
          <>
            <p className="text-xs text-slate-500">
              {lastRoll.nickname} · {lastRoll.count}
              {lastRoll.dice}
              {lastRoll.mode && lastRoll.mode !== 'normal' ? ` (${lastRoll.mode})` : ''}
              {lastRoll.modifier === 0
                ? ''
                : lastRoll.modifier > 0
                  ? `+${lastRoll.modifier}`
                  : lastRoll.modifier}
            </p>
            <p className="mt-2 flex flex-wrap justify-center gap-1">
              {lastRoll.rolls.map((value, index) => (
                <span
                  key={`${index}-${value}`}
                  className={`rounded-md bg-slate-800 px-2 py-1 text-sm tabular-nums ${
                    keptValue !== null
                      ? value === keptValue
                        ? 'text-emerald-300 ring-1 ring-emerald-400'
                        : 'text-slate-500'
                      : 'text-slate-200'
                  }`}
                >
                  {value}
                </span>
              ))}
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-indigo-300">{lastRoll.total}</p>
          </>
        ) : (
          <p className="text-sm text-slate-500">Belum ada lemparan di sesi ini.</p>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="text-center text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      {/* Tombol utama didorong ke bawah layar (zona jempol). */}
      <button
        type="button"
        onClick={handleRoll}
        disabled={rolling}
        className="mt-auto min-h-14 rounded-2xl bg-indigo-500 text-base font-semibold text-white active:bg-indigo-400 disabled:opacity-50"
      >
        {rolling ? 'Melempar…' : `Lempar ${notation}`}
      </button>
    </div>
  );
}
