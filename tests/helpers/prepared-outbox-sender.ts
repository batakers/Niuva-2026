import type { OutboxSender } from "@/modules/outbox/worker-core";
export function preparedOutboxSender(prepare: OutboxSender["prepare"]): OutboxSender {
  return { prepare, assertReady() {}, async send() { throw new Error("Worker must use the prepared envelope"); } };
}
