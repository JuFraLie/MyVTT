import { useState } from 'react';
import { TOKEN_COLORS } from '@myvtt/shared';
import BottomSheet from '../../components/BottomSheet';
import { useRoomStore } from '../room/store';
import LibraryStrip from './LibraryStrip';
import SizeChoiceRow from './SizeChoiceRow';
import TokenImagePicker from './TokenImagePicker';
import { uploadTokenBlob } from './uploadToken';

interface AddTokenSheetProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none';

/**
 * Bottom sheet tambah token (C1 + A6 + C7 + C8): strip pustaka untuk klon
 * tanpa unggah ulang, nama, warna, pemilih "Milik", dan gambar crop lingkaran.
 * Hanya dibuka DM; posisi spawn dihitung server (tidak dikirim klien).
 */
export default function AddTokenSheet({ open, onClose }: AddTokenSheetProps) {
  const addToken = useRoomStore((state) => state.addToken);
  const addAsset = useRoomStore((state) => state.addAsset);
  const members = useRoomStore((state) => state.members);
  const roomCode = useRoomStore((state) => state.code);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TOKEN_COLORS[4]);
  const [owner, setOwner] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [libraryImage, setLibraryImage] = useState<string | null>(null);
  const [size, setSize] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initial = name.trim().charAt(0).toUpperCase();
  const players = members.filter((member) => member.role === 'player');

  /** Pilihan dari pustaka (C8) mengisi form; unggah baru saling menggantikan. */
  function handleLibraryUse(image: string | null, pickedName: string | null) {
    setLibraryImage(image);
    if (pickedName !== null) setName(pickedName);
    if (image !== null) setImageBlob(null);
  }

  async function handleAdd() {
    if (saving || name.trim().length === 0) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      let image: string | null = null;
      if (imageBlob) {
        // Unggah dulu (C7), lalu daftarkan ke pustaka (C8) — gagal = batal menambah
        // agar tidak ada unggahan yang tidak terlacak saat pustaka penuh.
        if (!roomCode) throw new Error('Kode ruang tidak ditemukan.');
        image = await uploadTokenBlob(imageBlob, roomCode);
        const saved = await addAsset(name.trim(), owner ? 'pemain' : 'monster', image);
        if (!saved.ok) throw new Error(saved.error.message);
      } else {
        image = libraryImage;
      }
      const result = await addToken(name.trim(), color, owner, image, size);
      if (!result.ok) throw new Error(result.error.message);
      setName('');
      setOwner(null);
      setImageBlob(null);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menambah token.');
    } finally {
      setSaving(false);
    }
  }

  function ownerButton(label: string, value: string | null) {
    const selected = owner === value;
    return (
      <button
        key={label}
        type="button"
        aria-pressed={selected}
        onClick={() => setOwner(value)}
        className={`min-h-11 rounded-xl border px-3 text-sm ${
          selected
            ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
            : 'border-slate-700 bg-slate-950 text-slate-300'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <BottomSheet open={open} title="Tambah Token" onClose={onClose}>
      <div className="space-y-4">
        <LibraryStrip onUse={handleLibraryUse} />

        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: color, boxShadow: '0 0 0 3px rgba(15,23,42,0.9)' }}
          >
            {initial || '?'}
          </span>
          <label className="block flex-1 space-y-1">
            <span className="text-xs text-slate-400">Nama (inisial tampil di token)</span>
            <input
              value={name}
              maxLength={24}
              placeholder="mis. Goblin"
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div>
          <span className="text-xs text-slate-400">Warna</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOKEN_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={`Warna ${preset}`}
                aria-pressed={preset === color}
                onClick={() => setColor(preset)}
                className={`h-11 w-11 rounded-full ${
                  preset === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400">Milik (opsional)</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {ownerButton('DM / Monster', null)}
            {players.map((player) => ownerButton(player.nickname, player.nickname))}
          </div>
          {players.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">Belum ada pemain di ruang ini.</p>
          )}
        </div>

        <TokenImagePicker
          value={imageBlob}
          onChange={(blob) => {
            setImageBlob(blob);
            if (blob !== null) setLibraryImage(null); // unggah baru menggantikan pilihan pustaka
          }}
        />

        <SizeChoiceRow value={size} onChange={setSize} label="Ukuran token" />

        <button
          type="button"
          disabled={saving || name.trim().length === 0}
          onClick={handleAdd}
          className="min-h-11 w-full rounded-xl bg-indigo-500 text-sm font-medium text-white active:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? 'Menambah…' : 'Tambah ke Peta'}
        </button>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
