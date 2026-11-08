import { useState } from 'react';
import type { Token } from '@myvtt/shared';
import GridCalibrateScreen from '../grid/GridCalibrateScreen';
import { useRoomStore } from '../room/store';
import AddTokenSheet from '../token/AddTokenSheet';
import TokenHPSheet from '../token/TokenHPSheet';
import MapUpload from './MapUpload';
import MapViewport from './MapViewport';

/**
 * Layar Peta (tab F1): peta + grid (B1/B2) + token (C1) + sheet HP (C3),
 * dengan pan & pinch-zoom (B3). Sheet dirender di sini — bukan di dalam
 * viewport — karena position: fixed rusak di dalam elemen ber-transform.
 */
export default function MapScreen() {
  const { map, grid, tokens, fog, role, setFog, rulers, updateRuler, clearRuler } = useRoomStore();
  const [calibrating, setCalibrating] = useState(false);
  const [addingToken, setAddingToken] = useState(false);
  const [fogMode, setFogMode] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const isDm = role === 'dm';
  const selectedToken: Token | null = tokens.find((token) => token.id === selectedTokenId) ?? null;

  return (
    <div className="relative h-full">
      {map ? (
        <MapViewport
          map={map}
          grid={grid}
          tokens={tokens}
          onTapToken={(token) => setSelectedTokenId(token.id)}
          fog={fog}
          fogMode={fogMode}
          onFogChange={(cells) => void setFog(cells)}
          rulers={rulers}
          onRulerMove={updateRuler}
          onRulerEnd={clearRuler}
        />
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCalibrating(true)}
              className="min-h-11 rounded-xl border border-slate-700 bg-slate-900/95 px-4 text-sm font-medium text-slate-100 active:bg-slate-800"
            >
              {grid ? 'Ubah Grid' : 'Atur Grid'}
            </button>
            <button
              type="button"
              aria-pressed={fogMode}
              onClick={() => setFogMode((value) => !value)}
              className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${
                fogMode
                  ? 'border-indigo-400 bg-indigo-500 text-white'
                  : 'border-slate-700 bg-slate-900/95 text-slate-100 active:bg-slate-800'
              }`}
            >
              Fog
            </button>
          </div>
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

      {selectedToken && (
        <TokenHPSheet
          key={selectedToken.id}
          token={selectedToken}
          onClose={() => setSelectedTokenId(null)}
        />
      )}

      {calibrating && map && (
        <div className="absolute inset-0 z-40 bg-slate-950">
          <GridCalibrateScreen map={map} onExit={() => setCalibrating(false)} />
        </div>
      )}
    </div>
  );
}
