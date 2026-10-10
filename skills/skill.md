# Nekoffice Skills

Dokumen ini mencatat skill dan workflow yang dipakai untuk membangun Nekoffice. Skill di sini adalah panduan development; bukan service yang dijalankan oleh server atau client runtime.

## Registry skill

| Skill/reference | Peran di project |
| --- | --- |
| `sprite-gen` | Pipeline sprite, atlas, palette, dan pemeriksaan aset. |
| `create-game-assets` | Perencanaan art direction dan konsistensi aset kantor. |
| `phaser-core` | Struktur scene, lifecycle, loader, dan renderer Phaser. |
| `camera-systems` | Pan, zoom, fit, follow, dan batas kamera kantor. |
| `game-feel` | Timing, easing, variasi gerak, dan feedback animasi. |
| `game-ui-ux` | HUD, panel agent, pairing, dan layout responsive. |
| `performance-optimization` | Profiling dan pengurangan beban render saat agent bertambah. |
| `sites:sites` | Workflow website untuk build, preview, dan deployment. |
| `awesome-gamedev-agent-skills` + router | Referensi dan pemilihan skill game development yang sesuai. |

Skill engine khusus lain seperti Godot, Unity, Unreal, dan Roblox tidak digunakan untuk runtime Nekoffice.

## Art direction dan asset

### `sprite-gen`

Dipakai untuk pipeline sprite karakter dan aset kantor:

- menyiapkan row/frame sprite;
- ekstraksi dan alignment frame;
- pembuatan atlas dan manifest;
- pembersihan background;
- pembuatan colorway/palette;
- preview dan pemeriksaan kualitas.

Output runtime berada di `assets/generated/`. Browser hanya membaca aset hasil pipeline dan tidak membutuhkan API key provider.

### Bumi `openai/gpt-image-2`

Bumi dipakai sebagai provider untuk membuat konsep kantor dan basis karakter chibi. Provider ini bukan skill runtime. API key hanya boleh digunakan dari environment lokal atau pipeline asset, tidak dari frontend dan tidak dengan prefix `VITE_`.

## Game dan rendering

### Phaser game workflow

Phaser dipakai sebagai renderer dunia kantor 2D:

- scene dan lifecycle kantor;
- sprite avatar dan komputer;
- proyeksi status agent ke animasi;
- animasi masuk dari pintu, berjalan, mengetik, idle, selesai, dan keluar;
- kamera pan, zoom, fit, dan follow.

Implementasi utamanya ada di `src/OfficeScene.ts`.

### Game feel dan animation

Dipakai untuk membuat aktivitas agent terbaca dan terasa hidup:

- timing gerak yang bervariasi;
- typing loop saat coding;
- state reasoning/waiting/working/done;
- jeda dan variasi acak antar agent;
- transisi masuk dan pulang.

Timer animasi hanya memvisualisasikan state. State operasional tetap berasal dari API atau mode demo.

### Performance optimization

Dipakai untuk menjaga rendering tetap ringan ketika banyak agent aktif:

- mengurangi pekerjaan per frame;
- membatasi update yang tidak berubah;
- menjaga label dan UI tetap tajam saat zoom;
- memisahkan state API dari renderer.

## UI dan aplikasi web

### Game UI/UX

Dipakai untuk UI yang mengelilingi scene kantor:

- daftar agent;
- status koneksi dan heartbeat;
- detail agent dan aktivitas singkat;
- panel pairing client;
- tombol copy konfigurasi Hermes/Codex;
- layout responsive dan mode viewer.

### Website/server workflow

Stack aplikasi yang digunakan:

- React + TypeScript untuk UI;
- Vite untuk development dan build frontend;
- Node.js untuk API server dan static serving;
- Docker Compose untuk deployment;
- Vitest untuk pengujian.

Server pusat menyediakan endpoint API dan static build dari origin yang sama. Client Hermes/Codex hanya membuat koneksi keluar ke server.

## Integrasi agent

### Hermes dan Codex bridge

Bridge bukan skill Codex, tetapi integrasi project yang memakai konfigurasi:

```env
LITTLE_OFFICE_URL=https://office.nekoding.xyz
LITTLE_OFFICE_API_TOKEN=token-server
```

Hermes dan Codex mengirim heartbeat/status ke API Nekoffice. Browser menerima perubahan melalui stream dan menampilkan agent sesuai status terakhir.

## Prinsip penggunaan

1. Skill hanya membantu proses development; jangan menganggapnya sebagai dependency runtime.
2. Credential provider dan token server tidak boleh masuk ke source control.
3. Status agent harus berasal dari API/event; animasi tidak boleh mengubah status operasional.
4. Aset yang dipakai runtime harus berasal dari output yang sudah diperiksa pipeline.
5. Perubahan visual harus diuji pada zoom, ukuran layar, dan jumlah agent yang realistis.

## Referensi

- Pipeline aset: `docs/workflow-demo-baseline.md`
- Kontrak server/client: `docs/SERVER-CLIENT.md`
- Bridge Hermes: `docs/HERMES-BRIDGE.md`
- Bridge Codex: `docs/CODEX-BRIDGE.md`
- Skill sprite-gen: https://github.com/aldegad/sprite-gen
- Koleksi game-dev skills: https://github.com/gamedev-skills/awesome-gamedev-agent-skills
