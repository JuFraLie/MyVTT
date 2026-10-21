/** Layar Dadu (tab F1). Fitur D1–D3 diimplementasi pada fase berikutnya. */
export default function DiceScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-5xl" aria-hidden="true">
        🎲
      </p>
      <p className="text-sm text-slate-300">Dice roller akan tampil di sini.</p>
      <p className="text-xs text-slate-500">Fase 0 — fitur dadu belum diimplementasi.</p>
    </div>
  );
}
