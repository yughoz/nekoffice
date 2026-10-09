# PRD Virtual Office untuk Produksi Video YouTube

Versi 1.0 · 6 Oktober 2026 · Zona waktu pengguna Asia/Jakarta

Status Draft untuk baseline implementasi

Virtual Office adalah aplikasi browser untuk menyaksikan agent AI dan subagent bekerja menghasilkan video YouTube. Aktivitas mereka ditampilkan sebagai manusia chibi di kantor cozy pixel art, dilihat dari atas dengan sudut tiga perempat. Pengguna mengikuti proses sebagai penonton: melihat siapa yang bekerja, apa yang sedang dibuat, bagaimana hasil berpindah antartim, dan mengapa sebuah pekerjaan tertahan.

Produk dimulai dari demo simulasi lengkap, kemudian memakai workflow agent nyata dengan kontrak status dan event yang sama. Video landscape menjadi format pertama; Shorts memakai preset produksi tersendiri setelah alur landscape berjalan. Keberhasilan produk bergantung pada dua hal sekaligus: kantor terasa hidup dan menarik ditonton, serta informasi pekerjaan tetap benar dan mudah dipahami.

Dokumen ini menjadi acuan produk dan implementasi. Fitur, target pengujian, dan stack yang belum dibuat merupakan spesifikasi rencana, bukan kemampuan aplikasi yang sudah tersedia.

## 1 Keputusan produk dan asumsi awal

| Area | Keputusan atau asumsi | Status |
| --- | --- | --- |
| Tujuan | Kantor virtual untuk memantau agent dan subagent yang benar-benar bekerja | Dipilih pengguna |
| Tahap awal | Demo simulasi sebelum integrasi nyata | Dipilih pengguna |
| Visual | Cozy pixel art, pandangan dari atas dengan sudut tiga perempat | Dipilih pengguna |
| Karakter | Manusia chibi | Dipilih pengguna |
| Interaksi utama | Penonton; pekerjaan agent berlangsung otomatis | Dipilih pengguna |
| Workflow | Research dan Planning, Creative Studio, Production Room, QA dan Publishing | Berasal dari rancangan pengguna |
| Format video | Landscape dan Shorts; landscape dikerjakan lebih dulu | Dipilih pengguna |
| Gambar AI | Bumi dengan model `openai/gpt-image-2` | Dipilih pengguna |
| Pipeline sprite | Menggunakan skill `sprite-gen` | Diminta pengguna; skill terpasang |
| Skill gamedev | Koleksi `awesome-gamedev-agent-skills` dan router | Diminta pengguna; terpasang |
| Populasi demo | 1 koordinator, 4 lead, 8 subagent | Usulan awal, dapat dikonfigurasi |
| Platform awal | Desktop browser; mobile mendukung pengamatan dasar | Usulan awal |
| Bahasa UI | Bahasa Indonesia | Usulan awal sesuai pengguna |
| Jumlah project aktif | Satu run aktif pada demo dan alpha awal | Usulan awal |
| Sumber brief | Preset demo; formulir atau input dari runtime untuk mode nyata | Usulan awal |
| Stack | TypeScript, React, Phaser, backend Node.js | Usulan teknis; belum dipasang |
| Publishing awal | Menghasilkan paket siap publikasi; unggah nyata pada tahap berikutnya | Usulan tahapan |
| LLM dan TTS | Adapter provider; provider belum dipilih | Keputusan terbuka |
| Anggaran produksi | Dikonfigurasi sebelum run berbayar | Keputusan terbuka |

Angka populasi, ukuran sprite, durasi animasi, resolusi, dan target performa dalam bagian berikut merupakan nilai awal untuk diuji. Implementasi boleh menyesuaikannya apabila kriteria keterbacaan dan perilaku produk tetap terpenuhi; perubahan dicatat dalam keputusan teknis.

## 2 Masalah yang diselesaikan

Workflow multiagent sulit diikuti ketika informasi tersebar di log, antrean, file, dan dashboard provider. Pengguna melihat proses berjalan, tetapi sering tidak tahu agent mana yang bertanggung jawab, apakah sebuah langkah menunggu dependensi atau gagal, hasil mana yang terbaru, dan seberapa dekat video dengan tahap publikasi.

Virtual Office menyatukan aktivitas tersebut dalam ruang yang mudah dibaca. Ruangan menunjukkan fungsi tim, avatar menunjukkan pelaksana, meja menunjukkan jenis pekerjaan, dan perpindahan artefak menunjukkan serah terima. Panel serta timeline menyediakan detail ketika pengguna membutuhkannya.

Animasi harus membantu pemahaman. Avatar yang mengetik tidak cukup untuk membuktikan task sedang berjalan; status dan hasil berasal dari simulator atau runtime yang menjadi sumber data pada mode tersebut.

## 3 Tujuan produk dan indikator keberhasilan

| ID | Tujuan | Indikator penerimaan |
| --- | --- | --- |
| GOAL-01 | Membuat workflow mudah dipahami | Dalam uji dengan minimal 5 pengguna, setidaknya 4 dapat menemukan tahap aktif, pemilik task, dan hambatan utama dalam 30 detik |
| GOAL-02 | Membuat kantor menarik ditonton | Dalam uji demo, setidaknya 4 dari 5 pengguna memberi nilai minimal 4 dari 5 untuk keterbacaan aktivitas dan daya tarik visual |
| GOAL-03 | Menjaga representasi yang benar | Semua status dan artefak yang ditampilkan dapat ditelusuri ke event atau snapshot dari mode yang aktif |
| GOAL-04 | Memungkinkan migrasi simulator ke runtime nyata | Komponen kantor dan panel memakai kontrak event yang sama pada kedua mode |
| GOAL-05 | Menghasilkan video landscape secara nyata | Vertical slice nyata menghasilkan paket video, audio, caption, thumbnail, metadata, dan laporan QA yang konsisten |
| GOAL-06 | Menghindari kerja ulang yang tidak perlu | Revisi hanya menjalankan ulang task terdampak beserta dependensi turunannya |

Angka uji usability merupakan ambang awal untuk keputusan release, bukan hasil riset yang sudah diperoleh. Keberhasilan channel, views, pendapatan, dan viralitas berada di luar indikator MVP.

## 4 Pengguna dan konteks penggunaan

Pengguna utama adalah pemilik workflow produksi konten yang ingin melihat agent bekerja tanpa mengelola setiap langkah. Ia dapat membuka kantor ketika run sedang berlangsung, memilih avatar, mengikuti satu tim, melihat hasil, lalu meninggalkan tab sementara backend terus bekerja pada mode nyata.

Kebutuhan utamanya adalah mengetahui apakah pekerjaan berjalan, apa yang sudah tersedia, dan apa yang membutuhkan perhatian. Mode penonton berlaku terhadap aktivitas kantor; pemilik tetap dapat mengatur brief, provider, anggaran, dan kebijakan publishing sebelum workflow nyata dimulai.

Pengembang atau operator memiliki kebutuhan tambahan untuk memeriksa tool execution, retry, event, dan penggunaan provider. Detail ini ditempatkan dalam panel operasional yang terpisah dari tampilan utama.

## 5 Cakupan dan prioritas release

Prioritas P0 berarti wajib untuk demo pertama. P1 berarti wajib untuk alpha dengan agent nyata. P2 berarti perluasan setelah alpha stabil.

| Area | P0 Demo | P1 Alpha nyata | P2 Perluasan |
| --- | --- | --- | --- |
| Kantor | Empat zona, avatar, kamera, pemilihan, timeline | Event nyata dan indikator koneksi | Kantor lebih besar dan beberapa project |
| Workflow | Simulasi lengkap beserta revisi dan kegagalan | Produksi landscape dengan artefak nyata | Preset Shorts dan variasi workflow |
| Agent | Hierarki dan task simulasi | Agent/tool execution yang dapat ditelusuri | Struktur tim dan concurrency lebih besar |
| Gambar | Asset kantor yang diproduksi sebelumnya | Adapter Bumi untuk gambar video | Provider gambar tambahan bila diperlukan |
| Publishing | Tahap simulasi berlabel jelas | Paket siap publikasi | Integrasi YouTube dan penjadwalan |
| Penyimpanan | Snapshot demo di browser | Database dan artifact store | Retensi dan backup untuk deployment |
| Operasional | Reset, pause, speed demo | Budget, retry, cancel, pemulihan | Multiuser dan akses operator |

Di luar MVP: kontrol berjalan dengan WASD, menyeret agent ke meja, stamina karakter, ekonomi kantor, dekorasi yang dapat dibeli, multiplayer, chat antarpemain, editor video manual penuh, optimasi otomatis untuk views, dan integrasi semua layanan dalam satu release.

Produk tidak membaca chat Codex atau agent dari aplikasi lain secara otomatis. Integrasi semacam itu memerlukan adapter dan akses resmi yang dipilih terpisah.

## 6 Istilah dan model konseptual

| Istilah | Makna |
| --- | --- |
| Project | Identitas konten atau seri video yang memiliki brief dan riwayat run |
| Run | Satu pelaksanaan workflow dengan konfigurasi, event, dan artefak sendiri |
| Agent | Pelaksana logika yang bertanggung jawab atas satu atau beberapa task |
| Lead | Agent yang mengoordinasikan pekerjaan pada satu fungsi atau zona |
| Subagent | Agent dengan ruang lingkup terbatas yang memiliki hubungan induk |
| Task | Unit pekerjaan dengan input, dependensi, pemilik, status, dan output |
| Attempt | Satu percobaan eksekusi sebuah task; retry membuat attempt baru |
| Avatar | Representasi visual agent; jumlah avatar tidak menunjukkan jumlah koneksi LLM aktif |
| Artifact | Output yang tersimpan dan memiliki identitas, versi, asal, serta validasi |
| Event | Perubahan keadaan yang dikirim simulator atau runtime |
| Snapshot | Keadaan lengkap run pada suatu posisi event |
| Handoff | Pemindahan hasil atau tanggung jawab yang divisualkan sebagai serah terima |

Satu task dapat memakai tool deterministik tanpa LLM. Label aktivitas harus menjelaskan pekerjaan aktual, misalnya render dengan tool atau pembuatan gambar melalui provider, sehingga pengguna tidak menganggap semua avatar sebagai panggilan model yang berjalan bersamaan.

## 7 Perjalanan pengguna

### 7.1 Menonton demo pertama

1. Pengguna membuka aplikasi dan melihat pilihan demo dengan penanda Simulasi.
2. Preset project menjelaskan topik video dan hasil contoh yang akan ditampilkan.
3. Kantor terbuka dalam tampilan keseluruhan, menampilkan koordinator dan empat tim.
4. Koordinator membentuk rencana; Research memulai tugas awal.
5. Tugas Creative berjalan paralel; hasil masuk ke Production.
6. QA menemukan satu masalah contoh dan meminta revisi terarah.
7. Setelah revisi, workflow mencapai paket siap publikasi dan publikasi simulasi.
8. Pengguna membuka artefak contoh dan ringkasan hasil.

Durasi demo usulan 3–5 menit pada kecepatan 1x. Pause, 2x, dan 4x hanya mengubah waktu simulator. Demo tidak melakukan panggilan provider berbayar atau upload YouTube.

### 7.2 Menonton run nyata

1. Pemilik mengatur brief atau menerima brief dari sumber input yang dikonfigurasi.
2. Sistem memvalidasi provider yang dibutuhkan, anggaran, preset output, dan kebijakan publishing.
3. Run dimulai; kantor menampilkan event runtime.
4. Pengguna mengamati avatar, task, output, dan penggunaan yang tersedia.
5. Gangguan yang dapat dipulihkan ditangani sesuai retry policy. Gangguan lain muncul sebagai membutuhkan perhatian.
6. Run menghasilkan paket yang lulus QA atau alasan mengapa pekerjaan belum dapat selesai.
7. Jika publishing telah diaktifkan, sistem melanjutkan sesuai kebijakan project yang sudah dikonfigurasi.

### 7.3 Kembali setelah menutup tab

Pada demo, aplikasi memulihkan snapshot browser yang kompatibel. Pada mode nyata, aplikasi mengambil snapshot backend lalu melanjutkan event dari cursor yang sesuai. Menutup tab tidak membatalkan worker; informasi koneksi dibedakan dari keadaan pekerjaan.

## 8 Struktur tim dan tanggung jawab

Susunan awal yang diusulkan adalah 13 avatar: satu koordinator, empat lead, dan delapan subagent. Jumlah subagent aktif dapat bertambah atau berkurang sesuai task; placeholder kosong tidak disajikan sebagai pekerjaan aktif.

| Peran | Tanggung jawab | Contoh subagent | Identitas visual |
| --- | --- | --- | --- |
| Koordinator | Menafsirkan brief, membentuk rencana, menjaga dependensi dan batas run | Planner bila diperlukan | Cardigan navy dan clipboard |
| Lead Research | Riset, sumber, sudut cerita, skrip dan storyboard | Researcher, Scriptwriter | Hijau, kacamata dan buku |
| Lead Creative | Audio, gambar, thumbnail dan bahan caption | Voice Artist, Visual Artist | Pastel, headphone dan tablet |
| Lead Production | Penyusunan timeline, komposisi dan render | Editor, Render Worker | Ungu, hoodie dan headset |
| Lead QA dan Publishing | Validasi hasil, revisi, metadata dan persiapan upload | QA Reviewer, Publisher | Peach, checklist dan badge roket |

AGT-01 P0: Setiap avatar terhubung ke agent ID yang stabil selama run. Memilih avatar menampilkan role, parent, task aktif, task terakhir, dan output terkait.

AGT-02 P0: Warna tim mengikuti induk; badge dan aksesori membedakan lead dan subagent. Ukuran badan mengikuti satu standar agar posisi dalam hierarki tidak mengorbankan keterbacaan.

AGT-03 P1: Runtime membatasi kedalaman subagent dan concurrency melalui konfigurasi. Usulan awal maksimal dua tingkat di bawah koordinator dan empat tool job bersamaan; angka akhirnya mengikuti kapasitas provider serta anggaran.

AGT-04 P1: Panel menampilkan ringkasan keputusan operasional dan bukti hasil. Penalaran internal model tidak menjadi syarat UI.

AGT-05 P1: Runner nyata mendukung delegasi dari parent ke subagent dengan agent ID, task ID, input, output contract, budget, dan hubungan parent yang tercatat. Hasil kembali ke parent melalui referensi artifact/version yang tervalidasi. Alpha harus membuktikan minimal satu parent mendelegasikan ke dua subagent yang menjalankan LLM atau tool AI nyata; queue worker yang hanya diberi nama karakter belum memenuhi gate multiagent ini.

## 9 Workflow produksi dan dependensi

Workflow menggunakan graf task dengan dependensi. Jalur utamanya adalah brief, riset, skrip dan storyboard, pembuatan asset, penyusunan video, render, QA, lalu publishing. Task kreatif independen dapat berjalan bersamaan setelah inputnya siap.

```text
Brief → Research → Outline → Script → Storyboard
Script → TTS → Audio dan timing ─────────────┐
Storyboard → Gambar adegan ──────────────────┤
Script + timing audio → Caption final ───────┤
                                            ↓
                           Timeline → Render → QA video ──────┐
Storyboard → Thumbnail dan validasinya ───────────────────────┤
Script → Metadata dan validasinya ────────────────────────────┤
                                                             ↓
                                             QA paket lengkap
                                                             ↓
                                       Paket siap publikasi
                                                             ↓
                                  Kebijakan publishing project
```

Thumbnail dan metadata diperlukan untuk paket publikasi; keduanya tidak harus menghalangi render video jika asset video sudah siap. Caption final membutuhkan timing audio yang stabil. Setiap join memeriksa versi input dan validasi artefak, bukan sekadar status task selesai.

### 9.1 Research dan Planning

WF-01 P0/P1: Brief memuat topik, tujuan, audiens, bahasa, target durasi, format, tone, gaya visual, ketentuan sumber, dan batas produksi. Preset demo menyediakan semua nilai; formulir nyata menandai kolom wajib.

WF-14 P1: Kontrol Mulai run nyata memerlukan topik, audiens, bahasa, preset output, target durasi, serta konfigurasi budget yang valid. Tone/gaya memakai default yang terlihat jika tidak diisi. Preflight memeriksa kemampuan preset, credential/provider yang diperlukan, renderer, writable storage, dan kebijakan publishing; draft_only tidak memerlukan koneksi YouTube. Error ditampilkan per field atau capability dan dapat diperbaiki. Preflight gagal tidak menjadwalkan pekerjaan berbayar.

WF-02 P1: Research menyimpan daftar sumber beserta URL, tanggal akses, ringkasan, dan klaim yang didukung. Keluaran mencakup outline, skrip bernarasi, serta storyboard dengan scene ID.

WF-03 P1: Storyboard menyebut teks narasi, kebutuhan visual, durasi perkiraan, dan transisi per adegan. Perubahan skrip menghasilkan versi baru dan menandai task turunannya untuk divalidasi ulang.

### 9.2 Creative Studio

WF-04 P0/P1: TTS, gambar adegan, thumbnail, dan metadata awal dapat dijadwalkan paralel menurut dependensinya. Status setiap pekerjaan tampil terpisah.

WF-05 P1: TTS menyimpan audio dan timing atau hasil alignment. Provider suara, lisensi voice, dan parameter audio ditentukan sebelum integrasi; kegagalan audio tidak dianggap selesai karena animasi rekaman sudah berakhir.

WF-06 P1: Gambar adegan memakai Bumi sesuai scene brief. Prompt, model, parameter, generation ID, hasil, dan asal versi tersimpan. Seed atau determinisme tidak diasumsikan tersedia jika schema model tidak menyediakannya.

WF-07 P1: Caption draft dapat berasal dari skrip, tetapi caption final memakai timing audio yang disetujui. Perubahan narasi mengharuskan caption diperiksa ulang.

### 9.3 Production Room

WF-08 P1: Editor membentuk timeline deklaratif dari scene, gambar, audio, caption, transisi, dan preset format. Usulan renderer awal adalah FFmpeg; backend memvalidasi tool yang tersedia sebelum run.

WF-09 P1: Render menghasilkan file sementara, validasi teknis, lalu publikasi artefak secara atomik. File setengah jadi tidak menjadi video final dan tidak membuka tahap publishing.

WF-10 P1: Persentase render ditampilkan bila berasal dari renderer dan total yang terukur. Jika provider tidak memberi progress, UI menampilkan tahap, elapsed time, dan indikator aktivitas tanpa persentase buatan.

### 9.4 QA dan Publishing

WF-11 P0/P1: QA menilai video beserta versi audio, caption, thumbnail, dan metadata yang masuk paket. Setiap temuan memiliki severity, bukti, pemilik perbaikan, dan tindak lanjut.

WF-12 P0/P1: Revisi membuat task atau versi baru. Task yang tidak terdampak tetap dapat digunakan. Usulan batas revisi otomatis dua putaran per masalah; setelah batas tercapai status menjadi membutuhkan perhatian.

WF-13 P1: Paket siap publikasi terbentuk hanya ketika pemeriksaan wajib lulus. Tidak dapat diperiksa bukan lulus.

## 10 Status pekerjaan dan status animasi

Status bisnis dan status visual disimpan terpisah. Pekerjaan boleh berakhir ketika avatar masih berjalan; UI segera menampilkan status terbaru lalu menyelesaikan transisi visual yang pendek. Animasi tidak menjadi dependensi task.

| Status task | Makna | Visual utama |
| --- | --- | --- |
| queued | Siap dijadwalkan, menunggu kapasitas | Idle di area tim |
| waiting_dependency | Input atau task lain belum tersedia | Menunggu dengan ikon dependensi |
| waiting_external | Provider sudah menerima pekerjaan dan belum mengembalikan hasil | Indikator layanan dan waktu berjalan |
| running | Attempt sedang dikerjakan | Animasi profesi sesuai tool/task |
| retry_scheduled | Percobaan baru akan dijalankan setelah jeda | Indikator retry dan waktu bila diketahui |
| blocked | Kondisi membutuhkan perubahan atau input | Avatar berhenti dengan tanda perhatian |
| succeeded | Output memenuhi kontrak task | Handoff atau selebrasi singkat |
| failed | Task tidak dapat selesai setelah kebijakan retry; kegagalan attempt tersimpan dalam riwayat | Gesture gagal singkat dan alasan di panel |
| cancelled | Eksekusi dihentikan atau tidak dilanjutkan | Kembali idle; penanda dibatalkan di panel |
| skipped | Task tidak diperlukan oleh preset/rencana | Tidak digambarkan sebagai hasil kerja |

Task terminal tidak diubah menjadi running secara diam-diam. Retry membuat attempt baru; revisi membuat task baru atau output version baru yang terhubung pada riwayat.

Status run: created, validating, running, attention_required, ready_to_publish, cancelling, completed, failed, dan cancelled. Run juga menyimpan `scheduling_paused` serta `cancellation_requested_at`. Flag pause dan intent cancel persisten serta dipulihkan setelah restart. Run tidak menjadi cancelled ketika operasi eksternal masih membutuhkan rekonsiliasi. Status publishing dikelola tersendiri agar completed pada produksi tidak salah dibaca sebagai tayang di YouTube.

STATE-01 P0/P1: Ikon, teks, dan warna saling melengkapi. Warna bukan satu-satunya cara membedakan sukses, menunggu, gagal, dan dibatalkan.

STATE-02 P1: Koneksi stale atau terputus menandai informasi sebagai terakhir diketahui. UI tidak menyimpulkan semua task gagal karena koneksi browser putus.

STATE-03 P1: Biaya, token, estimasi, dan progress yang tidak tersedia ditampilkan sebagai belum tersedia, bukan nol.

STATE-04 P0/P1: Badge aktivitas agent dan tanda perhatian dipisahkan. Jika agent mempunyai task running sekaligus task blocked/failed yang belum terselesaikan, aktivitas masih terlihat dan marker perhatian tetap muncul. Filter agent berdasarkan status cocok jika salah satu task aktif/relevan memenuhi filter; panel menampilkan seluruh task bersamaan. Error attempt lama yang sudah pulih tidak terus menjadi marker perhatian.

## 11 Tata ruang kantor

Kantor memakai satu lantai dengan empat zona kerja dan koridor tengah. Orientasi awal memprioritaskan jalur horizontal dan vertikal yang mudah dibaca, dengan tampilan permukaan meja dan bagian depan furniture.

```text
┌──────────────────────────┬────────────────────────────┐
│ RESEARCH DAN PLANNING    │ CREATIVE STUDIO            │
│ Buku, catatan, browser   │ Mic, tablet, visual, audio │
├──────────────────────────┴────────────────────────────┤
│ Lounge, koridor lapang, papan project dan koordinator │
├────────────────────────────┬──────────────────────────┤
│ PRODUCTION ROOM            │ QA DAN PUBLISHING        │
│ Timeline, editor, render   │ Review, paket, upload    │
└────────────────────────────┴──────────────────────────┘
```

WORLD-01 P0: Tiap zona punya label UI, landmark, furniture, dan accent warna. Label tetap berupa teks UI, tidak dibakar ke gambar background.

WORLD-02 P0: Tiap workstation punya titik antre, titik kerja, dan titik keluar. Jalur avatar memakai navigation grid yang memperhitungkan meja serta dinding. Usulan lebar koridor minimal dua footprint karakter.

WORLD-03 P0: Agent berjalan saat berganti tempat kerja atau handoff. Aktivitas dekoratif seperti kopi dibatasi agar tidak menutupi pekerjaan penting.

WORLD-04 P0: Avatar tidak berjalan menembus furniture. Penumpukan di workstation ditangani dengan slot antre; jika gagal menemukan jalur, posisi dan status tetap dapat diakses melalui daftar agent.

WORLD-05 P0: Pengurutan gambar mengikuti posisi kaki pada sumbu vertikal agar agent melewati furniture secara wajar. Occlusion tidak boleh membuat avatar terpilih sulit ditemukan.

## 12 Arah visual dan spesifikasi asset

Palet lingkungan memakai kayu madu, krem, sage, dan peach. Cahaya hangat berasal dari arah yang konsisten. Karakter mempunyai kepala besar, badan ringkas, wajah sederhana, dan aksesori profesi yang tetap terbaca saat kantor tampil keseluruhan.

Referensi visual awal: [konsep kantor dengan tiga karakter](../assets/concepts/office-v1.png). Gambar tersebut menjadi acuan suasana dan identitas karakter. Produksi runtime perlu menaikkan sudut kamera, menyamakan skala, dan mengendalikan grid serta palet.

| Komponen | Usulan awal | Kriteria wajib |
| --- | --- | --- |
| Canvas logis | 640 × 360, dapat diperluas bila layout membutuhkan | Seluruh kantor terbaca pada fit view |
| Tile | 16 × 16 atau 32 × 32 setelah blockout | Satu standar grid untuk dunia |
| Karakter | Tinggi isi 24–32 pixel logis, frame 48 × 48 | Ukuran, kaki, pivot dan proporsi konsisten |
| Pivot | Bottom center pada titik kaki | Tidak meloncat antarframe |
| Filtering | Nearest neighbor, pembulatan posisi render | Tepi pixel tajam pada zoom normal |
| Arah jalan | Empat arah untuk MVP | Facing mengikuti gerak dan anchor yang sama |
| Detail warna | Palet keluarga yang dikendalikan | Tidak memakai detail halus yang hilang di skala game |
| UI | Font biasa yang tajam dan terbaca | Ukuran teks independen dari zoom kantor |

ART-01 P0: Asset dipisahkan menjadi lantai, dinding, furniture, dekorasi, karakter, shadow, efek, dan ikon. Kantor tidak menggunakan satu gambar konsep dengan karakter tertanam sebagai dunia interaktif final.

ART-02 P0: Pipeline menghasilkan source image, sprite hasil ekstraksi, atlas runtime, manifest frame, preview motion, dan laporan QA. Runtime membaca frame dari manifest, tidak menebak grid hasil generasi.

ART-03 P0: Setiap asset mencatat ukuran, anchor, frame count, fps, loop flag, varian, sumber, dan status review. File yang tidak memenuhi kontrak gagal masuk manifest release.

ART-04 P0: Bumi membuat anchor/row sesuai adapter yang dipilih; `sprite-gen` menjalankan cleanup, extraction, alignment, compose, dan pemeriksaan yang relevan. Bumi bukan provider bawaan skill; adapter tidak boleh mengubah pipeline ekstraksi menjadi pemotongan grid sekali jadi yang belum diverifikasi.

Inventaris awal: empat set workstation zona, meja koordinator, papan project, lounge, dua jenis lantai bila perlu, dinding dan pintu, rak buku, microphone, drawing tablet, dua monitor production, checklist QA, dekorasi tanaman, lima identitas role utama, varian rambut/pakaian subagent, ikon status, folder handoff, dan efek selesai.

## 13 Animasi dan feedback

Semua angka berikut adalah target awal yang diperiksa lewat preview pada skala game. Animasi karakter memakai frame yang sudah diekstraksi; efek kecil pada UI dapat memakai tween.

| State visual | Usulan frame dan timing | Penggunaan |
| --- | --- | --- |
| idle | 4 frame, 3–5 fps, loop | Bernapas atau mengangguk ringan |
| walk | 6–8 frame per arah, 8–12 fps | Perjalanan antartitik kerja |
| research | 4–6 frame, 5–7 fps, loop | Membaca dan mencatat |
| typing | 4–6 frame, 6–8 fps, loop | Menulis, metadata, atau task umum |
| drawing | 4–6 frame, 6–8 fps, loop | Visual dan thumbnail |
| recording | 4–6 frame, 5–7 fps, loop | Narasi dan TTS |
| editing | 4–6 frame, 6–8 fps, loop | Timeline dan produksi |
| reviewing | 4–6 frame, 5–7 fps, loop | QA |
| waiting | Idle ditambah indikator dependensi | Menunggu tanpa kesan bekerja aktif |
| handoff | 4–6 frame, satu kali | Mengirim atau menerima hasil |
| success | 4–6 frame, sekitar 0,6–1 detik | Selesai, lalu kembali ke state berikutnya |
| blocked atau error | 2–4 frame singkat lalu idle | Masalah dibaca lewat ikon dan panel |

ANIM-01 P0: Pose, volume badan, warna, facing, dan baseline stabil antarframe. Gerakan kaki harus sesuai arah dan tidak terlihat meluncur pada kecepatan jalan yang dipakai.

ANIM-02 P0: Monitor atau lampu workstation aktif mengikuti pekerjaan zona. Progress provider yang belum diketahui tidak digambarkan sebagai meter yang terus mengisi sampai selesai.

ANIM-03 P0: Event yang datang lebih cepat daripada animasi digabung atau dilewati secara visual berdasarkan prioritas. Status terakhir tampil segera; kantor tidak tertinggal puluhan animasi di belakang backend.

ANIM-04 P0: Selebrasi dan handoff tidak memblokir klik atau panel. Tidak ada shake kamera atau flash besar pada setiap task rutin.

ANIM-05 P0: Reduced motion mematikan gerakan dekoratif, pop berlebihan, dan perpindahan kamera otomatis. Status tetap terbaca dari teks dan ikon.

ANIM-06 P0: Coverage minimum idle dan walk adalah empat facing. Pose profesi memakai facing workstation yang dideklarasikan; MVP dapat membatasi orientasi tiap jenis meja agar hanya satu atau dua facing kerja diperlukan. Waiting memakai idle pada facing terakhir. Handoff dan success minimal memiliki facing depan/samping yang diperlukan layout; perpindahan facing dilakukan saat avatar berhenti. Manifest mencatat coverage dan fallback yang telah direview, sehingga renderer tidak menebak atau membalik sprite dengan aksesori yang tidak simetris.

## 14 Layar dan interaksi penonton

### 14.1 Tampilan kantor

Bar atas memuat nama project, format video, mode Simulasi atau Nyata, status run, dan indikator koneksi. Kantor menjadi area utama. Ringkasan tahap serta antrean per ruangan tampil tanpa membuka panel.

Panel detail di sisi kanan muncul ketika agent, task, ruangan, atau project dipilih. Timeline ringkas berada di bawah atau pada drawer. Layout harus tetap terbaca pada viewport desktop 1280 × 720; target desain utama 1440 × 900.

UI-01 P0: Klik avatar, workstation, atau daftar agent membuka entitas yang sama. Nama agent ditampilkan ketika hover atau dipilih; semua nama tidak memenuhi kantor secara permanen.

UI-02 P0: Filter tersedia untuk tim, status, dan project/run aktif. Agent terpilih mendapat outline serta marker yang tidak bergantung pada warna.

UI-03 P0: Kamera mendukung fit office, pan, zoom, reset, dan follow agent. Usulan rentang zoom 1x–4x; zoom kantor tidak mengecilkan teks UI.

UI-04 P0: Follow memakai smoothing dan berhenti jika pengguna pan manual. Pengguna dapat memilih agent melalui daftar ketika avatar tertutup atau berada di luar viewport.

### 14.2 Panel agent dan task

Panel agent memuat identitas, role, parent, subagent, pekerjaan aktif, pekerjaan terakhir, dan tautan hasil. Panel task memuat input, dependensi, status, attempt, elapsed time, output, ringkasan tool, serta alasan blocked/failed.

UI-05 P0/P1: Semua angka dan ringkasan mempunyai konteks yang jelas. Perkiraan tidak disajikan sebagai durasi pasti, dan penggunaan biaya yang tidak tersedia tidak ditampilkan sebagai nol.

### 14.3 Papan project dan artefak

Papan project menunjukkan tahap lengkap, aktif, tertahan, dan belum dimulai. Artifact viewer mendukung gambar, audio, video, skrip, caption, metadata, serta QA report sesuai format yang tersedia. File yang besar dimuat saat dibuka.

UI-06 P0: Contoh artefak demo diberi penanda Simulasi atau Contoh. Preview dari fixture tidak dianggap sebagai hasil pembuatan provider nyata.

### 14.4 Timeline dan panel operasional

Timeline mengutamakan kejadian yang bermakna: task mulai, output siap, handoff, revisi, masalah, render selesai, dan perubahan publishing. Log heartbeat serta detail teknis tidak memenuhi feed utama.

Panel operasional dapat memuat retry task, cancel run, pause scheduling, budget, dan konfigurasi provider. Panel ini adalah kontrol proses; pengguna tidak memberi instruksi melalui posisi avatar.

UI-07 P1: Pause scheduling menahan task baru. Panggilan eksternal yang sudah berjalan tidak diasumsikan berhenti; statusnya tetap dipantau. Cancel memiliki hasil per task sesuai kemampuan tool/provider.

UI-08 P0/P1: Pause visual hanya menghentikan gerakan di browser dan tidak mengubah task backend. Nama kontrol membedakan pause demo, pause visual, dan pause scheduling.

UI-09 P1: Attention panel menyebut penyebab, task terdampak, dan tindakan yang tersedia: memperbaiki konfigurasi, menambah budget, merevisi input, mengizinkan attempt tambahan, atau membatalkan. Setelah tindakan, command resume menjalankan preflight ulang dan hanya melanjutkan task yang tertahan/terdampak. Artefak serta cabang yang masih valid tidak dibuat ulang. Task failed terminal membutuhkan retry/attempt baru; resume tidak menghapus riwayat kegagalan.

## 15 Responsivitas dan aksesibilitas

ACC-UI-01 P0: Panel, tombol, daftar, dan artifact viewer dapat dinavigasi dengan keyboard. Esc menutup panel atau modal paling atas; fokus kembali ke kontrol pemicu.

ACC-UI-02 P0: Ukuran teks dapat diperbesar tanpa menutup kontrol penting. Warna status memakai ikon dan label. Target kontras teks normal minimal 4,5:1 dan fokus keyboard terlihat.

ACC-UI-03 P0: Suara tidak diputar otomatis saat pertama membuka aplikasi. Musik ambient dan SFX mempunyai pengaturan volume serta mute terpisah.

ACC-UI-04 P0: Pada layar sempit, kantor tetap dapat dipan dan panel berubah menjadi drawer. Mode daftar agent/task menyediakan alternatif ketika interaksi canvas sulit. Mobile awal untuk mengamati dan membuka hasil; konfigurasi operasional lengkap dapat difokuskan ke desktop.

ACC-UI-05 P0: Setelan reduced motion dan mute bertahan antar sesi. Ambient seperti kopi dan tanaman tidak membawa informasi status yang hanya dapat diketahui dari animasi.

ACC-UI-06 P0: Target awal pengujian adalah pembesaran teks 200%, viewport mobile 360 × 800 piksel CSS, target sentuh minimal 44 × 44 piksel CSS, serta safe area perangkat. Drawer dan kontrol kamera tidak saling menutupi; pengguna tetap dapat membuka setiap task lewat daftar. Angka ini adalah target desain yang perlu diverifikasi pada perangkat acuan.

## 16 Preset video landscape dan Shorts

Kedua format menggunakan sumber project yang sama bila sesuai, tetapi mempunyai storyboard, komposisi, caption, dan hasil render sendiri. Output Shorts tidak dibuat hanya dengan memotong file landscape tanpa memeriksa visual serta narasi.

| Parameter | Landscape pertama | Shorts berikutnya |
| --- | --- | --- |
| Rasio output usulan | 16:9 | 9:16 |
| Resolusi usulan | 1920 × 1080 | 1080 × 1920 |
| Frame rate usulan | 30 fps | 30 fps |
| Format usulan | MP4, H.264 dan AAC | MP4, H.264 dan AAC |
| Caption | Maksimal dua baris pada area aman | Baris lebih pendek dan area aman yang disesuaikan |
| Storyboard | Komposisi horizontal | Subjek, crop dan pacing vertikal |
| Durasi | Berdasarkan brief | Berdasarkan brief dan kemampuan platform saat integrasi |

VIDEO-01 P1/P2: Preset disimpan dengan versi dan digunakan renderer serta QA. Target durasi adalah konfigurasi, bukan asumsi yang diturunkan dari jumlah scene.

VIDEO-02 P1: Kriteria audio awal meliputi durasi, decode, clipping, keberadaan narasi, serta level yang dapat diukur. Target loudness dan subtitle alignment ditetapkan pada preset sebelum alpha diuji.

VIDEO-03 P2: Klasifikasi Shorts dan kemampuan thumbnail/publishing mengikuti aturan platform yang diverifikasi saat implementasi. PRD tidak mengunci batas durasi platform yang dapat berubah.

## 17 Kontrak artefak dan QA

Setiap output mempunyai identitas, versi, checksum, ukuran, MIME, task/attempt pembuat, input versi asal, waktu, serta lokasi penyimpanan. Artefak baru tidak menimpa artefak yang sudah menjadi dasar QA atau publishing.

| Jenis artefak | Format usulan | Isi minimum |
| --- | --- | --- |
| Brief | JSON | Topik, tujuan, preset, batas dan preferensi |
| Research | JSON dan teks | Sumber, ringkasan, klaim dan relevansi |
| Script | Teks dan JSON scene | Narasi, bahasa, scene ID dan versi |
| Storyboard | JSON | Scene, visual brief, timing perkiraan dan input |
| Audio | WAV sebagai master, MP3 bila perlu | Durasi, format, voice/provider dan timing |
| Scene image | PNG atau WebP | Scene ID, prompt, model dan hasil generation |
| Thumbnail | PNG atau JPEG | Versi, komposisi dan target format |
| Caption | SRT atau VTT | Teks serta timestamp tervalidasi |
| Timeline | JSON | Asset version, posisi, durasi, crop dan transisi |
| Video | MP4 | Preset, durasi, codec dan checksum |
| Metadata | JSON | Judul, deskripsi, bahasa, kategori dan pengaturan publishing |
| QA report | JSON | Pemeriksaan, bukti, severity, hasil dan versi terkait |
| Publish package | JSON manifest | Seluruh artefak yang digunakan dan QA yang berlaku |

QA-01 P0/P1: Pemeriksaan memiliki hasil pass, fail, atau unverified. Temuan critical menghalangi paket siap publikasi; warning mengikuti kebijakan project. Unverified pada pemeriksaan wajib memerlukan pemeriksaan lain atau perhatian operator.

QA-02 P1: Pemeriksaan teknis memverifikasi file dapat dibaca, video/audio dapat didecode, resolusi dan rasio sesuai preset, durasi dalam toleransi brief, scene lengkap, caption tidak keluar dari rentang, dan metadata wajib terisi.

QA-03 P1: Pemeriksaan isi menilai relevansi terhadap brief, klaim dengan sumber, kelengkapan narasi, keterbacaan caption, kualitas visual, dan konsistensi thumbnail. Penilaian model menyertakan bukti serta keterbatasannya; skor model saja tidak membuktikan semua klaim faktual benar.

QA-04 P1: QA menunjuk checksum dan versi exact yang diperiksa. Perubahan artefak setelah QA menandai paket terdampak sebagai perlu diperiksa ulang.

QA-05 P0: Fixture demo mencakup contoh thumbnail tidak lengkap atau caption yang belum selaras, revisi terarah, dan QA ulang. Bukti yang dipakai jelas merupakan contoh simulasi.

## 18 Integrasi Bumi dan pipeline sprite

Adapter gambar memakai API Bumi yang dipilih pengguna. `POST /api/v1/image/generate` menerima `model_id` dan `parameters`, dengan autentikasi Bearer. Payload OpenAI native tidak diasumsikan kompatibel dengan API ini. [Image API Bumi](https://bumi.digital/api-docs/image).

Snapshot katalog yang diperiksa pada 6 Oktober 2026 untuk `openai/gpt-image-2` menyatakan model aktif dan menyediakan schema berikut. Validasi saat run memakai schema provider yang berlaku, bukan angka yang disalin tanpa pemeriksaan. [Katalog model publik Bumi](https://bumi.digital/api/v1/models/pricing?type=image).

| Parameter | Kemampuan pada snapshot |
| --- | --- |
| prompt | Wajib, 1–4.000 karakter |
| input_images | Maksimal 10 URI untuk referensi/edit |
| aspect_ratio | 1:1, 3:2, atau 2:3 |
| quality | low, medium, atau high |
| output_format | webp, jpeg, atau png |
| Harga quality | low 0,072; medium 0,282; high 0,768 credit |

BUMI-01 P1: Backend memvalidasi model dan parameter sebelum submit. Model, kualitas, dan estimasi credit tercatat dalam konfigurasi run. Model alternatif tidak dipakai otomatis ketika pilihan pengguna tidak tersedia.

BUMI-02 P1: Generation ID disimpan segera setelah respons diterima. Polling atau webhook memperbarui status job yang sama sampai hasilnya terminal. Bumi menyediakan status endpoint `/api/v1/generation/{generation_id}` dan callback hasil asynchronous. [Webhooks Bumi](https://bumi.digital/api-docs/webhooks).

BUMI-03 P1: Timeout submit dengan hasil ambigu masuk rekonsiliasi; sistem tidak otomatis melakukan paid POST baru. Status gagal yang sudah pasti dapat mengikuti retry policy dan budget yang dikonfigurasi.

BUMI-04 P1: Callback ganda dan hasil polling yang sama hanya menghasilkan satu artifact version. Webhook diperlakukan sebagai pemberitahuan untuk rekonsiliasi sampai mekanisme autentikasinya diverifikasi; dukungan signature tidak diasumsikan ada.

BUMI-05 P1: Hasil diunduh tanpa meneruskan API key ke URL file, diverifikasi, lalu disimpan di artifact store. URL provider tidak menjadi satu-satunya lokasi permanen.

BUMI-06 P0/P1: Rasio output kantor atau video dapat berbeda dari rasio generation. Crop, komposisi, padding, atau image reference dipilih sesuai tujuan dan diperiksa pada skala target. Transparansi serta seed tidak diminta sebagai parameter apabila schema tidak mendeklarasikannya.

SPRITE-01 P0: `sprite-gen` digunakan pada produksi asset kantor saat development. Aplikasi browser membaca hasil PNG/atlas dan manifest; aplikasi tidak perlu memanggil skill Codex untuk menampilkan setiap frame.

SPRITE-02 P0: Bumi dapat menyediakan anchor dan state row melalui adapter, kemudian tools `sprite-gen` memproses background, frame, anchor, atlas, dan preview yang relevan. Tahap hasil yang diubah manual dicatat; output tidak disebut lolos pipeline bila pemeriksaannya dilewati.

SPRITE-03 P0: Runtime skill memerlukan environment Python terisolasi. Kebutuhan video/RIFE hanya masuk jika pipeline gerak tersebut dipilih. Pipeline asset MVP dapat memakai image rows; pemilihan motion method diputuskan setelah seed karakter yang konsisten tersedia. [Skill sprite-gen](https://github.com/aldegad/sprite-gen).

## 19 Kebijakan publishing dan integrasi YouTube

Publishing adalah kapabilitas tersendiri yang diaktifkan per project. Mode penonton tetap otomatis selama produksi. Pemilik memilih kebijakan sebelum publishing nyata dijalankan, sehingga setiap run mempunyai tujuan akhir yang jelas.

| Kebijakan | Perilaku | Tahap |
| --- | --- | --- |
| draft_only | Berhenti dengan paket siap publikasi | Default usulan semua project sampai pemilik memilih policy lain |
| review_before_upload | Menunggu review paket, kemudian melakukan upload sesuai konfigurasi | Integrasi YouTube |
| auto_private_after_qa | QA lulus memulai upload private secara otomatis | Setelah kanal terhubung |
| auto_publish_after_qa | QA lulus mengikuti pengaturan tayang atau jadwal project | Setelah kemampuan channel/API tervalidasi |

PUB-01 P2: Kebijakan, channel, privacy, jadwal, dan package version tercatat. Review jika dipakai terikat pada versi paket, bukan persetujuan umum terhadap semua video berikutnya.

Menghubungkan OAuth channel tidak mengubah draft_only. Kebijakan upload atau tayang otomatis memerlukan pilihan eksplisit pemilik pada konfigurasi project; perubahan berlaku pada run baru atau command perubahan yang tercatat.

PUB-02 P2: OAuth pengguna dilakukan untuk channel yang dipilih. Token dan sesi upload berada di backend publisher. YouTube Data API tidak menggunakan service account untuk menggantikan akses akun channel. [Autentikasi YouTube](https://developers.google.com/youtube/v3/guides/authentication).

PUB-03 P2: Publisher memakai resumable upload dan menyimpan session URI untuk melanjutkan atau memeriksa upload setelah koneksi putus. Satu operasi upload internal dibuat untuk kombinasi run, video artifact ID/version, dan channel. Package version menjadi referensi review, terpisah dari kunci upload. Revisi thumbnail/metadata saja memperbarui video ID yang sama; command duplikat kembali ke operasi yang sama. [Protokol resumable upload YouTube](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol).

PUB-04 P2: Jika hasil upload ambigu, sistem memeriksa sesi dan hasil provider terlebih dahulu. Jika belum dapat dipastikan, status outcome_unknown meminta rekonsiliasi; sistem tidak membuat upload baru secara diam-diam. Exactly once pada layanan eksternal tidak dijanjikan.

PUB-05 P2: Selesai mengirim byte, memperoleh video ID, selesai diproses platform, dijadwalkan, dan tayang publik merupakan status yang berbeda. URL publik hanya diberi label Tayang setelah ada bukti status yang sesuai.

PUB-06 P2: Metadata, thumbnail, caption upload bila dipakai, dan processing diperiksa tersendiri. Kegagalan memasang thumbnail tidak otomatis mengulang pengiriman seluruh video.

PUB-07 P2: Kemampuan public/scheduled serta quota diperiksa saat onboarding channel. Dokumentasi `videos.insert` menyatakan proyek API yang tidak terverifikasi dan dibuat setelah 28 Juli 2020 dapat dibatasi ke private sampai audit; aplikasi tidak menjanjikan public publishing sebelum kemampuan ini terpenuhi. [Videos insert](https://developers.google.com/youtube/v3/docs/videos/insert).

Pada mode simulasi, seluruh tahap upload dan tayang menggunakan fixture dengan penanda Simulasi. Penyusunan PRD dan keberadaan kredensial Bumi tidak memberi akses YouTube; koneksi channel ditangani pada fase integrasinya.

## 20 Arsitektur dan pemisahan komponen

Usulan stack awal adalah React dan TypeScript untuk UI, Phaser untuk dunia 2D, serta Node.js untuk API, orchestrator dan worker. Phaser dipilih sebagai kandidat karena kebutuhan sprite, scene, kamera, input dan animasi kantor; framework ini menyediakan rendering 2D untuk browser dan mendukung TypeScript. Versi dipilih dan dikunci setelah compatibility check saat bootstrap. [Dokumentasi Phaser](https://docs.phaser.io/phaser/getting-started/what-is-phaser).

Pemilihan ini masih dapat berubah lewat keputusan teknis sebelum implementasi. PixiJS merupakan alternatif jika scene cukup membutuhkan renderer dan pengelolaan gerak sendiri; tim tidak membangun dua renderer sekaligus untuk MVP.

```text
Simulator browser ──────┐
                       ├→ Event adapter → State store → UI React
Backend event stream ──┘                            └→ Scene Phaser

HTTP commands → Backend → Orchestrator → Queue → Workers → Provider/tool
                    │                         │
                    └→ Database + event log ←┘
                    └→ Artifact store → Preview/download
```

ARCH-01 P0: Kontrak domain dan state reducer terpisah dari renderer. React tidak mengubah status task dari timer animasi; renderer tidak menulis state operasional.

ARCH-02 P0: Demo dapat berjalan sebagai aplikasi browser dengan fixture dan penyimpanan lokal. Backend produksi, akun layanan, dan queue eksternal tidak menjadi prasyarat demo.

ARCH-03 P1: Runtime memiliki orchestrator, queue persisten, worker dengan lease, event log, artifact store, dan provider adapter. SQLite serta folder lokal cukup sebagai kandidat alpha satu host; deployment beberapa worker membutuhkan storage dan concurrency control yang sesuai, misalnya PostgreSQL dan object storage.

ARCH-04 P1: Worker menyimpan intent operasi internal dan input fingerprint sebelum mengirim request berbayar, kemudian menyimpan operation ID eksternal ketika respons diterima. Crash setelah provider menerima request tetapi sebelum ID tersimpan menghasilkan outcome_unknown; paid submit ditahan sampai rekonsiliasi, atau run masuk attention_required jika hasil tidak dapat dipastikan. Lease dan fencing token mencegah worker lama menulis setelah task diambil worker lain. Update status dan event menggunakan transaksi atau outbox yang konsisten.

ARCH-05 P1/P2: Adapter LLM, image, TTS dan renderer diimplementasikan pada P1. Kontrak publisher disiapkan pada P1 dan integrasi eksternalnya pada P2. Respons provider dinormalisasi ke kontrak internal; error, capability cancellation, usage, dan fase eksternal dinyatakan eksplisit.

ARCH-06 P1: Backend tidak menganggap skill gamedev sebagai layanan agent produksi. Skills adalah panduan development; runtime agent harus mempunyai runner, tool, dan kontrak hasil yang benar-benar diimplementasikan.

## 21 Model data minimum

| Entitas | Field minimum |
| --- | --- |
| Project | id, name, brief, output presets, provider configuration references, publish policy |
| Run | id, project_id, mode, workflow_version, status, configuration, scheduling_paused, cancellation_requested_at, started_at, completed_at, completion_kind |
| AgentInstance | id, run_id, role, parent_agent_id, capabilities, current task references |
| Task | id, run_id, agent_id, type, dependencies, input versions, status, revision, output references |
| Attempt | id, task_id, number, worker lease, status, provider operation ID, timing, error summary |
| Artifact | id, run_id, task_id, attempt_id, type, version, MIME, size, checksum, storage reference, validation |
| Event | id, schema_version, run_id, seq, entity revision, type, occurred_at, payload |
| ProviderOperation | id, run_id, task_id, attempt_id, provider, input fingerprint, submit state, external ID nullable, reconciliation state |
| BudgetLedger | entry_id, operation_id unik, run_id, provider unit, reserved, committed, actual, reconciliation state |
| PublishOperation | id, run_id, video artifact ID/version, package_version, channel, policy, session reference, video ID, status |
| Command | command_id, target, expected revision, actor, parameters, result, timestamp |

DATA-01 P0/P1: ID logis tidak berubah karena avatar pindah ruangan. Referensi artefak menggunakan ID dan versi; filename saja tidak menjadi identitas data.

DATA-02 P1: Timestamps disimpan dalam UTC dan ditampilkan menurut zona pengguna, awalnya Asia/Jakarta. Sequence menentukan urutan event dalam run; timestamp tidak dipakai sendiri untuk menyelesaikan konflik.

DATA-03 P1: `completion_kind` membedakan draft_ready, uploaded, dan published. Completed pada run tidak otomatis berarti tayang.

DATA-04 P0/P1: Snapshot dan fixture memiliki schema version. Data yang tidak kompatibel menghasilkan pesan pemulihan, bukan state campuran.

## 22 Kontrak event dan API internal

Envelope event usulan:

```json
{
  "schema_version": 1,
  "event_id": "evt_example_042",
  "project_id": "project_example",
  "run_id": "run_example",
  "mode": "simulation",
  "seq": 42,
  "occurred_at": "2026-10-06T08:00:00Z",
  "type": "task.status_changed",
  "agent_id": "agent_visual_01",
  "parent_agent_id": "agent_creative_lead",
  "task_id": "task_scene_image_03",
  "attempt_id": "attempt_scene_image_03_1",
  "entity_revision": 3,
  "payload": {
    "status": "waiting_external",
    "summary": "Gambar adegan sedang diproses provider",
    "room_id": "creative"
  }
}
```

Tipe minimum: run.created, run.status_changed, agent.spawned, agent.updated, task.created, task.status_changed, task.progress, artifact.created, artifact.validated, qa.issue_created, budget.updated, dan publish.status_changed. Heartbeat transport tidak masuk feed aktivitas utama.

EVENT-01 P0/P1: Envelope serta payload divalidasi sebelum reducer menerima data. Event yang tidak kompatibel dicatat sebagai error integrasi dan tidak memutasi state secara parsial.

EVENT-02 P1: `seq` monoton per run; `event_id` unik. Duplikasi diabaikan. Event di luar urutan ditahan sampai gap dipulihkan atau snapshot baru diterima. Revisi entity yang lama tidak menimpa keadaan terbaru.

EVENT-03 P1: Reconnect mengambil snapshot beserta cursor kemudian event setelah cursor. Jika history sudah melewati retensi, server mengirim snapshot baru. UI tidak menggandakan avatar, artifact, atau biaya setelah reconnect.

Snapshot dan cursor diambil secara konsisten pada sequence S, lalu semua event setelah S dapat dibaca tanpa celah. Buffer gap dibatasi dengan usulan 100 event atau dua detik; melebihi batas memicu resync. Schema yang tidak didukung menghentikan aplikasi event secara eksplisit dan meminta snapshot yang kompatibel atau pembaruan client; reducer tidak menunggu sequence yang sudah ditolak tanpa batas.

EVENT-04 P1: SSE menjadi usulan transport satu arah server ke browser; command memakai HTTP. Event ID dan mekanisme reconnect mengikuti kontrak SSE, dengan sinkronisasi snapshot ditangani aplikasi. [Standar Server Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html).

EVENT-05 P0/P1: Replay adalah pembacaan history untuk pengamatan. Replay tidak menjalankan ulang job, mengirim prompt, atau melakukan publishing.

| API usulan | Tujuan | Fase |
| --- | --- | --- |
| GET /projects | Daftar project | P1 |
| POST /runs | Validasi dan memulai run | P1 |
| GET /runs/:id | Snapshot dan cursor | P1 |
| GET /runs/:id/events?after=cursor | Event stream atau history sesuai transport | P1 |
| GET /runs/:id/artifacts | Manifest hasil yang diizinkan | P1 |
| POST /runs/:id/commands | Retry, cancel, pause scheduling, atau review | P1/P2 |
| GET /provider-capabilities | Model/schema dan status konfigurasi tanpa secret | P1 |
| POST /webhooks/bumi | Pemberitahuan hasil untuk rekonsiliasi | P1 deployment |

API-01 P1: Command membawa command ID dan expected revision. Pengiriman ulang ID yang sama tidak membuat operasi baru. Pengguna mendapat hasil diterima, ditolak karena state berubah, atau status operasi yang dapat diperiksa.

## 23 Kegagalan pemulihan dan budget

| Kondisi | Perilaku wajib |
| --- | --- |
| Dependensi belum siap | Waiting dengan alasan; tidak memasukkan task ke worker lebih awal |
| Rate limit atau gangguan sementara | Backoff terbatas sesuai provider dan budget |
| Credential tidak valid | Blocked/attention; tidak berulang terus dengan secret yang sama |
| Submit berbayar timeout | Rekonsiliasi hasil, bukan langsung membuat generation baru |
| File rusak atau output kosong | Validasi gagal dan task terkait dapat direvisi |
| Worker crash | Lease kedaluwarsa, pemeriksaan operation provider, attempt pemulihan |
| Backend restart | Memulihkan status persisted dan job asynchronous yang masih aktif |
| Budget habis | Menahan submit baru dan memperlihatkan kebutuhan perhatian |
| Cancel ketika provider aktif | Menghentikan penjadwalan dan mengikuti capability cancellation provider |
| Browser terputus | Last known state dengan indikator koneksi, lalu snapshot/event recovery |
| Upload ambigu | Outcome unknown sampai rekonsiliasi; tidak membuat video duplikat otomatis |

ERR-01 P1: Retry otomatis dibatasi usulan maksimal dua retry per task untuk error yang aman diulang. Batas revisi isi terpisah dari retry transport. Kegagalan permanen tidak diperlakukan sebagai transient.

ERR-02 P1: Cancel tidak menyatakan pekerjaan eksternal dibatalkan sebelum ada bukti atau rekonsiliasi yang sesuai. Hasil yang selesai setelah cancel dicatat tanpa otomatis membuka tahap berikutnya.

BUDGET-01 P1: Konfigurasi membatasi paid generations, token, credit per provider, render, task count, kedalaman subagent, concurrency, dan revision count. Nilai anggaran aktual ditentukan sebelum run berbayar; tidak ada angka uang yang diasumsikan dalam PRD.

BUDGET-02 P1: Usulan batas awal empat tool job keseluruhan, maksimal dua operasi berbayar provider, satu render, dan satu uploader per channel. Operasi asynchronous tetap menggunakan slot sampai terminal.

BUDGET-03 P1: Reservasi biaya dan concurrency slot diambil secara atomik dengan operation ID unik sebelum submit, lalu direkonsiliasi sekali dengan data aktual. Operation ambigu mempertahankan reservasi sampai hasilnya dipastikan; pengiriman event ganda tidak mengurangi atau menambah biaya lagi. Jika actual usage tidak tersedia, statusnya tetap estimasi atau belum diketahui. Credit Bumi tidak dijumlahkan langsung dengan USD/token provider lain.

BUDGET-04 P1: Task anak mewarisi batas run; membuat subagent tidak menambah anggaran tanpa keputusan konfigurasi. Retry dan revisi ikut mengonsumsi budget yang sama.

## 24 Penyimpanan akses dan operasional

STORE-01 P0: Demo menyimpan snapshot, seed, posisi waktu simulator, pilihan UI, dan schema version di browser. Reset menghapus sesi demo tersebut dan tidak menyentuh artefak project lain.

STORE-02 P1: Status, event, provider operation, budget, dan artifact manifest berada di storage persisten backend. Output masuk staging sebelum validasi dan publikasi atomik.

STORE-03 P1: Usulan retensi alpha adalah 30 hari untuk event dan artefak run, dengan opsi mempertahankan final package. Nilai ini perlu disesuaikan dengan kapasitas; penghapusan tidak menghilangkan file input yang masih direferensikan run aktif.

SEC-01 P1: Bumi API key, OAuth token, serta upload session URI tidak berada di browser bundle, event, fixture, log publik, atau PRD. Environment variable dan secret store backend menjadi sumber credential.

SEC-02 P1: Worker hanya mendapat credential yang dibutuhkan adapter. Agent riset tidak menerima token publisher. Tool execution memvalidasi path dan parameter; teks model tidak dijalankan langsung sebagai shell command.

SEC-03 P1: Reference URL dan hasil provider diunduh melalui kebijakan URL yang sesuai. Backend membatasi akses jaringan lokal, path traversal, MIME, ukuran file, dan redirect credential.

SEC-04 P1: Demo tidak memerlukan login. Backend lokal hanya diakses pada host yang ditentukan. Sebelum deployment yang dapat diakses jaringan lain, autentikasi, ownership run, HTTPS, dan artifact access diuji.

OPS-01 P1: Log menyimpan correlation ID run/task/attempt/operation serta pesan yang sudah disanitasi. Status kesehatan backend, worker dan provider dibedakan dari status run.

OPS-02 P1: Sediakan metrik antrean, task aktif, durasi, retry, artifact validation failure, penggunaan yang tersedia, dan reconnect. Metrik membantu diagnosis tanpa memenuhi UI kantor.

OPS-03 P1/P2: Backup dan restore diuji sebelum output nyata menjadi satu-satunya salinan. Retensi, lokasi backup, dan target pemulihan ditetapkan saat memilih deployment.

## 25 Performa dan skalabilitas

Target berikut adalah kriteria benchmark yang diusulkan. Perangkat, browser, koneksi, build, jumlah avatar, jumlah task, dan durasi pengamatan dicatat saat uji. Belum ada hasil benchmark aplikasi yang dapat diklaim.

| Area | Target awal | Skenario |
| --- | --- | --- |
| Desktop rendering | Median frame time ≤16,7 ms; p95 ≤33,3 ms | 13 avatar, kantor dan satu panel, 60 detik |
| Kepadatan scene | Minimal 30 fps | 32 avatar terlihat dan 100 agent logis |
| Mobile observation | Minimal 30 fps atau mode daftar yang tetap lancar | Perangkat mobile acuan saat QA |
| Pembaruan UI | ≤500 ms setelah event diterima browser | Task/status/artifact berubah |
| Event backend ke UI | p95 ≤2 detik pada lingkungan uji lokal | Tidak termasuk waktu eksekusi provider |
| Memuat kantor | ≤8 detik pada 20 Mbps, cold cache | Build produksi dan asset awal |
| Transfer awal | ≤10 MiB terkompresi untuk app dan asset kantor awal | Audio/video hasil dimuat saat dibuka |
| Stability soak | 30 menit tanpa error fatal atau pertumbuhan memory terus-menerus | Demo ulang dan perpindahan panel |

Usulan desktop acuan adalah laptop Apple M1 dengan 8 GB RAM atau PC setara; perangkat final ditetapkan dan dicatat sebelum angka diterima sebagai gate release. Kompatibilitas diuji pada Chrome dan Safari stabil saat release; Edge menjadi pemeriksaan tambahan untuk distribusi Windows.

PERF-01 P0: Frame animation berjalan di renderer; panel status diperbarui dari event. UI tidak melakukan render seluruh daftar pada setiap frame kantor.

PERF-02 P0: Gunakan atlas, reuse sprite, batasi ambient effects, dan hentikan animasi objek di luar viewport jika layak. Optimasi dilakukan berdasarkan pengukuran, bukan menambah sistem kompleks sebelum ada masalah.

PERF-03 P0/P1: Tab yang tidak aktif mengurangi pekerjaan visual. Backend dan event persistence tetap berjalan; ketika tab aktif kembali UI menyelaraskan snapshot terbaru.

PERF-04 P1/P2: Jika kapasitas visual tercapai, kelompok ruangan dan daftar agent tetap menampilkan seluruh identitas logis. Seluruh agent dapat dicari/dipilih, parent tetap terbaca, dan marker pilihan bertahan ketika ruangan dikelompokkan. Tidak ada agent operasional yang dihapus dari data hanya agar scene lebih ringan. Benchmark 13 avatar berlaku pada gate demo; stress 32 avatar/100 agent logis berlaku pada gate perluasan M6.

## 26 Skenario pengujian dan kriteria penerimaan

Pengujian memakai fixture yang mencakup jalur sukses, parallel task, satu revisi QA, error sementara, kegagalan permanen, cancel, koneksi putus, dan event ganda. Integration test provider menggunakan respons tiruan terlebih dahulu; smoke test berbayar terpisah dari test suite rutin.

Referensi requirement P1 di test P0 berarti perilaku itu ditunjukkan melalui fixture dan simulator. Gate demo tidak menuntut panggilan provider, backend produksi, atau publishing nyata.

| ID | Skenario dan requirement terkait | Kriteria lulus | Fase |
| --- | --- | --- | --- |
| TEST-01 | Happy path demo, WF-01 sampai WF-13 | Empat zona aktif, paket contoh tersedia, mode Simulasi terlihat sepanjang run | P0 |
| TEST-02 | Parallel Creative, WF-04 | Minimal dua task mempunyai rentang waktu running yang tumpang tindih pada timeline | P0 |
| TEST-03 | Hierarki, AGT-01 dan AGT-02 | Setiap subagent dapat ditemukan, parent benar, klik avatar/list membuka identitas yang sama | P0 |
| TEST-04 | Kejujuran status, STATE-01 sampai STATE-03 | Menunggu dan failed berbeda; unknown usage bukan nol; persentase memiliki sumber | P0/P1 |
| TEST-05 | Revisi QA, WF-12 dan QA-04 | Cabang terdampak menghasilkan versi baru, QA menunjuk versi baru, cabang lain tetap digunakan | P0/P1 |
| TEST-06 | Navigasi kantor, WORLD-02 sampai WORLD-05 | Avatar tidak menembus furniture dan tetap dapat dipilih saat antre/tertutup | P0 |
| TEST-07 | Sprite, ART-02 dan ANIM-01 | Contact sheet dan loop native lulus review identitas, arah, kaki, pivot dan alpha | P0 |
| TEST-08 | Kamera, UI-03 dan UI-04 | Fit, pan, zoom, reset, follow berjalan; pan manual menghentikan follow | P0 |
| TEST-09 | Pause demo dan visual, UI-08 | Pause demo menghentikan simulator; pause visual tidak menghentikan data real runtime | P0/P1 |
| TEST-10 | Aksesibilitas, ACC-UI-01 sampai ACC-UI-06 | Keyboard, teks 200%, reduced motion, mute, kontras, viewport/target sentuh dan safe area diuji langsung | P0 |
| TEST-11 | Mode dan fixture, UI-06 dan ARCH-02 | Demo tidak memanggil endpoint provider produksi atau YouTube; artefak contoh berlabel | P0 |
| TEST-12 | Determinisme demo, STORE-01 | Tiga run dengan seed sama menghasilkan urutan dan output task yang sama | P0 |
| TEST-13 | Event duplikat, EVENT-02 | Tidak ada avatar, artifact, usage, atau transisi terminal yang tergandakan | P1 |
| TEST-14 | Event gap dan reconnect, EVENT-03 | State akhir sama dengan konsumsi event lengkap setelah snapshot/replay recovery | P1 |
| TEST-15 | Replay, EVENT-05 | Membuka history tidak membuat tool invocation, generation, atau upload baru | P1 |
| TEST-16 | Command ganda, API-01 | Command ID sama mengembalikan operasi/hasil yang sama | P1 |
| TEST-17 | Submit Bumi ambigu, BUMI-03 | Tidak ada paid POST kedua sebelum hasil attempt pertama direkonsiliasi | P1 |
| TEST-18 | Poll dan callback ganda, BUMI-04 | Satu job menghasilkan satu artifact version dan satu penggunaan biaya | P1 |
| TEST-19 | Worker crash, ARCH-04 | Lease dan fencing mencegah worker lama menulis; operation provider dipulihkan | P1 |
| TEST-20 | Budget dan concurrency, BUDGET-01 sampai BUDGET-04 | Tidak ada submit baru melewati limit; asynchronous job tetap memegang slot | P1 |
| TEST-21 | Cancel, ERR-02 | Job eksternal tidak dilabel cancelled tanpa dasar; downstream tidak otomatis dimulai | P1 |
| TEST-22 | Artifact validation, QA-02 dan STORE-02 | File rusak atau parsial tidak membuka render/publishing berikutnya | P1 |
| TEST-23 | Credential isolation, SEC-01 dan SEC-02 | Browser, event dan log terkontrol tidak mengandung secret/provider credential | P1 |
| TEST-24 | End to end landscape, GOAL-05 dan VIDEO-01 | Paket nyata lengkap, checksum/versi konsisten, video dapat diputar dan QA wajib lulus | P1 |
| TEST-25 | Publishing policy, PUB-01 dan PUB-05 | Draft, upload private, scheduled dan published tampil sesuai policy/bukti | P2 |
| TEST-26 | Upload timeout dan command ganda, PUB-03 dan PUB-04 | Satu operasi internal, resume/reconciliation dilakukan, tidak memulai upload kedua otomatis | P2 |
| TEST-27 | Preset Shorts, VIDEO-03 | Komposisi vertikal, caption, narasi, metadata dan QA sesuai preset tersendiri | P2 |
| TEST-28 | Responsivitas dan performa, PERF-01 sampai PERF-04 | Benchmark 13 avatar pada demo dan stress 32/100 pada perluasan dicatat; ambang fase yang berlaku terpenuhi | P0/P1/P2 |
| TEST-29 | Backend restart dan backup, STORE-02 dan OPS-03 | Run/artefak persisted dapat dipulihkan tanpa kehilangan relasi versi | P1/P2 |
| TEST-30 | Usability, GOAL-01 dan GOAL-02 | Uji minimal lima pengguna memenuhi ambang yang ditentukan | P0 |
| TEST-31 | Delegasi nyata, AGT-05 | Parent mendelegasikan ke dua subagent, jejak LLM/tool aktual tersimpan, hasil tervalidasi diterima parent | P1 |
| TEST-32 | Attention recovery, UI-09 | Perubahan budget/config/input tervalidasi, task tertahan dilanjutkan, cabang valid tidak dibuat ulang | P1 |
| TEST-33 | Preflight run, WF-14 | Input invalid dapat diperbaiki; tidak ada paid scheduling sampai preflight lulus | P1 |
| TEST-34 | Banyak task/agent, STATE-04 dan PERF-04 | Busy dan attention tidak saling menutupi; semua identitas serta parent dapat diakses pada kapasitas fase terkait | P0/P1/P2 |
| TEST-35 | Snapshot dan schema gap, EVENT-01 sampai EVENT-03 | Snapshot konsisten; gap melewati batas memicu resync, unsupported schema tidak membuat reducer menunggu selamanya | P1 |

Gate demo: TEST-01 sampai TEST-12, TEST-28 untuk demo, TEST-30, serta TEST-34 pada populasi demo lulus; asset kantor, scenario fixture, README menjalankan app, dan laporan QA tersedia. Gate alpha nyata: seluruh test P1 yang berlaku lulus dan satu vertical slice landscape nyata selesai. Gate publishing/Shorts: seluruh test P2 untuk kemampuan yang dirilis lulus.

Defect yang membuat UI mengklaim status/output palsu, membocorkan credential, menggandakan paid submit, kehilangan artifact final, atau melakukan upload tanpa kebijakan project yang aktif adalah blocker release. Defect kosmetik dicatat dengan dampak pada keterbacaan dan diprioritaskan berdasarkan hasil uji.

## 27 Tahapan pengerjaan dan deliverable

Milestone adalah urutan dependensi pekerjaan, bukan komitmen tanggal. Estimasi kalender ditentukan setelah scope asset, provider, dan deployment dipilih.

| Milestone | Isi | Deliverable dan exit gate |
| --- | --- | --- |
| M0 PRD dan arah visual | Menyepakati cakupan, status, art brief, output dan keputusan terbuka | PRD menjadi baseline dan satu target visual diterima untuk produksi asset |
| M1 Blockout dan asset inti | Grid kantor, furniture, seed chibi, role family dan animasi minimum | Peta navigasi, atlas, manifest dan QA native scale |
| M2 Demo simulasi lengkap | Kantor, simulator, hierarchy, panels, timeline, fixtures, camera dan settings | Build browser memenuhi gate demo |
| M3 Backend dan adapter awal | Database, queue, event, snapshot, worker dan Bumi adapter | Job gambar nyata tercatat, restart/reconnect/reconciliation teruji |
| M4 Workflow landscape nyata | LLM/riser sumber, skrip, TTS, imagery, caption, render dan QA | Satu paket landscape lengkap memenuhi gate alpha |
| M5 Publishing YouTube | OAuth, channel capabilities, resumable upload, policy dan processing | Private upload serta recovery teruji sebelum public policy dirilis |
| M6 Shorts dan peningkatan kapasitas | Preset vertikal, storyboard/caption terpisah, stress scene dan refinement | Paket Shorts dan gate format/kapasitas lulus |

M5 dan M6 dapat bertukar urutan setelah M4 jika prioritas pengguna berubah. Pengembangan scene dan backend memakai kontrak event yang sama; penggantian simulator tidak memerlukan pembangunan ulang UI.

Backlog awal yang paling penting adalah scaffold UI/scene dan shared domain types, office blockout, asset manifest, simulator seeded, reducer event, agent hierarchy, task/artifact panel, timeline, accessibility, benchmark, lalu backend persistence dan provider operation recovery.

## 28 Risiko dan keputusan terbuka

| Risiko | Dampak | Tindakan dalam rancangan |
| --- | --- | --- |
| Visual generatif tidak konsisten | Karakter berubah antarframe dan kantor sulit dibaca | Seed reference, family production, grid/palette standard dan native QA |
| Kamera terlalu frontal | Jalur dan workstation tertutup | Blockout dari atas dan uji seluruh kantor pada fit view |
| Terlalu banyak subagent terlihat | Label dan avatar bertumpuk | Slot antre, label selektif, kelompok ruang dan daftar logis |
| Animasi tertinggal dari runtime | Status terlambat atau menyesatkan | State terpisah, transisi singkat dan event batching visual |
| Provider lambat atau berubah schema | Run tertahan atau submit tidak valid | Capability validation, polling/backoff dan adapter terpisah |
| Paid operation berulang | Biaya serta output duplikat | Operation ID, reserve budget, idempotent command dan rekonsiliasi |
| Revisi terlalu luas | Biaya dan waktu membesar | Input version graph dan invalidasi cabang terdampak |
| TTS atau renderer belum dipilih | Vertical slice nyata belum bisa lengkap | Pilih capability/provider sebelum M4 |
| Public publishing belum tersedia | Workflow berhenti pada private/draft | Channel onboarding dan capability check |
| Asset/event memenuhi storage | Preview atau recovery terganggu | Retensi, lazy loading dan storage capacity monitoring |

| ID keputusan | Pilihan yang masih diperlukan | Default atau usulan | Diperlukan sebelum |
| --- | --- | --- | --- |
| DEC-01 | Nama produk dan nama kantor | Virtual Office sebagai nama kerja | Branding final |
| DEC-02 | Niche, audiens, bahasa konten dan sumber riset | Bahasa UI Indonesia; isi video berdasarkan brief | M4 |
| DEC-03 | Durasi video awal dan jumlah scene | Brief konfigurabel; alpha uji pendek untuk validasi pipeline | M4 |
| DEC-04 | LLM, akses riset dan provider TTS/voice | Adapter terpisah; tidak mengunci vendor | M4 |
| DEC-05 | Budget credit/token serta kebijakan retry/revisi | Limit konfigurabel dan bounded retry | M3/M4 |
| DEC-06 | Populasi demo dan jumlah varian sprite | 1 koordinator, 4 lead dan 8 subagent | M1/M2 |
| DEC-07 | Stack dan versi dependency | React, TypeScript, Phaser dan Node.js sebagai kandidat | Bootstrap M2/M3 |
| DEC-08 | Mode publishing dan channel tujuan | Draft only pada alpha awal | M5 |
| DEC-09 | Sumber brief otomatis atau input manual | Preset demo; formulir/sumber runtime untuk nyata | M3/M4 |
| DEC-10 | Hosting dan ownership akses | Lokal lebih dulu, deployment dipilih kemudian | Deployment |
| DEC-11 | Target loudness dan toleransi caption/durasi | Ditulis dalam preset dan diuji dengan fixture audio | M4 |
| DEC-12 | Ukuran grid dan sprite final | Menurut blockout serta keterbacaan native | M1 |

Keputusan terbuka yang berada pada fase berikutnya tidak menghalangi penyelesaian demo. Jika sebuah pilihan memengaruhi schema, biaya, atau behavior publikasi, keputusan dicatat sebelum implementasi kemampuan tersebut dimulai.

## 29 Kondisi project dan bahan implementasi

Project saat penyusunan PRD mempunyai satu konsep PNG 1536 × 1024, prompt, art brief, schema model Bumi, script generation, serta laporan inspeksi. Generation konsep melalui Bumi sudah menghasilkan gambar; hal ini membuktikan jalur pembuatan contoh gambar, bukan implementasi orkestrasi agent produksi.

| Bahan | Lokasi project | Fungsi |
| --- | --- | --- |
| Konsep awal | assets/concepts/office-v1.png | Acuan suasana, palette dan tiga identitas chibi |
| Prompt konsep | assets/concepts/office-v1.prompt.txt | Brief generation yang dapat ditinjau |
| Art direction | design/art-direction.json | Keputusan visual dan target awal |
| Review konsep | design/office-v1.review.json | Temuan kamera, skala dan pixel fidelity |
| Schema provider | design/bumi-model-schema.json | Snapshot referensi; perlu refresh pada integrasi |
| Script Bumi | scripts/bumi_image.py | Generation konsep dengan credential dari environment/hidden prompt |
| Scene inspection | assets/concepts/office-v1.scene-check.json | Pemeriksaan placement konsep melalui sprite-gen |

Skill `sprite-gen` dan 74 skill gamedev plus router sudah terpasang di environment development. Kode game, backend orkestrasi, agent runtime, TTS, render video, dan integrasi YouTube belum menjadi deliverable saat ini.

## 30 Pengelolaan perubahan PRD

Perubahan pada pilihan pengguna, scope release, status/event schema, preset output, biaya, atau publishing policy memperbarui versi PRD dan keputusan terkait. Implementasi merujuk requirement ID agar behavior dapat diuji serta ditelusuri.

Versi 1.0 memasukkan keputusan pengguna tentang agent nyata dimulai dari simulasi, cozy pixel art dari atas, manusia chibi, mode penonton, Bumi dan sprite-gen, serta landscape dan Shorts dengan landscape lebih dulu. Semua usulan ukuran, timing, populasi, stack, budget policy, dan milestone tetap menjadi baseline yang dapat ditinjau saat fase terkait dimulai.
