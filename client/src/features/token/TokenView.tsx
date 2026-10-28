import type { Token } from '@myvtt/shared';

interface TokenViewProps {
  token: Token;
  /** Ukuran token dalam koordinat piksel gambar (mengisi elemen induk). */
  size: number;
}

/**
 * Token dasar (C1): warna + inisial; badge HP (C3) di tepi bawah.
 * Menjadi fallback otomatis saat token belum punya gambar atau gambar
 * gagal dimuat (C7 menyusul). Posisi/pemetaan drag dipegang induk.
 */
export default function TokenView({ token, size }: TokenViewProps) {
  return (
    <div
      role="img"
      aria-label={`${token.name}, HP ${token.hp}`}
      className="flex h-full w-full items-center justify-center rounded-full font-bold text-white select-none"
      style={{
        fontSize: size * 0.42,
        backgroundColor: token.color,
        boxShadow: `0 0 0 ${Math.max(1, size * 0.05)}px rgba(15, 23, 42, 0.9)`,
      }}
    >
      {token.name.charAt(0).toUpperCase()}
      <span
        className={`absolute -bottom-[12%] left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/95 px-[0.35em] font-semibold ${
          token.hp <= 0 ? 'text-red-400' : 'text-slate-100'
        }`}
        style={{ fontSize: size * 0.28, lineHeight: 1.4 }}
      >
        {token.hp}
      </span>
    </div>
  );
}
