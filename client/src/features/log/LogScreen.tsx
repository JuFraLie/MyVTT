import type { LogEntryType } from '@myvtt/shared';
import { useRoomStore } from '../room/store';

const TYPE_META: Record<LogEntryType, { label: string; className: string }> = {
  dice: { label: 'Dadu', className: 'bg-indigo-500/20 text-indigo-300' },
  hp: { label: 'HP', className: 'bg-red-500/20 text-red-300' },
  turn: { label: 'Giliran', className: 'bg-emerald-500/20 text-emerald-300' },
};

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Tab Log (D3): riwayat aksi bersama berurutan — dadu (D1), perubahan HP (C3),
 * giliran (C5 nanti). Terbaru di atas; membuka tab menutup kembali peta tanpa
 * menutupi peta (F1).
 */
export default function LogScreen() {
  const log = useRoomStore((state) => state.log);
  const ordered = [...log].reverse();

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col gap-2 overflow-y-auto p-4">
      <h1 className="text-sm font-semibold text-slate-300">Log Aksi Bersama</h1>

      {ordered.length === 0 && (
        <p className="text-sm text-slate-500">Belum ada aksi tercatat di ruang ini.</p>
      )}

      <ul className="space-y-2">
        {ordered.map((entry) => {
          const meta = TYPE_META[entry.type];
          return (
            <li
              key={entry.id}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}
                >
                  {meta.label}
                </span>
                <span className="text-[10px] tabular-nums text-slate-500">
                  {formatTime(entry.at)}
                </span>
              </div>
              <p className="mt-1 text-sm break-words text-slate-100">{entry.text}</p>
              <p className="text-xs text-slate-500">oleh {entry.actor}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
