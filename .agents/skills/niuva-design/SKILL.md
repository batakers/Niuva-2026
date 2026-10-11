---
name: niuva-design
description: Membantu keputusan komposisi dan review UI Niuva pada Company, Commerce/Customer, atau Admin dengan panduan lokal dan bukti produk. Gunakan untuk desain, redesign, atau kritik visual Niuva; bukan pekerjaan backend saja.
---

# Niuva Design

Gunakan untuk menerjemahkan konten dan tugas menjadi komposisi pada route Niuva. Nilai visual tidak disalin ke skill ini: [DESIGN.md](../../../DESIGN.md) memiliki identitas bersama, [AGENTS.md](../../../AGENTS.md) memiliki workflow/otorisasi.

## Pilih konteks dari tugas route

| Konteks | Baca |
| --- | --- |
| Homepage, layanan, projects/case study | [Company](../../../docs/design/company.md) |
| Shop, MAKE, quote, cart/checkout, account, auth/status Customer | [Commerce & Customer](../../../docs/design/commerce.md) |
| Dashboard, daftar, detail, workspace, form Admin | [Admin](../../../docs/design/admin.md) |

Baca hanya panduan area yang terkait, route asli, primitive/token yang digunakan, serta sumber konten penting. Untuk perubahan yang melintasi area, baca masing-masing panduan. PRODUCT_CONTEXT memiliki positioning/copy; PRD/Tech Design beserta addenda tetap authority produk/teknis.

## Putuskan hubungan sebelum bentuk

Untuk perubahan komposisi yang berarti, tentukan secara singkat:
- tugas dan keputusan utama pengguna;
- isi/bukti yang tersedia serta mana yang paling penting;
- hubungan yang perlu terlihat, misalnya narasi–artefak, produk–varian–harga, atau record–tindakan;
- bentuk yang membuat hubungan itu terbaca di wide dan compact.

Ini catatan kerja, bukan deliverable tambahan atau tahap approval. Gunakan brief/referensi yang sudah diberikan. Jika arah belum tersedia, ikuti satu pertanyaan yang ditentukan AGENTS; jangan membuat turnamen konsep atau preview terpisah sebagai prasyarat.

Pilih paragraf, daftar, definition list, tabel, grid media, atau card dari kebutuhan konten. Seluruh halaman mengikuti kontrak shadcn/ui global di DESIGN: gunakan komponen lokal ui atau komposisi niuva, dengan HTML semantik yang sesuai; jangan membuat primitive paralel per area. Reuse behavior/state tanpa memaksakan satu komposisi pada tiga area. Pola standar tetap sah; asimetri, serif, dark stage, dan detail engineering harus punya manfaat yang dapat dijelaskan.

## Jaga sumber dan status keputusan

Bukti Niuva dan kontrak produk membatasi klaim. Jangan mengisi kekurangan konten dengan pelanggan, outcome, harga, inventory, atau media realistis yang dibuat-buat. Pertahankan tujuan DEVELOP/MAKE/BUY, state server, native semantics, dan permission existing.

[Foundation proposal](../../../docs/design/foundation-proposal.md) dan studi referensi adalah bahan evaluasi, bukan token aktif. Scope audit tidak otomatis menjadi izin redesign. Permintaan implementasi yang jelas langsung dikerjakan dalam scope, tanpa approval serial yang tidak diminta.

Persetujuan dasar komponen global tidak membuktikan semua route sudah bermigrasi. Pada tugas dokumentasi saja, catat keputusan dan status existing tanpa mengubah runtime; penerapan berikutnya mengikuti scope implementasi yang diminta.

Impeccable boleh membantu craft pada tugas yang relevan; niuva-editorial membantu copy secara opsional. Keduanya tidak mengganti panduan area atau memaksakan template estetika lain.

## Periksa hasil yang sebenarnya

Gunakan [quality review](../../../docs/design/quality.md). Pada audit, pisahkan pengamatan source dari bukti browser. Pada implementasi, periksa route sebenarnya, viewport/state relevan, interaksi, keyboard/fokus, dan reduced motion; tunjukkan hasil. Laporkan acceptance dan batas bukti sesuai AGENTS. Mengganti file panduan saja belum membuktikan kualitas visual UI meningkat.
