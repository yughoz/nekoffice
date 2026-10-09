# Perubahan scope — 6 Oktober 2026

User telah memperjelas bahwa agent dan script kerja sudah dimiliki sendiri. Scope implementasi project ini sekarang **tampilan kantor animasi saja**, dengan adapter API yang menerima status/aktivitas dari sistem eksternal. UI terdiri dari satu ruangan besar dengan komputer berjajar, avatar chibi, status singkat saat avatar dipilih, daftar agent minimal, dan kontrol kamera. Demo hanya memberi contoh animasi. Tidak ada orkestrasi agent, pipeline produksi video, library output, QA workflow, atau publishing dalam scope aplikasi ini. Kontrak implementasi terbaru dan contoh integrasi berada di `README.md`.

PRD pembahasan awal disimpan terpisah di `PRD-workflow-baseline.md`. Bagian workflow/backend di dalamnya telah digantikan oleh scope tampilan ini.

## Produk

Little Office adalah tampilan visual untuk agent yang sudah dimiliki user. Script eksternal mengirim update via HTTP; frontend mengubahnya menjadi avatar, aktivitas dan gerakan. Demo hanya memperlihatkan animasi, tidak mensimulasikan pipeline produksi.

## Pengalaman utama

Satu layar kantor terbuka berisi komputer berjajar dan manusia chibi, judul kantor, pilihan Demo/Live API, daftar agent, dan kamera pan/zoom/fit/follow. Klik avatar menampilkan satu kartu status dan aktivitas. Tidak ada sidebar project, timeline, library output, atau layar workflow.

## Kontrak minimum

POST /api/agents melakukan upsert berdasarkan ID stabil. Field tampilan: name, role, team, room, status, task, parentId, progress opsional. Status: idle, working, thinking, waiting, error, done. Event tambahan mencakup move, remove, update title, reset tampilan. GET /api/state menyediakan snapshot dan GET /api/stream mengirim SSE. Contoh lengkap di README.md.

## Pemisahan tanggung jawab

Sistem agent user menentukan pekerjaan, progress, hasil, error dan hubungan parent. Little Office hanya memproyeksikan update itu secara visual. Animasi tidak memengaruhi atau menyimpulkan keadaan pekerjaan. Pause mengatur demo saja. Tidak ada panggilan AI berbayar atau upload YouTube di viewer.

## Batas awal

Receiver lokal berjalan dengan Vite dev/preview di loopback. State tampilan berada di memori; browser refresh memuat ulang snapshot, server restart mengosongkan avatar. Batas awal 64 avatar, body 64 KiB, progress 0–1. Deploy lintas mesin/auth/persistensi mengikuti sistem backend user pada integrasi berikutnya.

## Kriteria penerimaan

1. Update dari script membuat avatar tanpa reload browser.
2. ID yang sama memperbarui avatar yang sama; partial update mempertahankan field lain.
3. Setiap agent mendapat komputer sendiri; status working mengaktifkan gerakan mengetik dan layar. Perpindahan posisi mengikuti lantai di antara meja.
4. Klik avatar menunjukkan status, task dan parent sesuai API.
5. Progress hanya ditampilkan bila dikirim script.
6. Update invalid tidak mengubah snapshot.
7. Event ID retry tidak diterapkan dua kali.
8. Refresh/reconnect memulihkan tampilan dari server.
9. Demo dan Live API ditandai jelas.
10. Layar desktop/HP dapat menampilkan kantor dan daftar agent dengan keyboard.

Baseline workflow produksi dari pembahasan awal disimpan terpisah di PRD-workflow-baseline.md dan tidak menjadi scope implementasi aktif.

Revisi visual 9 Oktober 2026: satu ruangan terbuka, 15 komputer awal, meja bertambah untuk tim besar, pose duduk menghadap monitor, tangan mengetik, gerakan badan halus, teks/kursor monitor. Field room dipertahankan sebagai metadata kompatibilitas.

Revisi animasi 9 Oktober 2026: satu pintu di bagian bawah ruangan. Agent baru berjalan dari pintu menuju komputer, baru mengetik setelah duduk, lalu berjalan ke pintu saat status done. Agent selesai tetap ada di data API/daftar; update working atau thinking berikutnya membuatnya datang lagi. Demo memiliki kedatangan, durasi kerja, jeda dan kecepatan jalan yang bervariasi, dengan seed acak per halaman agar tiap sesi berbeda. Pause membekukan seluruh gerakan demo; reduced motion melewati perjalanan tanpa animasi.
