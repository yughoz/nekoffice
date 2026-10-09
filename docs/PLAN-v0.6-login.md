# v0.6 — akun lokal dan office publik

v0.6 menambahkan registrasi dan login lokal tanpa GitHub atau provider eksternal. Penonton tetap dapat membuka office publik tanpa akun; owner memakai akun lokal untuk mengatur office dan membuat device token.

## Kontrak akses

| Pengguna | Akses | Kredensial |
| --- | --- | --- |
| Penonton | Public Lobby dan office dengan `publicEnabled` | Tidak ada |
| Owner | Office miliknya, history, pengaturan, dan pairing | Username + password, session cookie |
| Bridge Hermes/Codex | Heartbeat ke satu office | Device token |
| Bootstrap server | Kompatibilitas script dan migrasi default | `OFFICE_API_TOKEN` |

Session browser memakai cookie `office_session` yang opaque, `HttpOnly`, `SameSite=Lax`, dan `Secure` saat request datang melalui HTTPS. Server hanya menyimpan hash session di `OFFICE_DATA_DIR/auth.json`. Password disimpan sebagai salt + hash scrypt, tidak pernah sebagai teks mentah.

## Alur akun

1. Klik **Masuk owner**.
2. Pilih **Registrasi**, isi nama tampilan, username, dan password minimal 8 karakter.
3. Setelah akun dibuat, server langsung membuat session dan office owner.
4. Login berikutnya memakai username dan password yang sama.
5. Logout hanya mengakhiri session browser; agent dan bridge tetap bekerja.

Username dinormalisasi menjadi huruf kecil dan memakai 3–32 karakter dari huruf, angka, titik, garis bawah, atau tanda minus. Server menolak username duplikat dan mengembalikan pesan yang sama untuk username/password login yang salah.

## Endpoint auth

```text
GET  /api/auth/me
POST /api/auth/register   { username, displayName?, password }
POST /api/auth/login      { username, password }
POST /api/auth/logout
```

Endpoint register/login menerima JSON same-origin. Response sukses memasang cookie session; response tidak pernah mengembalikan password atau hash. Akun dan session persisten melalui `OFFICE_DATA_DIR/auth.json`.

## Office dan URL

Server menyimpan directory office di `OFFICE_DATA_DIR/offices.json`. Instalasi lama mendapat office `default` agar heartbeat dan URL yang ada tetap kompatibel. Owner pertama mengambil office default; owner berikutnya mendapat office baru dengan slug unik.

Endpoint publik:

```text
GET /api/public/offices
GET /api/public/offices/:slug
GET /api/public/offices/:slug/stream
```

UI Public Lobby tersedia di `/lobby`; scene office publik dibuka di `/office/:slug`. URL `/` tetap menjadi kantor utama agar link deployment lama tidak rusak.

State publik hanya memuat avatar, role, status, team, posisi, dan label aktivitas umum. `machineId`, label mesin, versi bridge, `projectKey`, prompt, command, dan isi chat tidak dikirim ke public projection.

## Endpoint owner

```text
GET   /api/auth/me
POST  /api/auth/logout
PATCH /api/offices/:id
GET   /api/device-tokens
POST  /api/device-tokens
POST  /api/device-tokens/revoke
```

Device token yang dibuat owner diberi `officeId`. Heartbeat dari token itu masuk ke runtime dan history office tersebut; owner lain tidak dapat membaca daftar atau mencabut token tersebut.

## Kriteria verifikasi

- Viewer tanpa login hanya dapat melihat office yang public.
- Office private mengembalikan `401` untuk state, stream, integrations, dan history tanpa session owner.
- Username duplikat ditolak dan password tidak disimpan mentah.
- Mengganti slug tidak memberikan akses ke office private.
- User kedua tidak dapat melihat atau mencabut device token user pertama.
- Device token tetap bekerja saat owner logout.
- `npm test` dan `npm run build` wajib lulus sebelum deployment.
