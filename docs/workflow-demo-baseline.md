# Little Office

Demo kantor virtual untuk menonton agent dan subagent bekerja. Cozy pixel art, manusia chibi, empat tim, browser desktop dan mobile. Baseline produk ada di [PRD](docs/PRD.md).

## Jalankan

Node 22.12+ dibutuhkan. Versi dependensi dipin di `package-lock.json`.

```sh
npm ci
npm run dev
```

Buka URL yang dicetak Vite. Port default 5173; bila dipakai aplikasi lain, Vite memilih port berikutnya. Server preview hanya bind ke `127.0.0.1`.

```sh
npm test
npm run build
npm run preview
```

## Yang tersedia

- 13 avatar: koordinator, empat lead, delapan subagent. Klik avatar atau daftar tim untuk melihat tugas, parent, dependensi, output, dan aktivitas.
- 19 tugas dengan event deterministik. Jalur landscape dimulai dari brief, riset dan skrip, creative paralel, timeline dan render, QA, revisi caption terarah, lalu publikasi simulasi.
- Demo sekitar 4 menit pada 1x. Pause, 2x/4x, reset, pencarian dan filter agent.
- Pan, zoom, fit, follow agent; pan menghentikan follow. Nama ruangan digambar dalam scene, bukan dibakar ke gambar kantor.
- Script, riset, storyboard, audio WAV, gambar, thumbnail, caption SRT, metadata, timeline, video MP4, laporan QA, dan ZIP paket fixture dapat dipreview/diunduh setelah tugasnya selesai.
- Snapshot versi 1 di localStorage; refresh memulihkan waktu, pause, kecepatan, mute, dan reduced motion. Menutup tab tidak mempercepat demo secara diam-diam. Snapshot rusak/versi lain diabaikan.
- Layout HP dengan menu tim dan drawer detail; dialog preview/pengaturan, keyboard, reduced motion, notifikasi suara opsional.

Ini milestone **demo simulasi**. Task, delegasi, progres provider, pemeriksaan QA, dan publishing berasal dari simulator. Tidak ada tool AI berbayar atau upload YouTube saat menjalankan demo. Media preview adalah fixture lokal landscape ~20 detik; brief menargetkan video 60 detik. Shorts, runtime agent nyata, provider TTS/gambar saat run, server rendering, dan OAuth YouTube belum terintegrasi.

## Struktur

| File / folder | Peran |
| --- | --- |
| `src/domain.ts` | Tim, graf dependensi, perencanaan seeded, kontrak event, reducer, pemulihan snapshot |
| `src/useDemo.ts` | Clock simulasi dan penyimpanan browser |
| `src/OfficeScene.ts` | Phaser 4 scene, avatar, animasi, kamera, proyeksi event ke gerak |
| `src/navigation.ts` | Grid lantai, pintu, furnitur, pathfinding |
| `src/App.tsx` | React UI, tree agent, pipeline, hasil dan detail |
| `src/components/ArtifactModal.tsx` | Preview dan unduh fixture |
| `public/assets` | Aset runtime dan media fixture |
| `assets/generated/sprites/office-worker` | Run sprite-gen lengkap, raw rows, atlas, manifest, QA dan colorways |
| `scripts/bumi_image.py`, `scripts/bumi_assets.py` | Adapter generation Bumi, ID resume, upload referensi |
| `scripts/make_demo_media.py` | Pembuatan media fixture lokal, bukan worker production |

Keadaan task tidak menunggu avatar sampai ke meja. Gerakan adalah proyeksi dekoratif event. Reducer menolak gap urutan dan mengabaikan event duplikat/run lain; integrasi nyata berikutnya perlu adapter snapshot + stream serta worker backend dengan persistensi.

## Aset dan credential

Kantor dan satu basis karakter dibuat melalui **Bumi `openai/gpt-image-2`**. Enam baris terpisah dibuat dengan identity reference dan layout guide dari `sprite-gen`, kemudian diekstrak, dikomposisi, diinspeksi, dan diwarnai ulang dengan tool skill tersebut. Phaser membaca `frame_layout` manifest yang eksplisit. Atlas/colorway hasil komposisi dipakai sebagai input runtime.

Tidak ada API key dalam frontend atau source. Script membaca `BUMI_API_KEY` dari environment atau prompt terminal tersembunyi. Jangan memakai prefix `VITE_` untuk credential provider. Metadata generation tidak menyimpan header authorization. Paid POST tidak diulang otomatis; jalankan batch yang sama untuk memulihkan generation ID yang sudah tersimpan.

```sh
python3 scripts/bumi_assets.py design/initial-assets.jobs.json
python3 scripts/bumi_assets.py design/sprite-assets.jobs.json
```

Batch di atas melewati output yang sudah ada; jangan menghapus metadata pending lalu resubmit tanpa memeriksa job provider. Upload referensi mengikuti [Bumi upload API](https://bumi.digital/api-docs/upload); model parameter mengikuti [Bumi image API](https://bumi.digital/api-docs/image).

Narasi fixture dibuat lokal memakai voice macOS Damayanti. Untuk membuat ulang klip, sediakan `public/assets/demo-narration.wav`, Pillow, font Arial, dan FFmpeg; jalankan `scripts/make_demo_media.py`. Path FFmpeg/font script saat ini mengikuti lingkungan macOS ini. Menjalankan web demo tidak membutuhkan Python, Bumi, voice macOS, atau FFmpeg.

## Validasi dan batas demo

Tes meliputi determinisme event, pekerjaan creative paralel, caption yang menunggu timing audio, join input render, revisi QA terarah, deduplikasi/gap event, snapshot invalid, status attention yang terpisah dari riwayat QA, dan koneksi seluruh workstation melalui lantai/pintu.

Catatan kualitas sprite ada di `assets/generated/sprites/office-worker/qa-notes.md`. Walking rows bersifat **experimental**; ada perbedaan pitch/scale sumber, dan siklus foot contact belum disertifikasi. Avatar memakai basis yang sama dengan lima warna pakaian, nama dan badge role; variasi rambut dan aksesori individual merupakan tahap art polish. Collision diterapkan terhadap furnitur; avatar dekoratif dapat berpapasan saling menumpuk di koridor. UI dan state model siap dikembangkan, tetapi keseluruhan PRD belum dinyatakan selesai.
