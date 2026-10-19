import { OperationalJobHttpEndpoint } from "@/modules/jobs/http";
import type { OperationalJobRuntime } from "@/modules/jobs/runtime";

export const INVENTORY_RESERVATION_JOB_KEY = "INVENTORY_RESERVATIONS";
export class InventoryReservationJobRunner extends OperationalJobHttpEndpoint {
  constructor(options: { runtime: OperationalJobRuntime | (() => OperationalJobRuntime) }) {
    super(options.runtime, INVENTORY_RESERVATION_JOB_KEY);
  }
}
