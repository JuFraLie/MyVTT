import { useState } from 'react';
import { TOKEN_COLORS } from '@myvtt/shared';
import BottomSheet from '../../components/BottomSheet';
import { useRoomStore } from '../room/store';

interface AddTokenSheetProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none';

/**
 * Bottom sheet tambah token (C1): nama + warna preset + pratinjau inisial.
 * Hanya dibuka DM; posisi spawn dihitung server (tidak dikirim klien).
 */
export default function AddTokenSheet({ open, onClose }: AddTokenSheetProps) {
  const addToken = useRoomStore((state) => state.addToken);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TOKEN_COLORS[4]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initial = name.trim().charAt(0).toUpperCase();

  async function handleAdd() {
    if (saving || name.trim().length === 0) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await addToken(name.trim(), color);
      if (!result.ok) throw new Error(result.error.message);
      setName('');
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menambah token.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} title="Tambah Token" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: color, boxShadow: '0 0 0 3px rgba(15,23,42,0.9)' }}
          >
            {initial || '?'}
          </span>
          <label className="block flex-1 space-y-1">
            <span className="text-xs text-slate-400">Nama (inisial tampil di token)</span>
            <input
              value={name}
              maxLength={24}
              placeholder="mis. Goblin"
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div>
          <span className="text-xs text-slate-400">Warna</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOKEN_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={`Warna ${preset}`}
                aria-pressed={preset === color}
                onClick={() => setColor(preset)}
                className={`h-11 w-11 rounded-full ${
                  preset === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={saving || name.trim().length === 0}
          onClick={handleAdd}
          className="min-h-11 w-full rounded-xl bg-indigo-500 text-sm font-medium text-white active:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? 'Menambah…' : 'Tambah ke Peta'}
        </button>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
