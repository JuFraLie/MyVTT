import { useRoomStore } from '../room/store';
import MapUpload from './MapUpload';

/** Layar Peta (tab F1): menampilkan peta aktif ruang (B1); DM bisa menggantinya. */
export default function MapScreen() {
  const { map, role } = useRoomStore();

  if (map) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <img src={map.url} alt="Peta ruang" className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl" aria-hidden="true">
        🗺️
      </p>
      <p className="text-sm text-slate-300">Belum ada peta di ruang ini.</p>
      {role === 'dm' ? (
        <MapUpload />
      ) : (
        <p className="text-xs text-slate-500">Menunggu DM mengunggah peta.</p>
      )}
    </div>
  );
}
