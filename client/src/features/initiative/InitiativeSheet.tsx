import { useState } from 'react';
import BottomSheet from '../../components/BottomSheet';
import { useRoomStore } from '../room/store';

interface InitiativeSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Pelacak inisiatif (C5): daftar peserta urut nilai + penanda giliran aktif
 * (ring emas di token, terlihat semua pemain) + tombol "Giliran Berikutnya".
 * DM menyusun daftar (tambah/ubah/hapus); pemain hanya melihat (A6).
 */
export default function InitiativeSheet({ open, onClose }: InitiativeSheetProps) {
  const tokens = useRoomStore((state) => state.tokens);
  const role = useRoomStore((state) => state.role);
  const initiative = useRoomStore((state) => state.initiative);
  const setInitiative = useRoomStore((state) => state.setInitiative);
  const nextTurn = useRoomStore((state) => state.nextTurn);
  const isDm = role === 'dm';

  // Draft nilai per tokenId agar tidak terkirim tiap ketikan (commit saat blur).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState<string | null>(null);
  const [addTokenId, setAddTokenId] = useState('');
  const [addValue, setAddValue] = useState('');

  const byId = new Map(tokens.map((token) => [token.id, token]));
  const inList = new Set(initiative.entries.map((entry) => entry.tokenId));
  const candidates = tokens.filter((token) => !inList.has(token.id));

  async function commit(entries: { tokenId: string; initiative: number }[]) {
    setAddError(null);
    const result = await setInitiative(entries);
    if (!result.ok) setAddError(result.error.message);
  }

  function clearDraft(tokenId: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[tokenId];
      return next;
    });
  }

  function handleDraftCommit(tokenId: string) {
    const raw = drafts[tokenId];
    if (raw === undefined) return;
    clearDraft(tokenId);
    const value = Number(raw);
    const current = initiative.entries.find((entry) => entry.tokenId === tokenId);
    if (!current || !Number.isInteger(value) || value < 0 || value > 99) return;
    if (value === current.initiative) return;
    void commit(
      initiative.entries.map((entry) =>
        entry.tokenId === tokenId ? { ...entry, initiative: value } : entry,
      ),
    );
  }

  function handleAdd() {
    const value = Number(addValue);
    if (!addTokenId || !Number.isInteger(value) || value < 0 || value > 99) {
      setAddError('Pilih token dan isi nilai0–99.');
      return;
    }
    void commit([...initiative.entries, { tokenId: addTokenId, initiative: value }]);
    setAddTokenId('');
    setAddValue('');
  }

  function handleRemove(tokenId: string) {
    void commit(initiative.entries.filter((entry) => entry.tokenId !== tokenId));
  }

  return (
    <BottomSheet open={open} title="Pelacak Inisiatif" onClose={onClose}>
      {initiative.entries.length === 0 && (
        <p className="mb-3 text-sm text-slate-400">
          Belum ada peserta{isDm ? ' — tambahkan token ke daftar.' : '.'}
        </p>
      )}
      <ul className="mb-3 max-h-64 overflow-y-auto">
        {initiative.entries.map((entry) => {
          const token = byId.get(entry.tokenId);
          const active = initiative.activeTokenId === entry.tokenId;
          return (
            <li
              key={entry.tokenId}
              className={`mb-2 flex items-center gap-2 rounded-lg border p-2 ${
                active ? 'border-amber-400/80 bg-amber-400/10' : 'border-slate-700 bg-slate-800/60'
              }`}
            >
              <span
                className="h-7 w-7 shrink-0 rounded-full border border-slate-700"
                style={{ backgroundColor: token?.color ?? '#64748b' }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {token?.name ?? 'Token terhapus'}
                  {active && (
                    <span className="ml-2 text-xs font-semibold text-amber-300">GILIRAN</span>
                  )}
                </p>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={drafts[entry.tokenId] ?? entry.initiative}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [entry.tokenId]: event.target.value }))
                }
                onBlur={() => handleDraftCommit(entry.tokenId)}
                disabled={!isDm}
                aria-label={`Nilai inisiatif ${token?.name ?? 'token'}${active ? ' (giliran aktif)' : ''}`}
                className="w-16 rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 disabled:opacity-60"
              />
              {isDm && (
                <button
                  type="button"
                  onClick={() => handleRemove(entry.tokenId)}
                  aria-label={`Hapus ${token?.name ?? 'token'} dari inisiatif`}
                  className="min-h-11 min-w-11 rounded-lg text-slate-400 active:bg-slate-800"
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {isDm && (
        <>
          <div className="mb-3 flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs text-slate-400">
              Token
              <select
                value={addTokenId}
                onChange={(event) => setAddTokenId(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-2.5 text-sm text-slate-100"
              >
                <option value="">Pilih token…</option>
                {candidates.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-20 text-xs text-slate-400">
              Nilai
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={addValue}
                onChange={(event) => setAddValue(event.target.value)}
                placeholder="15"
                className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-2.5 text-sm text-slate-100"
              />
            </label>
            <button
              type="button"
              onClick={handleAdd}
              className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white active:bg-indigo-500"
            >
              Tambah
            </button>
          </div>
          {addError && <p className="mb-2 text-xs text-red-400">{addError}</p>}
          <button
            type="button"
            onClick={() => void nextTurn()}
            disabled={initiative.entries.length === 0}
            className="min-h-11 w-full rounded-xl bg-amber-500 text-sm font-semibold text-slate-950 active:bg-amber-400 disabled:opacity-40"
          >
            Giliran Berikutnya ▶
          </button>
        </>
      )}
    </BottomSheet>
  );
}
