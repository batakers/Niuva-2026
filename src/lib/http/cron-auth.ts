import { timingSafeEqual } from "node:crypto";

export type CronAuthorization = "authorized" | "missing-secret" | "invalid";

export function authorizeCronRequest(request: Request, secret: string | undefined): CronAuthorization {
  if (!secret) return "missing-secret";
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return "invalid";
  return "authorized";
}
