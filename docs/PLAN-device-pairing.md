# Plan: Tambah agent dan pairing device

Status: implementasi v0.1 selesai di lokal; token device sudah dipisahkan dari token server utama.

Tujuan fitur ini adalah membuat onboarding satu device baru dari panel **Daftar agent**. Satu device boleh menjalankan Hermes dan Codex sekaligus dengan satu token device yang sama. Session tetap menjadi identitas agent di kantor, sedangkan token mengidentifikasi device pengirim heartbeat.

## Alur pengguna

1. Operator membuka **Daftar agent** dan memilih **Tambah agent**.
2. Operator mengisi label device dan memilih provider Hermes, Codex, atau keduanya.
3. Operator memasukkan kunci admin server secara lokal. Kunci ini tidak disimpan oleh browser.
4. Server membuat token device acak 256-bit dan hanya mengembalikan plaintext token pada respons pembuatan.
5. Modal menampilkan Markdown yang berisi URL server, token device, dan perintah instalasi provider terpilih.
6. Operator menyalin Markdown ke device baru, menjalankan installer, lalu melihat session muncul pada kantor.
7. Token device lama tidak berubah. Token baru dapat dicabut tanpa memutus device lain.

## Kontrak server

- `POST /api/device-tokens` — hanya token server utama; membuat token device.
- `GET /api/device-tokens` — hanya token server utama; melihat metadata token tanpa plaintext.
- `POST /api/device-tokens/revoke` — hanya token server utama; mencabut token device.
- Endpoint heartbeat menerima token server utama maupun token device aktif.
- Registry token disimpan di `OFFICE_DATA_DIR/device-tokens.json` dengan permission `0600`.
- Token plaintext tidak disimpan; server hanya menyimpan hash SHA-256.

## Batas keamanan

- Tombol ini adalah tindakan operator. Viewer publik yang tidak memiliki kunci admin tidak dapat membuat token.
- Token device tidak boleh ditempatkan pada URL viewer atau Git.
- Token device dibagi oleh Hermes dan Codex pada device yang sama; masing-masing bridge tetap memiliki `clientId` sendiri.
- `clientId` tidak disalin antar device. Installer membuat identitas lokal baru.

## Hasil v0.1

- Modal responsif dengan pilihan provider, label device, status error, dan tombol copy Markdown/token.
- Endpoint token device dengan persistence, revoke, dan autentikasi master.
- Client lama tetap kompatibel karena masih menerima token server utama.
