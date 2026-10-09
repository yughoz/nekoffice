# Little Office — tampilan untuk agent lu

Live di **[office.nekoding.xyz](https://office.nekoding.xyz/)**. Lihat [catatan deployment dan operasi VPS](docs/DEPLOYMENT.md).

**Server pusat + client Hermes sudah tersedia.** Server menyajikan kantor dan API; tiap mesin Hermes hanya menjalankan plugin client yang mengirim status lewat HTTP dengan token. Satu session induk = satu orang, nama dari folder kerja, subagent digabung ke induknya. Ikuti [panduan server dan client](docs/SERVER-CLIENT.md) untuk setup dan deployment Docker.

| Bagian | Source | Dijalankan di |
| --- | --- | --- |
| Server API + penyaji kantor | `server/main.ts`, `server/api.ts`, `server/remoteHermes.ts` | Server pusat, `npm start` atau Docker |
| Client Hermes | `integrations/hermes/little-office-bridge/` | Tiap mesin Hermes, via plugin runtime |
| Tampilan browser | `src/` + `public/assets/` | Browser yang membuka URL server |

```text
Hermes A + client ─┐
Hermes B + client ─┼── HTTPS/API server ── kantor di browser
Hermes C + client ─┘
```

Satu ruangan kantor cozy pixel art dengan deretan komputer dan avatar manusia chibi. Ada 15 komputer awal; baris meja bertambah otomatis untuk tim yang lebih besar. Saat status `working`, avatar duduk menghadap monitor, tangan bergantian mengetik, badan bergerak halus, dan baris teks/kursor di layar ikut berubah. Gerak dekoratif ini tidak memengaruhi script kerja. Project ini hanya menampilkan aktivitas dari script/agent eksternal. Tidak menjalankan LLM, mengatur workflow, membuat video, atau mengupload YouTube.

```sh
npm ci
npm run dev
```

Buka URL yang dicetak Vite. Pilih **Demo** untuk melihat agent datang bergantian lewat pintu, berjalan ke komputer, mengetik, lalu keluar setelah selesai. Waktu kedatangan, durasi kerja, jeda, dan kecepatan jalan bervariasi antar agent; jadwal demo diacak saat halaman dibuka; demo terus mengulang. Pilih **Live API** untuk melihat agent lu; update pertama dari script otomatis mengaktifkan Live API. Klik avatar untuk melihat status dan aktivitas singkat. Tombol Daftar agent menyediakan pilihan lewat keyboard. Kamera mendukung pan, zoom, fit dan follow. Pause hanya tersedia untuk animasi demo.

## Hubungkan script

Hermes lokal bisa otomatis terhubung lewat plugin bridge: **satu session = satu orang**, nama dari folder kerja, dan orang pulang saat giliran selesai atau proses terputus. Lihat [setup dan perilaku bridge Hermes](docs/HERMES-BRIDGE.md). API manual di bawah tetap tersedia.

API berjalan di host/port yang sama dengan tampilan. Contoh berikut memakai port preview saat ini, `5174`. Sesuaikan jika Vite mencetak port lain.

Pada server pusat, semua POST membutuhkan header `Authorization: Bearer TOKEN_SERVER`. Token diset lewat `OFFICE_API_TOKEN` pada server; browser hanya menggunakan endpoint baca. Contoh tanpa token di bawah berlaku untuk development lokal yang belum dikonfigurasi dengan token.

```sh
curl http://127.0.0.1:5174/api/agents \
  -H 'Content-Type: application/json' \
  -d '{"id":"research-1","name":"Nara","role":"Researcher","team":"research","status":"working","task":"Membaca referensi untuk naskah"}'
```

ID yang sama memperbarui avatar yang sama. Kirim hanya field yang ingin diubah. Agent baru masuk melalui pintu dan menuju komputer. Status `done` membuatnya berjalan keluar; datanya tetap ada di daftar agent. Update `working` atau `thinking` berikutnya membuat agent tersebut masuk lagi. Agent yang sudah `done` saat halaman pertama dibuka tidak menjalankan ulang animasi bekerja.

```sh
curl http://127.0.0.1:5174/api/agents \
  -H 'Content-Type: application/json' \
  -d '{"id":"research-1","status":"done","task":"Riset selesai"}'
```

| Field | Isi |
| --- | --- |
| `id` | Wajib; ID stabil dari script lu |
| `name` | Nama yang tampil di atas avatar |
| `role` | Peran, misalnya Researcher atau Scriptwriter |
| `team` | `coord`, `research`, `creative`, `production`, `qa`; menentukan warna pakaian dan kategori tim |
| `room` | Metadata kompatibilitas API lama; semua tim kini berada dalam satu ruangan |
| `status` | `idle`, `working`, `thinking`, `waiting`, `error`, `done` |
| `task` | Teks singkat aktivitas, maksimal 500 karakter |
| `parentId` | Opsional; ID agent induk untuk subagent. `null` menghapus hubungan |
| `progress` | Opsional; 0–1. Tidak ada progres buatan di Live API. `null` menghapus |

Contoh Python tanpa dependensi tambahan:

```python
import json
from urllib.request import Request, urlopen

def office_update(**agent):
    request = Request(
        "http://127.0.0.1:5174/api/agents",
        data=json.dumps(agent).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=5) as response:
        return json.load(response)

office_update(id="lead-1", name="Nara", team="research", status="thinking")
office_update(id="writer-1", name="Sora", team="research", parentId="lead-1",
              status="working", task="Menulis naskah", progress=0.25)
```

API menerima update tampilan; response berhasil tidak menandakan pekerjaan agent berhasil. Kegagalan mengirim status sebaiknya tidak menghentikan script kerja lu.

## Event tambahan

`POST /api/events`, header `Content-Type: application/json`:

```json
{"type":"agent.move","agentId":"writer-1","room":"creative"}
```

```json
{"type":"agent.move","agentId":"writer-1","position":{"x":382,"y":260}}
```

```json
{"type":"agent.remove","agentId":"writer-1"}
```

```json
{"type":"office.update","title":"YouTube office"}
```

```json
{"type":"office.reset"}
```

`office.reset` hanya membersihkan avatar di tampilan. Tidak menyentuh proses agent eksternal. `agent.move` dengan `position` memindahkan avatar secara dekoratif lewat grid lantai. Koordinat input tetap 768 × 512; tujuan di meja diarahkan ke titik lantai terdekat. Field `room` tetap diterima sebagai metadata untuk script lama, tetapi tidak memindahkan avatar antar ruangan. Tanpa posisi khusus, ID yang sama tetap memakai komputer yang sama.

Untuk retry yang aman, kirim event upsert dengan ID event unik:

```json
{"type":"agent.upsert","eventId":"run-17-step-3","agent":{"id":"writer-1","status":"working","task":"Menulis adegan kedua"}}
```

Event ID yang sama dideduplikasi untuk 1.000 event terakhir. Response: `{"ok":true,"duplicate":false,"revision":3}`. Update invalid ditolak dengan JSON error dan status HTTP 400; agent move yang ID-nya belum ada memakai 404.

`GET /api/state` memberikan snapshot saat ini. Browser menggunakan `GET /api/stream` (SSE) untuk menerima snapshot terbaru; reconnect/refresh tidak perlu mengirim ulang setiap event.

## Build & batas viewer lokal

```sh
npm test
npm run build
npm run preview
# Server pusat: setelah OFFICE_API_TOKEN diatur di .env
npm start
```

Receiver juga tersedia dalam `npm run preview`; server produksi mandiri tersedia dalam `npm start`. Hosting file `dist` saja tidak menjalankan API. Node 22.12+ diperlukan. Store tampilan ada di memori: refresh browser memulihkan dari server; restart server dikembalikan oleh heartbeat client Hermes berikutnya, atau script manual mengirim ulang status terakhir.

Development bind ke `127.0.0.1`; server produksi memakai `HOST` dan `PORT` dari `.env`. Batas 64 agent dan body 64 KiB. Cross-origin browser writes ditolak. Client mesin lain memakai server pusat dengan token dan URL HTTPS pada deployment lu.

Struktur utama: `src/App.tsx` untuk UI sederhana, `src/OfficeScene.ts` untuk animasi, `src/officeModel.ts` untuk kontrak, `server/store.ts` untuk state tampilan, dan `server/viewerPlugin.ts` untuk adapter HTTP/SSE. Server ini tidak berisi scheduler atau agent runner.

Aset karakter dan kantor versi awal dibuat memakai Bumi `openai/gpt-image-2`; row extraction, atlas, dan palette bake memakai `sprite-gen`. API key tidak dibutuhkan untuk menjalankan tampilan. Source/audit aset tersedia di `assets/generated`; catatan kualitas walking experimental ada di folder sprite. Ruangan terbuka dan meja saat ini digambar langsung di Phaser; animasi mengetik memakai pose belakang chibi dengan gerakan tangan dan monitor di scene. Lima warna pakaian memakai satu basis chibi; variasi rambut/aksesori dapat dipoles berikutnya.
