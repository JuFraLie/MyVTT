import { CONDITION_PRESETS, type ConditionId, type Token } from '@myvtt/shared';
import { useRoomStore } from '../room/store';

interface ConditionChipsProps {
  token: Token;
}

/**
 * Pilihan kondisi token (C4): enam chip preset (ketuk = pasang/lepas),
 * ukuran sentuh minimal 44 px. Izin mengikuti `canManageToken` (DM/pemilik);
 * kegagalan server mengembalikan chip ke kondisi semula lewat rollback store.
 */
export default function ConditionChips({ token }: ConditionChipsProps) {
  const role = useRoomStore((state) => state.role);
  const nickname = useRoomStore((state) => state.nickname);
  const setTokenConditions = useRoomStore((state) => state.setTokenConditions);
  const active = token.conditions ?? [];
  const canManage = role === 'dm' || (token.owner !== null && token.owner === nickname);

  function toggle(id: ConditionId) {
    const next = active.includes(id) ? active.filter((item) => item !== id) : [...active, id];
    void setTokenConditions(token.id, next);
  }

  return (
    <section aria-label="Kondisi token">
      <p className="text-xs text-slate-500">Kondisi — ketuk untuk memasang/menanggalkan</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONDITION_PRESETS.map((preset) => {
          const on = active.includes(preset.id);
          const base = 'min-h-11 rounded-xl border px-3 text-sm disabled:opacity-50';
          const tone = on
            ? 'border-amber-400 bg-amber-500/20 text-amber-100'
            : 'border-slate-700 bg-slate-900 text-slate-300 active:bg-slate-800';
          return (
            <button
              key={preset.id}
              type="button"
              disabled={!canManage}
              aria-pressed={on}
              onClick={() => toggle(preset.id)}
              className={`${base} ${tone}`}
            >
              <span aria-hidden="true">{preset.icon}</span> {preset.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
