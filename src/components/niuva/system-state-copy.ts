import type { FailureKind } from "@/lib/observability/logger";

export const SYSTEM_HEADING_ID = "system-state-title" as const;

export type SystemStateCopy = Readonly<{ title: string; description: string }>;

/**
 * Single source of static copy for system pages (not-found, error, access, loading).
 * Every sentence stays at 20 words or fewer, in Indonesian, and never mentions
 * technical detail such as exception, stack or digest.
 */
export const systemCopy = {
  notFound: {
    title: "Halaman ini tidak tersedia.",
    description:
      "Alamat yang Anda buka tidak tersedia atau sudah dipindahkan. Lanjutkan dari beranda atau katalog.",
  },
  publicError: {
    title: "Halaman belum dapat dimuat.",
    description:
      "Terjadi kegagalan saat menyiapkan halaman ini. Coba lagi, atau kembali ke beranda.",
  },
  globalError: {
    title: "Niuva belum dapat dimuat.",
    description:
      "Terjadi kegagalan pada aplikasi. Coba lagi dalam beberapa saat, atau kembali ke beranda.",
  },
  adminError: {
    title: "Ruang Admin belum dapat dimuat.",
    description:
      "Terjadi kesalahan saat memuat halaman ini. Coba lagi, atau kembali ke Overview.",
  },
  adminNotFound: {
    title: "Data admin tidak ditemukan.",
    description:
      "Data yang diminta tidak ada atau sudah tidak tersedia. Kembali ke Overview untuk melanjutkan.",
  },
  adminAccess: {
    UNAUTHENTICATED: {
      title: "Masuk untuk membuka ruang Admin",
      description:
        "Sesi Anda belum aktif atau sudah berakhir. Masuk dengan akun Owner atau Admin Niuva.",
    },
    FORBIDDEN: {
      title: "Akun ini tidak memiliki akses Admin",
      description:
        "Akun yang sedang masuk belum terdaftar sebagai Owner atau Admin aktif. Keluar, lalu masuk dengan akun lain.",
    },
    AUTH_UNAVAILABLE: {
      title: "Layanan autentikasi belum tersedia",
      description:
        "Akses Admin belum dapat diperiksa saat ini. Muat ulang halaman, atau coba lagi beberapa saat lagi.",
    },
  },
  // Description per failure cause for the admin "data unavailable" view.
  // Kinds without an entry use `fallback`. No raw error text is ever interpolated.
  adminDataUnavailable: {
    DATABASE_UNAVAILABLE:
      "Basis data belum dapat dijangkau saat ini. Coba muat ulang dalam beberapa saat, tanpa mengubah data.",
    PROVIDER_TIMEOUT:
      "Layanan pendukung terlalu lama merespons. Coba muat ulang dalam beberapa saat, tanpa mengubah data.",
    CODE_DEFECT:
      "Terjadi kesalahan saat memuat data ini. Coba muat ulang, atau kembali ke Overview.",
    fallback:
      "Data operasional belum dapat dimuat saat ini. Coba muat ulang tanpa mengubah data.",
  },
  resourceBusy: {
    title: "Server sedang sibuk saat ini.",
    description:
      "Permintaan Anda belum dapat diproses karena server sedang sibuk. Tunggu sebentar, lalu coba lagi.",
  },
  signOutFailed: { title: "Keluar belum berhasil", description: "Coba keluar lagi." },
  loading: { cart: "Memuat keranjang" },
  actions: {
    retry: "Coba lagi",
    home: "Kembali ke beranda",
    shop: "Lihat Shop",
    adminHome: "Kembali ke Overview",
    publicSite: "Ke halaman publik",
    signIn: "Masuk",
    signOut: "Keluar",
    reload: "Muat ulang",
  },
} as const satisfies Record<string, unknown>;

/**
 * Picks the admin "data unavailable" description for a failure cause. Causes
 * without dedicated copy, and callers that pass no kind, get the safe fallback.
 */
export function adminDataUnavailableDescription(kind?: FailureKind): string {
  const copy = systemCopy.adminDataUnavailable;
  switch (kind) {
    case "DATABASE_UNAVAILABLE":
      return copy.DATABASE_UNAVAILABLE;
    case "PROVIDER_TIMEOUT":
      return copy.PROVIDER_TIMEOUT;
    case "CODE_DEFECT":
      return copy.CODE_DEFECT;
    default:
      return copy.fallback;
  }
}
