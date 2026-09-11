import {
  projectActionQueueSignals,
  type ActionQueueResult,
  type ActionQueueSignal,
} from "./action-queue";
import {
  PrismaActionQueueRepository,
  type ActionQueueSignalReader,
} from "./action-queue-repository";

export type ActionQueueServiceDependencies = Readonly<{
  now?: () => Date;
  repository?: ActionQueueSignalReader;
}>;

export class ActionQueueService {
  private readonly now: () => Date;
  private readonly repository: ActionQueueSignalReader;

  constructor(dependencies: ActionQueueServiceDependencies = {}) {
    this.now = dependencies.now ?? (() => new Date());
    this.repository =
      dependencies.repository ?? new PrismaActionQueueRepository();
  }

  async list(): Promise<ActionQueueResult> {
    const signals: readonly ActionQueueSignal[] =
      await this.repository.listSignals();

    return projectActionQueueSignals(signals, this.now());
  }
}
