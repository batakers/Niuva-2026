import { decideFileRetention } from "../files/retention-core";
import { FileRetentionRepository } from "../files/retention-repository";
import type { PrivateObjectStorage } from "../files/object-storage";
import type { JobContext, JobResult } from "./core";

type RetentionStorage = Pick<PrivateObjectStorage, "deleteObject">;
const SCAN_LIMIT = 100;
const STORAGE_TIMEOUT_MS = 2000;

export class CustomerFileRetentionJob {
  constructor(private readonly storage: () => RetentionStorage, private readonly repository = new FileRetentionRepository()) {}

  async run(context: JobContext): Promise<JobResult> {
    const counts = { scanned: 0, eligible: 0, claimed: 0, deleted: 0, failed: 0, unknown: 0, activeHolds: 0 };
    const page = await context.withLease(tx => this.repository.page(tx, SCAN_LIMIT));
    for (const candidate of page) {
      const prepared = await context.withLease(async (tx, now) => {
        const file = await this.repository.read(tx, candidate.id, context.request.mode === "execute");
        const decision = file ? decideFileRetention(file.facts, now) : { state: "protected" as const };
        if (context.lease) {
          await context.verifyLease(tx);
          if (file && decision.state === "due") await this.repository.claim(tx, file.id, decision, now);
          await this.repository.cursor(tx, candidate.id);
        }
        return { file, decision };
      });
      counts.scanned++;
      if (prepared.decision.state === "held") counts.activeHolds++;
      if (prepared.decision.state !== "due" || !prepared.file) continue;
      counts.eligible++;
      if (context.request.mode === "execute") {
        if (prepared.file.facts.uploadStatus !== "DELETE_PENDING") counts.claimed++;
        const result = await context.withLease(async (tx, now) => {
          const file = await this.repository.read(tx, candidate.id, true);
          if (!file || decideFileRetention(file.facts, now).state !== "due") return "paused";
          await this.repository.attempted(tx, file.id);
          await context.verifyLease(tx);
          const controller = new AbortController();
          let timer: ReturnType<typeof setTimeout> | undefined;
          let unknown = false;
          let attempted = false;
          try {
            const storage = this.storage();
            attempted = true;
            await Promise.race([
              storage.deleteObject(file.facts.storageKey, { signal: controller.signal }),
              new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { unknown = true; controller.abort(); reject(new Error("Storage delete timed out")); }, STORAGE_TIMEOUT_MS); }),
            ]);
          } catch {
            unknown ||= attempted;
            await context.verifyLease(tx);
            await this.repository.failed(tx, file.id, unknown);
            return unknown ? "unknown" : "failed";
          } finally {
            if (timer !== undefined) clearTimeout(timer);
          }
          await context.verifyLease(tx);
          await this.repository.completed(tx, file.id);
          return "deleted";
        });
        if (result === "deleted") counts.deleted++;
        if (result === "failed" || result === "unknown") counts.failed++;
        if (result === "unknown") counts.unknown++;
        if (result === "paused") counts.activeHolds++;
      }
      if (counts.eligible >= context.request.limit) break;
    }
    if (context.lease && counts.scanned === page.length && page.length < SCAN_LIMIT) {
      await context.withLease(async tx => { await context.verifyLease(tx); await this.repository.cursor(tx, null); });
    }
    return { counts, ...(counts.failed > 0 ? { failure: "JOB_FAILED" as const } : {}) };
  }
}
