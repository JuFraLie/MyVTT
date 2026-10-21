import { z } from 'zod';

/**
 * Skema validasi zod per event (AGENTS.md §5 dan §6).
 * Setiap handler server memvalidasi payload memakai skema di sini sebelum
 * memutasi state, dan membalas event `error` bila tidak valid.
 */

/** Payload `room:create` (A1): DM membuat ruang, server menghasilkan kode. */
export const roomCreateSchema = z.object({});

export type RoomCreatePayload = z.infer<typeof roomCreateSchema>;
