import { useState } from 'react';
import type { Token } from '@myvtt/shared';
import BottomSheet from '../../components/BottomSheet';
import { useRoomStore } from '../room/store';
import TokenImageControls from './TokenImageControls';
import TokenSizeRow from './TokenSizeRow';

interface TokenHPSheetProps {
  token: Token;
  onClose: () => void;
}

const clampHp = (value: number) => Math.min(999, Math.max(0, value));

/**
 * Bottom sheet HP token (C3): angka besar, tombol −/+ (>= 44 px, zona
 * jempol), dan input angka. DM mengubah HP; gambar token (C7) boleh DM
 * atau pemiliknya lewat TokenImageControls (izin A6).
 */
export default function TokenHPSheet({ token, onClose }: TokenHPSheetProps) {
  const role = useRoomStore((state) => state.role);
  const updateTokenHp = useRoomStore((state) => state.updateTokenHp);
  const removeToken = useRoomStore((state) => state.removeToken);
  const [draft, setDraft] = useState(String(token.hp));
  const [lastHp, setLastHp] = useState(token.hp);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const canEdit = role === 'dm';

  // Sinkron saat nilai server berubah (klien lain maupun rollback),
  // tanpa menimpa saat pengguna sedang mengetik (pola "adjust during render").
  if (token.hp !== lastHp) {
    setLastHp(token.hp);
    setDraft(String(token.hp));
  }

  async function handleRemove() {
    if (!confirmRemove) {
      setConfirmRemove(true); // dua langkah agar hapus tidak kecelakaan
      return;
    }
    setRemoveError(null);
    try {
      const result = await removeToken(token.id);
      if (!result.ok) throw new Error(result.error.message);
      onClose();
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : 'Gagal menghapus token.');
      setConfirmRemove(false);
    }
  }

  function commitHp(hp: number) {
    setDraft(String(hp));
    void updateTokenHp(token.id, hp);
  }

  function commitDraft() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || draft.trim() === '') {
      setDraft(String(token.hp));
      return;
    }
    const hp = clampHp(Math.round(parsed));
    if (hp !== token.hp) commitHp(hp);
    else setDraft(String(hp));
  }

  return (
    <BottomSheet open title={`HP ${token.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          {canEdit ? (
            <button
              type="button"
              aria-label="Kurangi HP"
              disabled={token.hp <= 0}
              onClick={() => commitHp(clampHp(token.hp - 1))}
              className="h-14 w-14 rounded-xl bg-slate-800 text-2xl font-bold text-slate-100 active:bg-slate-700 disabled:opacity-40"
            >
              −
            </button>
          ) : (
            <span className="h-14 w-14" aria-hidden="true" />
          )}
          <label className="min-w-0 flex-1">
            <span className="sr-only">HP</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={draft}
              readOnly={!canEdit}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitDraft}
              className="min-h-14 w-full rounded-xl border border-slate-700 bg-slate-950 text-center text-3xl font-bold text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </label>
          {canEdit ? (
            <button
              type="button"
              aria-label="Tambah HP"
              onClick={() => commitHp(clampHp(token.hp + 1))}
              className="h-14 w-14 rounded-xl bg-indigo-500 text-2xl font-bold text-white active:bg-indigo-400"
            >
              +
            </button>
          ) : (
            <span className="h-14 w-14" aria-hidden="true" />
          )}
        </div>
        <p className="text-center text-xs text-slate-500">
          {canEdit
            ? 'Ketuk −/+ atau ketik angka; perubahan langsung tersinkron.'
            : 'HP hanya dapat diubah oleh DM.'}
        </p>

        <TokenImageControls token={token} />

        <TokenSizeRow token={token} />

        {canEdit && (
          <button
            type="button"
            onClick={handleRemove}
            className={`min-h-11 w-full rounded-xl text-sm font-medium ${
              confirmRemove
                ? 'bg-red-600 text-white active:bg-red-500'
                : 'border border-slate-700 bg-slate-900 text-red-400 active:bg-slate-800'
            }`}
          >
            {confirmRemove ? 'Ketuk lagi untuk hapus token' : 'Hapus Token'}
          </button>
        )}
        {removeError && (
          <p role="alert" className="text-center text-sm text-red-400">
            {removeError}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
