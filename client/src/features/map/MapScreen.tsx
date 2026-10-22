import { useState } from 'react';
import GridCalibrateScreen from '../grid/GridCalibrateScreen';
import { useRoomStore } from '../room/store';
import AddTokenSheet from '../token/AddTokenSheet';
import MapUpload from './MapUpload';
import MapViewport from './MapViewport';

/**
 * Layar Peta (tab F1): menampilkan peta + grid (B1/B2) + token (C1)
 * lewat MapViewport (B3 pan & pinch-zoom). DM bisa membuka kalibrasi
 * grid dan sheet tambah token; keduanya menumpuk agar viewport tidak unmount.
 */
export default function MapScreen() {
  const { map, grid, tokens, role } = useRoomStore();
  const [calibrating, setCalibrating] = useState(false);
  const [addingToken, setAddingToken] = useState(false);
  const isDm = role === 'dm';

  return (
    <div className="relative h-full">
      {map ? (
        <MapViewport map={map} grid={grid} tokens={tokens} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-5xl" aria-hidden="true">
            🗺️
          </p>
          <p className="text-sm text-slate-300">Belum ada peta di ruang ini.</p>
          {isDm ? (
            <MapUpload />
          ) : (
            <p className="text-xs text-slate-500">Menunggu DM mengunggah peta.</p>
          )}
        </div>
      )}

      {map && isDm && !calibrating && (
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <button
            type="button"
            onClick={() => setCalibrating(true)}
            className="min-h-11 rounded-xl border border-slate-700 bg-slate-900/95 px-4 text-sm font-medium text-slate-100 active:bg-slate-800"
          >
            {grid ? 'Ubah Grid' : 'Atur Grid'}
          </button>
          <button
            type="button"
            onClick={() => setAddingToken(true)}
            className="min-h-11 rounded-xl bg-indigo-500 px-4 text-sm font-medium text-white active:bg-indigo-400"
          >
            ＋ Token
          </button>
        </div>
      )}

      {map && <AddTokenSheet open={addingToken} onClose={() => setAddingToken(false)} />}

      {calibrating && map && (
        <div className="absolute inset-0 z-40 bg-slate-950">
          <GridCalibrateScreen map={map} onExit={() => setCalibrating(false)} />
        </div>
      )}
    </div>
  );
}
