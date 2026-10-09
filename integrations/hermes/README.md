# Hermes client

Plugin Python ini berjalan di setiap mesin Hermes dan mengirim status session ke server Little Office. Tidak perlu Node/npm di mesin client.

```sh
python3 integrations/hermes/install_bridge.py --server https://office.DOMAIN_LU
```

Masukkan token server saat diminta. Lalu mulai ulang runtime Hermes agar plugin/config baru termuat. Aktifkan pada setiap profile yang dipakai. Lihat [panduan server dan client](../../docs/SERVER-CLIENT.md) untuk setup lengkap, Docker, profiles, heartbeat, dan API.

File plugin: `little-office-bridge/__init__.py` mengamati session dan menjalankan writer; `transport.py` menangani HTTP, token, dan identitas mesin; `plugin.yaml` mendeklarasikan hook. `install_bridge.py` menyalin plugin dan mengaktifkannya lewat CLI resmi Hermes. Seluruh client memakai standard library Python.
