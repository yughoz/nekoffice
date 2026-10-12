# NekOffice v0.5 — Avatar Penonton Realtime

Status: implementasi lokal selesai di branch `codex/v0.5-viewer-avatar`.

v0.5 menambahkan karakter penonton yang muncul di kantor dan bisa digerakkan dengan `W`, `A`, `S`, `D` atau tombol panah. Posisi, arah, nama acak, dan gaya avatar disiarkan melalui SSE sehingga penonton lain melihat pergerakan yang sama.

## Perilaku

- Satu tab browser membuat satu session viewer ephemeral tanpa login.
- Token viewer hanya disimpan di `sessionStorage` dan tidak pernah masuk snapshot publik.
- Session yang tidak mengirim heartbeat selama 45 detik dihapus otomatis.
- Server membatasi maksimal 3 viewer aktif secara default; batas dapat diubah dengan `OFFICE_MAX_VIEWERS`.
- Viewer tidak bisa berjalan melewati area meja; posisi divalidasi ulang di server.
- Viewer dapat mengganti nama karakter dan mengirim catatan singkat maksimal 50 karakter yang tampil sebagai bubble di atas kepala.
- Session yang tidak mengirim heartbeat selama 45 detik dianggap pulang dan dibersihkan server. Token yang tersimpan di tab dipulihkan saat reload agar posisi, nama, dan note tetap konsisten.
- Avatar memakai aset karakter kantor yang sama dengan tint berbeda dan label `Penonton-xxx`.

## Endpoint

| Endpoint | Fungsi |
| --- | --- |
| `POST /api/viewers/session` | Membuat session viewer anonim dan token ephemeral |
| `POST /api/viewers/move` | Memperbarui posisi, arah, status bergerak, dan `note` opsional |
| `POST /api/viewers/leave` | Menghapus session viewer saat tab ditutup |
| `GET /api/stream` | Mengirim snapshot agent dan viewer ke semua browser |

Viewer write endpoint tetap dibatasi same-origin, memakai token session, batas posisi walkable, TTL, dan kapasitas aktif untuk mencegah session liar memenuhi kantor.
