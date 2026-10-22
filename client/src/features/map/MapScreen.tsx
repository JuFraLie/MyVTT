import { useState } from 'react';
import GridCalibrateScreen from '../grid/GridCalibrateScreen';
import { useRoomStore } from '../room/store';
import MapUpload from './MapUpload';
import MapViewport from './MapViewport';

/**
 * Layar Peta (tab F1): menampilkan peta aktif + grid (B1/B2) lewat
 * MapViewport (B3 pan & pinch-zoom). DM bisa membuka kalibrasi grid;
 * layar kalibrasi ditumpuk agar viewport tidak di-unmount.
 */
export default function MapScreen() {
  const { map, grid, role } = useRoomStore();
  const [calibrating, setCalibrating] = useState(false);
  const isDm = role === 'dm';

  return (
    <div className="relative h-full">
      {map ? (
        <MapViewport map={map} grid={grid} />
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
        <button
          type="button"
          onClick={() => setCalibrating(true)}
          className="absolute bottom-3 left-3 min-h-11 rounded-xl border border-slate-700 bg-slate-900/95 px-4 text-sm font-medium text-slate-100 active:bg-slate-800"
        >
          {grid ? 'Ubah Grid' : 'Atur Grid'}
        </button>
      )}

      {calibrating && map && (
        <div className="absolute inset-0 z-40 bg-slate-950">
          <GridCalibrateScreen map={map} onExit={() => setCalibrating(false)} />
        </div>
      )}
    </div>
  );
}
