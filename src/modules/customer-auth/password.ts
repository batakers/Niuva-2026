import { appError } from "@/modules/shared/errors";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export { passwordSchema, emailSchema, registrationSchema, loginSchema, tokenSchema } from "./password-validation";

let activeHashes = 0;
async function derive(password: string, salt: string): Promise<Buffer> {
  if (activeHashes >= 2) throw appError("RESOURCE_BUSY", { details: { retryAfterSeconds: "5" } });
  activeHashes++;
  try { return await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key))); } finally { activeHashes--; }
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:131072:8:1:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const match = /^scrypt:131072:8:1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded);
  if (!match) return false;
  const candidate = await derive(password, match[1]);
  return timingSafeEqual(candidate, Buffer.from(match[2], "hex"));
}
// Same work for an unknown account as for an existing password account.
export const DUMMY_PASSWORD_HASH = `scrypt:131072:8:1:${"0".repeat(32)}:${"0".repeat(128)}`;
