import { StatusNotice } from "@/components/niuva/status-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type AdminPreviewState = "auth-unavailable" | "forbidden" | "ready";

type SignInViewProps = Readonly<{
  state: AdminPreviewState;
}>;

const stateContent: Record<
  AdminPreviewState,
  Readonly<{
    accessLabel: string;
    description: string;
    heading: string;
    noticeDescription: string;
    noticeTitle: string;
    tone: "error" | "info" | "warning";
    routeTarget: "/admin" | "/admin/sign-in";
  }>
> = {
  "auth-unavailable": {
    accessLabel: "Autentikasi belum tersedia",
    description:
      "Clerk belum dikonfigurasi pada environment ini. Tidak ada kredensial, session, atau profil yang dibuat dari preview.",
    heading: "Akses operasi belum terhubung.",
    noticeDescription:
      "Route /admin tetap dijaga oleh Proxy dan requireAdmin. Aktifkan credential Clerk melalui konfigurasi environment yang terpisah dari preview UI.",
    noticeTitle: "Layanan autentikasi admin belum tersedia",
    tone: "info",
    routeTarget: "/admin/sign-in",
  },
  forbidden: {
    accessLabel: "Akses ditolak",
    description:
      "Sesi yang valid belum cukup untuk membuka operasi. Server memeriksa profil AdminProfile aktif dan role di database sebelum data dibaca.",
    heading: "Akses admin tidak diizinkan.",
    noticeDescription:
      "Preview ini tidak menunjukkan identitas akun. Pada alur nyata, akses hanya dapat dilanjutkan setelah Owner mengaktifkan profil yang sesuai.",
    noticeTitle: "Profil admin aktif diperlukan",
    tone: "warning",
    routeTarget: "/admin/sign-in",
  },
  ready: {
    accessLabel: "Contoh shell setelah verifikasi",
    description:
      "Komposisi ini menunjukkan ruang kerja setelah server memverifikasi sesi Clerk, AdminProfile aktif, dan otorisasi yang sesuai.",
    heading: "Ruang kerja operasi siap ditinjau.",
    noticeDescription:
      "Ini hanya contoh susunan antarmuka. Tidak ada sesi Clerk, daftar tindakan, atau data admin yang dimuat oleh halaman ini.",
    noticeTitle: "Preview shell tanpa data operasional",
    tone: "info",
    routeTarget: "/admin",
  },
};

export function getAdminPreviewAccessLabel(state: AdminPreviewState): string {
  return stateContent[state].accessLabel;
}

export function getAdminPreviewRouteTarget(state: AdminPreviewState): "/admin" | "/admin/sign-in" {
  return stateContent[state].routeTarget;
}

export function SignInView({ state }: SignInViewProps) {
  const content = stateContent[state];
  const isReady = state === "ready";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14" data-admin-preview-state={state} id="main-content">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-brand-700">{isReady ? "Target /admin" : "Target /admin/sign-in"}</p>
          <Badge className="border-border bg-background text-muted-foreground" variant="outline">
            Development-only preview
          </Badge>
        </div>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{content.heading}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{content.description}</p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <section aria-label="Status akses admin" className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <StatusNotice
            description={content.noticeDescription}
            role={state === "forbidden" ? "alert" : "status"}
            title={content.noticeTitle}
            tone={content.tone}
          />

          {isReady ? (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-lg font-semibold">Action Queue menjadi halaman pertama</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                FE-17 akan mengisi area ini dengan keputusan operasional, bukan metrik hiasan atau data database palsu.
              </p>
            </div>
          ) : (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-lg font-semibold">Jalur akses yang aman</h2>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                <li>
                  <span className="font-mono text-xs text-foreground">01</span>{" "}
                  Clerk menangani tampilan dan verifikasi kredensial.
                </li>
                <li>
                  <span className="font-mono text-xs text-foreground">02</span>{" "}
                  Server memeriksa session dan AdminProfile yang aktif.
                </li>
                <li>
                  <span className="font-mono text-xs text-foreground">03</span>{" "}
                  Role OWNER atau ADMIN dibatasi lagi per tindakan operasional.
                </li>
              </ol>
            </div>
          )}
        </section>

        <aside aria-label="Batasan preview admin">
          <Card className="h-full shadow-card">
            <CardHeader>
              <CardTitle>Yang tidak dilakukan preview</CardTitle>
              <CardDescription>Review visual tidak menggantikan kontrol akses server.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                <li>Tidak membuat login, session, atau profil admin.</li>
                <li>Tidak memuat data inquiry, order, file privat, atau audit.</li>
                <li>Tidak membuka registrasi Owner/Admin untuk publik.</li>
                <li>Tidak mengubah Proxy, requireAdmin, atau permission matrix.</li>
              </ul>

              {state === "auth-unavailable" ? (
                <Button className="mt-6 min-h-11 w-full" disabled type="button">
                  Sign-in Clerk belum tersedia
                </Button>
              ) : null}

              {state === "forbidden" ? (
                <p className="mt-6 border-l-2 border-warning-border pl-3 text-sm leading-6 text-muted-foreground">
                  Hubungi Owner Niuva melalui jalur internal yang telah disepakati untuk meninjau aktivasi profil.
                </p>
              ) : null}

              {isReady ? (
                <p className="mt-6 border-l-2 border-brand-300 pl-3 text-sm leading-6 text-muted-foreground">
                  Skenario ini bukan session Clerk dan tidak memberi akses ke route atau operasi nyata.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
