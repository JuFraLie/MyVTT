import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Sheet dari bawah layar (AGENTS.md §7) — menggantikan modal tengah
 * untuk edit HP, kondisi, dan aksi token.
 */
export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Tutup panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative w-full max-w-md rounded-t-2xl bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-lg text-slate-400 active:bg-slate-800"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
