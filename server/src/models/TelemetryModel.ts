import mongoose, { Schema } from 'mongoose';
import type { TelemetryEvent } from '@myvtt/shared';

/**
 * Koleksi telemetry riset (G2): satu dokumen per event, tanpa PII — hanya
 * UUID partisipan/sesi. Index (participantId, at) menopang ekspor CSV (G5).
 */
const telemetrySchema = new Schema(
  {
    participantId: { type: String, required: true },
    sessionId: { type: String, required: true },
    type: { type: String, required: true },
    at: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

telemetrySchema.index({ participantId: 1, at: 1 });

// Pola models.X agar aman saat hot-reload tsx watch (registrasi ganda).
export const TelemetryModel =
  (mongoose.models.Telemetry as mongoose.Model<TelemetryEvent>) ??
  mongoose.model<TelemetryEvent>('Telemetry', telemetrySchema);
