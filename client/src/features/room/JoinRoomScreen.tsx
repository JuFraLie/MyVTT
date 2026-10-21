import { useState } from 'react';
import type { Role } from '@myvtt/shared';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useRoomStore } from './store';

interface JoinRoomScreenProps {
  onBack: () => void;
}

/** Layar A2: gabung ruang dengan kode + nama panggilan + peran (DM atau Pemain). */
export default function JoinRoomScreen({ onBack }: JoinRoomScreenProps) {
  const { status, errorMessage, joinRoom } = useRoomStore();
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<Role>('player');
  const busy = status === 'joining';

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pt-10">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Gabung Ruang</h1>
        <p className="text-sm text-slate-400">Masukkan kode dari DM, lalu nama panggilanmu.</p>
      </div>

      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Kode ruang (6 karakter)</span>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="mis. RTK2QV"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={6}
            inputMode="text"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Nama panggilan</span>
          <Input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="mis. Budi"
            maxLength={24}
            autoComplete="off"
          />
        </label>

        <fieldset>
          <legend className="mb-1 text-xs text-slate-400">Peran</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'player', label: 'Pemain' },
                { value: 'dm', label: 'DM' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={role === option.value}
                onClick={() => setRole(option.value)}
                className={`min-h-11 rounded-xl border text-sm font-medium transition-colors ${
                  role === option.value
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <Button
          className="w-full text-base"
          disabled={busy}
          onClick={() => joinRoom({ code, nickname, role })}
        >
          {busy ? 'Bergabung…' : 'Gabung'}
        </Button>

        {status === 'error' && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        )}

        <Button variant="ghost" className="w-full" disabled={busy} onClick={onBack}>
          Kembali
        </Button>
      </div>
    </div>
  );
}
