# Owner catalog seed

Audit sumber yang sudah diberikan Owner dan batas data yang masih terbuka dicatat di
[`catalog-source-audit.md`](catalog-source-audit.md).

`scripts/seed-catalog.ts` adalah importer idempotent untuk dataset katalog yang sudah disediakan Owner. Script ini hanya menerima database PostgreSQL loopback dengan marker `dev`, `demo`, atau `test`, dan memerlukan `CATALOG_SEED_CONFIRMATION=I_UNDERSTAND_NON_PRODUCTION`.

Dataset Shop yang saat ini dipakai berada di
`docs/source/Dataset Shop Niuva/`. `catalog-publish-decisions.json` adalah
approval Owner yang tervalidasi: SKU `SOURCE_ID_V1`, 3 produk ready-made
published, dan 5 produk custom-flow draft. Regenerasi manifest dan mapping media:

```powershell
corepack pnpm catalog:prepare
```

Seed loopback development:

```powershell
$env:CATALOG_SEED_FILE = (Resolve-Path -LiteralPath "docs/source/Dataset Shop Niuva/catalog-seed.json").Path
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

Generator menolak approval yang tidak mencakup tepat seluruh produk sumber,
memiliki ID/nama yang tidak cocok, atau menduplikasi keputusan. Importer tidak
membuat data sintetis, tidak menghapus produk/varian/media lain, dan tidak
mengaktifkan Biteship atau Midtrans. `stockOnHand`, harga, dan foto berasal dari
dataset Owner; ID sumber digunakan sebagai SKU internal v1 sesuai approval.
Dimensi paket boleh tetap kosong selama katalog memakai preview, ongkir manual,
atau flat-rate; field itu menjadi wajib saat shipping provider-calculated
diaktifkan. Key foto harus menunjuk file nyata di `public/` sebelum transaksi.
