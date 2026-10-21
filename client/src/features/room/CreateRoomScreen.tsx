import { useState } from 'react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useRoomStore } from './store';

interface CreateRoomScreenProps {
  onOpenJoin: () => void;
}

/**
 * Layar buat ruang (A1) + masuk sebagai DM (A2):
 * membuat ruang, menampilkan kode untuk dibagikan, lalu DM memasukkan
 * nama panggilan dan masuk ke ruangnya sendiri.
 */
export default function CreateRoomScreen({ onOpenJoin }: CreateRoomScreenProps) {
  const { code, status, errorMessage, createRoom, joinRoom } = useRoomStore();
  const [copied, setCopied] = useState(false);
  const [nickname, setNickname] = useState('');
  const busy = status === 'creating' || status === 'joining';

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
          <Button className="w-full text-base" disabled={busy} onClick={createRoom}>
            {status === 'creating' ? 'Membuat ruang…' : 'Buat Ruang'}
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy} onClick={onOpenJoin}>
            Gabung Ruang
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
          <label className="block space-y-1 text-left">
            <span className="text-xs text-slate-400">Nama panggilan DM</span>
            <Input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="mis. Dungeon Master"
              maxLength={24}
              autoComplete="off"
            />
          </label>
          <Button
            className="w-full text-base"
            disabled={busy || nickname.trim().length === 0}
            onClick={() => joinRoom({ code, nickname, role: 'dm' })}
          >
            {status === 'joining' ? 'Masuk…' : 'Masuk sebagai DM'}
          </Button>
          {status === 'error' && (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
