import { useEffect, useRef, useState, type PointerEvent } from 'react';

interface TokenImageEditorProps {
  file: File;
  onCancel: () => void;
  /** Blob hasil crop 256x256 WebP lingkaran — diproses lanjut oleh pemanggil. */
  onConfirm: (blob: Blob) => void;
}

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Diameter pratinjau lingkaran di layar (px). */
const PREVIEW_PX = 260;
const OUTPUT_PX = 256;
const MAX_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Alat crop lingkaran token (C7, AGENTS §12): geser satu jari untuk
 * memosisikan, slider untuk zoom, hasil akhir 256x256 WebP dengan area
 * di luar lingkaran transparan (alpha PNG tetap terjaga — canvas kosong).
 */
export default function TokenImageEditor({ file, onCancel, onConfirm }: TokenImageEditorProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  // Validasi file + reset state saat file berpindah (pola "adjust during render"
  // agar tidak ada setState sinkron di dalam effect — AGENTS §5).
  const [loadedFor, setLoadedFor] = useState<File | null>(null);
  if (loadedFor !== file) {
    setLoadedFor(file);
    setSrc(null);
    setImage(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(
      !ACCEPTED_TYPES.includes(file.type)
        ? 'Format gambar harus JPG, PNG, atau WebP.'
        : file.size > MAX_BYTES
          ? 'Ukuran gambar melebihi 3 MB.'
          : null,
    );
  }

  const fileInvalid = !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_BYTES;

  // Muat gambar valid (AGENTS §12: maks 4096 px); hasil hanya dari callback async.
  useEffect(() => {
    if (fileInvalid) return;
    let cancelled = false;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth > MAX_DIMENSION || img.naturalHeight > MAX_DIMENSION) {
        setError('Ukuran piksel melebihi 4096 px.');
        return;
      }
      setSrc(objectUrl);
      setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setError('Gambar tidak dapat dibaca.');
    };
    img.src = objectUrl;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, fileInvalid]);

  // Lingkaran selalu tertutup penuh oleh gambar: clamp offset ke tepi gambar.
  function limitsFor(targetZoom: number) {
    if (!image) return { maxX: 0, maxY: 0 };
    const cover = PREVIEW_PX / Math.min(image.naturalWidth, image.naturalHeight);
    const width = image.naturalWidth * cover * targetZoom;
    const height = image.naturalHeight * cover * targetZoom;
    return {
      maxX: Math.max(0, (width - PREVIEW_PX) / 2),
      maxY: Math.max(0, (height - PREVIEW_PX) / 2),
    };
  }

  function clampOffset(x: number, y: number, targetZoom: number) {
    const limits = limitsFor(targetZoom);
    return { x: clamp(x, -limits.maxX, limits.maxX), y: clamp(y, -limits.maxY, limits.maxY) };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    setOffset(
      clampOffset(drag.ox + event.clientX - drag.x, drag.oy + event.clientY - drag.y, zoom),
    );
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  }

  function handleZoom(value: number) {
    setZoom(value);
    setOffset((current) => clampOffset(current.x, current.y, value));
  }

  async function handleConfirm() {
    if (!image || busy) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_PX;
      canvas.height = OUTPUT_PX;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Browser tidak mendukung kanvas.');
      // Clip lingkaran: di luar lingkaran dibiarkan transparan (alpha PNG aman).
      context.translate(OUTPUT_PX / 2, OUTPUT_PX / 2);
      context.beginPath();
      context.arc(0, 0, OUTPUT_PX / 2, 0, Math.PI * 2);
      context.clip();
      // Skala pratinjau → keluaran (256/260); posisi relatif pusat lingkaran.
      const k = OUTPUT_PX / PREVIEW_PX;
      const width = displayWidth * k;
      const height = displayHeight * k;
      context.drawImage(image, offset.x * k - width / 2, offset.y * k - height / 2, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.9),
      );
      if (!blob) throw new Error('Hasil crop gagal dibuat.');
      onConfirm(blob);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Hasil crop gagal dibuat.');
      setBusy(false);
    }
  }

  const cover = image ? PREVIEW_PX / Math.min(image.naturalWidth, image.naturalHeight) : 1;
  const displayWidth = image ? image.naturalWidth * cover * zoom : 0;
  const displayHeight = image ? image.naturalHeight * cover * zoom : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-base font-semibold text-slate-100">Crop Gambar Token</h2>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 min-w-11 rounded-lg text-slate-400 active:bg-slate-800"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div
          className="relative touch-none overflow-hidden rounded-full bg-slate-800 select-none"
          style={{ width: PREVIEW_PX, height: PREVIEW_PX }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {src && image && (
            <img
              src={src}
              alt="Pratinjau crop token"
              draggable={false}
              className="absolute max-w-none"
              style={{
                width: displayWidth,
                height: displayHeight,
                left: PREVIEW_PX / 2 + offset.x - displayWidth / 2,
                top: PREVIEW_PX / 2 + offset.y - displayHeight / 2,
              }}
            />
          )}
        </div>
      </div>

      <div className="space-y-1 px-4 pb-2">
        <p className="text-center text-xs text-slate-500">
          Geser lingkaran untuk memposisikan · slider untuk zoom
        </p>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          Zoom
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            disabled={!image}
            onChange={(event) => handleZoom(Number(event.target.value))}
            className="h-11 flex-1 accent-indigo-500"
          />
        </label>
        {error && (
          <p role="alert" className="text-center text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-900 text-sm font-medium text-slate-100 active:bg-slate-800"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={!image || busy}
          onClick={handleConfirm}
          className="min-h-11 flex-1 rounded-xl bg-indigo-500 text-sm font-medium text-white active:bg-indigo-400 disabled:opacity-50"
        >
          {busy ? 'Memproses…' : 'Gunakan'}
        </button>
      </div>
    </div>
  );
}
