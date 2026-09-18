# Custom Product Intake v1

Snapshot: **2026-09-18** · status: `IMPLEMENTED_WITH_REVIEW_GATE`

Dokumen ini menjelaskan jalur aman untuk lima produk Shop yang disetujui Owner
sebagai `HOLD_CUSTOM_FLOW`. Produk tetap tidak muncul di Shop dan tidak memiliki
checkout langsung. Customer memilih referensi, mengirim konteks serta file
model melalui `/custom-print/request`, lalu request masuk ke `/admin/custom-print`
untuk review operator dan quote.

## Produk yang tersedia sebagai referensi

Daftar dibangun dari `catalog-seed.json` dan `catalog-publish-decisions.json`,
bukan dari input browser. Setiap pilihan membawa source ID Owner, slug, foto
referensi pertama, dan nama varian. Pilihan tambahan `CUSTOM_UNSPECIFIED`
menampung kebutuhan custom lain atau customer yang belum yakin.

Harga dan stok pada manifest hanya konteks sumber. Intake tidak membuat
reservasi, order, pembayaran, atau janji harga maupun tanggal selesai.

## Data intake

| Field | Aturan | Penyimpanan |
| --- | --- | --- |
| Produk referensi | Source ID lima produk atau `CUSTOM_UNSPECIFIED`; divalidasi server | Ditulis sebagai blok kanonik pada catatan request |
| Ukuran target | Opsional, teks customer | Catatan request |
| Warna/material/jumlah/unit | Material, jumlah, dan unit tetap wajib seperti alur custom yang ada | Kolom request yang sudah ada |
| Fakultas/identitas | Opsional; berguna untuk produk wisuda | Catatan request |
| Target diperlukan | Opsional tanggal ISO; hanya target pembahasan | Catatan request |
| Catatan | Opsional | Catatan request |
| File model | STL/3MF/OBJ/STEP/STP melalui private R2 capability | `StoredFile` privat dan ownership request |

Field konteks baru dinormalisasi server menjadi catatan berlabel
`[Intake produk custom]`. Dengan demikian migration database tidak diperlukan
untuk vertical slice ini, sementara operator tetap menerima konteks yang bisa
dibaca pada detail request. Nilai product ID yang tidak ada di manifest ditolak
oleh schema server.

## Alur operator

1. Customer membuka kartu referensi atau langsung membuka request form.
2. Browser memvalidasi metadata file; bila capability R2 aktif, file diunggah
   langsung ke bucket privat dan dikonfirmasi server.
3. Server memvalidasi ulang pilihan produk, metadata, ownership file, lalu
   membuat `CustomPrintRequest` berstatus `SUBMITTED`.
4. Operator membuka request di `/admin/custom-print/[id]`, memeriksa file
   privat dan konteks intake, lalu mencatat hasil slicer.
5. Quote dibuat dan dikirim melalui workflow yang sudah ada. Quote tetap
   server-authoritative; Biteship dan Midtrans tidak disentuh oleh slice ini.

## Batas dan acceptance

- Lima produk tetap draft; CTA mengarah ke intake, bukan `/checkout`.
- Foto referensi ditampilkan dari media lokal yang sudah ada di dataset Owner.
- Tidak ada signed URL, upload token, atau access token yang dirender pada
  halaman sukses.
- Target tanggal bukan SLA dan tidak mengubah status atau quote.
- Fresh authenticated admin visual acceptance pasca-seed sudah lulus pada
  1280x900 dan 390x844 dengan sesi Clerk Owner; `/admin/custom-print` tetap
  empty karena belum ada request nyata, sehingga detail custom-print tidak
  dipaksa dengan ID sintetis.
