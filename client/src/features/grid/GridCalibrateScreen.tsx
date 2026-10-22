import { useState } from 'react';
import { DEFAULT_GRID, type GridConfig, type RoomMap } from '@myvtt/shared';
import { useRoomStore } from '../room/store';
import GridControls from './GridControls';
import GridPreview from './GridPreview';

interface GridCalibrateScreenProps {
  map: RoomMap;
  onExit: () => void;
}

/**
 * Layar kalibrasi grid (B2): DM mencocokkan grid ke kotak peta memakai
 * kotak contoh (geser/tarik), input angka, dan slider; pratinjau zoom;
 * Simpan atau Kunci Grid — semua terkirim lewat `grid:set`.
 */
export default function GridCalibrateScreen({ map, onExit }: GridCalibrateScreenProps) {
  const savedGrid = useRoomStore((state) => state.grid);
  const setGrid = useRoomStore((state) => state.setGrid);
  const [draft, setDraft] = useState<GridConfig>(savedGrid ?? DEFAULT_GRID);
  const [showGrid, setShowGrid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const change = (patch: Partial<GridConfig>) => setDraft((current) => ({ ...current, ...patch }));

  async function handleSave(locked: boolean) {
    if (saving) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await setGrid({ ...draft, locked });
      if (!result.ok) throw new Error(result.error.message);
      onExit();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menyimpan grid.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 md:flex-row">
      {/* HP: kolom (header → pratinjau → kontrol); desktop: pratinjau + panel kanan */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-800 px-3 py-1">
          <button
            type="button"
            onClick={onExit}
            className="min-h-11 rounded-lg px-2 text-sm text-slate-300 active:bg-slate-800"
          >
            ← Kembali
          </button>
          <h2 className="text-sm font-semibold">Kalibrasi Grid</h2>
        </div>

        <GridPreview map={map} grid={draft} showGrid={showGrid} onChange={change} />
      </div>

      <div className="max-h-[46%] shrink-0 overflow-y-auto border-t border-slate-800 p-3 md:max-h-none md:w-80 md:border-l md:border-t-0">
        <GridControls
          draft={draft}
          showGrid={showGrid}
          saving={saving}
          onToggleShow={() => setShowGrid((value) => !value)}
          onChange={change}
          onSave={handleSave}
        />
        {errorMessage && (
          <p role="alert" className="mt-2 text-sm text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
