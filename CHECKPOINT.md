# CHECKPOINT — Lightweight Mobile-First VTT (lanjutkan nanti)

> File ini catatan kerja sementara untuk melanjutkan sesi berikutnya.
> Boleh dihapus atau dimasukkan ke .gitignore sebelum publikasi.
> Terakhir diperbarui: 10 Nov 2026.

## Status umum

- Branch `main`, selalu ter-push ke https://github.com/JuFraLie/MyVTT.git (Conventional Commits, satu commit per fitur, TANPA ditanya).
- Working tree saat ini: **perubahan D2 BELUM di-commit** (lihat "D2 in progress" di bawah).
- Pola verifikasi per fitur:
  `npm.cmd run format | Out-Null; if ($LASTEXITCODE -ne 0) { exit 1 }; npm.cmd run typecheck; if ($LASTEXITCODE -ne 0) { exit 1 }; npm.cmd run lint; if ($LASTEXITCODE -ne 0) { exit 1 }; npm.cmd run build; exit $LASTEXITCODE`
  lalu uji runtime socket (jika perilaku server berubah), cleanup file uji, commit + push tanpa bertanya.

## Fitur SELESAI (semua sudah di-push)

- Fase 0 scaffold; A1–A6; B1–B4; C1–C3; F1; D1; D3; E1; E2 (Fase 2 lengkap).
- G1 consent (`ea128ce`), G2 telemetry (`c5f1b05`), B5 ruler (`0ff594f`),
  G3 tasks (`1ae2dfb`), G4 kuesioner (`0022139`), G5 ekspor CSV (`424ec46`) — modul riset G1–G5 Lengkap.
- C4 ikon kondisi: kode di commit `266e78d` (pesan "rest abis token", dibuat di sesi lain) + cleanup uji `68a474e`.
  Uji runtime C4: 10/10 lulus.
- C5 pelacak inisiatif: `08a4e7b` — uji runtime 13/13 lulus.
- C6 undo langkah terakhir: `bdbec2d` — uji runtime 10/10 lulus.
- F2 mode gelap: dianggap selesai (aplikasi dark-only).

## D2 — Advantage/Disadvantage (K2): KODE SELESAI, UJI BELUM JALAN

Status: format/typecheck/lint/build GREEN (204 modul). File uji `_d2test.ts` sudah
ditulis tapi BELUM dijalankan. Server TIDAK sedang berjalan (sudah dimatikan).

File yang berubah (belum di-commit):

- `shared/src/types.ts` — `DiceRollMode` ('normal'|'advantage'|'disadvantage') + `mode?` di `DiceRolledPayload`.
- `shared/src/schemas.ts` — `diceRollSchema` + `mode` enum + refine: adv/dis hanya untuk `dice==='d20' && count===1`.
- `server/src/handlers/dice.ts` — adv/dis melempar 2d20, total = max/min + modifier;
  `count` di payload jadi 2; label log `2d20 adv` / `2d20 dis`.
- `client/src/features/room/store.ts` — `rollDice(dice, count, modifier, mode?)`.
- `client/src/components/StepperRow.tsx` — prop opsional `disabled` (+ disabled:opacity-40).
- `client/src/features/dice/DiceScreen.tsx` — tombol mode Normal/Advantage/Disadvantage
  (hanya saat d20), stepper jumlah dibekukan saat adv/dis, chip hasil ditandai cincin
  hijau (nilai dipakai) / redup (dibuang), notasi tombol `2d20 adv+5`.

### Langkah lanjut D2 (urut)

1. Start server:
   `Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','-w','server' -RedirectStandardOutput server-test.log -RedirectStandardError server-test.err -WindowStyle Hidden; Start-Sleep 7`
2. Jalankan `npx.cmd tsx _d2test.ts`. Ekspektasi 8 baris ✓ + `SEMUA LULUS`:
   normal 1d20+5 (mode undefined), advantage (2 rolls, total=max+3), disadvantage (total=min-2),
   log memuat "2d20 adv", adv+d6 INVALID_PAYLOAD, adv+count2 INVALID_PAYLOAD, regresi 2d6+1.
3. Cleanup: `Remove-Item _d2test.ts, server-test.log, server-test.err -ErrorAction SilentlyContinue`
   + matikan node tsx (kecuali opencode) — pola:
   `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'tsx|MyVTT' -and $_.CommandLine -notmatch 'opencode' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
4. Build ulang (sudah hijau, boleh skip bila tak ada perubahan kode), lalu commit + push TANPA bertanya:
   `feat(dice): add D2 advantage and disadvantage d20 rolls`

## Sisa roadmap setelah D2 (urut sesuai daftar fitur)

- **F3** Haptic feedback (K1): `navigator.vibrate` saat snap token, lemparan dadu, giliran mulai.
- **F4** PWA (K2): manifest + service worker + ikon (Vite plugin atau file statis; hati-hati scope).
- **F5** Mode satu tangan/kidal (K1, riset): toggle geser tombol aksi kiri/kanan.
- **F6** Onboarding 3 langkah (K1): tutorial saat pertama buka.
- (F2 dianggap selesai — aplikasi dark-only.)

## Aturan yang tetap berlaku

- Jawab bahasa Indonesia; kode/nama variabel Inggris; satu fitur per permintaan; minimal diff.
- Setiap fitur: sebutkan ID + file dulu → implementasi → format/typecheck/lint/build →
  uji runtime bila server berubah → cleanup → commit + push → akhiri dengan cara menguji,
  risiko/edge case, langkah berikutnya.
- Server-authoritative; event HANYA dari `/shared/events.ts`; zod di setiap handler.
- Uji runtime: pasang listener SEBELUM emit; pakai predikat anti-event-basi;
  watchdog `setTimeout(...)` + `process.exit(1)` 45 detik; ack = objek bukan string;
  `room:create` TIDAK otomatis join — harus `room:join` (role dm);
  warna token harus dari `TOKEN_COLORS` (refine zod → parse gagal = TANPA ack → timeout);
  emit payload invalid TANPA callback ack (server mengirim `error`, tidak membalas ack).

## Gotcha penting

- Jangan menulis ekspresi multiline `${\n ... }` di template literal tsx test.
- Jaringan npm/github flaky — push/install bisa timeout; ulangi perintahnya (commit sudah lokal).
- `MaxListenersExceededWarning` 11+ handler `io.on('connection')` muncul di log — berbahaya?
  Tidak: hanya warning bawaan EventEmitter (default max 10); abaikan atau naikkan maxListeners bila perlu.
- Edge case yang sudah diketahui & diterima (tidak perlu diperbaiki sekarang):
  fog tidak auto-reset saat ganti peta/grid; ownership berbasis nickname; undo token:remove tidak ada
  (C6 hanya move/HP); ruler tidak ikut state:full (join di tengah ukur tidak melihat);
  inisiatif & undoStack TIDAK dipersistensi (A5 tidak menyebutnya);
  undoDepth klien bisa drfit setelah reload (server stack tetap, tombol tersembunyi — aman).
- Tidak ada `MONGODB_URI` lokal → A5 Atlas belum teruji; Cloudinary belum terkonfigurasi →
  unggah B1/C7/C8 tidak bisa diuji end-to-end (alur event sudah diuji dengan URL palsu).
