import { useState } from 'react';
import type { Character, CharacterAbilities } from '@myvtt/shared';
import StepperRow from '../../components/StepperRow';
import { useRoomStore } from '../room/store';
import AbilityInputs from './AbilityInputs';

interface CharacterForm {
  name: string;
  class: string;
  level: number;
  hp: number;
  ac: number;
  abilities: CharacterAbilities;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function defaultForm(owner: string): CharacterForm {
  return {
    name: owner,
    class: '',
    level: 1,
    hp: 10,
    ac: 10,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  };
}

function toForm(character: Character): CharacterForm {
  return {
    name: character.name,
    class: character.class,
    level: character.level,
    hp: character.hp,
    ac: character.ac,
    abilities: { ...character.abilities },
  };
}

const inputClass =
  'min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none';

/**
 * Lembar karakter ringkas (E1): nama, kelas, level, HP, AC, enam kemampuan.
 * Disimpan per pemain di ruang lewat `character:set` (upsert, owner = sesi);
 * disimpan saat tombol Simpan ditekan, bukan tiap ketukan.
 */
export default function CharacterScreen() {
  const nickname = useRoomStore((state) => state.nickname);
  const characters = useRoomStore((state) => state.characters);
  const setCharacter = useRoomStore((state) => state.setCharacter);
  const [form, setForm] = useState<CharacterForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const existing = nickname === null ? undefined : characters.find((c) => c.owner === nickname);
  // Hydrate sekali dari state:full; setelah pengguna mengetik, draft lokal dipegang.
  if (form === null && existing) setForm(toForm(existing));

  if (nickname === null) return null;
  const active = form ?? defaultForm(nickname);

  function update(patch: Partial<CharacterForm>) {
    setSaved(false);
    setErrorMessage(null);
    setForm({ ...active, ...patch });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);
    try {
      const result = await setCharacter(active);
      if (!result.ok) throw new Error(result.error.message);
      setSaved(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menyimpan lembar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto p-4">
      <h1 className="text-sm font-semibold text-slate-300">Lembar Karakter</h1>

      <label className="block">
        <span className="text-xs text-slate-400">Nama</span>
        <input
          type="text"
          maxLength={40}
          value={active.name}
          onChange={(event) => update({ name: event.target.value })}
          className={`mt-1 ${inputClass}`}
        />
      </label>

      <label className="block">
        <span className="text-xs text-slate-400">Kelas</span>
        <input
          type="text"
          maxLength={30}
          placeholder="mis. Rogue"
          value={active.class}
          onChange={(event) => update({ class: event.target.value })}
          className={`mt-1 ${inputClass}`}
        />
      </label>

      <StepperRow
        label="Level"
        display={String(active.level)}
        onDec={() => update({ level: clamp(active.level - 1, 1, 20) })}
        onInc={() => update({ level: clamp(active.level + 1, 1, 20) })}
      />
      <StepperRow
        label="HP"
        display={String(active.hp)}
        onDec={() => update({ hp: clamp(active.hp - 1, 0, 999) })}
        onInc={() => update({ hp: clamp(active.hp + 1, 0, 999) })}
      />
      <StepperRow
        label="AC"
        display={String(active.ac)}
        onDec={() => update({ ac: clamp(active.ac - 1, 0, 99) })}
        onInc={() => update({ ac: clamp(active.ac + 1, 0, 99) })}
      />

      <div>
        <span className="text-xs text-slate-400">Kemampuan (0–30)</span>
        <div className="mt-2">
          <AbilityInputs
            abilities={active.abilities}
            onChange={(key, value) =>
              update({ abilities: { ...active.abilities, [key]: clamp(value, 0, 30) } })
            }
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-auto min-h-14 rounded-2xl bg-indigo-500 text-base font-semibold text-white active:bg-indigo-400 disabled:opacity-50"
      >
        {saving ? 'Menyimpan…' : 'Simpan Lembar'}
      </button>

      {saved && <p className="text-center text-xs text-emerald-400">Tersimpan ✓</p>}
      {errorMessage && (
        <p role="alert" className="text-center text-sm text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
