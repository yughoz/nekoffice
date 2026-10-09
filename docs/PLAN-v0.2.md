# Nekoffice v0.2 Product and Implementation Plan

Nekoffice v0.2 membuat kantor lebih mudah dibaca: terlihat client mana yang terhubung, siapa sedang mengerjakan apa, dan kapan suatu session selesai. Pengalaman utama tetap satu ruangan besar dengan manusia chibi dan komputer. Detail koneksi, filter, dan riwayat dibuka melalui panel kecil agar kantor tetap menjadi fokus.

Status: rancangan untuk implementasi. Tanggal: 9 Oktober 2026. Keenam fitur di bawah masuk target rilis v0.2. Agent dan script tetap berjalan di sistem user; Nekoffice menerima metadata dan menampilkan aktivitasnya.

## Kondisi implementasi sekarang

| Bagian | Kondisi saat ini | Perubahan v0.2 |
| --- | --- | --- |
| Koneksi | Browser menerima SSE; API provider memberikan jumlah client dan heartbeat agregat | Daftar client per mesin, umur heartbeat, dan kondisi kosong yang berbeda |
| Gerakan | Masuk, berjalan, mengetik pada `working`, pulang pada `done` | Pose berpikir, menunggu dengan kopi, siaga, dan perlu perhatian |
| Identitas | Warna karakter mengikuti tim; lokasi meja disimpan hanya dalam scene | Profil penampilan stabil dan preferensi meja yang disimpan server |
| Aktivitas | Label umum ada di kartu detail; nama ada di karakter | Aktivitas pendek di atas kepala dengan aturan kepadatan |
| Filter | Snapshot dan daftar menampilkan seluruh agent | Filter project dan mesin yang hanya memengaruhi tampilan |
| Riwayat | State aktif dan lease berada di memori | Riwayat kehadiran terbatas yang bertahan setelah restart server |

`src/OfficeScene.ts` menghapus alokasi meja ketika agent dihapus atau epoch berubah. `src/useOffice.ts` hanya mengenali koneksi browser ke server. `server/remoteClients.ts` sudah memiliki heartbeat 10 detik dari client, lease server 35 detik, namespace ID per client, dan penahanan metadata selesai selama 90 detik. Fondasi ini dipertahankan.

## Pengalaman pada layar utama

Header menampilkan pilihan Demo atau Live API, badge koneksi, dan tombol Penghuni. Badge memberi ringkasan seperti `2 mesin terhubung` dan bisa dibuka untuk melihat detail. Footer menambahkan tombol Riwayat serta kontrol gerakan yang sudah tersedia. Kontrol filter ditempatkan dalam panel Penghuni, dengan chip ringkas pada layar hanya ketika filter aktif.

Panel memakai satu slot: Koneksi, Penghuni, atau Riwayat. Membuka panel lain menggantikan panel sebelumnya. Desktop memakai drawer di sisi kanan; HP memakai bottom sheet. Kartu avatar tetap muncul saat karakter dipilih, tetapi ditutup saat panel besar dibuka agar layar tidak tertutup dua lapisan detail sekaligus.

Semua panel memiliki tombol tutup, fokus awal, dukungan Tab dan Escape, serta pengembalian fokus ke tombol pembukanya. Daftar HTML menjadi cara alternatif memilih karakter tanpa mengandalkan canvas. Badge memiliki teks dan ikon selain warna.

## Indikator koneksi

Ada dua koneksi yang berbeda. Badge viewer menjelaskan browser ke server. Daftar client menjelaskan Codex atau Hermes ke server. Browser dapat terhubung ketika semua client agent sedang offline; keadaan ini harus terlihat jelas.

Satu baris client menampilkan provider, alias mesin, jumlah session aktif, status koneksi, dan `heartbeat 8 detik lalu`. Klik baris memperlihatkan versi bridge bila dikirim dan waktu terakhir menerima heartbeat. Produser dari beberapa proses Hermes digabung berdasarkan client ID; jumlah proses tidak dihitung sebagai jumlah mesin.

| Umur heartbeat menurut server | Label client | Perilaku |
| --- | --- | --- |
| Sampai 20 detik | Terhubung | Client hidup; nol session aktif berarti sedang idle |
| Lebih dari 20 sampai kurang dari 35 detik | Terlambat | Tampilkan heartbeat terlambat; belum menyuruh orang pulang |
| 35 detik atau lebih | Terputus | Lease kedaluwarsa; avatar pulang dengan alasan koneksi hilang |
| Provider belum pernah mengirim heartbeat | Belum terdeteksi | Jangan mengklaim plugin belum terpasang |

Daftar menyimpan client offline yang terlihat dalam 24 jam terakhir. Provider dapat menampilkan beberapa client dalam satu mesin. Ringkasan menghitung mesin unik; panel tetap memperlihatkan status setiap provider secara terpisah.

Alias mesin merupakan konfigurasi client, misalnya `Mac kerja` atau `VPS render`. Default aman adalah `Mesin a1b2`, berasal dari ID acak. Hostname, username, IP, dan full path tidak dikirim otomatis. Installer kedua provider memakai machine ID bersama pada mesin yang sama; client ID provider yang sudah ada tetap dipertahankan agar ID avatar lama tidak berubah.

Jika client lama tidak mengirim metadata mesin, server menampilkan `Mesin belum diberi nama` dengan identitas fallback per client. Penggabungan Codex dan Hermes sebagai satu mesin tersedia setelah kedua client diperbarui.

Empty state membedakan keadaan berikut:

- Client terhubung, tidak ada session aktif: `Semua sedang istirahat. Client tetap terhubung.`
- Belum ada heartbeat client: `Belum ada client terdeteksi.` dengan tautan panduan pemasangan.
- Client yang dikenal terputus: `Client terputus. Terakhir terlihat …` dengan tombol Koneksi.
- Filter tidak cocok: `Tidak ada session yang cocok dengan filter.` dengan tombol Hapus filter.
- Browser kehilangan SSE: `Koneksi ke kantor terputus. Menyambungkan kembali …`; snapshot terakhir ditandai belum diperbarui.

Server mengirim perubahan koneksi melalui event SSE tersendiri dengan `serverNow` dan `lastSeenAt` setiap client. UI menghitung selisih waktu browser terhadap server agar jam mesin yang berbeda tidak membuat heartbeat terlihat palsu. Hitungan detik diperbarui lokal; setiap detik tidak perlu mengubah revision agent atau memulai ulang animasi.

## Animasi sesuai aktivitas

Status dari sumber tetap menentukan keadaan pekerjaan. Animasi hanya representasi visual. Karakter mempunyai fase perjalanan `entering`, `seated`, `leaving`, dan `gone`; ketika duduk, activity memilih gerakan dekoratif.

| Status dan activity | Tampilan karakter | Layar komputer |
| --- | --- | --- |
| `working`, edit atau command atau test | Duduk, mengetik, gerakan tangan bergantian | Kursor dan baris bergerak |
| `working`, membaca referensi | Duduk melihat monitor, sesekali mengangguk | Gerakan layar pelan |
| `thinking` | Tangan berhenti; gerakan kepala pelan dan bubble tiga titik | Monitor tetap menyala |
| `waiting` | Duduk, sesekali mengangkat cangkir kopi; bubble menunggu | Monitor tenang |
| `idle` pada session yang masih hadir | Duduk tenang, gerakan kecil | Monitor redup |
| `error` | Pose diam dengan indikator perhatian | Tidak ada efek berkedip cepat |
| `done` atau kehadiran berakhir | Bangun, berjalan ke pintu, menghilang | Monitor kembali idle |

Client terhubung tetapi tanpa session aktif tidak membuat orang duduk siaga. `waiting` adalah session yang masih hadir dan menunggu jawaban atau persetujuan. Informasi ini berbeda dari session yang sudah selesai.

Pergantian activity saat berjalan tidak membuat karakter berteleportasi atau memulai perjalanan ulang. Pose baru aktif setelah duduk. Session yang aktif lagi ketika sedang pulang membalik tujuan dengan jalur yang aman. Agent tidak perlu menunggu animasi selesai untuk mengerjakan tugas nyata.

Frekuensi gerakan berbeda sedikit per karakter melalui seed stabil. State berubah segera mengikuti event; efek dekoratif dapat bertransisi singkat tanpa menunda status sebenarnya. Reduced motion menampilkan pose dan ikon statis serta melewati perjalanan, sambil mempertahankan status yang terbaca.

Pose kopi dan berpikir diupayakan melalui komponen/layer pada karakter yang ada. Jika aset baru diperlukan, buat paket chibi yang konsisten untuk arah berjalan dan pose belakang, lalu validasi atlas serta ukuran frame sebelum dipakai. Tidak ada generasi aset atau biaya API pada tahap rancangan ini.

## Identitas avatar tetap

Identitas memakai ID session hasil namespace server yang sudah ada. Nama folder hanya menjadi label; mengganti nama project tidak mengganti wajah karakter. Session berbeda pada folder yang sama tetap dua orang.

Profil avatar versi pertama menggunakan pilihan rambut, palet baju, dan aksesori dari seed ID. Target aset adalah empat rambut, empat palet baju, dan dua pilihan aksesori, termasuk tanpa aksesori. Penampilan dipisahkan dari `team`; kategori tim tetap terlihat melalui badge. Detail menggunakan portrait yang cocok dengan profil avatar.

Server menyimpan `avatarStyleVersion`, profil penampilan, dan preferensi meja. Versi profil dibekukan per identitas supaya penambahan varian aset pada rilis berikutnya tidak mengubah semua orang. Hash ID hanya dipakai sebagai seed; tidak diperlukan informasi pribadi untuk membentuk penampilan.

Meja lama diprioritaskan saat session kembali. Saat meja itu sudah dipakai session aktif lain, server memberikan meja kosong tanpa memindahkan pekerja yang sedang duduk. Preferensi sebelumnya tetap disimpan untuk kedatangan berikutnya. Ini menjaga komputer yang konsisten ketika tersedia sekaligus memungkinkan banyak session bergantian memakai kantor.

Alokasi meja aktif ditentukan server agar dua browser melihat susunan yang sama. Mapping tidak bergantung pada urutan snapshot, filter, heartbeat, atau urutan browser dibuka. Pintu dan jalur menggunakan kapasitas kantor keseluruhan, termasuk avatar yang tersembunyi oleh filter. Batas 64 agent tetap berlaku; kondisi penuh ditampilkan sebagai kapasitas tercapai.

Profil tidak dihapus ketika metadata selesai dibersihkan setelah 90 detik. Penyimpanan profil dibatasi 2.048 identitas, dengan pembersihan identitas yang tidak aktif selama 30 hari; identitas aktif selalu dilindungi. Penampilan dapat dibentuk ulang dari seed yang sama, sedangkan preferensi meja yang sudah dibersihkan kembali mengikuti alokasi meja kosong.

## Aktivitas singkat di atas kepala

Nama dan activity ditampilkan dekat kepala karakter dengan pemisahan yang jelas dari sprite. Nama dipotong secara visual bila panjang; nama lengkap tetap tersedia di panel. Activity menggunakan frasa tetap, maksimal 32 karakter pada label, misalnya `Mengubah file`, `Menjalankan perintah`, `Membaca referensi`, atau `Menunggu jawaban`.

Dengan sampai delapan avatar terlihat, tampilkan activity setiap orang. Pada kantor lebih ramai, tampilkan ikon activity untuk semua orang dan teks lengkap hanya untuk avatar yang dipilih atau diarahkan pointer. Tombol Activity menyediakan pilihan Otomatis, Semua, atau Ringkas. Label yang bertabrakan mengutamakan avatar terpilih dan menyingkat label lain.

Ukuran teks dijaga terbaca saat zoom; label disembunyikan atau diringkas pada zoom yang terlalu jauh. Detail lengkap tetap bisa diakses melalui daftar. Pada HP, tap karakter menggantikan hover.

Client memetakan event ke activity code dari allowlist. Contoh `Menjalankan tes` hanya muncul jika adapter atau script memberikan kategori `test` yang dapat dipercaya; event command umum tetap `Menjalankan perintah`. Jangan menyimpulkan hasil tes atau pekerjaan berhasil dari command selesai maupun animasi.

Client otomatis tidak mengirim prompt, reasoning, command mentah, argument tool, output, nama file, atau full path untuk mengisi bubble. Activity tanpa kategori yang dikenali memakai label umum sesuai status. API script manual tetap dapat memberikan `task` seperti sekarang, yang dirender sebagai teks biasa dengan batas panjang.

## Filter project dan mesin

Panel Penghuni menambahkan pencarian nama project dan dua pemilih: Project serta Mesin. Pilihan provider Codex/Hermes tersedia sebagai filter ringkas tambahan. Semua menjadi default. Filter aktif terlihat sebagai chip dan bisa dihapus sekaligus.

Project memiliki ID tersamarkan yang dibentuk client dari lokasi kerja lokal dan machine ID bersama. Server tidak menerima lokasi tersebut. Nama project dari folder terakhir tetap menjadi label. Project dengan nama sama tetapi lokasi berbeda tidak digabung otomatis; pilihan ditampilkan dengan pembeda mesin dan ID pendek bila perlu.

Filter berlaku pada avatar, daftar, dan riwayat. Ia tidak mengubah kehadiran, alokasi meja, session, atau agent di server. Hidden avatar mempertahankan state dan lokasi; menghapus filter tidak menjalankan ulang animasi masuk. Badge koneksi selalu menunjukkan seluruh kantor, bukan hanya hasil filter.

Counter menunjukkan `3 ditampilkan · 7 session aktif` agar kantor terfilter tidak dianggap kosong atau kehilangan koneksi. Jika agent terpilih tidak cocok dengan filter baru, kartu detail ditutup. Preferensi filter disimpan lokal di browser, dipisahkan antara Demo dan Live API. Nilai filter yang tidak ada lagi dapat dihapus dengan satu klik.

## Riwayat ringan

Panel Riwayat menampilkan waktu, project, provider/mesin, kejadian, dan durasi kehadiran yang terpantau. User dapat memfilter memakai pilihan yang sama dengan panel Penghuni. UI mengambil 50 baris per halaman dengan pagination berbasis cursor.

Riwayat mencatat masuk, giliran selesai atau dihentikan, koneksi hilang, dan aktif kembali. Heartbeat serta pergantian label activity tidak menjadi baris riwayat. Durasi menghitung interval kehadiran yang terlihat server, termasuk reasoning dan menunggu; bukan jumlah waktu mengetik atau tagihan penggunaan model.

Alasan akhir disimpan terpisah: selesai menurut sumber, dihentikan menurut sumber, client terputus, timeout observer, atau alasan belum diketahui. Koneksi hilang tidak diberi label `pekerjaan selesai`. Jika client baru terhubung di tengah pekerjaan, tampilkan `Terpantau sejak …` dan durasi sejak pengamatan dimulai. Tidak menghitung ulang riwayat lama dari transcript Codex/Hermes.

Setiap interval memiliki ID unik. Bila tersedia, client menambahkan `runId` tersamarkan dari turn sumber sehingga retry dan pergantian proses tidak membuat entri ganda. Untuk client lama tanpa run ID, server memakai transisi kehadiran yang diterimanya. Activity akhir tidak menandakan hasil pekerjaan berhasil.

Simpan maksimal 2.000 interval atau tujuh hari, mana yang tercapai lebih dahulu. Rekaman menyimpan label project dan mesin pada saat kejadian agar perubahan nama berikutnya tidak menulis ulang riwayat. Tidak ada prompt, file kerja, isi command, atau hasil tool dalam riwayat.

## Kontrak data dan penyimpanan

Heartbeat version 1 menerima field opsional baru agar bridge lama tetap bekerja. `clientId`, `producerId`, sequence, autentikasi, batas ukuran paket, dan ID avatar yang sudah dipakai dipertahankan.

| Data tambahan | Tujuan |
| --- | --- |
| `machineId`, `machineLabel`, `bridgeVersion` pada heartbeat | Menggabungkan provider per mesin dan menjelaskan koneksi |
| `projectKey`, `projectName` pada session | Filter project tanpa mengirim path |
| `activityCode` pada session | Memilih label dan pose dari kategori tetap |
| `runId` opsional dan `endReason` saat berakhir | Membedakan giliran dan alasan akhir tanpa isi chat |
| `avatarProfile`, `seatIndex`, metadata sumber pada snapshot | Menyamakan identitas dan lokasi antar browser |

Sumber provider berasal dari endpoint penerima, sehingga payload tidak bebas menyamar sebagai provider lain. Field tambahan divalidasi sebelum snapshot diterapkan. Field teks memiliki batas panjang dan dirender sebagai teks; timestamp dari client tidak menentukan lease jaringan.

Tambahkan `GET /api/integrations` untuk ringkasan dan daftar client serta `GET /api/history` untuk pagination riwayat. Endpoint health provider yang ada tetap tersedia. SSE menambahkan event `integrations` dan `history`; event `office` mempertahankan struktur dasarnya dengan field tambahan opsional. Pada reconnect, UI mengambil snapshot registry dan halaman riwayat terbaru lalu melakukan deduplikasi berdasarkan ID.

Persistence menggunakan file JSON terbatas dalam direktori `OFFICE_DATA_DIR`, misalnya `/data/nekoffice`, pada volume Docker. Registry mesin, profil avatar, dan riwayat tersimpan; pekerjaan agent tetap berada di sistem sumber. Penulisan menggunakan file sementara dan rename atomik dengan antrean satu penulis. Perubahan riwayat/profil disimpan segera; heartbeat disk dibatasi frekuensinya agar tidak menulis setiap detik.

Saat server restart, registry dikenal tampil offline hingga heartbeat baru diterima. Lease aktif tidak dipulihkan sebagai bukti bahwa client masih hidup. Interval yang masih terbuka ditandai terputus oleh restart dan tidak diberi akhir pekerjaan yang dibuat-buat. Profil dan preferensi meja tetap tersedia ketika client terhubung kembali.

Jika file rusak, pertahankan salinannya dan tampilkan penyimpanan bermasalah; kantor masih menerima state aktif di memori. Kegagalan penyimpanan tidak boleh diklaim sebagai riwayat yang sudah aman tersimpan.

Dashboard dan endpoint baca pada deployment sekarang bersifat publik. Nama mesin default dan data riwayat tetap minimal; v0.2 tidak memindahkan token API ke frontend. Login dashboard menjadi scope terpisah bila akses kantor hendak dibatasi.

## Urutan implementasi

| Tahap | Pekerjaan | Hasil yang bisa diperiksa |
| --- | --- | --- |
| A | Metadata client/mesin/project/activity, registry koneksi, kompatibilitas bridge lama, fondasi persistence dan SSE tambahan | Dua provider bisa dibedakan per mesin; koneksi viewer dan agent jelas |
| B | Panel Koneksi, empty state, label activity dasar | Kantor kosong menjelaskan idle, offline, belum terdeteksi, atau filter |
| C | Profil avatar, alokasi meja server, pose berpikir/kopi/perhatian, label di atas kepala dan aturan kepadatan | Orang konsisten saat kembali; setiap status dapat dibedakan secara visual |
| D | Filter project/mesin/provider, panel Penghuni, state hidden avatar | Filter tidak mengubah meja atau mengirim orang pulang |
| E | Riwayat interval, alasan akhir, cursor, retensi, pemulihan setelah restart | Kehadiran bisa diperiksa tanpa log chat dan tanpa duplikasi heartbeat |
| F | Validasi client/server/browser, migrasi instalasi lokal, deployment volume, dokumentasi dan smoke test publik | Semua enam fitur selesai dan client lama tetap diterima |

Fondasi registry dan model data dikerjakan dahulu karena dipakai oleh indikator, filter, dan riwayat. Pada tahap C, profil diselesaikan sebelum varian pose agar seluruh pose memakai identitas yang sama. Demo menggunakan kategori aktivitas yang sama untuk memeriksa animasi, dengan penanda simulasi yang jelas dan tanpa menulis riwayat produksi.

## Pemetaan perubahan kode

| Area | File utama |
| --- | --- |
| Kontrak metadata dan activity | `src/officeModel.ts`, `server/store.ts` |
| Registry mesin, lease, dan lifecycle interval | `server/remoteClients.ts`; modul registry/history/profile baru |
| Endpoint dan SSE | `server/api.ts`, `server/main.ts` |
| Metadata adapter dan instalasi | `integrations/codex/`, `integrations/hermes/` |
| State koneksi, filter, riwayat | `src/useOffice.ts`; hook terpisah bila perlu |
| Header, drawer, bottom sheet, panel | `src/App.tsx`, `src/styles.css`; komponen panel baru |
| Profil, label, pose, dan state hidden | `src/OfficeScene.ts`, `src/officeLayout.ts`, `src/components/Office.tsx` |
| Aset dan portrait | `public/assets/worker*`, manifest, paket variasi bila dibutuhkan |
| Volume dan panduan migrasi | `deploy/compose.production.yaml`, `docs/SERVER-CLIENT.md`, `docs/CODEX-BRIDGE.md` |

## Kriteria penerimaan rilis

1. Dua provider pada satu machine ID muncul sebagai satu mesin dengan status provider masing-masing. Dua mesin tidak saling menimpa meski project bernama sama.
2. Client terhubung tanpa session aktif terlihat idle; heartbeat yang kedaluwarsa terlihat terputus setelah 35 detik. SSE terputus tidak ditampilkan sebagai bukti semua client agent offline.
3. Activity event memperbarui label dan pose tanpa reload. Target latensi tampilan paling lama tiga detik pada koneksi normal diuji menggunakan event nyata dan tercatat sebagai hasil pengujian.
4. Transisi working, thinking, waiting, done, dan aktif kembali bekerja saat duduk maupun berjalan. Waiting tetap hadir; done dan kehilangan lease membuat orang pulang.
5. Session yang sama mempertahankan profil setelah refresh browser, reconnect, penghapusan metadata selesai, dan restart server. Meja sebelumnya dipakai lagi bila tersedia; konflik meja tidak memindahkan orang yang sedang bekerja.
6. Filter lalu hapus filter tidak mencatat selesai, tidak memindahkan komputer, dan tidak memutar ulang kedatangan. Badge koneksi tidak ikut menyusut mengikuti filter.
7. Completion, retry heartbeat, SSE reconnect, dan restart client tidak menduplikasi interval riwayat. Koneksi hilang mempunyai alasan akhir berbeda dari selesai menurut sumber.
8. Restart server mempertahankan profil dan riwayat yang tersimpan. Registry baru dianggap online setelah heartbeat baru. Retensi membersihkan data sesuai batas dan melindungi profil yang sedang aktif.
9. Bridge lama, API script manual, dan endpoint health lama tetap berfungsi. Metadata baru yang invalid ditolak seluruhnya tanpa mengubah state lama.
10. Payload client otomatis, snapshot, registry, persistence, serta history tidak berisi prompt, full path, command mentah, output tool, hostname otomatis, atau token API.
11. Panel dapat digunakan dengan keyboard; pengujian browser mencakup viewport 390 × 844, 580 × 853, dan 1366 × 768. Reduced motion mempertahankan informasi status tanpa animasi perjalanan atau kopi.
12. Ukur performa pada 1, 15, dan 64 avatar di Mac pengembangan dengan target minimal 30 FPS untuk 64 avatar. Aturan label otomatis mengurangi kepadatan sebelum menambah detail grafis. Laporkan pengukuran sebenarnya saat implementasi; target ini belum merupakan hasil tes.

Unit test difokuskan pada lease, deduplikasi interval, batas retensi, alokasi meja dengan konflik, validasi metadata, dan kategori activity. Integration test memeriksa client HTTP, SSE reconnect, persistence restart, volume produksi, serta backward compatibility. Pemeriksaan browser memverifikasi pose, label, filter, fokus panel, reduced motion, dan keterbacaan. Smoke test publik menggunakan session Codex/Hermes nyata setelah deployment dan menyimpan screenshot hasilnya.

## Batas rilis

Rilis ini mencakup enam fitur viewer. Ia tidak menambahkan perintah menjalankan agent, editor prompt, orkestrasi subagent, statistik penggunaan model, atau workflow YouTube. Riwayat mengukur kehadiran yang terpantau. Observer Codex tetap bergantung pada format event lokal; activity dan status yang tidak tersedia memakai fallback umum, tanpa mengarang keadaan pekerjaan.
