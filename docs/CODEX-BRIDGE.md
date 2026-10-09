# Client Codex → Nekoffice

Client ini menampilkan aktivitas **Codex Desktop / IDE dan terminal lokal** tanpa mengubah cara lu menjalankan Codex. Satu thread induk = satu orang. Nama orang diambil dari folder kerja terakhir (`cwd`), subagent digabung ke induknya, dan guardian approval internal tidak menjadi orang terpisah.

```text
Codex Desktop / CLI
      │ event lifecycle pada rollout lokal
      ▼
client pengamat Python ── HTTPS + Bearer token ── API Nekoffice
                                                   │ SSE
                                                   ▼
                                              kantor browser
```

Implementasi ini dibuat sendiri. [codex-acp](https://github.com/agentclientprotocol/codex-acp) menjadi referensi arsitektur: adapter tersebut menjalankan Codex App Server dan menerjemahkan event ke ACP melalui stdio. ACP cocok untuk session yang dijalankan melalui client ACP; memasang adapter saja tidak menangkap session desktop yang sudah berjalan. [Dokumentasi App Server resmi](https://learn.chatgpt.com/docs/app-server) menjelaskan lifecycle thread/turn/item. Untuk langsung memantau session lokal yang sudah dipakai, client Nekoffice membaca event lifecycle JSONL yang ditulis Codex.

## Pasang di setiap mesin Codex

Python 3.9+ diperlukan. Tidak perlu OpenAI API key tambahan atau package Python eksternal. Gunakan **token API Nekoffice**, bukan kredensial OpenAI. Token server sama dengan `OFFICE_API_TOKEN` pada deployment.

```sh
git clone git@github.com:yughoz/nekoffice.git
cd nekoffice
python3 integrations/codex/install.py --server https://office.nekoding.xyz --autostart
```

Installer meminta token tanpa menampilkannya. Pada macOS, `--autostart` memasang LaunchAgent, mulai berjalan sekarang, dan aktif lagi saat login. Jika client Hermes Nekoffice sudah dikonfigurasi di mesin yang sama:

```sh
python3 integrations/codex/install.py --from-hermes-config --autostart
```

URL dan token dipakai ulang; ID client Codex dibuat sendiri dan tetap stabil. Jangan menyalin `client.json` antar mesin; gunakan installer agar setiap mesin mempunyai ID sendiri. Desktop dan terminal dengan `CODEX_HOME` yang sama cukup memakai satu client pengamat.

Linux: hilangkan `--autostart`, lalu jalankan client dengan supervisor lu sendiri:

```sh
python3 integrations/codex/install.py --server https://office.nekoding.xyz
python3 ~/.codex/nekoffice/client.py run
```

Untuk home lain: tambahkan `--home /path/to/codex-home`. Default membaca `CODEX_HOME`, atau `~/.codex`. Autostart macOS saat ini memakai satu service per user; gunakan satu Codex home pada service tersebut. Instal ulang setelah memperbarui source client.

## Aktivitas yang terlihat

| Event lokal | Tampilan |
| --- | --- |
| `task_started` | Masuk, mulai berpikir |
| Item reasoning / command / file / tool | Berpikir atau mengetik; label aktivitas umum |
| Approval / input request jika dicatat rollout | Menunggu |
| `task_complete` / `turn_aborted` | Pulang |
| Giliran baru pada thread sama | Orang yang sama masuk kembali |
| Client kehilangan jaringan / berhenti | Server menyuruh pulang setelah lease 35 detik |

Polling lokal setiap satu detik. Snapshot dikirim segera saat berubah dan heartbeat setiap 10 detik; kegagalan memakai retry 1–30 detik. Server menahan metadata orang selesai selama 90 detik untuk animasi keluar, lalu menghapusnya. Completion lama tidak menutup turn baru. Thread selesai saat client mulai tidak menjalankan ulang pekerjaan lama.

Client tidak mengirim isi chat, reasoning, command, argument tool, output, instruksi, full path, atau kredensial OpenAI. Payload hanya berisi ID hash session, nama folder, peran, status, label aktivitas umum, waktu aktivitas, dan penanda aktif. Token hanya berada dalam header autentikasi. Config dan status lokal permission 0600; tidak disimpan di Git.

## Batas pengamat lokal

Format rollout merupakan format internal Codex, bukan API ACP yang stabil. Parser diuji pada **Codex 0.160.1** dan source event yang tersedia di mesin ini. Pembaruan Codex dapat memerlukan pembaruan parser. Client membaca metadata awal dan maksimal 4 MiB bagian akhir saat bootstrap, lalu hanya tambahan baris baru dengan batas ukuran dan waktu baca. Thread yang baru aktif dalam 120 detik dapat muncul saat client pertama dijalankan; sisanya menunggu aktivitas berikutnya.

Session tanpa event selama **10 menit** dianggap tidak aktif agar session yang crash tidak tinggal selamanya. Tool yang sangat lama tanpa event juga dapat mencapai batas ini; sesuaikan lewat `--stale-seconds 1800` pada installer/client. Event berikutnya mengaktifkan orang lagi. Status approval hanya tersedia jika runtime mencatat event tersebut. Session cloud, ephemeral tanpa rollout, dan mesin lain tidak terbaca oleh observer ini; pasang client pada mesin yang menyimpan rollout. Client ini tidak memulai atau mengambil alih pekerjaan Codex.

## Status dan operasi macOS

```sh
python3 ~/.codex/nekoffice/client.py status
curl https://office.nekoding.xyz/api/integrations/codex
```

Status lokal menunjukkan `running`, `connected`, `activeSessions` dan waktu heartbeat berhasil, tanpa token. Status server menghitung client/produser HTTP yang masih hidup dan session aktif. `activeSessions: 0` normal ketika Codex selesai atau menunggu pesan baru.

```sh
# Restart client pengamat
launchctl kickstart -k gui/$(id -u)/xyz.nekoding.office.codex

# Hentikan dan nonaktifkan autostart
launchctl bootout gui/$(id -u)/xyz.nekoding.office.codex
rm ~/Library/LaunchAgents/xyz.nekoding.office.codex.plist
```

File instalasi: `~/.codex/nekoffice/{client.py,observer.py,client.json,status.json}`. Log service tidak berisi transcript. Menghentikan client tidak membatalkan session Codex.

## Kontrak API

`POST /api/codex/heartbeat` memakai JSON dan `Authorization: Bearer TOKEN_SERVER`.

```json
{
  "version": 1,
  "clientId": "persistent-machine-id",
  "producerId": "unique-observer-process-id",
  "sequence": 1,
  "sessions": [{
    "agent": {
      "id": "codex-0123456789abcdef01234567",
      "name": "nekoffice",
      "role": "Codex · Desktop / IDE",
      "team": "production",
      "status": "working",
      "task": "Mengubah file project",
      "parentId": null,
      "progress": null
    },
    "active": true,
    "updatedAt": 1791540000000
  }]
}
```

Server memberi namespace ID per client sehingga session dari mesin berbeda tidak bertabrakan. Sequence lama tidak memperbarui lease. Paket divalidasi seluruhnya sebelum diubah. Endpoint Hermes tetap `/api/hermes/heartbeat`; masing-masing endpoint menolak ID provider lain. API manual tetap tersedia.

## Tes

```sh
npm test
npm run build
python3 -m unittest discover -s integrations/codex -v
python3 -m unittest discover -s integrations/hermes -v
```

Tes memeriksa lifecycle/resume, selesai sebelum startup, stale/crash, subagent/guardian, record parsial UTF-8, truncation, bounded tail, penyaringan konten sensitif, autentikasi HTTP, redirect, serta kompatibilitas Hermes.
