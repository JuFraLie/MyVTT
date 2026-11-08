import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import TokenImageEditor from './TokenImageEditor';

interface TokenImagePickerProps {
  /** Blob hasil crop; null = token tanpa gambar (fallback inisial). */
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
}

/**
 * Pemilih gambar token untuk sheet tambah (C7): pilih file → crop lingkaran →
 * pratinjau bulat. Unggah & pengiriman `token:add` dilakukan oleh induk.
 */
export default function TokenImagePicker({ value, onChange }: TokenImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object URL dibersihkan saat berganti maupun saat komponen dilepas.
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (picked) setFile(picked);
  }

  function handleConfirm(blob: Blob) {
    setFile(null);
    setPreviewUrl(URL.createObjectURL(blob));
    onChange(blob);
  }

  return (
    <div className="space-y-2">
      <span className="text-xs text-slate-400">Gambar (opsional)</span>
      <div className="flex items-center gap-3">
        {value && previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Pratinjau token terpilih"
              className="h-14 w-14 rounded-full border border-slate-700 object-cover"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 active:bg-slate-800"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewUrl(null);
                onChange(null);
              }}
              className="min-h-11 rounded-xl px-3 text-sm text-red-400 active:bg-slate-800"
            >
              Hapus
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 active:bg-slate-800"
          >
            Pilih Gambar
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">JPG, PNG, atau WebP — maks 3 MB, dipotong lingkaran.</p>

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
