import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { parseServerEnvironment } from "@/lib/env/server";
import { sendAdminAuthMail, type AdminAuthMail } from "@/modules/admin-auth/mail";
import { appError } from "@/modules/shared/errors";

export type AdminAuthEngineOptions = Readonly<{
  baseUrl: string;
  secret: string;
  production: boolean;
  sendMail: (mail: AdminAuthMail) => Promise<void>;
}>;

export function createAdminAuthEngine(prisma: PrismaClient, options: AdminAuthEngineOptions) {
  const origin = new URL(options.baseUrl);
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || (options.production && origin.protocol !== "https:")) throw appError("AUTH_UNAVAILABLE");
  return betterAuth({
    appName: "NIUVA Admin",
    baseURL: origin.origin,
    basePath: "/api/admin/auth",
    secret: options.secret,
    trustedOrigins: [origin.origin],
    database: prismaAdapter(prisma, { provider: "postgresql", transaction: true }),
    user: { modelName: "AdminAuthUser" },
    account: { modelName: "AdminAuthAccount", accountLinking: { enabled: false } },
    verification: { modelName: "AdminAuthVerification" },
    session: {
      modelName: "AdminAuthSession",
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 30,
      cookieCache: { enabled: false },
      additionalFields: { mfaVerified: { type: "boolean", defaultValue: false, required: true, input: false } },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      sendResetPassword: async ({ user, url }) => options.sendMail({ to: user.email, url, kind: "reset" }),
    },
    emailVerification: {
      sendOnSignIn: true,
      sendOnSignUp: false,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 30,
      sendVerificationEmail: async ({ user, url }) => options.sendMail({ to: user.email, url, kind: "verify" }),
    },
    plugins: [twoFactor({ issuer: "NIUVA Admin", twoFactorTable: "AdminAuthTwoFactor", skipVerificationOnEnable: false, accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 900 } })],
    rateLimit: { enabled: true, storage: "database", modelName: "AdminAuthRateLimit", window: 60, max: 20, customRules: { "/sign-in/email": { window: 60, max: 5 }, "/request-password-reset": { window: 60, max: 3 }, "/send-verification-email": { window: 60, max: 3 } } },
    advanced: {
      cookiePrefix: "niuva_admin",
      useSecureCookies: options.production,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: options.production },
    },
    databaseHooks: {
      session: { create: { before: async (session, context) => {
        const profile = await prisma.adminProfile.findUnique({ where: { authUserId: session.userId }, select: { isActive: true } });
        if (!profile?.isActive) return false;
        // Only Better Auth's successful factor-verification endpoints can create a privileged session.
        // Password login, password reset and session rotation cannot promote it.
        const mfaVerified = context?.path === "/two-factor/verify-totp" || context?.path === "/two-factor/verify-backup-code";
        return { data: { ...session, mfaVerified } };
      } } },
    },
    logger: { disabled: true },
  });
}

let instance: ReturnType<typeof createAdminAuthEngine> | undefined;
export function getAdminAuth() {
  const env = parseServerEnvironment();
  if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL || !env.DATABASE_URL) throw appError("AUTH_UNAVAILABLE");
  instance ??= createAdminAuthEngine(getPrismaClient(), { baseUrl: env.BETTER_AUTH_URL, secret: env.BETTER_AUTH_SECRET, production: env.NODE_ENV === "production", sendMail: sendAdminAuthMail });
  return instance;
}
