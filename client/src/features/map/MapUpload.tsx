import { useRef, useState, type ChangeEvent } from 'react';
import Button from '../../components/Button';
import { useRoomStore } from '../room/store';
import { processMapFile, uploadMapBlob } from './uploadMap';

type Phase = 'idle' | 'processing' | 'uploading';

/** Alur unggah peta (B1): pilih file → kompres di klien → unggah Cloudinary → map:set. */
export default function MapUpload() {
  const setMap = useRoomStore((state) => state.setMap);
  const roomCode = useRoomStore((state) => state.code);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = phase !== 'idle';

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // izinkan file yang sama dipilih ulang
    if (!file || !roomCode) return;
    setErrorMessage(null);
    try {
      setPhase('processing');
      const { blob, width, height } = await processMapFile(file);
      setPhase('uploading');
      const url = await uploadMapBlob(blob, roomCode);
      const result = await setMap({ url, width, height });
      if (!result.ok) throw new Error(result.error.message);
      setPhase('idle');
    } catch (error) {
      setPhase('idle');
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mengunggah peta.');
    }
  }

  return (
    <div className="w-full max-w-xs space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        className="w-full text-base"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {phase === 'processing'
          ? 'Memproses…'
          : phase === 'uploading'
            ? 'Mengunggah…'
            : 'Unggah Peta'}
      </Button>
      <p className="text-xs text-slate-500">
        JPG, PNG, atau WebP — maks 15 MB, dikompres otomatis.
      </p>
      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
