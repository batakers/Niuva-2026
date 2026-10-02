import { privacyPostHandler } from "@/modules/customer-privacy/handler";
export const runtime = "nodejs";
export const POST = privacyPostHandler("owner");
