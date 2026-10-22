import { z } from 'zod';
import { TOKEN_COLORS } from './types';

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

/**
 * Payload `map:set` (B1): hasil unggah peta yang sudah dikompres di klien.
 * URL wajib Cloudinary agar state bersama hanya berisi aset CDN tepercaya.
 */
export const mapSetSchema = z.object({
  url: z
    .url()
    .max(512)
    .regex(/^https:\/\/res\.cloudinary\.com\//),
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
});

export type MapSetPayload = z.infer<typeof mapSetSchema>;

/** Permintaan tanda tangan unggah Cloudinary (B1, REST `/api/assets/signature`). */
export const assetSignatureRequestSchema = z.object({
  roomCode: z.string().regex(/^[A-HJ-NP-TV-Z2-9]{6}$/),
  kind: z.enum(['map']),
});

export type AssetSignatureRequest = z.infer<typeof assetSignatureRequestSchema>;

/**
 * Payload `grid:set` (B2): parameter grid dalam koordinat piksel gambar
 * peta (bukan piksel layar) agar tidak bergeser saat zoom atau resize.
 */
export const gridSetSchema = z.object({
  cellPx: z.number().int().min(8).max(4096),
  offsetX: z.number().int().min(0).max(4096),
  offsetY: z.number().int().min(0).max(4096),
  locked: z.boolean(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  opacity: z.number().min(0).max(1),
});

export type GridSetPayload = z.infer<typeof gridSetSchema>;

/**
 * Payload `token:add` (C1): DM menambah token dasar (warna + inisial).
 * Posisi (col,row) dihitung server agar spawn tidak menumpuk.
 */
export const tokenAddSchema = z.object({
  name: z.string().trim().min(1).max(24),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .refine((value) => (TOKEN_COLORS as readonly string[]).includes(value), {
      message: 'warna harus salah satu dari preset',
    }),
});

export type TokenAddPayload = z.infer<typeof tokenAddSchema>;

/**
 * Payload `token:move` (C2): hasil snap-to-grid setelah token dilepas.
 * `id` adalah UUID yang dibuat server (C1); col/row indeks kotak hasil snap.
 */
export const tokenMoveSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  col: z.number().int().min(0).max(999),
  row: z.number().int().min(0).max(999),
});

export type TokenMovePayload = z.infer<typeof tokenMoveSchema>;
