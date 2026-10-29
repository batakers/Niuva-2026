import { performance } from "node:perf_hooks";
import type { Prisma } from "../../generated/prisma/client";
import type { BoundDatabaseService } from "../database-binding/service";
import { appError } from "../shared/errors";
import { parseJobPolicy, parseJobRequest, parseJobResult, parseJobRole, type JobContext, type JobHandler, type JobLease, type JobName, type JobResult, type JobRunSummary } from "./core";
import type { PrismaJobRepository } from "./repository";

export class JobRunner {
  private readonly bound: Pick<BoundDatabaseService, "run">;
  private readonly repository: PrismaJobRepository;
  private readonly expectedRole: string;
  private readonly policy: ReturnType<typeof parseJobPolicy>;
  private readonly handlers: Readonly<Record<JobName, JobHandler>>;
  private readonly clock: () => number;
  constructor(options: { bound: Pick<BoundDatabaseService, "run">; repository: PrismaJobRepository; expectedRole: string; policy: unknown; handlers: Readonly<Record<JobName, JobHandler>>; clock?: () => number }) {
    this.bound = options.bound; this.repository = options.repository; this.expectedRole = parseJobRole(options.expectedRole); this.policy = parseJobPolicy(options.policy); this.handlers = Object.freeze({ ...options.handlers });
    this.clock = options.clock ?? (() => performance.now());
  }
  private async guarded<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.bound.run("job", async tx => { await this.repository.assertRole(tx, this.expectedRole); return work(tx); }); }
    catch { throw appError("PROVIDER_UNAVAILABLE"); }
  }
  async run(raw: unknown): Promise<JobRunSummary> {
    const startedAt = this.clock(), request = parseJobRequest(raw), handler = this.handlers[request.job];
    if (typeof handler !== "function") throw appError("PROVIDER_UNAVAILABLE");
    const claim = await this.guarded(tx => request.mode === "dry-run" ? Promise.resolve(null) : this.repository.claim(tx, request.job, this.policy));
    if (claim && claim.state !== "claimed") return { job: request.job, mode: request.mode, state: claim.state, cooldownMs: claim.cooldownMs, counts: {} };
    const lease: JobLease | null = claim?.state === "claimed" ? claim.lease : null;
    const verifyLease = async (tx: Prisma.TransactionClient) => { await this.repository.assertRole(tx, this.expectedRole); if (!lease) throw appError("PROVIDER_UNAVAILABLE"); return this.repository.verifyLease(tx, lease); };
    const context: JobContext = Object.freeze({ request, lease,
      elapsedMs: () => this.clock() - startedAt,
      withLease: <T>(work: (tx: Prisma.TransactionClient, now: Date) => Promise<T>) => this.guarded(async tx => { if (lease) await verifyLease(tx); return work(tx, await this.repository.now(tx)); }),
      verifyLease,
      recordCooldown: async (tx: Prisma.TransactionClient, until: Date) => { await this.repository.assertRole(tx, this.expectedRole); if (!lease) throw appError("PROVIDER_UNAVAILABLE"); await this.repository.recordCooldown(tx, lease, until); },
    });
    let result: JobResult;
    try { result = parseJobResult(await handler(context)); } catch { result = { counts: {}, failure: "JOB_FAILED" }; }
    const finished = !lease || await this.guarded(tx => this.repository.finalize(tx, lease, result, this.policy));
    return { job: request.job, mode: request.mode, state: !finished ? "lost-lease" : result.failure ? "failed" : "completed", counts: result.counts, ...(result.cooldownMs === undefined ? {} : { cooldownMs: result.cooldownMs }) };
  }
}
