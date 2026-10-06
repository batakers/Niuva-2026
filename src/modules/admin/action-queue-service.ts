import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";

import {
  projectActionQueueSignals,
  type ActionQueueGroup,
  type ActionQueueResult,
  type ActionQueueSignal,
} from "./action-queue";
import {
  PrismaActionQueueRepository,
  type ActionQueueSignalReader,
} from "./action-queue-repository";
import { requireAdminPermission } from "./permissions";

export type ActionQueueServiceDependencies = Readonly<{
  authorize?: () => Promise<AdminAccess>;
  now?: () => Date;
  repository?: ActionQueueSignalReader;
}>;

export class ActionQueueService {
  private readonly authorize: () => Promise<AdminAccess>;
  private readonly now: () => Date;
  private readonly repository: ActionQueueSignalReader;

  constructor(dependencies: ActionQueueServiceDependencies = {}) {
    this.authorize = dependencies.authorize ?? requireAdmin;
    this.now = dependencies.now ?? (() => new Date());
    this.repository =
      dependencies.repository ?? new PrismaActionQueueRepository();
  }

  async list(group: ActionQueueGroup = "all"): Promise<ActionQueueResult> {
    // The queue aggregates read-only signals across domains; AUDIT_READ is the
    // generic read permission held by both OWNER and ADMIN (matrix unchanged).
    requireAdminPermission(await this.authorize(), "AUDIT_READ");

    const signals: readonly ActionQueueSignal[] =
      await this.repository.listSignals();

    return projectActionQueueSignals(signals, this.now(), group);
  }
}
