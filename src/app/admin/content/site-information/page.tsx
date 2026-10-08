import { connection } from "next/server";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminShell, AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { SiteInformationService } from "@/modules/site-information/service";
import { SiteInformationForm } from "./site-information-form";
import { publishSiteInformationAction } from "./actions";
export default async function SiteInformationPage() {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "SITE_CONTENT_WRITE" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const loaded = await loadAdminRecordLogged("page:/admin/content/site-information", () => new SiteInformationService().load(gate.access), { op: "read" });
  if (loaded.status !== "found") return <AdminDataUnavailableView active="site-information" role={gate.access.profile.role} />;
  return <AdminShell active="site-information" role={gate.access.profile.role}><main id="main-content" data-admin-surface="site-information" className="space-y-6"><AdminPageHeader title="Informasi Situs" description="Perbarui profil dan kontak yang dilihat customer." breadcrumbs={[{ label: "Konten" }, { label: "Informasi Situs" }]} /><SiteInformationForm snapshot={loaded.record} action={publishSiteInformationAction} /></main></AdminShell>;
}
