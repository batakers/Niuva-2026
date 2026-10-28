import { z } from "zod";
import { readExplicitDeploymentTier } from "../../lib/env/deployment";
import { appError } from "../shared/errors";
import { normalizeCustomerEmail } from "./core";

// Owner decision E1 (TASKS.md#keputusan-owner-untuk-staging-2026-10-28):
// Customer accounts on staging are limited to listed tester addresses. The
// list lives only in the staging environment, never in Git. Outside an
// explicit staging tier, or with a missing or malformed list, this returns
// null and every staging Customer path stays closed.

const testerListSchema = z
  .string()
  .transform((value) => value.split(",").map((item) => item.trim()).filter((item) => item.length > 0))
  .pipe(z.array(z.email().max(254)).min(1).max(10));

export function getStagingCustomerTesters(
  source: Readonly<Record<string, string | undefined>> = process.env,
): ReadonlySet<string> | null {
  if (readExplicitDeploymentTier(source) !== "staging") return null;
  const parsed = testerListSchema.safeParse(source.NIUVA_STAGING_CUSTOMER_EMAILS ?? "");

  return parsed.success ? new Set(parsed.data.map(normalizeCustomerEmail)) : null;
}

export function assertStagingCustomerTester(
  email: string,
  testers: ReadonlySet<string> | null = getStagingCustomerTesters(),
): void {
  if (!testers?.has(normalizeCustomerEmail(email))) {
    throw appError("CUSTOMER_AUTH_UNAVAILABLE", {
      message: "Akun Customer di staging hanya tersedia untuk alamat email penguji.",
    });
  }
}
