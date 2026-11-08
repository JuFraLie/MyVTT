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

/** URL aset tepercaya: hanya CDN Cloudinary (AGENTS.md §12). */
const cloudinaryImageUrl = z
  .url()
  .max(512)
  .regex(/^https:\/\/res\.cloudinary\.com\//);

/**
 * Payload `map:set` (B1): hasil unggah peta yang sudah dikompres di klien.
 * URL wajib Cloudinary agar state bersama hanya berisi aset CDN tepercaya.
 */
export const mapSetSchema = z.object({
  url: cloudinaryImageUrl,
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
});

export type MapSetPayload = z.infer<typeof mapSetSchema>;

/** Permintaan tanda tangan unggah Cloudinary (B1/C7, REST `/api/assets/signature`). */
export const assetSignatureRequestSchema = z.object({
  roomCode: z.string().regex(/^[A-HJ-NP-TV-Z2-9]{6}$/),
  kind: z.enum(['map', 'token']),
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
 * Payload `token:add` (C1 + A6 + C7): DM menambah token dasar (warna + inisial)
 * atau dengan gambar hasil crop lingkaran. Posisi (col,row) dihitung server
 * agar spawn tidak menumpuk; `owner` = nama panggilan pemain pemilik.
 */
export const tokenAddSchema = z.object({
  name: z.string().trim().min(1).max(24),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .refine((value) => (TOKEN_COLORS as readonly string[]).includes(value), {
      message: 'warna harus salah satu dari preset',
    }),
  owner: z.string().trim().min(1).max(24).nullish(),
  image: cloudinaryImageUrl.nullish(),
  /** Ukuran sisi token dalam kotak (C9): 1 Medium, 2 Large, 3 Huge. */
  size: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
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

/**
 * Payload `token:update` (C3 + C7 + C9): ubah HP (DM saja) dan/atau ganti
 * gambar & ukuran (DM atau pemilik token). `image: null` menghapus gambar.
 * Minimal satu field.
 */
export const tokenUpdateSchema = z
  .object({
    id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
    hp: z.number().int().min(0).max(999).optional(),
    image: cloudinaryImageUrl.nullish(),
    size: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  })
  .refine(
    (value) => value.hp !== undefined || value.image !== undefined || value.size !== undefined,
    {
      message: 'token:update harus membawa hp, image, atau size',
    },
  );

export type TokenUpdatePayload = z.infer<typeof tokenUpdateSchema>;

/** Payload `token:remove` (A6): DM menghapus token dari ruang. */
export const tokenRemoveSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
});

export type TokenRemovePayload = z.infer<typeof tokenRemoveSchema>;

/**
 * Payload `fog:set` (B4): daftar sel tertutup SELURUHNYA (replace penuh),
 * kunci "col,row". Server menormalkan (dedupe) sebelum menyiarkan.
 */
export const fogSetSchema = z.object({
  cells: z.array(z.string().regex(/^\d{1,3},\d{1,3}$/)).max(3000),
});

export type FogSetPayload = z.infer<typeof fogSetSchema>;

/**
 * Payload `asset:add` (C8): daftarkan gambar token hasil unggah ke pustaka
 * ruang agar bisa dipilih ulang/diklon tanpa unggah lagi. DM saja.
 */
export const assetAddSchema = z.object({
  name: z.string().trim().min(1).max(24),
  type: z.enum(['pemain', 'monster']),
  image: cloudinaryImageUrl,
});

export type AssetAddPayload = z.infer<typeof assetAddSchema>;

/** Payload `asset:remove` (C8): hapus entri pustaka; token yang memakainya tidak ikut hilang. */
export const assetRemoveSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
});

export type AssetRemovePayload = z.infer<typeof assetRemoveSchema>;

/**
 * Payload `dice:roll` (D1): lemparan dadu. Hasil (rolls + total) dihitung di
 * server dengan pembangkit acak server — klien tidak pernah mengirim angka hasil.
 */
export const diceRollSchema = z.object({
  dice: z.enum(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']),
  count: z.number().int().min(1).max(20),
  modifier: z.number().int().min(-99).max(99),
});

export type DiceRollPayload = z.infer<typeof diceRollSchema>;

/** Nilai kemampuan masuk akal untuk D&D (E1): 0..30. */
const abilityValue = z.number().int().min(0).max(30);

/**
 * Payload `character:set` (E1): simpan (upsert) lembar milik pengirim.
 * `owner` TIDAK diterima dari klien — server mengisi dari nickname sesi
 * agar pemain tidak bisa menimpa lembar orang lain.
 */
export const characterSetSchema = z.object({
  name: z.string().trim().min(1).max(40),
  class: z.string().trim().max(30),
  level: z.number().int().min(1).max(20),
  hp: z.number().int().min(0).max(999),
  ac: z.number().int().min(0).max(99),
  abilities: z.object({
    str: abilityValue,
    dex: abilityValue,
    con: abilityValue,
    int: abilityValue,
    wis: abilityValue,
    cha: abilityValue,
  }),
});

export type CharacterSetPayload = z.infer<typeof characterSetSchema>;
