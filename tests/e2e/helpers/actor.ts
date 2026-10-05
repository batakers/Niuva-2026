import { createHash, randomUUID } from "node:crypto";
import type { TestInfo } from "@playwright/test";

const workerActorNonce = randomUUID();

/** Independent loopback fixtures represent distinct actors, including no-JS contexts. */
export function isolatedActorHeaders(testInfo: TestInfo, actor = "customer"): Record<string, string> {
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== "string" || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
    throw new Error("Synthetic browser actors are restricted to the loopback E2E harness");
  }
  const digest = createHash("sha256")
    .update(`${workerActorNonce}:${testInfo.testId}:${testInfo.retry}:${testInfo.repeatEachIndex}:${actor}`)
    .digest("hex");
  // RFC 3849 documentation prefix; these addresses are metadata, never destinations.
  const ip = `2001:db8:${Array.from({ length: 6 }, (_, index) => digest.slice(index * 4, index * 4 + 4)).join(":")}`;
  return { "x-forwarded-for": ip, "x-real-ip": ip };
}
