export { privacyPurposeSchema, privacyTokenSchema, privacyRequestSchema, privacyOwnerSchema, type PrivacyPurpose } from "./validation";
import { appError } from "../shared/errors";
import { getInternalAuthConfig } from "../customer-auth/internal-testing";
import { isCustomerEmailTestRuntime } from "../customer-auth/email-test-runtime";
import { hashOpaqueToken } from "../customer-auth/core";

export const DAY_MS = 86400000;
export const PRIVACY_CONFIRMATION_MS = 15 * 60000;
export const PRIVACY_CONTACT = "niuvamakerspace@gmail.com";
export function isCustomerPrivacyAvailable(): boolean { return Boolean(getInternalAuthConfig()) || isCustomerEmailTestRuntime(); }
export function assertCustomerPrivacyAvailable() { if (!isCustomerPrivacyAvailable()) throw appError("LOCAL_SETUP_DISABLED"); }
export function privacyDeadline(receivedAt: Date) { return new Date(receivedAt.getTime() + 3 * DAY_MS); }
export function closureIdentityHash(email: string) { return hashOpaqueToken(`niuva-closure-email:${email.trim().toLowerCase()}`); }
export function closureGoogleHash(subject: string) { return hashOpaqueToken(`niuva-closure-google:${subject}`); }
export const privacyStatusLabels: Readonly<Record<string, string>> = { OPEN: "Diterima", IN_REVIEW: "Sedang ditangani", RESOLVED: "Selesai" };
export const privacyKindLabels: Readonly<Record<string, string>> = { CORRECTION: "Koreksi data", ADDITIONAL: "Data tambahan" };
