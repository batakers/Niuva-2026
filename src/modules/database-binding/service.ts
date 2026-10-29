import type { Prisma } from "../../generated/prisma/client";
import { requireAllowed, type CapabilityContext } from "../capabilities/resolver";
import { appError } from "../shared/errors";
import { readDatabaseBindingExpectation } from "./core";
import type { BindingTransactionOptions, DatabaseBindingRepository } from "./repository";

/**
 * Outbox and job transactions run several round trips; hosted functions can sit
 * far from the database (staging: Ohio to Singapore), so the 5 s Prisma default
 * aborted a three-message OUTBOX_BUSINESS run. Leases still bound the work.
 */
export const BOUND_TRANSACTION_OPTIONS: BindingTransactionOptions = Object.freeze({ maxWait: 10_000, timeout: 20_000 });

export type BoundDatabaseServiceOptions = Readonly<{
  context: CapabilityContext & { env: Readonly<Record<string, string | undefined>> };
  repositoryFactory: () => DatabaseBindingRepository;
}>;

export class BoundDatabaseService {
  private readonly context: BoundDatabaseServiceOptions["context"];
  private readonly repositoryFactory: () => DatabaseBindingRepository;

  constructor(options: BoundDatabaseServiceOptions) {
    this.context = Object.freeze({ ...options.context, env: Object.freeze({ ...options.context.env }) });
    this.repositoryFactory = options.repositoryFactory;
  }

  async run<T>(operation: "outbox" | "job", work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const capability = operation === "outbox" ? "emailDelivery" : operation === "job" ? "scheduledJobs" : undefined;
    if (capability === undefined) throw appError("PROVIDER_UNAVAILABLE");
    try {
      const decision = requireAllowed(capability, this.context);
      const expected = readDatabaseBindingExpectation(this.context.env, decision.tier);
      return await this.repositoryFactory().withVerifiedBinding(expected, work, BOUND_TRANSACTION_OPTIONS);
    } catch {
      throw appError("PROVIDER_UNAVAILABLE");
    }
  }
}
