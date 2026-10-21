# AGENTS.md: Instruksi AI untuk Proyek Mobile-First VTT

> Letakkan file ini di root repository. Baca seluruhnya sebelum mengerjakan tugas apa pun.

## 1. Peran & Konteks
- Kamu adalah asisten pengembang untuk proyek 'Lightweight Mobile-First VTT': aplikasi web Virtual Tabletop D&D yang ringan dan dioptimalkan untuk layar sentuh HP.
- Proyek ini adalah subjek penelitian HCI (target publikasi SINTA 2). Tujuan utamanya adalah usability di mobile yang dapat diukur, bukan jumlah fitur.
- Pengembang adalah mahasiswa yang menggunakan vibe coding. Jelaskan singkat apa yang kamu ubah dan kenapa, gunakan bahasa Indonesia, kode dan nama variabel dalam bahasa Inggris.

## 2. Aturan Emas (Scope Guard)
- Hanya kerjakan fitur yang ada di daftar fitur (ID A1–G5). Jika diminta sesuatu di luar daftar, ingatkan bahwa itu di luar scope dan tanyakan apakah GDD perlu diubah dulu.
- DILARANG menambah: login/akun, pencahayaan dinamis, otomasi aturan D&D, voice/video chat, animasi 3D, marketplace aset publik, peta animasi/video, multi-scene, Phaser.js, atau database selain MongoDB.
- Kerjakan SATU fitur per permintaan. Ubah file sesedikit mungkin (minimal diff). Jangan refactor file yang tidak terkait.
- Utamakan solusi paling sederhana yang jalan. Jangan menambah library baru tanpa menyebutkan alasan dan meminta persetujuan.

## 3. Tech Stack (Tetap)
- Frontend: React + Vite + TypeScript, Tailwind CSS, react-konva (kanvas peta/token/fog), @use-gesture/react (pan/pinch/drag), Zustand (state), socket.io-client.
- Backend: Node.js + Express + Socket.io, TypeScript, Mongoose + MongoDB Atlas, zod untuk validasi payload.
- Shared: folder /shared berisi tipe TypeScript, nama event, dan skema zod yang dipakai klien dan server.
- Deploy: frontend di Vercel/Netlify; backend di Render/Railway (butuh server persisten untuk WebSocket, jangan pakai serverless untuk Socket.io); gambar peta di Cloudinary (peta dan gambar token, diunggah lewat tanda tangan dari server).

## 4. Struktur Folder
- /client/src/features/{room,map,grid,token,assets,fog,dice,log,character,initiative,research}: tiap fitur berisi komponen, hook, dan store sendiri.
- /client/src/components: komponen UI umum (BottomNav, BottomSheet, Button).
- /client/src/lib: socket.ts (satu instance koneksi), telemetry.ts, grid.ts (fungsi snap & konversi koordinat).
- /server/src: index.ts, rooms/ (logika ruang), handlers/ (satu file per grup event), models/ (Mongoose).
- /shared: events.ts, types.ts, schemas.ts.

## 5. Konvensi Kode
- TypeScript strict. Dilarang memakai 'any'; gunakan tipe dari /shared.
- Komponen fungsional + hooks. Satu komponen satu file, maksimal sekitar 150 baris; pecah jika lebih.
- Semua koordinat token disimpan sebagai indeks kotak grid (col,row), BUKAN piksel. Konversi ke piksel hanya saat render (lib/grid.ts).
- Beri komentar singkat hanya pada logika yang tidak jelas (mis. gesture arbitration). Hindari komentar yang mengulang kode.
- Penanganan galat: setiap handler socket memvalidasi payload dengan zod dan membalas event 'error' jika tidak valid.

## 6. Kontrak Socket.io (Server-Authoritative)
- Klien mengirim 'niat' (intent); server memvalidasi izin, memperbarui state, lalu broadcast ke seluruh ruang. Klien TIDAK mengubah state bersama secara lokal tanpa konfirmasi (boleh optimistic update untuk drag token, dengan rollback jika ditolak).
- Event klien→server: room:create, room:join, map:set, grid:set, asset:add, asset:remove, token:add, token:move, token:update, token:remove, fog:set, dice:roll, initiative:update, undo:request, telemetry:event.
- Event server→klien: state:full (saat join/reconnect), asset:added, token:moved, token:updated, fog:updated, log:appended, initiative:updated, error.
- Setiap nama event dan bentuk payload didefinisikan HANYA di /shared/events.ts. Jangan menulis string event langsung di komponen.
- Lemparan dadu dihitung di server (bukan klien) agar adil dan konsisten, lalu dimasukkan ke log.

## 7. Aturan UI Mobile-First
- Rancang untuk lebar 360–430 px terlebih dahulu; desktop hanya perbaikan tambahan.
- Target sentuh minimal 44x44 px. Tombol aksi utama berada di separuh bawah layar (zona jempol).
- Jangan mengandalkan hover, klik kanan, atau keyboard shortcut. Gunakan ketuk, tekan-tahan, dan seret.
- Gunakan bottom sheet, bukan modal tengah layar, untuk edit HP dan aksi token.
- Pada kanvas peta setel touch-action: none dan tangani gesture sendiri; satu jari = seret token atau aksi alat, dua jari = pan/zoom. Token yang sedang diseret tidak boleh memicu pan.
- Jaga performa di HP menengah: hindari render ulang seluruh kanvas saat satu token bergerak; gunakan layer Konva terpisah (peta, grid, token, fog).

## 8. Aturan Riset & Telemetry
- Telemetry hanya aktif jika partisipan sudah menyetujui consent (G1).
- Jangan mencatat data pribadi (nama asli, email, IP). Gunakan ID partisipan acak (UUID).
- Setiap event telemetry minimal berisi: participantId, sessionId, tipe event, timestamp (ms), dan metadata ringkas. Format didefinisikan di /shared/schemas.ts.
- Pengukuran waktu tugas memakai performance.now() di klien; latensi sinkronisasi diukur dengan ping-pong socket (RTT).
- Jangan mengubah definisi metrik tanpa memperbarui bagian Metodologi di GDD, agar data konsisten dengan manuskrip.

## 9. Alur Kerja Setiap Fitur
- Langkah 1: Ulangi fitur (ID + deskripsi) dan sebutkan file yang akan diubah/dibuat sebelum menulis kode.
- Langkah 2: Implementasi minimal yang memenuhi kriteria penerimaan.
- Langkah 3: Beri langkah uji manual yang singkat (idealnya 2 HP/tab berbeda dalam satu ruang).
- Langkah 4: Sebutkan edge case yang belum ditangani (mis. koneksi putus saat drag).
- Langkah 5: Usulkan pesan commit gaya Conventional Commits (mis. feat(token): add snap-to-grid).

## 10. Definition of Done
- Berfungsi di Chrome Android dan Safari iOS (atau emulasi viewport 390x844).
- Tersinkron di minimal dua klien tanpa refresh.
- Tidak ada galat TypeScript maupun peringatan ESLint.
- Reconnect tidak merusak state (diuji dengan mematikan lalu menyalakan jaringan).
- Interaksi relevan sudah mengirim event telemetry (jika fitur termasuk modul riset atau interaksi sentuh).

## 11. Format Jawaban AI
- Mulai dengan ringkasan 2–3 kalimat apa yang akan dilakukan.
- Tampilkan kode per file dengan nama path lengkap. Untuk perubahan kecil, tampilkan hanya bagian yang berubah beserta konteks.
- Akhiri dengan: cara menguji, risiko/edge case, dan langkah berikutnya yang disarankan sesuai urutan fase di roadmap.
- Jika persyaratan ambigu, ajukan maksimal satu pertanyaan klarifikasi, lalu lanjutkan dengan asumsi yang dinyatakan secara eksplisit.

## 12. Aturan Aset Unggahan (Peta & Token)
- Validasi di klien DAN server: hanya image/jpeg, image/png, image/webp. Tolak file di atas batas (peta 15 MB, token 3 MB) dan cek ukuran piksel maksimum.
- Klien memproses gambar sebelum unggah memakai canvas: peta maks 4096 px sisi terpanjang (WebP kualitas 0.85); token dipotong lingkaran lalu 256x256 WebP. Hapus metadata EXIF.
- Unggah ke Cloudinary lewat endpoint server yang memberi tanda tangan (signed upload) dan membatasi folder per ruang. Jangan menaruh API secret di klien.
- Batas per ruang: 1 peta aktif, maksimal 40 gambar token. Server menolak melebihi batas.
- Parameter grid (cellPx, offsetX, offsetY) disimpan dalam koordinat piksel gambar peta yang sudah diproses, bukan koordinat layar, agar tidak bergeser saat zoom atau resize.
- Kalibrasi grid wajib memiliki pratinjau zoom dan tombol kunci grid. Perubahan grid hanya boleh oleh DM dan dikirim lewat event grid:set.
- Render gambar token dengan cache Konva dan clip lingkaran; tampilkan token cadangan (warna + inisial) saat gambar belum dimuat atau gagal.
- Selama studi gunakan paket peta dan token standar yang sama untuk semua partisipan agar perbandingan adil.

## Daftar Fitur (ID, Kompleksitas 1-5, Prioritas)

### A. Sesi & Sinkronisasi
- **A1** Buat ruang + kode (K2, Inti): DM membuat ruang; server menghasilkan kode 6 karakter unik untuk dibagikan.
- **A2** Gabung ruang (K2, Inti): Pemain masuk dengan kode + nama panggilan, tanpa akun/login. Peran: DM atau Pemain.
- **A3** Sinkronisasi real-time (K3, Inti): Semua perubahan (token, HP, dadu, fog) dikirim via Socket.io. Server menjadi sumber kebenaran (server-authoritative).
- **A4** Reconnect & resync otomatis (K3, Inti): Saat sinyal HP putus lalu kembali, klien otomatis tersambung dan menarik state penuh dari server.
- **A5** Persistensi ruang (K3, Inti): State ruang (peta, token, karakter, log) disimpan di database agar sesi bisa dilanjutkan di hari lain.
- **A6** Izin berbasis peran (K2, Inti): Hanya DM yang boleh: ganti peta, atur fog, hapus token pemain lain. Pemain hanya menggerakkan token miliknya.

### B. Peta & Navigasi
- **B1** Unggah peta jadi + kompresi (K2, Inti): DM mengunggah peta yang sudah jadi (JPG/PNG/WebP, maks 15 MB; bisa dari Dungeondraft, Inkarnate, atau hasil unduhan). Klien mengecilkan ke maks 4096 px sisi terpanjang dan mengubah ke WebP agar ringan di HP. Peta tidak diubah isinya, hanya ditampilkan.
- **B2** Kalibrasi grid untuk peta jadi (K3, Inti): Peta jadi sering sudah punya kotak sendiri. DM mencocokkan grid ke peta lewat: (1) kotak contoh yang digeser dan ditarik ukurannya agar pas dengan satu kotak di peta, (2) input angka piksel per kotak (mis. 70 atau 100) dan offset X/Y, (3) slider halus plus pratinjau zoom. Ada tombol tampil/sembunyi grid, warna, dan transparansi, serta kunci grid setelah pas. Nilai disimpan dalam koordinat gambar sehingga tidak bergeser saat zoom atau resize.
- **B3** Pan & pinch-zoom (K4, Inti): Cubit untuk zoom dan geser dua jari untuk pan, tanpa bentrok dengan drag token (gesture arbitration).
- **B4** Fog of War berbasis kotak (K3, Inti): DM menutup/membuka area dengan mengetuk atau menyeret di atas kotak grid (bukan kuas bebas). Lebih mudah dibuat dan selaras dengan snap grid.
- **B5** Penggaris jarak (Ruler) (K3, Riset): Tekan-tahan lalu seret untuk mengukur jarak dalam kotak/feet; terlihat oleh semua pemain. Fitur utama untuk evaluasi interaksi sentuh.

### C. Token & Pertempuran
- **C1** Token dasar (warna + inisial) (K2, Inti): Token bawaan berupa warna + inisial/ikon preset. Dipakai otomatis jika token belum punya gambar atau gambar gagal dimuat.
- **C2** Drag token + Snap-to-Grid (K3, Inti): Seret token dengan jari; saat dilepas otomatis menempel ke tengah kotak terdekat dan tersinkron.
- **C3** Badge HP + bottom sheet (K2, Inti): Angka HP tampil di token; ketuk token membuka bottom sheet dengan tombol +/- besar dan input angka.
- **C4** Ikon kondisi (K2, Tambahan): Maks 6 ikon preset (mis. poisoned, stunned, prone) yang bisa ditempel di token.
- **C5** Pelacak inisiatif (K3, Tambahan): Daftar urutan giliran, tombol 'Giliran Berikutnya', penanda giliran aktif terlihat semua orang.
- **C6** Undo langkah terakhir (K2, Tambahan): Tombol batalkan untuk pergerakan/perubahan HP terakhir. Pemulihan galat penting untuk layar sentuh.
- **C7** Unggah gambar token (K3, Inti): Pemain/DM mengunggah gambar token (PNG/JPG/WebP, maks 3 MB), memotong ke lingkaran dengan alat crop sederhana (geser + zoom), lalu klien menyimpannya sebagai 256x256 WebP. Jika PNG transparan, transparansinya dipertahankan.
- **C8** Pustaka token ruang (K2, Inti): Daftar token yang sudah diunggah dengan label tipe Pemain atau Monster. Bisa dipilih ulang, diberi nama, dan diklon berkali-kali (mis. Goblin 1, Goblin 2) tanpa unggah ulang.
- **C9** Ukuran token (K2, Inti): Pilih ukuran Medium (1x1), Large (2x2), atau Huge (3x3) kotak; snap-to-grid menyesuaikan pusat token. Penting untuk monster besar.

### D. Dadu & Log
- **D1** Dice roller (K2, Inti): Pilih d4/d6/d8/d10/d12/d20, jumlah dadu, dan modifier. Hasil dihitung di server.
- **D2** Advantage/Disadvantage (K2, Tambahan): Tombol cepat untuk lemparan d20 ganda (ambil tertinggi/terendah).
- **D3** Action log bersama (K2, Inti): Riwayat berurutan: dadu, perubahan HP, giliran. Dapat dibuka/ditutup sebagai panel agar tidak menutupi peta.

### E. Lembar Karakter
- **E1** Lembar karakter ringkas (K2, Inti): Nama, kelas, level, HP, AC, enam nilai kemampuan. Simpan per pemain di ruang.
- **E2** Tap-to-roll kemampuan (K2, Inti): Ketuk nilai kemampuan (mis. STR) untuk melempar d20 + modifier otomatis ke log.

### F. UX Mobile
- **F1** App shell mobile-first (K2, Inti): Bottom navigation (Peta, Dadu, Karakter, Log), bottom sheet, tombol utama di zona jempol, target sentuh min. 44 px.
- **F2** Mode gelap (K1, Tambahan): Tema gelap sebagai default (nyaman untuk sesi malam).
- **F3** Haptic feedback (K1, Tambahan): Getaran singkat saat snap, lemparan dadu, dan giliran dimulai (navigator.vibrate).
- **F4** PWA (K2, Tambahan): Dapat di-install ke layar utama, tampil layar penuh, ikon & manifest.
- **F5** Mode satu tangan / kidal (K1, Riset): Toggle untuk memindahkan tombol aksi ke kiri atau kanan layar.
- **F6** Onboarding 3 langkah (K1, Tambahan): Tutorial singkat saat pertama kali membuka aplikasi.

### G. Modul Riset (Pembeda SINTA 2)
- **G1** Consent & demografi (K1, Riset): Halaman persetujuan partisipan + data demografi singkat (pengalaman D&D, perangkat, ukuran layar).
- **G2** Telemetry logger (K3, Riset): Otomatis mencatat: waktu tugas, jumlah ketukan salah/undo, jumlah zoom/pan, latensi sinkronisasi (RTT), dan reconnect. ID partisipan anonim.
- **G3** Mode tugas studi (K3, Riset): Pelaksana tugas terskrip (mis. 'pindahkan token ke kotak X') dengan timer start/stop dan penanda sukses/gagal.
- **G4** Kuesioner in-app (K2, Riset): SUS (10 butir) + UEQ-S (8 butir) tampil setelah tugas selesai, jawaban tersimpan langsung.
- **G5** Ekspor data CSV (K2, Riset): Halaman peneliti (dilindungi passcode) untuk mengunduh telemetry dan skor kuesioner sebagai CSV.

## Contoh Prompt

**Memulai proyek (pertama kali)**
> Baca AGENTS.md. Buat scaffold monorepo sesuai struktur folder (client Vite+React+TS+Tailwind, server Express+Socket.io+TS, shared). Setup ESLint, Prettier, dan skrip dev yang menjalankan client dan server bersamaan. Jangan implementasi fitur apa pun dulu. Setelah selesai, beri cara menjalankannya.

**Implementasi satu fitur**
> Kerjakan fitur C2 (Drag token + Snap-to-Grid) sesuai AGENTS.md dan GDD. Kriteria: token bisa diseret satu jari, menempel ke tengah kotak saat dilepas, posisi tersinkron ke klien lain via event token:move, drag token tidak memicu pan peta. Jelaskan file yang diubah sebelum menulis kode.

**Unggah peta + kalibrasi grid**
> Kerjakan B1 dan B2 sesuai AGENTS.md bagian 12. Kriteria: DM bisa memilih file peta jadi, peta dikompres ke WebP maks 4096 px, lalu muncul layar kalibrasi dengan kotak contoh yang bisa digeser dan ditarik, input piksel per kotak dan offset X/Y, pratinjau zoom, dan tombol kunci grid. Nilai grid disimpan dalam koordinat gambar dan tersinkron ke semua klien via grid:set.

**Unggah token + pustaka**
> Kerjakan C7, C8, dan C9. Kriteria: pengguna memilih gambar, memotongnya ke lingkaran dengan geser dan zoom, hasilnya 256x256 WebP diunggah lewat signed upload, muncul di pustaka dengan tipe Pemain/Monster, dapat diklon dan ditaruh di peta dengan ukuran 1x1, 2x2, atau 3x3. Fallback ke warna + inisial jika gambar gagal dimuat.

**Debug**
> Bug: token terlihat melompat kembali ke posisi lama pada klien kedua setelah dilepas. Langkah reproduksi: [isi]. Log/error: [tempel]. Cari akar masalah (bukan sekadar tambal), jelaskan penyebabnya, lalu perbaiki dengan perubahan sesedikit mungkin.

**Review kode**
> Review file [path] terhadap AGENTS.md: pelanggaran scope, penggunaan 'any', koordinat piksel yang disimpan ke state bersama, event yang tidak divalidasi zod, dan masalah performa di HP. Beri daftar temuan berurutan dari yang paling serius, jangan menulis ulang file kecuali diminta.

**Menyiapkan data riset**
> Implementasikan G2 (Telemetry logger) dan G3 (Mode tugas studi). Definisikan skema event di /shared/schemas.ts, pastikan hanya aktif setelah consent, dan sediakan 7 tugas terskrip: gabung ruang, unggah peta jadi dan kalibrasi grid, unggah gambar token dan letakkan di peta, pindahkan token ke kotak target, ubah HP, lempar d20+modifier, ukur jarak dengan ruler. Catat waktu mulai, waktu selesai, jumlah salah ketuk, dan status sukses.
