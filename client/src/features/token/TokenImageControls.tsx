import { useRef, useState, type ChangeEvent } from 'react';
import type { Token } from '@myvtt/shared';
import { useRoomStore } from '../room/store';
import TokenImageEditor from './TokenImageEditor';
import { uploadTokenBlob } from './uploadToken';

interface TokenImageControlsProps {
  token: Token;
}

type Phase = 'idle' | 'uploading';

/**
 * Kendali gambar di sheet token (C7): tampil hanya untuk DM atau pemilik
 * token (A6 + izin khusus C7). Pilih → crop lingkaran → unggah → `token:update`.
 */
export default function TokenImageControls({ token }: TokenImageControlsProps) {
  const role = useRoomStore((state) => state.role);
  const nickname = useRoomStore((state) => state.nickname);
  const roomCode = useRoomStore((state) => state.code);
  const setTokenImage = useRoomStore((state) => state.setTokenImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canChange = role === 'dm' || (token.owner !== null && token.owner === nickname);
  if (!canChange) return null;

  const busy = phase !== 'idle';

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (picked) setFile(picked);
  }

  async function handleConfirm(blob: Blob) {
    if (!roomCode) return;
    setFile(null);
    setPhase('uploading');
    setErrorMessage(null);
    try {
      const url = await uploadTokenBlob(blob, roomCode);
      const result = await setTokenImage(token.id, url);
      if (!result.ok) throw new Error(result.error.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mengunggah gambar.');
    } finally {
      setPhase('idle');
    }
  }

  async function handleRemove() {
    setErrorMessage(null);
    try {
      const result = await setTokenImage(token.id, null);
      if (!result.ok) throw new Error(result.error.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menghapus gambar.');
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-xs text-slate-400">Gambar Token</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-200 active:bg-slate-800 disabled:opacity-50"
        >
          {phase === 'uploading' ? 'Mengunggah…' : token.image ? 'Ganti Gambar' : 'Tambah Gambar'}
        </button>
        {token.image && (
          <button
            type="button"
            disabled={busy}
            onClick={handleRemove}
            className="min-h-11 rounded-xl px-3 text-sm text-red-400 active:bg-slate-800 disabled:opacity-50"
          >
            Hapus
          </button>
        )}
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {file && (
        <TokenImageEditor file={file} onCancel={() => setFile(null)} onConfirm={handleConfirm} />
      )}
    </div>
  );
}
