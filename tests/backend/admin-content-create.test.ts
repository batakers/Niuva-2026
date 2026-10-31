import { describe, expect, it } from "vitest";
import type { AdminAccess } from "@/lib/auth/admin";
import { PortfolioRepository } from "@/modules/portfolio/repository";
import { PortfolioService } from "@/modules/portfolio/service";
import type { DomainAuditEvent } from "@/modules/shared/audit";

const access: AdminAccess = { authUserId: "content-fixture", profile: {
  id: "7c535956-28fc-4e39-9429-349904612c4f", authUserId: "content-fixture", isActive: true, role: "ADMIN",
} };
const draft = { title: "Artefak baru", slug: "artefak-baru", summary: "Ringkasan berbasis bukti", serviceLabel: "Desain & Rekayasa" };

class DraftRepository extends PortfolioRepository {
  created: unknown[] = [];
  constructor() { super({} as ConstructorParameters<typeof PortfolioRepository>[0]); }
  async createProject(input: unknown) { this.created.push(input); return { id: "b512d5d5-d54b-48f7-8327-1e11af6a44d4" }; }
}

describe("Admin portfolio draft creation", () => {
  it.each(["ADMIN", "OWNER"] as const)("allows an active %s to create a private draft with an audit event", async role => {
    const repository = new DraftRepository(), events: DomainAuditEvent[] = [];
    const service = new PortfolioService({ repository, authorizeAdmin: async () => ({ ...access, profile: { ...access.profile, role } }), audit: event => { events.push(event); } });
    await expect(service.createProject(draft)).resolves.toHaveProperty("id");
    expect(repository.created).toEqual([{ ...draft, challenge: "", process: "", result: "", clientName: null, isPublished: false, isFeatured: false }]);
    expect(events).toEqual([expect.objectContaining({ action: "portfolio.project.created", actorId: access.profile.id, afterJson: { isPublished: false, slug: draft.slug } })]);
  });
  it("refuses inactive actors before persisting a draft", async () => {
    const repository = new DraftRepository();
    const service = new PortfolioService({ repository, authorizeAdmin: async () => ({ ...access, profile: { ...access.profile, isActive: false } }) });
    await expect(service.createProject(draft)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.created).toEqual([]);
  });
  it.each([{ ...draft, isPublished: true }, { ...draft, slug: "../bad" }, { ...draft, title: " " }, { ...draft, serviceLabel: "Invented service" }])("rejects an invalid or prematurely published draft %#", async input => {
    const repository = new DraftRepository();
    const service = new PortfolioService({ repository, authorizeAdmin: async () => access });
    await expect(service.createProject(input)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(repository.created).toEqual([]);
  });
});
