# Nekoffice v0.4 — kelompok parent–subagent yang lebih bersih

Status: rencana implementasi lokal. v0.4 melanjutkan v0.3 dan belum mengubah deployment publik.

v0.4 membuat hubungan agent utama dan subagent mudah dipahami tanpa memenuhi ruangan dengan tulisan. Agent utama tetap menjadi titik fokus, subagent berdiri di sekitarnya, dan detail lengkap baru muncul ketika penonton memilih kelompok tersebut.

## Tujuan

- Mengurangi teks yang menumpuk di area kantor.
- Menunjukkan satu parent sebagai pusat kelompok kerja.
- Menampilkan jumlah dan status subagent tanpa memberi label nama di bawah avatar.
- Membuka detail parent dan subagent dari panel ketika diperlukan.
- Menyamakan perilaku visual untuk Codex dan Hermes.
- Menyediakan fixture lokal untuk menguji lima subagent Codex dan lima subagent Hermes.
- Menjaga Nekoffice sebagai viewer event; orkestrasi, prompt, reasoning, command, dan output tetap berada di client agent.

## Prinsip pengalaman

1. **Scene bersih terlebih dahulu.** Avatar, status warna, dan satu bubble aktivitas cukup untuk membaca keadaan kantor.
2. **Detail berdasarkan permintaan.** Nama project, daftar child, mesin, heartbeat, dan riwayat berada di panel setelah agent dipilih.
3. **Parent adalah jangkar.** Subagent tidak mengambil kursi dan tidak membuat kapasitas meja bertambah.
4. **Provider tidak mengubah bahasa visual.** Codex dan Hermes memakai aturan parent–subagent yang sama; badge provider hanya muncul di detail koneksi.
5. **Metadata tetap aman.** Payload hanya membawa metadata allowlist. Isi chat, prompt, reasoning, command, tool output, dan path penuh tidak boleh masuk ke telemetry.

## Ruang lingkup P0

### 1. Tampilan kelompok

- Parent tetap duduk dan mengetik ketika statusnya `working`.
- Child berdiri di slot deterministik di sekitar parent.
- Lima child pertama memiliki offset yang terbaca; child berikutnya memakai ring kedua atau indikator jumlah.
- Nama di bawah avatar child tetap disembunyikan.
- Parent mendapat badge kecil seperti `+5` atau `5 subagent`.
- Warna ring/badge mengikuti status agregat child: bekerja, berpikir, menunggu, error, atau offline.
- Hanya satu bubble aktivitas kelompok yang aktif pada satu waktu; bubble berganti secara berkala atau mengikuti child yang dipilih.

### 2. Panel detail

Klik parent membuka detail kelompok yang berisi:

- nama project dan nama parent;
- provider (Codex atau Hermes);
- mesin asal dan heartbeat terakhir;
- status parent;
- jumlah child aktif, selesai, menunggu, dan error;
- daftar child dengan status singkat dan aktivitas aman;
- durasi sesi dan tautan riwayat lokal jika tersedia.

Klik child memilih child tersebut di panel yang sama tanpa memindahkan posisi kelompok.

### 3. Lifecycle

- Parent dan child masuk dari pintu secara terpisah.
- Child berhenti di offset kelompok dan tidak menampilkan kursi.
- Child yang selesai berjalan keluar sendiri.
- Parent tetap bekerja atau duduk sebagai `Mendampingi subagent` selama masih ada child aktif.
- Ketika heartbeat melewati lease, avatar berubah ke status offline sebelum pulang setelah grace period.
- Refresh snapshot tidak boleh mengubah identity, tint avatar, atau posisi slot child.

### 4. Fixture dan provider

- Pertahankan fixture Codex lima child.
- Tambahkan `scripts/local-v04-hermes-demo.py` yang mengirim lima session Hermes dengan `parentId`.
- Kedua fixture menerima `--subagents`, `--interval`, `--once`, server URL, dan token dari `.env`/environment.
- Fixture memakai sequence yang aman ketika proses demo dimulai ulang agar tidak dianggap replay oleh server.

## Kontrak data v0.4

Tidak ada perubahan wajib pada endpoint heartbeat. Field yang digunakan:

~~~
{
  "agent": {
    "id": "hermes-child-session",
    "name": "project · subagent 1",
    "role": "Hermes · Subagent",
    "parentId": "hermes-parent-session",
    "status": "working",
    "task": "Menjalankan tes",
    "activityCode": "test"
  },
  "active": true,
  "updatedAt": 1791554005
}
~~~

Server tetap men-namespace `id` dan `parentId` dengan provider/client yang sama. Client hanya perlu mengirim `parentId` ketika session child memang diketahui. Jika parent hilang dari satu snapshot, server mempertahankan child sesuai aturan lease dan memberi status aman sampai sesi berakhir.

Field UI baru yang boleh ditambahkan bila dibutuhkan:

- `childCount`: jumlah child yang diketahui parent;
- `aggregateStatus`: status tampilan kelompok yang dihitung server atau client;
- `lastActivityAt`: waktu metadata aktivitas terakhir.

Field tersebut tidak boleh berisi isi percakapan atau command mentah.

## State dan aturan visual

| Keadaan | Parent | Child | Scene |
| --- | --- | --- | --- |
| Parent bekerja, child aktif | Duduk/mengetik | Berdiri di sekitar parent | Badge jumlah child, satu bubble bergilir |
| Parent berpikir | Animasi berpikir | Tetap berdiri | Ring parent biru |
| Child menunggu | Tetap duduk | Diam atau minum kopi | Bubble hanya jika child dipilih |
| Satu child selesai | Tetap bekerja | Jalan ke pintu | Counter child aktif berkurang |
| Client putus | Offline sementara | Status ikut lease | Indikator koneksi berubah, lalu avatar pulang |
| Semua child selesai | Menyelesaikan pekerjaan | Tidak ada child aktif | Parent pulang setelah status done |

## Urutan implementasi

1. Tambahkan model selector parent–child dan hitung status agregat tanpa mengubah endpoint.
2. Sembunyikan bubble duplikat dan tambahkan badge jumlah child pada visual parent.
3. Tambahkan panel detail kelompok dengan daftar child dan metadata koneksi.
4. Tambahkan fixture Hermes lima child dan uji `parentId` dari bridge sampai browser.
5. Tambahkan test lifecycle: child selesai lebih dulu, parent selesai lebih dulu, heartbeat stale, dan resume.
6. Jalankan test web, test Codex, test Hermes, build TypeScript, lalu preview lokal.
7. Ambil screenshot pembanding Codex dan Hermes. Deploy publik hanya setelah hasil lokal disetujui.

## Kriteria selesai

- Scene dengan satu parent dan lima child tidak menampilkan nama child di bawah avatar.
- Parent memiliki indikator jumlah child yang terbaca tanpa menutup avatar.
- Maksimal satu bubble aktivitas kelompok tampil pada waktu yang sama.
- Klik parent membuka daftar lima child dengan status dan aktivitas masing-masing.
- Codex dan Hermes menghasilkan layout serta lifecycle yang sama ketika payload metadata setara.
- Child selesai tidak membuat parent pulang.
- Parent selesai lebih dulu tetap terlihat sampai child selesai atau lease berakhir.
- Session yang sama mempertahankan avatar style dan posisi slot setelah refresh.
- Test web, Codex bridge, Hermes bridge, dan build lulus.
- Tidak ada prompt, reasoning, command, output tool, atau full path di payload telemetry.

## Di luar v0.4

- Membuat atau menghentikan subagent dari UI.
- Mengirim pesan ke Codex/Hermes.
- Menampilkan isi chat, reasoning, command, atau output tool.
- Graph dependency interaktif antar-subagent.
- Penyimpanan riwayat jangka panjang dan analitik produktivitas.
- Deploy otomatis ke VPS atau domain publik.
