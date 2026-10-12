# NekOffice v0.6 — Viewer movement controls

Status: implementasi lokal di branch `codex/v0.6-viewer-controls`.

Rilis ini menyempurnakan viewer realtime v0.5 dengan collision meja, catatan singkat di atas karakter, dan kapasitas penonton yang bisa dikonfigurasi.

## Perilaku

- W/A/S/D dan tombol panah memakai collision geometry yang sama dengan path agent. Viewer akan berhenti di sisi meja dan dapat meluncur pada sumbu yang masih terbuka.
- Tombol `Space` dan kontrol pause membekukan animasi di browser. Pada Live API, bridge dan data server tetap berjalan.
- Server memeriksa ulang setiap posisi agar client tidak dapat menembus meja dengan request manual.
- Input `Nama karakter` dan `Catatan singkat` di layar viewer dikirim lewat heartbeat viewer dan tersinkron ke karakter lain. Nama dibatasi 5 karakter, catatan 50 karakter, dan isi catatan tidak disimpan di history.
- Batas viewer aktif default adalah 3. Set `OFFICE_MAX_VIEWERS` pada `.env` atau compose untuk mengubahnya. Session keempat menerima HTTP 429 ketika kapasitas penuh.

## Kontrak API

`POST /api/viewers/move` menerima:

```json
{
  "position": {"x": 500, "y": 300},
  "direction": "right",
  "moving": true,
  "name": "Pekerja Santai",
  "note": "Lagi ngoding"
}
```

`name` dibatasi 5 karakter. `note` boleh dikosongkan untuk menghapus bubble. Token viewer tetap ephemeral di `sessionStorage`; token tidak masuk snapshot publik.

## Validasi

- `npm test -- --run`
- `npm run build`
