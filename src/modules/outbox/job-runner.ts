import { OperationalJobHttpEndpoint } from "@/modules/jobs/http";
import type { OperationalJobRuntime } from "@/modules/jobs/runtime";

export const CUSTOMER_OUTBOX_JOB_KEY = "OUTBOX_DELIVERY";
export class CustomerOutboxJobRunner extends OperationalJobHttpEndpoint {
  constructor(options: { runtime: OperationalJobRuntime | (() => OperationalJobRuntime) }) {
    super(options.runtime, CUSTOMER_OUTBOX_JOB_KEY);
  }
}
