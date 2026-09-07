"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminCustomReview } from "@/features/admin/custom-review";
import {
  customFileStateConfig,
  customRequestPreviewFixture,
  customRequestStatusConfig,
  getPreviewCustomRequest,
  type PreviewCustomRequestFixture,
  type PreviewCustomRequestStatus,
} from "@/features/admin/custom-review-preview-data";

export type AdminCustomRequestScenario = "populated" | "loading" | "empty" | "error";

type CustomRequestStatusFilter = "ALL" | PreviewCustomRequestStatus;

type AdminCustomRequestListProps = Readonly<{
  initialScenario: AdminCustomRequestScenario;
  initialSelectedReference: string | null;
}>;

const customReviewPath = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=custom-print";

function CustomRequestLoadingState() {
  return (
    <section aria-busy="true" aria-label="Memuat review custom print preview" className="space-y-3" data-custom-review-loading>
      <p className="text-sm font-medium text-muted-foreground">Memuat request custom print preview.</p>
      {["first", "second", "third"].map((item) => (
        <div className="h-28 animate-pulse rounded-xl border border-border bg-muted" key={item} />
      ))}
    </section>
  );
}

function CustomRequestTable({
  onSelect,
  requests,
  selectedReference,
  selectionDisabled,
}: Readonly<{
  onSelect: (reference: string) => void;
  requests: readonly PreviewCustomRequestFixture[];
  selectedReference: string | null;
  selectionDisabled: boolean;
}>) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="text-xs font-medium text-muted-foreground">
          <tr>
            <th className="border-b border-border px-3 py-3" scope="col">Referensi</th>
            <th className="border-b border-border px-3 py-3" scope="col">Status review</th>
            <th className="border-b border-border px-3 py-3" scope="col">Request</th>
            <th className="border-b border-border px-3 py-3" scope="col">File privat</th>
            <th className="border-b border-border px-3 py-3" scope="col">Diperbarui</th>
            <th className="border-b border-border px-3 py-3 text-right" scope="col"><span className="sr-only">Tindakan</span></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const status = customRequestStatusConfig[request.status];

            return (
              <tr className={selectedReference === request.reference ? "bg-brand-50/70" : ""} key={request.reference}>
                <td className="border-b border-border px-3 py-4 font-mono text-xs font-medium text-brand-700">{request.reference}</td>
                <td className="border-b border-border px-3 py-4"><Badge className={status.className} variant="outline">{status.label}</Badge></td>
                <td className="max-w-sm border-b border-border px-3 py-4">
                  <p className="font-medium">{request.requestedMaterial}, quantity {request.quantity}</p>
                  <p className="mt-1 leading-5 text-muted-foreground">{request.reviewSummary}</p>
                </td>
                <td className="border-b border-border px-3 py-4 text-muted-foreground">{customFileStateConfig[request.fileState].label}</td>
                <td className="border-b border-border px-3 py-4 text-muted-foreground">{request.updatedAt}</td>
                <td className="border-b border-border px-3 py-4 text-right">
                  <Button
                    className="min-h-11 cursor-pointer"
                    disabled={selectionDisabled}
                    onClick={() => onSelect(request.reference)}
                    type="button"
                    variant={selectedReference === request.reference ? "secondary" : "outline"}
                  >
                    Tinjau request
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CustomRequestCards({
  onSelect,
  requests,
  selectedReference,
  selectionDisabled,
}: Readonly<{
  onSelect: (reference: string) => void;
  requests: readonly PreviewCustomRequestFixture[];
  selectedReference: string | null;
  selectionDisabled: boolean;
}>) {
  return (
    <div className="grid gap-3 md:hidden">
      {requests.map((request) => {
        const status = customRequestStatusConfig[request.status];

        return (
          <article className="rounded-xl border border-border bg-card p-4" key={request.reference}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-mono text-xs font-medium text-brand-700">{request.reference}</p>
              <Badge className={status.className} variant="outline">{status.label}</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">Request</dt><dd>{request.requestedMaterial}, quantity {request.quantity}</dd></div>
              <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">File</dt><dd>{customFileStateConfig[request.fileState].label}</dd></div>
              <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">Update</dt><dd>{request.updatedAt}</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{request.reviewSummary}</p>
            <Button
              className="mt-4 min-h-11 w-full cursor-pointer"
              disabled={selectionDisabled}
              onClick={() => onSelect(request.reference)}
              type="button"
              variant={selectedReference === request.reference ? "secondary" : "outline"}
            >
              Tinjau request
            </Button>
          </article>
        );
      })}
    </div>
  );
}

export function AdminCustomRequestList({ initialScenario, initialSelectedReference }: AdminCustomRequestListProps) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [scenario, setScenario] = useState<AdminCustomRequestScenario>(initialScenario);
  const [search, setSearch] = useState("");
  const [selectedReference, setSelectedReference] = useState<string | null>(initialSelectedReference);
  const [statusFilter, setStatusFilter] = useState<CustomRequestStatusFilter>("ALL");

  const selectedRequest = selectedReference === null ? null : getPreviewCustomRequest(selectedReference);
  const visibleRequests = useMemo(() => {
    if (scenario === "empty") return [];

    const normalizedSearch = search.trim().toLowerCase();
    return customRequestPreviewFixture.filter((request) => {
      const matchesStatus = statusFilter === "ALL" || request.status === statusFilter;
      const matchesSearch = normalizedSearch.length === 0 || request.reference.toLowerCase().includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [scenario, search, statusFilter]);
  const hasAppliedFilters = search.trim().length > 0 || statusFilter !== "ALL";

  function selectRequest(reference: string) {
    setSelectedReference(reference);
    router.push(`${customReviewPath}&request=${reference}`);
  }

  function closeSelectedRequest() {
    setSelectedReference(null);
    router.push(customReviewPath);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("ALL");
  }

  return (
    <main
      className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10"
      data-admin-custom-request-list="preview"
      data-custom-review-scenario={scenario}
      id="main-content"
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-brand-700">Target /admin/custom-print</p>
              <Badge className="border-border bg-background text-muted-foreground" variant="outline">Development-only preview</Badge>
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Review yang menunggu bukti slicer.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Periksa input operator dan batas private file sebelum request diteruskan ke draft quote.
            </p>
          </header>

          <section aria-labelledby="custom-review-filter-heading" className="border-b border-border py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold" id="custom-review-filter-heading">Cari request</h2>
              {scenario !== "loading" && scenario !== "error" ? <p className="text-xs text-muted-foreground" role="status">{visibleRequests.length} request contoh ditampilkan</p> : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="custom-review-search">Cari referensi custom print</label>
                <Input
                  className="min-h-11"
                  disabled={!hydrated || scenario === "loading"}
                  id="custom-review-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Contoh: CPR-EX-2093"
                  value={search}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="custom-review-status">Status review</label>
                <select
                  className="min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
                  disabled={!hydrated || scenario === "loading"}
                  id="custom-review-status"
                  onChange={(event) => setStatusFilter(event.target.value as CustomRequestStatusFilter)}
                  value={statusFilter}
                >
                  <option value="ALL">Semua status</option>
                  <option value="SUBMITTED">Diajukan</option>
                  <option value="UNDER_REVIEW">Sedang direview</option>
                  <option value="QUOTE_READY">Siap untuk draft quote</option>
                </select>
              </div>
            </div>
          </section>

          {selectedReference !== null && selectedRequest === null ? (
            <StatusNotice
              className="mt-6"
              description="Reference pada query tidak cocok dengan fixture yang tersedia. Tidak ada request server yang dicari atau dimuat."
              title="Request preview tidak tersedia"
              tone="warning"
            />
          ) : null}

          <section aria-labelledby="custom-request-list-heading" className="pt-6">
            <h2 className="text-lg font-semibold" id="custom-request-list-heading">Daftar review custom print</h2>
            <div className="mt-4">
              {scenario === "loading" ? <CustomRequestLoadingState /> : null}
              {scenario === "error" ? (
                <StatusNotice
                  action={<Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setScenario("populated")} type="button" variant="outline">Coba lagi</Button>}
                  description="Tidak ada request atau status server yang ditampilkan ketika projection custom print belum tersedia."
                  title="Daftar review preview belum dapat dimuat"
                  tone="error"
                />
              ) : null}
              {scenario !== "loading" && scenario !== "error" && visibleRequests.length === 0 ? (
                <StatusNotice
                  action={hasAppliedFilters ? <Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={resetFilters} type="button" variant="outline">Tampilkan semua request</Button> : undefined}
                  description={hasAppliedFilters ? "Tidak ada request contoh yang sesuai. Ubah pencarian atau filter tanpa menganggap review produksi kosong." : "Keadaan kosong ini hanya skenario preview, bukan pernyataan bahwa tidak ada request produksi."}
                  title={hasAppliedFilters ? "Filter tidak menemukan request" : "Daftar review contoh sedang kosong"}
                  tone="info"
                />
              ) : null}
              {scenario !== "loading" && scenario !== "error" && visibleRequests.length > 0 ? (
                <>
                  <CustomRequestTable onSelect={selectRequest} requests={visibleRequests} selectedReference={selectedReference} selectionDisabled={!hydrated} />
                  <CustomRequestCards onSelect={selectRequest} requests={visibleRequests} selectedReference={selectedReference} selectionDisabled={!hydrated} />
                </>
              ) : null}
            </div>
          </section>
        </div>

        <aside aria-label="Batas review custom print preview" className="space-y-4 xl:sticky xl:top-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Evidence yang tidak boleh diasumsikan</CardTitle>
              <CardDescription>Preview menampilkan kebutuhan review, bukan akses terhadap data private.</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusNotice
                description="File private, ownership, signed access, status terbaru, permission, audit, dan pricing rule tetap diverifikasi server."
                size="compact"
                title="Authority server diperlukan"
                tone="warning"
              />
              <p className="mt-5 border-l-2 border-brand-300 pl-3 text-sm leading-6 text-muted-foreground">
                Review valid membutuhkan material, berat slicer desimal, durasi integer detik, dan quantity yang sama dengan request. Konfigurasi serta catatan boleh kosong.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
      {selectedRequest ? <AdminCustomReview key={selectedRequest.reference} onClose={closeSelectedRequest} request={selectedRequest} /> : null}
    </main>
  );
}
