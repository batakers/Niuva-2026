"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  CircleCheck,
  Clock3,
  Menu,
  Search,
  X,
} from "lucide-react";

import AuLogo from "@/components/ui/AuLogo";
import { Button } from "@/components/ui/button";
import {
  activity,
  previewRecords,
  previewWork,
  type ModuleArea,
  type PreviewArea,
  type PreviewRecord,
  type PreviewWork,
  type WorkGroup,
} from "./admin-dashboard-preview-data";

type DemoMode = "ready" | "empty" | "loading" | "error";

const primaryNavigation: readonly Readonly<{ area: PreviewArea; label: string }>[] = [
  { area: "overview", label: "Overview" },
  { area: "queue", label: "Action Queue" },
  { area: "orders", label: "Orders" },
  { area: "custom-print", label: "Custom Print" },
  { area: "inquiries", label: "B2B Inquiries" },
];

const manageNavigation: readonly Readonly<{ area: PreviewArea; label: string }>[] = [
  { area: "products", label: "Products & Stock" },
  { area: "portfolio", label: "Portfolio" },
  { area: "pricing", label: "Pricing Rules" },
];

const areaCopy: Record<PreviewArea, Readonly<{ title: string; description: string }>> = {
  overview: {
    title: "Pusat operasi",
    description: "Lihat kondisi hari ini dan tentukan pekerjaan yang perlu didahulukan.",
  },
  queue: {
    title: "Action Queue",
    description: "Sinyal pekerjaan yang menunggu keputusan atau tindakan operator.",
  },
  orders: {
    title: "Orders",
    description: "Bedakan pesanan retail dan custom, lalu buka langkah fulfillment berikutnya.",
  },
  "custom-print": {
    title: "Custom Print",
    description: "Tinjau permintaan, siapkan quotation, dan ikuti proses produksi.",
  },
  inquiries: {
    title: "B2B Inquiries",
    description: "Pindai brief yang masuk dan buka konteks proyek tanpa antarmuka chat.",
  },
  products: {
    title: "Products & Stock",
    description: "Periksa konten katalog, varian, dan perhatian stok.",
  },
  portfolio: {
    title: "Portfolio",
    description: "Kelola cerita proyek dan status publikasinya.",
  },
  pricing: {
    title: "Pricing Rules",
    description: "Tinjau versi aturan tanpa menebak nilai atau mengaktifkan aturan baru.",
  },
};

const groupOptions: readonly Readonly<{ value: WorkGroup; label: string }>[] = [
  { value: "all", label: "Semua" },
  { value: "inquiries", label: "Inquiry" },
  { value: "custom-print", label: "Custom Print" },
  { value: "orders", label: "Orders" },
];

const focusClass =
  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2";

function recordById(id: string): PreviewRecord | undefined {
  return previewRecords.find((record) => record.id === id);
}

function workMatches(row: PreviewWork, group: WorkGroup, query: string): boolean {
  if (group !== "all" && row.group !== group) return false;
  const search = query.trim().toLocaleLowerCase("id");
  if (search.length === 0) return true;
  return [row.title, row.reference, row.nextStep].some((value) =>
    value.toLocaleLowerCase("id").includes(search),
  );
}

function recordMatches(row: PreviewRecord, query: string): boolean {
  const search = query.trim().toLocaleLowerCase("id");
  if (search.length === 0) return true;
  return [row.title, row.reference, row.status, row.description].some((value) =>
    value.toLocaleLowerCase("id").includes(search),
  );
}

export function AdminDashboardPreview() {
  const [area, setArea] = useState<PreviewArea>("overview");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [mode, setMode] = useState<DemoMode>("ready");
  const [group, setGroup] = useState<WorkGroup>("all");
  const [query, setQuery] = useState("");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  function navigate(nextArea: PreviewArea) {
    setArea(nextArea);
    setRecordId(nextArea === "inquiries" ? "inquiry-1" : null);
    setGroup("all");
    setQuery("");
    setMobileNavigationOpen(false);
    setManageOpen(false);
  }

  function openRecord(id: string) {
    const record = recordById(id);
    if (record === undefined) return;
    setArea(record.area);
    setRecordId(id);
    setQuery("");
    setMobileNavigationOpen(false);
  }

  const selectedRecord = recordId === null ? undefined : recordById(recordId);
  const visibleWork = previewWork.filter((row) => workMatches(row, group, query));

  return (
    <section className="scroll-mt-8 space-y-5" id="admin-dashboard-preview">
      <div className="max-w-3xl space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Prototype dashboard Admin
        </h2>
        <p className="leading-7 text-muted-foreground">
          Jalur eksplorasi visual untuk Owner/Admin Niuva. Semua angka, referensi,
          dan record di bawah adalah data sintetis. Navigasi dan kontrol hanya
          mengubah tampilan contoh ini.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-border bg-neutral-100 text-foreground"
        data-admin-dashboard-preview
        data-demo-mode={mode}
      >
        <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-neutral-900 px-2 py-2">
              <AuLogo className="h-auto w-27" />
            </span>
            <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
            <span className="text-sm font-medium text-muted-foreground">Operations</span>
            <span className="ml-auto rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">
              Preview · data sintetis
            </span>
            <span
              className="flex size-9 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-white"
              aria-label="Identitas contoh: Owner"
            >
              O
            </span>
          </div>

          <button
            aria-controls="admin-preview-mobile-navigation"
            aria-expanded={mobileNavigationOpen}
            className={"mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium md:hidden " + focusClass}
            onClick={() => setMobileNavigationOpen((open) => !open)}
            type="button"
          >
            {mobileNavigationOpen ? <X aria-hidden="true" className="size-4" /> : <Menu aria-hidden="true" className="size-4" />}
            {mobileNavigationOpen ? "Tutup menu" : "Buka menu"}
          </button>

          <nav aria-label="Navigasi prototype Admin" className="mt-4 hidden flex-wrap items-center gap-2 md:flex">
            {primaryNavigation.map((item) => (
              <NavigationButton
                active={area === item.area}
                key={item.area}
                label={item.label}
                onClick={() => navigate(item.area)}
              />
            ))}
            <div className="relative" onKeyDown={(event) => {
              if (event.key === "Escape") setManageOpen(false);
            }}>
              <button
                aria-controls="admin-preview-manage-navigation"
                aria-expanded={manageOpen}
                className={"inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted " + focusClass}
                onClick={() => setManageOpen((open) => !open)}
                type="button"
              >
                Kelola
                <ChevronDown aria-hidden="true" className="size-4" />
              </button>
              {manageOpen ? (
                <div className="absolute right-0 z-20 mt-2 min-w-52 rounded-xl border border-border bg-card p-1 shadow-floating" id="admin-preview-manage-navigation">
                  {manageNavigation.map((item) => (
                    <button
                      className={"flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-muted " + focusClass}
                      key={item.area}
                      onClick={() => navigate(item.area)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
          {mobileNavigationOpen ? (
            <nav
              aria-label="Navigasi mobile prototype Admin"
              className="mt-3 grid gap-1 border-t border-border pt-3 md:hidden"
              id="admin-preview-mobile-navigation"
            >
              {primaryNavigation.map((item) => (
                <NavigationButton
                  active={area === item.area}
                  key={item.area}
                  label={item.label}
                  onClick={() => navigate(item.area)}
                />
              ))}
              <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Kelola</p>
              {manageNavigation.map((item) => (
                <NavigationButton
                  active={area === item.area}
                  key={item.area}
                  label={item.label}
                  onClick={() => navigate(item.area)}
                />
              ))}
            </nav>
          ) : null}
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {areaCopy[area].title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {areaCopy[area].description}
              </p>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              Kondisi demo
              <select
                className={"min-h-11 rounded-lg border border-border bg-card px-3 text-sm " + focusClass}
                onChange={(event) => setMode(event.target.value as DemoMode)}
                value={mode}
              >
                <option value="ready">Dengan data</option>
                <option value="empty">Kosong</option>
                <option value="loading">Memuat</option>
                <option value="error">Gagal dimuat</option>
              </select>
            </label>
          </div>

          {mode === "ready" ? (
            area === "overview" ? (
              <Overview
                group={group}
                onGroupChange={setGroup}
                onNavigate={navigate}
                onOpenRecord={openRecord}
                onQueryChange={setQuery}
                query={query}
                rows={visibleWork}
              />
            ) : area === "queue" ? (
              <WorkWorkspace
                group={group}
                onGroupChange={setGroup}
                onOpenRecord={openRecord}
                onQueryChange={setQuery}
                query={query}
                rows={visibleWork}
              />
            ) : area === "inquiries" ? (
              <InquiriesWorkspace
                onOpenRecord={openRecord}
                onQueryChange={setQuery}
                query={query}
                selectedRecord={selectedRecord}
              />
            ) : selectedRecord?.area === area ? (
              <RecordDetail
                onBack={() => setRecordId(null)}
                record={selectedRecord}
              />
            ) : (
              <ModuleWorkspace
                area={area}
                onOpenRecord={openRecord}
                onQueryChange={setQuery}
                query={query}
              />
            )
          ) : (
            <DemoStatePanel
              mode={mode}
              onRestore={() => setMode("ready")}
              title={areaCopy[area].title}
            />
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
          <span>Prototype visual terpisah · semua isi hanya contoh.</span>
          <span>Tidak ada tindakan yang mengubah data Admin live.</span>
        </footer>
      </div>
    </section>
  );
}

function NavigationButton({
  active,
  label,
  onClick,
}: Readonly<{ active: boolean; label: string; onClick: () => void }>) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={
        "min-h-11 rounded-full border px-4 text-left text-sm font-medium transition-colors " +
        (active
          ? "border-brand-700 bg-brand-50 text-brand-900"
          : "border-border bg-card text-foreground hover:bg-muted") +
        " " + focusClass
      }
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Overview({
  group,
  onGroupChange,
  onNavigate,
  onOpenRecord,
  onQueryChange,
  query,
  rows,
}: Readonly<{
  group: WorkGroup;
  onGroupChange: (group: WorkGroup) => void;
  onNavigate: (area: PreviewArea) => void;
  onOpenRecord: (id: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
  rows: readonly PreviewWork[];
}>) {
  const metrics: readonly Readonly<{ label: string; value: string; note: string; area: PreviewArea }>[] = [
    { label: "Pekerjaan terbuka", value: "18", note: "Semua sinyal aktif", area: "queue" },
    { label: "Inquiry baru", value: "04", note: "Perlu peninjauan", area: "inquiries" },
    { label: "Custom print", value: "06", note: "Menunggu review", area: "custom-print" },
    { label: "Order dibayar", value: "03", note: "Perlu diproses", area: "orders" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <button
            className={"min-w-0 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40 " + focusClass}
            key={metric.label}
            onClick={() => onNavigate(metric.area)}
            type="button"
          >
            <span className="flex items-start justify-between gap-2 text-sm font-medium">
              {metric.label}
              <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />
            </span>
            <strong className="mt-5 block text-3xl font-semibold tabular-nums">{metric.value}</strong>
            <span className="mt-1 block text-xs text-muted-foreground">{metric.note}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(15rem,0.8fr)]">
        <ActivityChart />
        <section aria-labelledby="preview-priority-title" className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold" id="preview-priority-title">Prioritas sekarang</h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Urutan contoh dari Action Queue.</p>
            </div>
            <Clock3 aria-hidden="true" className="size-5 text-brand-700" />
          </div>
          <ol className="mt-4 divide-y divide-border">
            {previewWork.slice(0, 3).map((row) => (
              <li className="py-3" key={row.id}>
                <button
                  className={"block min-h-11 w-full rounded-md text-left " + focusClass}
                  onClick={() => onOpenRecord(row.recordId)}
                  type="button"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                    {row.title}
                    <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {row.reference} · {row.updated}
                  </span>
                  <span className="mt-2 block text-xs font-medium text-brand-800">{row.nextStep}</span>
                </button>
              </li>
            ))}
          </ol>
          <Button className="mt-4 w-full" onClick={() => onNavigate("queue")} variant="outline">
            Buka Action Queue
          </Button>
        </section>
      </div>

      <WorkWorkspace
        group={group}
        onGroupChange={onGroupChange}
        onOpenRecord={onOpenRecord}
        onQueryChange={onQueryChange}
        query={query}
        rows={rows}
        title="Kelola pekerjaan"
      />
    </div>
  );
}

function ActivityChart() {
  const scale = 21;
  const baseline = 166;
  return (
    <section aria-labelledby="preview-activity-title" className="min-w-0 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold" id="preview-activity-title">Aktivitas masuk</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Simulasi 30 hari · jumlah record dibuat, bukan omzet.</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">30 hari</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-brand-700" />Brief B2B</span>
        <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-info" />Custom print</span>
        <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-success" />Order</span>
      </div>
      <svg
        aria-labelledby="preview-chart-svg-title preview-chart-svg-desc"
        className="mt-4 h-auto w-full"
        role="img"
        viewBox="0 0 720 212"
      >
        <title id="preview-chart-svg-title">Aktivitas operasional sintetis selama 30 hari</title>
        <desc id="preview-chart-svg-desc">Batang bertumpuk menunjukkan brief B2B, permintaan custom print, dan order yang dibuat per hari. Data lengkap tersedia pada tabel untuk pembaca layar.</desc>
        {[0, 2, 4, 6].map((tick) => (
          <g key={tick}>
            <line stroke="var(--border)" strokeDasharray="3 5" x1="31" x2="710" y1={baseline - tick * scale} y2={baseline - tick * scale} />
            <text fill="var(--muted-foreground)" fontSize="11" textAnchor="end" x="25" y={baseline - tick * scale + 4}>{tick}</text>
          </g>
        ))}
        {activity.map((point, index) => {
          const x = 40 + index * 22;
          const inquiryHeight = point.inquiries * scale;
          const customHeight = point.custom * scale;
          const orderHeight = point.orders * scale;
          return (
            <g key={point.day}>
              <rect fill="var(--brand-700)" height={inquiryHeight} rx="2" width="13" x={x} y={baseline - inquiryHeight} />
              <rect fill="var(--info)" height={customHeight} rx="2" width="13" x={x} y={baseline - inquiryHeight - customHeight} />
              <rect fill="var(--success)" height={orderHeight} rx="2" width="13" x={x} y={baseline - inquiryHeight - customHeight - orderHeight} />
            </g>
          );
        })}
        {[["H-29", 40], ["H-22", 194], ["H-15", 348], ["H-8", 502], ["Hari ini", 678]].map(([label, x]) => (
          <text fill="var(--muted-foreground)" fontSize="11" key={label} textAnchor="middle" x={x} y="193">{label}</text>
        ))}
      </svg>
      <div className="sr-only">
        <table>
          <caption>Data sintetis aktivitas 30 hari, dari H-29 sampai hari ini</caption>
          <thead><tr><th>Hari</th><th>Brief B2B</th><th>Custom print</th><th>Order</th></tr></thead>
          <tbody>
            {activity.map((point) => (
              <tr key={point.day}>
                <th>H-{30 - point.day}</th>
                <td>{point.inquiries}</td>
                <td>{point.custom}</td>
                <td>{point.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WorkWorkspace({
  group,
  onGroupChange,
  onOpenRecord,
  onQueryChange,
  query,
  rows,
  title = "Semua pekerjaan",
}: Readonly<{
  group: WorkGroup;
  onGroupChange: (group: WorkGroup) => void;
  onOpenRecord: (id: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
  rows: readonly PreviewWork[];
  title?: string;
}>) {
  return (
    <section aria-labelledby="preview-work-title" className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold" id="preview-work-title">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Referensi dan tindakan contoh; buka baris untuk melihat detail.</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground" role="status">{rows.length} pekerjaan ditampilkan</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div aria-label="Filter jenis pekerjaan" className="flex flex-wrap gap-2" role="group">
          {groupOptions.map((option) => (
            <button
              aria-pressed={group === option.value}
              className={
                "min-h-11 rounded-full border px-3 text-xs font-semibold transition-colors " +
                (group === option.value ? "border-brand-700 bg-brand-50 text-brand-900" : "border-border hover:bg-muted") +
                " " + focusClass
              }
              key={option.value}
              onClick={() => onGroupChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <SearchField label="Cari pekerjaan contoh" onChange={onQueryChange} value={query} />
      </div>
      {rows.length === 0 ? (
        <NoResults onClear={() => {
          onGroupChange("all");
          onQueryChange("");
        }} />
      ) : (
        <>
          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Pekerjaan operasional sintetis</caption>
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium" scope="col">Pekerjaan</th>
                  <th className="pb-3 font-medium" scope="col">Referensi</th>
                  <th className="pb-3 font-medium" scope="col">Langkah berikutnya</th>
                  <th className="pb-3 text-right font-medium" scope="col">Diperbarui</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-3 font-medium">
                      <button className={"inline-flex min-h-11 items-center text-left hover:text-brand-700 " + focusClass} onClick={() => onOpenRecord(row.recordId)} type="button">{row.title}</button>
                    </td>
                    <td className="py-3 pr-3 text-xs tabular-nums text-muted-foreground">{row.reference}</td>
                    <td className="py-3 pr-3 text-xs">{row.nextStep}</td>
                    <td className="py-3 text-right text-xs text-muted-foreground">{row.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-5 grid gap-2 md:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <button className={"min-h-11 w-full rounded-lg border border-border p-3 text-left hover:border-brand-400 " + focusClass} onClick={() => onOpenRecord(row.recordId)} type="button">
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold">{row.title}<ArrowUpRight aria-hidden="true" className="size-4 shrink-0" /></span>
                  <span className="mt-1 block text-xs text-muted-foreground">{row.reference} · {row.updated}</span>
                  <span className="mt-2 block text-xs text-brand-800">{row.nextStep}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ModuleWorkspace({
  area,
  onOpenRecord,
  onQueryChange,
  query,
}: Readonly<{
  area: ModuleArea;
  onOpenRecord: (id: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
}>) {
  const rows = previewRecords.filter((record) => record.area === area && recordMatches(record, query));
  return (
    <section aria-label={"Daftar contoh " + areaCopy[area].title} className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold">Daftar {areaCopy[area].title}</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Pilih record untuk melihat contoh tampilan detail.</p>
        </div>
        <SearchField label={"Cari contoh " + areaCopy[area].title} onChange={onQueryChange} value={query} />
      </div>
      {rows.length === 0 ? <NoResults onClear={() => onQueryChange("")} /> : (
        <ul className="mt-5 divide-y divide-border">
          {rows.map((record) => (
            <li key={record.id}>
              <button className={"grid min-h-20 w-full gap-3 py-3 text-left hover:text-brand-800 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.55fr)_auto] sm:items-center " + focusClass} onClick={() => onOpenRecord(record.id)} type="button">
                <span className="min-w-0">
                  <span className="block text-xs tabular-nums text-muted-foreground">{record.reference}</span>
                  <span className="mt-1 block font-semibold">{record.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{record.description}</span>
                </span>
                <StatusPill status={record.status} />
                <ArrowUpRight aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InquiriesWorkspace({
  onOpenRecord,
  onQueryChange,
  query,
  selectedRecord,
}: Readonly<{
  onOpenRecord: (id: string) => void;
  onQueryChange: (query: string) => void;
  query: string;
  selectedRecord: PreviewRecord | undefined;
}>) {
  const rows = previewRecords.filter((record) => record.area === "inquiries" && recordMatches(record, query));
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.2fr)]">
      <section aria-label="Daftar brief B2B contoh" className="min-w-0 rounded-xl border border-border bg-card p-4">
        <SearchField label="Cari brief contoh" onChange={onQueryChange} value={query} />
        {rows.length === 0 ? <NoResults onClear={() => onQueryChange("")} /> : (
          <ul className="mt-4 divide-y divide-border">
            {rows.map((record) => (
              <li key={record.id}>
                <button
                  aria-current={selectedRecord?.id === record.id ? "true" : undefined}
                  className={
                    "min-h-20 w-full rounded-lg px-3 py-3 text-left hover:bg-muted " +
                    (selectedRecord?.id === record.id ? "bg-brand-50" : "") + " " + focusClass
                  }
                  onClick={() => onOpenRecord(record.id)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold">{record.title}<ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /></span>
                  <span className="mt-1 block text-xs tabular-nums text-muted-foreground">{record.reference} · {record.updated}</span>
                  <span className="mt-2 block text-xs text-brand-800">{record.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selectedRecord?.area === "inquiries" ? (
        <RecordDetail record={selectedRecord} />
      ) : (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Pilih brief untuk membaca detail contoh.
        </div>
      )}
    </div>
  );
}

function RecordDetail({
  onBack,
  record,
}: Readonly<{ onBack?: () => void; record: PreviewRecord }>) {
  return (
    <article aria-labelledby="preview-record-title" className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      {onBack ? (
        <button className={"mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-700 hover:underline " + focusClass} onClick={onBack} type="button">
          <ArrowLeft aria-hidden="true" className="size-4" /> Kembali ke daftar
        </button>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="text-xs tabular-nums text-muted-foreground">{record.reference}</p>
          <h4 className="mt-2 text-xl font-semibold tracking-tight" id="preview-record-title">{record.title}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{record.description}</p>
        </div>
        <StatusPill status={record.status} />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Langkah berikutnya</p>
          <p className="mt-2 text-sm font-semibold">{record.nextStep}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Diperbarui</p>
          <p className="mt-2 text-sm">{record.updated}</p>
        </div>
      </div>
      <div className="mt-6 rounded-lg bg-neutral-100 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><CircleCheck aria-hidden="true" className="size-4 text-success" />Ringkasan operasional</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Panel ini menunjukkan bagaimana informasi dan status akan dipindai pada
          detail Admin. Tindakan operasional asli tetap berada di layanan live
          setelah prototype disetujui.
        </p>
      </div>
    </article>
  );
}

function SearchField({
  label,
  onChange,
  value,
}: Readonly<{ label: string; onChange: (value: string) => void; value: string }>) {
  return (
    <label className="relative block min-w-0 w-full sm:w-56">
      <span className="sr-only">{label}</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
      <input
        className={"min-h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground " + focusClass}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        type="search"
        value={value}
      />
    </label>
  );
}

function StatusPill({ status }: Readonly<{ status: string }>) {
  const tone = status.includes("Exception") || status.includes("perlu perhatian")
    ? "border-warning-border bg-warning-background text-warning"
    : status.includes("Baru") || status.includes("Menunggu") || status.includes("Dibayar")
      ? "border-info-border bg-info-background text-info"
      : "border-border bg-muted text-foreground";
  return <span className={"inline-flex w-fit max-w-full rounded-full border px-3 py-1.5 text-xs font-medium " + tone}>{status}</span>;
}

function NoResults({ onClear }: Readonly<{ onClear: () => void }>) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-border bg-neutral-50 p-5" role="status">
      <p className="text-sm font-semibold">Tidak ada hasil yang cocok.</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Coba kata lain atau tampilkan kembali semua contoh.</p>
      <Button className="mt-4" onClick={onClear} variant="outline">Bersihkan filter</Button>
    </div>
  );
}

function DemoStatePanel({
  mode,
  onRestore,
  title,
}: Readonly<{ mode: Exclude<DemoMode, "ready">; onRestore: () => void; title: string }>) {
  if (mode === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-6" role="status">
        <p className="font-semibold">Memuat {title}…</p>
        <p className="mt-1 text-sm text-muted-foreground">Contoh keadaan saat data sedang diambil.</p>
        <div aria-hidden="true" className="mt-6 grid gap-3 motion-safe:animate-pulse sm:grid-cols-3">
          <span className="h-20 rounded-lg bg-muted" />
          <span className="h-20 rounded-lg bg-muted" />
          <span className="h-20 rounded-lg bg-muted" />
        </div>
        <Button className="mt-6" onClick={onRestore} variant="outline">Kembali ke data contoh</Button>
      </div>
    );
  }
  if (mode === "error") {
    return (
      <div className="rounded-xl border border-destructive-border bg-card p-6" role="alert">
        <AlertCircle aria-hidden="true" className="size-6 text-destructive" />
        <p className="mt-4 text-lg font-semibold">{title} belum dapat dimuat</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Sumber data sedang tidak tersedia. Coba muat ulang; tidak ada perubahan operasional yang dibuat.</p>
        <Button className="mt-5" onClick={onRestore} variant="outline">Coba lagi</Button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-6" role="status">
      <p className="text-lg font-semibold">Belum ada data di {title}.</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Halaman akan terisi ketika record operasional tersedia.</p>
      <Button className="mt-5" onClick={onRestore} variant="outline">Tampilkan data contoh</Button>
    </div>
  );
}
