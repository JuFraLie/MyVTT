import mongoose, { Schema } from 'mongoose';
import type { AssetEntry, GridConfig, LogEntry, RoomMap, Token } from '@myvtt/shared';

/**
 * Bentuk ruang yang dipersistensikan (A5): state sesi yang harus bertahan
 * setelah server/matikan HP — anggota (socket) bersifat runtime dan TIDAK
 * disimpan; mereka terbangun ulang saat join. Karakter & log ditambahkan
 * ke dokumen ini bersama fiturnya (E1, D3).
 */
export interface PersistedRoom {
  code: string;
  map: RoomMap | null;
  grid: GridConfig | null;
  tokens: Token[];
  fog: string[];
  library: AssetEntry[];
  log: LogEntry[];
}

// Skema longgar (Mixed) karena validasi ketat sudah dilakukan zod di
// boundary socket (AGENTS.md §6); dokumen hanya menampung state tervalidasi.
const roomSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    map: { type: Schema.Types.Mixed, default: null },
    grid: { type: Schema.Types.Mixed, default: null },
    tokens: { type: [Schema.Types.Mixed], default: [] },
    fog: { type: [String], default: [] },
    library: { type: [Schema.Types.Mixed], default: [] },
    log: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

// Pola models.X agar aman saat hot-reload tsx watch (registrasi ganda).
export const RoomModel =
  (mongoose.models.Room as mongoose.Model<PersistedRoom>) ??
  mongoose.model<PersistedRoom>('Room', roomSchema);
