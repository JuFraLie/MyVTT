import { z } from 'zod';

/**
 * Skema validasi zod per event (AGENTS.md §5 dan §6).
 * Setiap handler server memvalidasi payload memakai skema di sini sebelum
 * memutasi state, dan membalas event `error` bila tidak valid.
 */

/** Payload `room:create` (A1): DM membuat ruang, server menghasilkan kode. */
export const roomCreateSchema = z.object({});

export type RoomCreatePayload = z.infer<typeof roomCreateSchema>;

/** Payload `room:join` (A2): masuk ruang dengan kode + nama panggilan + peran. */
export const roomJoinSchema = z.object({
  // Kode harus enam karakter alfabet/angka (huruf mirip 0/O/1/I tidak dipakai).
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NP-TV-Z2-9]{6}$/),
  nickname: z.string().trim().min(1).max(24),
  role: z.enum(['dm', 'player']),
});

export type RoomJoinPayload = z.infer<typeof roomJoinSchema>;
