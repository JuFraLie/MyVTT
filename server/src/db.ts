import mongoose from 'mongoose';
import { RoomModel, type PersistedRoom } from './models/RoomModel';

const MONGODB_URI = process.env.MONGODB_URI ?? '';
const CONNECT_TIMEOUT_MS = 3000;

let connecting: Promise<typeof mongoose | null> | null = null;

/**
 * Koneksi sekali, dipakai saat pertama kali ada operasi (A5).
 * Tanpa MONGODB_URI atau koneksi gagal → null: server tetap jalan in-memory
 * (dev tanpa Atlas tetap bisa) dan percobaan berikutnya diulang.
 */
export function connectDb(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) return Promise.resolve(null);
  if (!connecting) {
    connecting = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS })
      .then((instance) => {
        console.log('[db] MongoDB terhubung');
        return instance;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[db] koneksi gagal, lanjut in-memory: ${message}`);
        connecting = null; // coba lagi pada operasi berikutnya
        return null;
      });
  }
  return connecting;
}

type RoomData = Pick<PersistedRoom, 'map' | 'grid' | 'tokens' | 'fog'>;

/**
 * Simpan state ruang (write-through setelah mutasi A5).
 * Kegagalan hanya dicatat — tidak pernah menjatuhkan alur socket.
 */
export async function saveRoom(code: string, data: RoomData): Promise<void> {
  const instance = await connectDb();
  if (!instance) return;
  try {
    await RoomModel.updateOne({ code }, { $set: data }, { upsert: true });
  } catch (error) {
    console.warn(`[db] gagal simpan ruang ${code}:`, error);
  }
}

/** Ambil state ruang; null bila tidak ada di DB / DB nonaktif / gagal baca. */
export async function loadRoom(code: string): Promise<RoomData | null> {
  const instance = await connectDb();
  if (!instance) return null;
  try {
    const doc = await RoomModel.findOne({ code }).lean<RoomData>();
    if (!doc) return null;
    return {
      map: doc.map ?? null,
      grid: doc.grid ?? null,
      tokens: doc.tokens ?? [],
      fog: doc.fog ?? [],
    };
  } catch (error) {
    console.warn(`[db] gagal baca ruang ${code}:`, error);
    return null;
  }
}
