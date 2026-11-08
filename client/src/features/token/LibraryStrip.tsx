import { useState } from 'react';
import type { AssetEntry } from '@myvtt/shared';
import { useRoomStore } from '../room/store';

interface LibraryStripProps {
  /**
   * Pemakaian entri terpilih: image = URL siap pakai (form diisi ulang),
   * null = lepas pilihan. Diketuk dua kali untuk melepas.
   */
  onUse: (image: string | null, name: string | null) => void;
}

/**
 * Strip pustaka token (C8): daftar unggahan berlabel Pemain/Monster.
 * Ketuk = pilih (memakai ulang tanpa unggah), ketuk lagi = lepas;
 * entri terpilih bisa dihapus dari pustaka (token yang memakainya tetap ada).
 */
export default function LibraryStrip({ onUse }: LibraryStripProps) {
  const library = useRoomStore((state) => state.library);
  const removeAsset = useRoomStore((state) => state.removeAsset);
  const [selected, setSelected] = useState<AssetEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (library.length === 0) return null;

  function handlePick(entry: AssetEntry) {
    if (selected?.id === entry.id) {
      setSelected(null);
      onUse(null, null);
      return;
    }
    setSelected(entry);
    setErrorMessage(null);
    onUse(entry.image, entry.name);
  }

  async function handleRemove() {
    if (!selected) return;
    setErrorMessage(null);
    const result = await removeAsset(selected.id);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }
    setSelected(null);
    onUse(null, null);
  }

  return (
    <div className="space-y-2">
      <span className="text-xs text-slate-400">Pustaka — ketuk untuk pakai ulang</span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {library.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={selected?.id === entry.id}
            aria-label={`${entry.name} (${entry.type})`}
            onClick={() => handlePick(entry)}
            className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 ${
              selected?.id === entry.id ? 'border-indigo-400' : 'border-slate-700'
            }`}
          >
            <img src={entry.image} alt="" className="h-full w-full object-cover" />
            <span className="absolute right-0 bottom-0 rounded-tl-md bg-slate-950/85 px-1 text-[9px] leading-3 text-slate-300">
              {entry.type === 'pemain' ? 'P' : 'M'}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-slate-500">
          {selected ? `Terpilih: ${selected.name}` : 'Ketuk gambar untuk mengisi form.'}
        </p>
        {selected && (
          <button
            type="button"
            onClick={handleRemove}
            className="min-h-11 shrink-0 rounded-lg px-2 text-xs text-red-400 active:bg-slate-800"
          >
            Hapus dari pustaka
          </button>
        )}
      </div>
      {errorMessage && (
        <p role="alert" className="text-xs text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
