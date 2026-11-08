import { useState } from 'react';
import type { Token } from '@myvtt/shared';

interface TokenViewProps {
  token: Token;
  /** Lebar kotak token dalam koordinat piksel gambar (mengisi elemen induk). */
  size: number;
  /** Lebar satu sel — membatasi skala inisial/badge agar tidak membesar penuh pada token 2×2/3×3 (C9). */
  cellPx: number;
}

/**
 * Token (C1 + C7): warna + inisial, ditimpa gambar bulat bila ada.
 * Bila URL gambar gagal dimuat, lapisan gambar dibuang dan warna + inisial
 * tetap tampil (fallback sesuai AGENTS.md §12). Badge HP (C3) di tepi bawah.
 */
export default function TokenView({ token, size, cellPx }: TokenViewProps) {
  // Simpan URL yang gagal agar perubahan gambar memberi percobaan baru
  // tanpa useEffect (pola "adjust during render").
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = token.image;
  // Elemen dalam (inisial/badge) berhenti membesar setelah ~1,5 sel (C9).
  const inner = Math.min(size, cellPx * 1.5);

  return (
    <div
      role="img"
      aria-label={`${token.name}, HP ${token.hp}`}
      className="flex h-full w-full items-center justify-center rounded-full font-bold text-white select-none"
      style={{
        fontSize: inner * 0.42,
        backgroundColor: token.color,
        boxShadow: `0 0 0 ${Math.max(1, cellPx * 0.05)}px rgba(15, 23, 42, 0.9)`,
      }}
    >
      {token.name.charAt(0).toUpperCase()}
      {imageUrl && failedUrl !== imageUrl && (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          onError={() => setFailedUrl(imageUrl)}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      )}
      <span
        className={`absolute -bottom-[12%] left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/95 px-[0.35em] font-semibold ${
          token.hp <= 0 ? 'text-red-400' : 'text-slate-100'
        }`}
        style={{ fontSize: inner * 0.28, lineHeight: 1.4 }}
      >
        {token.hp}
      </span>
    </div>
  );
}
