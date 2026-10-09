# Server pusat dan client Hermes

```text
Mesin A: Hermes + plugin client ── HTTPS + token ──┐
Mesin B: Hermes + plugin client ── HTTPS + token ──┼── Server Little Office
Mesin C: Hermes + plugin client ── HTTPS + token ──┘   API + kantor di browser
```

**Benar: tiap mesin Hermes cukup menjalankan plugin client.** Node, React, dan tampilan kantor hanya perlu dibuild/jalankan di server pusat. Browser lu membuka URL server untuk melihat semua orang. Client hanya membuat koneksi keluar, sehingga tidak perlu membuka port pada mesin Hermes.

Satu session induk = satu orang, nama dari folder kerja session. Subagent digabung ke session induk. ID client stabil membedakan mesin; dua mesin dengan session ID/folder yang sama tetap dua orang.

## 1. Jalankan server sekali

Server perlu Node 22.12+ dan npm untuk build, atau Docker. Source bisa diambil dari repo:

```sh
git clone git@github.com:yughoz/nekoffice.git
cd nekoffice
npm ci
npm run build
```

Buat konfigurasi lokal dengan token acak, sekali saja. Token ini nanti dipakai client; `.env` tidak masuk Git. Perintah menolak menimpa konfigurasi yang sudah ada:

```sh
python3 - <<'PY'
import os, secrets
fd = os.open('.env', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write('OFFICE_API_TOKEN=' + secrets.token_hex(32) + '\nHOST=0.0.0.0\nPORT=3000\n')
PY
npm start
```

Buka `http://ALAMAT_SERVER:3000/`. Untuk domain internet, arahkan domain lewat reverse proxy HTTPS ke port 3000. UI, API, dan SSE berada pada origin yang sama. Pada proxy SSE, matikan buffering dan izinkan koneksi panjang; heartbeat SSE dikirim setiap 15 detik. Browser tidak perlu menyimpan token write.

Alternatif Docker, setelah `.env` dibuat:

```sh
docker compose up -d --build
docker compose logs -f office
```

Docker menjalankan server sebagai user `node`, menyajikan build kantor dan API, serta melakukan health check. Vite dipakai untuk development; `npm start` adalah server produksi mandiri dan tidak membaca folder `.hermes` milik host.

Dashboard dan endpoint baca menampilkan nama folder/status kepada orang yang dapat mengakses URL. Token melindungi semua endpoint **POST**; letakkan dashboard di jaringan privat atau di belakang autentikasi proxy jika hanya tim lu yang boleh melihatnya.

## 2. Pasang client pada setiap mesin Hermes

Hermes dan Python 3 harus sudah tersedia. Ambil repo, lalu jalankan installer; **tidak perlu npm install atau menjalankan server pada mesin client**:

```sh
git clone git@github.com:yughoz/nekoffice.git
cd nekoffice
python3 integrations/hermes/install_bridge.py --server https://office.DOMAIN_LU
```

Installer meminta token secara tersembunyi. Masukkan nilai `OFFICE_API_TOKEN` server. Config disimpan lokal dengan permission `0600` di `~/.hermes/plugins/little-office-bridge/client.json`; client ID stabil disimpan di `client-id`. Jangan salin ID itu ke mesin kedua: jalankan installer di mesin tersebut agar ID-nya berbeda. Tidak ada API key model yang diperlukan untuk bridge.

Untuk pemakaian pada LAN atau uji satu mesin, URL bisa berupa `http://IP_SERVER:3000` atau `http://127.0.0.1:3000`. Gunakan URL tujuan yang benar langsung; client tidak mengikuti redirect agar token tidak ikut diteruskan.

Buka ulang session terminal Hermes setelah memasang/mengubah konfigurasi. Installer mencoba aktivasi resmi pada gateway/backend saat plugin pertama diaktifkan; untuk plugin yang sebelumnya sudah aktif, runtime lama masih memakai kode/config sebelumnya. Restart backend/gateway ketika pekerjaan selesai, atau mulai session baru, supaya konfigurasi baru termuat.

Untuk profile lain di mesin yang sama:

```sh
python3 integrations/hermes/install_bridge.py --home ~/.hermes/profiles/NAMA_PROFILE
```

Config URL/token dan ID mesin dibagi oleh profile pada mesin itu. Aktifkan plugin pada setiap profile yang dipakai terminal, Desktop, atau Telegram. Session antar profile tetap mempunyai ID masing-masing.

Bila ingin config terpisah, set `LITTLE_OFFICE_CLIENT_CONFIG` ke path yang sama ketika memasang dan menjalankan Hermes. Alternatif environment: `LITTLE_OFFICE_URL`, `LITTLE_OFFICE_API_TOKEN`, dan opsional `LITTLE_OFFICE_CLIENT_ID` mengoverride config file. Hindari menaruh token pada argumen command, URL, atau variabel `VITE_*`.

## 3. Gunakan Hermes seperti biasa

Client menangkap hook runtime dari terminal, Desktop, gateway Telegram, dan client ACP. Ada job → kirim snapshot → orang masuk dan bekerja. Giliran selesai/gagal/dihentikan → status selesai → orang pulang. Selama client mendapat pekerjaan, heartbeat dikirim setiap 10 detik.

Client berjalan di thread terpisah; timeout HTTP 3 detik dan retry bertahap sampai 30 detik. Saat server terputus, pekerjaan Hermes tetap jalan. Setelah tersambung kembali, client mengirim snapshot terbaru, bukan memainkan ulang semua aktivitas lama. Mode HTTP tidak menulis spool lokal, sehingga tidak membuat avatar ganda di viewer development.

Server menghitung liveness dari waktu heartbeat **diterima server**, bukan PID atau jam mesin client. Setelah 35 detik tanpa heartbeat, orang pulang. Data orang yang sudah pulang dibuang setelah 90 detik; heartbeat berulang tidak membuat pekerjaan selesai muncul kembali. Session yang aktif kembali mempertahankan ID orangnya. Batas tampilan 64 orang; session aktif tambahan menunggu slot kosong.

Server menyimpan status saat ini di memori. Setelah restart server, client yang masih berjalan mengirim snapshot pada heartbeat berikutnya. Tidak ada penyimpanan riwayat prompt/hasil kerja. Metadata terdiri dari ID opaque, nama folder, platform, status, nama tool, dan timestamp; token hanya ada pada header autentikasi.

## Endpoint dan cek koneksi

| Endpoint | Pemakaian |
| --- | --- |
| `GET /` | Tampilan kantor |
| `GET /api/health` | Server hidup |
| `GET /api/state` | Snapshot semua orang |
| `GET /api/stream` | SSE untuk browser |
| `GET /api/integrations/hermes` | Jumlah client, producer, dan session aktif |
| `POST /api/hermes/heartbeat` | Snapshot autentikasi dari plugin client |
| `POST /api/agents` dan `/api/events` | Script lain; gunakan token yang sama |

```sh
curl https://office.DOMAIN_LU/api/health
curl https://office.DOMAIN_LU/api/integrations/hermes
```

Kirim satu prompt kerja biasa dari Hermes lu. Setelah itu, `clients`/`activeSessions` akan bertambah dan kantor otomatis memilih **Live API**. Client yang belum punya session kerja belum mengirim heartbeat.

Script non-Hermes tetap dapat memperbarui avatar dengan `Authorization: Bearer TOKEN_SERVER` dan kontrak di README. ID yang sama mengupdate orang yang sama; kirim `status: done` ketika selesai.

## Development lokal dan menonaktifkan client

Mode lama satu mesin tetap tersedia:

```sh
python3 integrations/hermes/install_bridge.py --local-only
npm run dev -- --port 5174
```

Mode ini membaca spool lokal, tanpa server pusat. Mulai ulang runtime Hermes setelah mengganti mode. Untuk mematikan plugin pada home/profile aktif:

```sh
hermes plugins disable little-office-bridge
```

## Verifikasi source

```sh
npm test
python3 -m unittest discover -s integrations/hermes -p 'test_*.py'
npm run build
hermes plugins validate integrations/hermes/little-office-bridge --json
```

Tes mencakup autentikasi, SSE, batas request, identitas multi-mesin, session yang dilanjutkan, heartbeat terputus, clock skew, client HTTP, retry dan shutdown client tanpa menghambat Hermes. Pemasangan lokal dan hook dibahas di [panduan Hermes](HERMES-BRIDGE.md).

Verifikasi saat implementasi: 26 tes lulus, build browser/server lulus, plugin lolos validator resmi Hermes, dan client Python berhasil mengirim dua identitas mesin ke server build yang sebenarnya melalui HTTP lokal. Konfigurasi Compose lolos `docker compose config`; image Docker belum berhasil dibuild karena daemon Docker pada mesin pengujian tidak sedang berjalan.
