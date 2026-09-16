# Owner catalog seed

`scripts/seed-catalog.ts` adalah importer idempotent untuk dataset katalog yang sudah disediakan Owner. Script ini hanya menerima database PostgreSQL loopback dengan marker `dev`, `demo`, atau `test`, dan memerlukan `CATALOG_SEED_CONFIRMATION=I_UNDERSTAND_NON_PRODUCTION`.

Jalankan setelah dataset nyata tersedia:

```powershell
$env:CATALOG_SEED_FILE = "C:\path\to\owner-catalog.json"
$env:CATALOG_SEED_CONFIRMATION = "I_UNDERSTAND_NON_PRODUCTION"
corepack pnpm db:seed:catalog
```

Format minimum:

```json
{
  "version": 1,
  "categories": [{ "slug": "desk", "name": "Desk", "sortOrder": 0 }],
  "products": [{
    "slug": "product-slug",
    "name": "Nama produk nyata",
    "description": "Deskripsi yang sudah disetujui",
    "categorySlug": "desk",
    "isPublished": false,
    "variants": [{
      "sku": "SKU-NYATA",
      "name": "Default",
      "priceRp": "125000",
      "stockOnHand": 0,
      "weightGrams": "120",
      "isActive": true
    }],
    "media": [{
      "storageKey": "media/products/product-slug.webp",
      "altText": "Foto produk product-slug",
      "sortOrder": 0
    }]
  }]
}
```

Importer tidak membuat data sintetis, tidak menghapus produk/varian/media lain, dan tidak mengaktifkan Biteship atau Midtrans. `stockOnHand`, harga, SKU, dan foto harus berasal dari dataset Owner; key foto harus sudah dipetakan ke file asset yang benar-benar ada di `public/` sebelum transaksi seed dimulai. Publikasi tetap melewati editor admin dan gate bukti/izin.
