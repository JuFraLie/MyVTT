import { useState } from 'react';
import type { DiceType } from '@myvtt/shared';
import { useRoomStore } from '../room/store';

const DICE: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Layar Dadu (D1): pilih tipe/jumlah/modifier lalu `dice:roll` — angka dadu
 * dan total dihitung server, semua klien menerima `dice:rolled`. Hasil terakhir
 * tampil di sini; riwayat/log bersama (D3) menyusul.
 */
export default function DiceScreen() {
  const lastRoll = useRoomStore((state) => state.lastRoll);
  const rollDice = useRoomStore((state) => state.rollDice);
  const [dice, setDice] = useState<DiceType>('d20');
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRoll() {
    if (rolling) return;
    setRolling(true);
    setErrorMessage(null);
    try {
      const result = await rollDice(dice, count, modifier);
      if (!result.ok) throw new Error(result.error.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal melempar dadu.');
    } finally {
      setRolling(false);
    }
  }

  const notation = `${count}${dice}${modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : modifier}`;

  /** Baris stepper −/+ (target sentuh ≥ 44 px, zona jempol — AGENTS §7). */
  function stepperRow(label: string, display: string, onDec: () => void, onInc: () => void) {
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

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto p-4">
      <span className="text-xs text-slate-400">Jenis dadu</span>
      <div className="grid grid-cols-3 gap-2">
        {DICE.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={dice === item}
            onClick={() => setDice(item)}
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

      {stepperRow(
        'Jumlah dadu',
        String(count),
        () => setCount((value) => clamp(value - 1, 1, 20)),
        () => setCount((value) => clamp(value + 1, 1, 20)),
      )}
      {stepperRow(
        'Modifier',
        modifier > 0 ? `+${modifier}` : String(modifier),
        () => setModifier((value) => clamp(value - 1, -99, 99)),
        () => setModifier((value) => clamp(value + 1, -99, 99)),
      )}

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
                  className="rounded-md bg-slate-800 px-2 py-1 text-sm tabular-nums text-slate-200"
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
