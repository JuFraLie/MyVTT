import { useState } from 'react';
import Button from '../../components/Button';
import { useRoomStore } from './store';

/**
 * Layar awal (A1): DM membuat ruang lalu mendapat kode 6 karakter
 * untuk dibagikan ke pemain (gabung ruang = fitur A2).
 */
export default function CreateRoomScreen() {
  const { code, status, errorMessage, createRoom } = useRoomStore();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">MyVTT</h1>
        <p className="text-sm text-slate-400">
          VTT mobile-first untuk sesi D&amp;D — buat ruang, lalu bagikan kode ke pemain.
        </p>
      </div>

      {code === null ? (
        <div className="w-full max-w-xs space-y-3">
          <Button
            className="w-full text-base"
            disabled={status === 'creating'}
            onClick={createRoom}
          >
            {status === 'creating' ? 'Membuat ruang…' : 'Buat Ruang'}
          </Button>
          {status === 'error' && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-3">
          <p className="text-xs text-slate-400">Kode ruang (bagikan ke pemain)</p>
          <p className="rounded-xl border border-slate-700 bg-slate-900 py-4 font-mono text-3xl font-bold tracking-[0.3em] text-indigo-300">
            {code}
          </p>
          <Button variant="ghost" className="w-full" onClick={handleCopy}>
            {copied ? 'Tersalin ✓' : 'Salin kode'}
          </Button>
          <p className="text-xs text-slate-500">
            Pemain masuk dengan kode ini lewat layar Gabung Ruang (fitur A2, menyusul).
          </p>
        </div>
      )}
    </div>
  );
}
