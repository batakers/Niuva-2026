import { parseServerEnvironment } from "@/lib/env/server";
import { PrismaAdminInvitationRepository } from "./invitation-repository";
import { AdminInvitationService } from "./invitation-service";
import { isAdminSmtpConfigured, sendAdminAuthMail } from "./mail";

export function getAdminInvitationService(): AdminInvitationService {
  const env = parseServerEnvironment();
  return new AdminInvitationService(new PrismaAdminInvitationRepository(), {
    ready: isAdminSmtpConfigured, send: sendAdminAuthMail, baseUrl: env.BETTER_AUTH_URL ?? "",
  });
}
