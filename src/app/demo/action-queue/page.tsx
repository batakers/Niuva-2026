import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { isLocalDemoMode } from "@/lib/env/server";
import type { ActionQueueResult } from "@/modules/admin/action-queue";
import { ActionQueueService } from "@/modules/admin/action-queue-service";
import { StatusNotice } from "@/components/niuva/status-notice";
import { PublicShell } from "@/components/niuva/public-shell";

import { LocalDemoActionQueueView } from "./action-queue-demo-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Action Queue demo · Niuva",
};

export default async function LocalDemoActionQueuePage() {
  await connection();

  if (!isLocalDemoMode()) {
    notFound();
  }

  let result: ActionQueueResult | null = null;
  try {
    result = await new ActionQueueService().list();
  } catch {
    // Keep the demo route useful even when its local database is unavailable.
  }

  if (result === null) {
    return (
      <PublicShell functionalStatus="server-backed" scope="demo-action-queue">
        <main id="main-content" className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
          <StatusNotice
            tone="error"
            title="Action Queue demo belum dapat dimuat."
            description="Pastikan database demo lokal sudah bermigrasi dan seed katalog sudah dijalankan. Tidak ada data operasional yang diubah oleh halaman ini."
          />
        </main>
      </PublicShell>
    );
  }

  return <LocalDemoActionQueueView result={result} />;
}
