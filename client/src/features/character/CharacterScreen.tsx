/** Layar Karakter (tab F1). Fitur E1–E2 diimplementasi pada fase berikutnya. */
export default function CharacterScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-5xl" aria-hidden="true">
        🧙
      </p>
      <p className="text-sm text-slate-300">Lembar karakter akan tampil di sini.</p>
      <p className="text-xs text-slate-500">Fase 0 — fitur karakter belum diimplementasi.</p>
    </div>
  );
}
