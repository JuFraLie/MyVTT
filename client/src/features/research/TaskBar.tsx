import { useEffect, useState } from 'react';
import { TASKS } from './tasks';
import { useTaskStore } from './taskStore';

/**
 * Bar tugas studi (G3): instruksi + timer + penanda lewati/keluar.
 * Menempel di atas layar (di luar zona jempol) agar peta tetap bisa disentuh.
 * Sukses terdeteksi otomatis oleh watcher — bar hanya menampilkan progres.
 */
export default function TaskBar() {
  const active = useTaskStore((state) => state.active);
  const index = useTaskStore((state) => state.index);
  const startPerf = useTaskStore((state) => state.startPerf);
  const finishCurrent = useTaskStore((state) => state.finishCurrent);
  const exit = useTaskStore((state) => state.exit);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Timer tampilan: ukur di dalam effect (bukan saat render — aturan purity).
  useEffect(() => {
    if (!active) return;
    const measure = () =>
      setElapsedSec(Math.max(0, Math.round((performance.now() - startPerf) / 1000)));
    measure();
    const id = window.setInterval(measure, 500);
    return () => window.clearInterval(id);
  }, [active, startPerf]);

  if (!active) return null;

  const task = TASKS[index];
  if (!task) return null;

  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-md p-2">
      <div className="pointer-events-auto rounded-xl border border-indigo-500/40 bg-slate-900/95 p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-wide text-indigo-300">
            TUGAS {index + 1}/{TASKS.length}
          </span>
          <span className="text-xs tabular-nums text-slate-400" aria-live="off">
            {minutes}:{String(seconds).padStart(2, '0')}
          </span>
          <button
            type="button"
            aria-label="Keluar mode tugas"
            onClick={exit}
            className="h-11 w-11 rounded-lg text-lg text-slate-400 active:bg-slate-800"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-100">{task.instruction}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => finishCurrent('fail')}
            className="min-h-11 flex-1 rounded-lg bg-slate-800 text-sm text-slate-200 active:bg-slate-700"
          >
            Lewati (gagal)
          </button>
          <span className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-700 px-2 text-center text-[11px] text-slate-500">
            Sukses terdeteksi otomatis
          </span>
        </div>
      </div>
    </div>
  );
}
