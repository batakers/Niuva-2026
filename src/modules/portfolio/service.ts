import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { requireAdminPermission } from "@/modules/admin/permissions";
import {
  recordAudit,
  type AuditRecorder,
} from "@/modules/shared/audit";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

import { PortfolioRepository } from "./repository";
import {
  replacePortfolioMediaSchema,
  updatePortfolioProjectSchema,
  type ReplacePortfolioMediaInput,
  type UpdatePortfolioProjectInput,
} from "./schema";

type AuthorizeAdmin = () => Promise<AdminAccess>;

export type PortfolioServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  repository?: PortfolioRepository;
}>;

export class PortfolioService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly repositoryFactory: () => PortfolioRepository;

  constructor(dependencies: PortfolioServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.repositoryFactory = () =>
      dependencies.repository ?? new PortfolioRepository();
  }

  async updateProject(projectId: string, input: unknown) {
    const parsed: UpdatePortfolioProjectInput = parseWithValidation(
      updatePortfolioProjectSchema,
      input,
    );
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "PORTFOLIO_WRITE");
    const repository = this.repositoryFactory();
    const current = await repository.findAdminProjectById(projectId);
    if (current === null) throw appError("NOT_FOUND");

    const candidate = { ...current, ...parsed };
    if (candidate.isPublished) {
      assertPublishable(candidate);
    }

    const updated = await repository.updateProject(projectId, parsed);
    await recordAudit(this.audit, {
      action: "portfolio.project.updated",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: {
        isFeatured: candidate.isFeatured,
        isPublished: candidate.isPublished,
        slug: candidate.slug,
      },
      entityId: updated.id,
      entityType: "PortfolioProject",
    });
    return updated;
  }

  async replaceMedia(projectId: string, input: unknown) {
    const parsed: ReplacePortfolioMediaInput = parseWithValidation(
      replacePortfolioMediaSchema,
      input,
    );
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "PORTFOLIO_WRITE");
    const repository = this.repositoryFactory();
    const current = await repository.findAdminProjectById(projectId);
    if (current === null) throw appError("NOT_FOUND");
    if (current.isPublished && parsed.items.length === 0) {
      throw appError("VALIDATION_ERROR", {
        details: { items: "Portfolio terbit harus memiliki minimal satu media." },
      });
    }

    const updated = await repository.replaceMedia(projectId, parsed.items);
    await recordAudit(this.audit, {
      action: "portfolio.project.media.replaced",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { mediaCount: updated.mediaCount },
      entityId: projectId,
      entityType: "PortfolioMedia",
    });
    return updated;
  }
}

function assertPublishable(project: Readonly<{
  challenge: string;
  clientName: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  media: readonly Readonly<{ altText: string; storageKey: string }>[];
  process: string;
  result: string;
  serviceLabel: string;
  slug: string;
  summary: string;
  title: string;
}>): void {
  const fields: readonly [keyof typeof project, string][] = [
    ["title", "Judul"],
    ["slug", "Slug"],
    ["summary", "Ringkasan"],
    ["challenge", "Tantangan"],
    ["process", "Proses"],
    ["result", "Hasil"],
    ["serviceLabel", "Layanan"],
  ];
  const missing = fields
    .filter(([key]) => typeof project[key] !== "string" || project[key].trim() === "")
    .map(([, label]) => label);
  if (missing.length > 0 || project.media.length === 0) {
    throw appError("VALIDATION_ERROR", {
      details: {
        publish:
          missing.length > 0
            ? `Lengkapi ${missing.join(", ")} sebelum publish.`
            : "Tambahkan minimal satu media sebelum publish.",
      },
    });
  }
}
