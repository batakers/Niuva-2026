/**
 * Deadline gate for batch jobs that run against a hosted time limit. A run asks
 * before each new unit of work; the unit starts only while the remaining budget
 * covers the explicit floor (the outbox send timeout) and the slowest interval
 * between two earlier checks of the same run. Work already started is never cut
 * short here: leases, send timeouts and fencing still bound it.
 */
export class RunBudget {
  private longestMs = 0;
  private lastCheckMs: number | undefined;
  constructor(private readonly budgetMs: number, private readonly elapsedMs: () => number, private readonly floorMs = 0) {}
  allowsNext(): boolean {
    const elapsed = this.elapsedMs();
    if (this.lastCheckMs !== undefined) this.longestMs = Math.max(this.longestMs, elapsed - this.lastCheckMs);
    this.lastCheckMs = elapsed;
    const remaining = this.budgetMs - elapsed;
    return remaining > 0 && remaining >= Math.max(this.floorMs, this.longestMs);
  }
}
