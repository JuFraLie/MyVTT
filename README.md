# MYVTT — Lightweight Mobile-First VTT

Aplikasi web Virtual Tabletop (VTT) Dungeons & Dragons yang ringan dan dioptimalkan
untuk layar sentuh HP, sekaligus instrumen penelitian HCI (target publikasi SINTA 2).

> Baca [AGENTS.md](./AGENTS.md) dan GDD (`GDD-MyVTT.docx`) sebelum menambah kode.

## Status

**Fase 0 — Scaffold monorepo.** Belum ada fitur yang diimplementasi; baru fondasi
(monorepo, app shell F1/F2, kontrak event bersama, kerangka server Socket.io).
Fitur berikutnya mengikuti roadmap di GDD bagian 9 (lanjut ke Fase 1: A1–A4, B1–B3, C1–C3).

## Struktur

```
/
├── client/          # React + Vite + TypeScript + Tailwind + react-konva (Frontend)
│   └── src/
│       ├── components/   # BottomNav, BottomSheet, Button
│       ├── features/     # room, map, grid, token, assets, fog, dice, log, character, initiative, research
│       └── lib/          # socket.ts (satu instance koneksi)
├── server/          # Node.js + Express + Socket.io + TypeScript (Backend)
│   └── src/         # index.ts, rooms/, handlers/ (satu file per grup event), models/
├── shared/          # events.ts, types.ts, schemas.ts — dipakai klien & server
├── AGENTS.md        # Instruksi AI asisten pengembang
└── GDD-MyVTT.docx   # Game Design Document v2.1
```

## Prasyarat

- Node.js >= 20 (dites dengan v24) dan npm >= 10

## Menjalankan

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001/health
- Saat dev, Socket.io klien lewat proxy Vite (`/socket.io` → `:3001`), jadi tidak
  perlu konfigurasi apa pun.

## Skrip

| Perintah            | Keterangan                                |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Menjalankan server + client bersamaan     |
| `npm run typecheck` | `tsc --noEmit` untuk client dan server    |
| `npm run lint`      | ESLint (flat config) seluruh workspace    |
| `npm run format`    | Prettier                                  |
| `npm run build`     | Typecheck lalu build bundle client (Vite) |

## Konfigurasi

Salin `.env.example` bila perlu mengubah nilai:

- `server/.env.example` — `PORT`, `CLIENT_ORIGIN` (punya default cocok untuk dev)
- `client/.env.example` — `VITE_SERVER_URL` (hanya untuk build produksi)

## Tech stack

React + Vite + TypeScript, Tailwind CSS, react-konva, @use-gesture/react, Zustand,
socket.io-client · Node.js + Express + Socket.io, zod, Mongoose + MongoDB Atlas ·
Cloudinary (aset). Rincian di GDD bagian 7 dan AGENTS.md §3.
