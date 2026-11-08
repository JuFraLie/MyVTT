import { create } from 'zustand';
import type { GridCell } from '@myvtt/shared';
import { resolveGrid } from '../../lib/grid';
import { getMisTapCount, logTelemetry } from '../../lib/telemetry';
import { useRoomStore } from '../room/store';
import { TASKS } from './tasks';

/** Penanda mode tugas selesai (atau keluar) — supaya tidak dimulai ulang. */
const FINISHED_KEY = 'myvtt.tasks.finished.v1';

export function tasksFinished(): boolean {
  try {
    return localStorage.getItem(FINISHED_KEY) === '1';
  } catch {
    return true; // localStorage rusak → jangan paksa peserta masuk mode tugas
  }
}

function markFinished(): void {
  try {
    localStorage.setItem(FINISHED_KEY, '1');
  } catch {
    // abaikan
  }
}

type RoomState = ReturnType<typeof useRoomStore.getState>;

interface TaskModeState {
  active: boolean;
  /** Index tugas aktif (0..6). */
  index: number;
  /** performance.now() saat tugas aktif — sumber durasi (AGENTS §8). */
  startPerf: number;
  /** Panjang log saat tugas aktif — deteksi entri baru tanpa jam server. */
  logLenAtStart: number;
  misTapsAtStart: number;
  /** Sel target tugas ke-4 (move_target); null di luar tugas itu. */
  target: GridCell | null;
  begin: () => void;
  /** Catat hasil tugas (sukses otomatis / gagal via Lewati) lalu lanjut. */
  finishCurrent: (status: 'success' | 'fail') => void;
  /** Keluar mode tugas lebih awal dan tandai selesai. */
  exit: () => void;
}

/** Kotak target tugas pindah-token: pojok kiri-atas +2 kotak (dibatasi peta). */
function computeTarget(): GridCell | null {
  const { map, grid } = useRoomStore.getState();
  if (!map) return null;
  const resolved = resolveGrid(grid);
  const maxCol = Math.floor((map.width - resolved.offsetX) / resolved.cellPx) - 1;
  const maxRow = Math.floor((map.height - resolved.offsetY) / resolved.cellPx) - 1;
  if (maxCol < 0 || maxRow < 0) return null;
  return { col: Math.min(2, maxCol), row: Math.min(2, maxRow) };
}

/** Deteksi sukses per tugas dari perubahan state ruang (server-authoritative). */
function isSuccess(index: number, state: RoomState, task: TaskModeState): boolean {
  switch (index) {
    case 0:
      return state.code !== null && state.nickname !== null;
    case 1:
      return state.map !== null && state.grid !== null;
    case 2:
      return state.tokens.some((token) => token.image !== null);
    case 3:
      return (
        task.target !== null &&
        state.tokens.some(
          (token) => token.col === task.target?.col && token.row === task.target?.row,
        )
      );
    case 4:
      return state.log.slice(task.logLenAtStart).some((entry) => entry.type === 'hp');
    case 5:
      return state.log
        .slice(task.logLenAtStart)
        .some((entry) => entry.type === 'dice' && /^1d20[+-]/.test(entry.text));
    case 6:
      return Object.keys(state.rulers).length > 0;
    default:
      return false;
  }
}

/**
 * Mode tugas studi (G3): watcher berlangganan store ruang; saat tugas aktif
 * dan kondisi sukses terpenuhi, hasil + durasi + jumlah ketukan salah dikirim
 * sebagai telemetry `task_start`/`task_end` (tipe sudah ada di G2).
 */
export const useTaskStore = create<TaskModeState>((set, get) => ({
  active: false,
  index: 0,
  startPerf: 0,
  logLenAtStart: 0,
  misTapsAtStart: 0,
  target: null,

  begin: () => {
    const first = TASKS[0];
    if (get().active || tasksFinished() || !first) return;
    set({
      active: true,
      index: 0,
      startPerf: performance.now(),
      logLenAtStart: useRoomStore.getState().log.length,
      misTapsAtStart: getMisTapCount(),
      target: null,
    });
    logTelemetry('task_start', { taskId: first.id, index: 0 });
  },

  finishCurrent: (status) => {
    const { active, index, startPerf, misTapsAtStart } = get();
    const task = TASKS[index];
    if (!active || !task) return;
    logTelemetry('task_end', {
      taskId: task.id,
      index,
      status,
      durationMs: Math.round(performance.now() - startPerf),
      misTaps: getMisTapCount() - misTapsAtStart,
    });

    const next = index + 1;
    const nextTask = TASKS[next];
    if (!nextTask) {
      markFinished();
      set({ active: false, target: null });
      return;
    }
    set({
      index: next,
      startPerf: performance.now(),
      logLenAtStart: useRoomStore.getState().log.length,
      misTapsAtStart: getMisTapCount(),
      target: next === 3 ? computeTarget() : null,
    });
    logTelemetry('task_start', { taskId: nextTask.id, index: next });
  },

  exit: () => {
    const { active, index, startPerf, misTapsAtStart } = get();
    const task = TASKS[index];
    if (active && task) {
      logTelemetry('task_end', {
        taskId: task.id,
        index,
        status: 'exit',
        durationMs: Math.round(performance.now() - startPerf),
        misTaps: getMisTapCount() - misTapsAtStart,
      });
    }
    markFinished();
    set({ active: false, target: null });
  },
}));

let watching = false;

/** Pasang watcher sukses tugas — panggil sekali dari App. */
export function initTaskWatcher(): void {
  if (watching) return;
  watching = true;
  useRoomStore.subscribe((state) => {
    const task = useTaskStore.getState();
    if (!task.active) return;
    if (isSuccess(task.index, state, task)) task.finishCurrent('success');
  });
}
