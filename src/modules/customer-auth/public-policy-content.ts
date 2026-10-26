import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { PUBLIC_CUSTOMER_POLICY } from "./public-policy";

const policyDirectory = join(process.cwd(), "src/content/customer-policy");

export async function readApprovedCustomerPolicy(document: "terms" | "privacy"): Promise<string> {
  const snapshot = PUBLIC_CUSTOMER_POLICY[document];
  const contentPath = join(policyDirectory, basename(snapshot.contentReference));
  const content = (await readFile(contentPath, "utf8")).replace(/\r\n/g, "\n");
  if (createHash("sha256").update(content).digest("hex") !== snapshot.sha256) throw new Error("Approved Customer policy content mismatch");
  return content;
}
