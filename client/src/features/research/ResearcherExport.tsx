import { useState } from 'react';

type Format = 'telemetry' | 'questionnaire';

interface ExportError {
  message?: string;
}

/**
 * Halaman peneliti (G5): dibuka lewat URL `#/peneliti`, dilindungi passcode
 * yang divalidasi server (env RESEARCH_PASSCODE). Mengunduh telemetry mentah
 * dan skor kuesioner sebagai CSV.
 */
export default function ResearcherExport() {
  const [passcode, setPasscode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function download(format: Format) {
    if (!passcode || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/research/export?format=${format}`, {
        headers: { 'X-Research-Passcode': passcode },
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as ExportError | null;
        if (response.status === 401) setStatus('Passcode salah.');
        else if (response.status === 503)
          setStatus(error?.message ?? 'Server belum dikonfigurasi (RESEARCH_PASSCODE).');
        else setStatus('Gagal mengunduh data.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${format}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(`${format}.csv berhasil diunduh.`);
    } catch {
      setStatus('Server tidak terjangkau.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div>
          <p className="text-xs font-semibold tracking-wide text-indigo-300">MODE PENELITI</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-100">Ekspor Data CSV</h1>
          <p className="mt-1 text-sm text-slate-400">
            Masukkan passcode peneliti, lalu unduh telemetry mentah atau skor kuesioner.
          </p>
        </div>

        <label className="block">
          <span className="text-xs text-slate-400">Passcode</span>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            autoComplete="off"
            className="mt-1 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 outline-none focus:border-indigo-400"
          />
        </label>

        <div className="space-y-2">
          <button
            type="button"
            disabled={!passcode || busy}
            onClick={() => void download('telemetry')}
            className="min-h-12 w-full rounded-2xl bg-indigo-500 text-sm font-semibold text-white active:bg-indigo-400 disabled:opacity-50"
          >
            Unduh telemetry.csv
          </button>
          <button
            type="button"
            disabled={!passcode || busy}
            onClick={() => void download('questionnaire')}
            className="min-h-12 w-full rounded-2xl border border-indigo-400/60 text-sm font-semibold text-indigo-200 active:bg-indigo-500/20 disabled:opacity-50"
          >
            Unduh questionnaire.csv
          </button>
        </div>

        {status && <p className="text-sm text-slate-300">{status}</p>}

        <button
          type="button"
          onClick={() => {
            window.location.hash = '';
          }}
          className="min-h-11 w-full text-sm text-slate-500 active:text-slate-300"
        >
          ← Kembali ke aplikasi
        </button>
      </div>
    </div>
  );
}
