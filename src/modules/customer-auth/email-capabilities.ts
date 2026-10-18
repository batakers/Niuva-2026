import { getDatabaseEnvironment, parseServerEnvironment } from "@/lib/env/server";
import { getCustomerAuthLegalDocuments } from "./legal";
import { CustomerEmailRepository } from "./email-repository";
import { createCustomerAuthProofDelivery } from "../outbox/runtime";
export function customerEmailCapabilities() {
  try {
    getDatabaseEnvironment();
    const env = parseServerEnvironment();
    const delivery = createCustomerAuthProofDelivery(new CustomerEmailRepository()) !== null;
    return { password: true, delivery, registration: delivery && getCustomerAuthLegalDocuments() !== null, google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI) };
  } catch { return { password: false, delivery: false, registration: false, google: false }; }
}
