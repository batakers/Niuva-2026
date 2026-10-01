import { isCustomerEmailTestRuntime } from "./email-test-runtime";
import { getDatabaseEnvironment, parseServerEnvironment } from "@/lib/env/server";
import { getCustomerAuthLegalDocuments } from "./legal";
export function customerEmailCapabilities() {
  try {
    getDatabaseEnvironment();
    const env = parseServerEnvironment();
    const delivery = isCustomerEmailTestRuntime() || Boolean(env.RESEND_API_KEY && env.EMAIL_FROM && env.APP_URL && env.NODE_ENV !== "production");
    return { password: true, delivery, registration: delivery && getCustomerAuthLegalDocuments() !== null, google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI) };
  } catch { return { password: false, delivery: false, registration: false, google: false }; }
}
