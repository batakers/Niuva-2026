import type { AdminAccess } from "@/lib/auth/admin";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { parseWithValidation } from "@/modules/shared/validation";
import { loadSiteInformation, publishSiteInformation } from "./repository";
import { publishSiteInformationSchema } from "./schema";
export class SiteInformationService {
  async load(access: AdminAccess) { requireAdminPermission(access, "SITE_CONTENT_WRITE"); return loadSiteInformation(); }
  async publish(access: AdminAccess, input: unknown) {
    requireAdminPermission(access, "SITE_CONTENT_WRITE");
    const parsed = parseWithValidation(publishSiteInformationSchema, input);
    return publishSiteInformation(access, parsed.expectedVersion, parsed.values);
  }
}
