import { useState } from 'react';
import type { Token } from '@myvtt/shared';
import BottomSheet from '../../components/BottomSheet';
import { useRoomStore } from '../room/store';

interface TokenHPSheetProps {
  token: Token;
  onClose: () => void;
}

const clampHp = (value: number) => Math.min(999, Math.max(0, value));

/**
 * Bottom sheet HP token (C3): angka besar, tombol −/+ (>= 44 px, zona
 * jempol), dan input angka. Tiap perubahan dikirim `token:update` (DM);
 * pemain hanya melihat hingga kepemilikan token ada (C7/C8, izin A6).
 */
export default function TokenHPSheet({ token, onClose }: TokenHPSheetProps) {
  const role = useRoomStore((state) => state.role);
  const updateTokenHp = useRoomStore((state) => state.updateTokenHp);
  const [draft, setDraft] = useState(String(token.hp));
  const [lastHp, setLastHp] = useState(token.hp);
  const canEdit = role === 'dm';

  // Sinkron saat nilai server berubah (klien lain maupun rollback),
  // tanpa menimpa saat pengguna sedang mengetik (pola "adjust during render").
  if (token.hp !== lastHp) {
    setLastHp(token.hp);
    setDraft(String(token.hp));
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
      </div>
    </BottomSheet>
  );
}
