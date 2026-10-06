-- AlterTable
ALTER TABLE "admin_profiles" ADD COLUMN     "auth_user_id" TEXT,
ALTER COLUMN "clerk_user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "admin_auth_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_auth_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "mfaVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admin_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_auth_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "password" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(6),
    "refreshTokenExpiresAt" TIMESTAMPTZ(6),
    "scope" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_auth_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_auth_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_auth_two_factors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(6),

    CONSTRAINT "admin_auth_two_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_auth_rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "admin_auth_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_auth_users_email_key" ON "admin_auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_auth_sessions_token_key" ON "admin_auth_sessions"("token");

-- CreateIndex
CREATE INDEX "admin_auth_sessions_userId_idx" ON "admin_auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "admin_auth_sessions_expiresAt_idx" ON "admin_auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_auth_accounts_userId_idx" ON "admin_auth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_auth_accounts_providerId_accountId_key" ON "admin_auth_accounts"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_auth_verifications_identifier_key" ON "admin_auth_verifications"("identifier");

-- CreateIndex
CREATE INDEX "admin_auth_verifications_expiresAt_idx" ON "admin_auth_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_auth_two_factors_userId_idx" ON "admin_auth_two_factors"("userId");

-- CreateIndex
CREATE INDEX "admin_auth_two_factors_secret_idx" ON "admin_auth_two_factors"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "admin_auth_rate_limits_key_key" ON "admin_auth_rate_limits"("key");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_auth_user_id_key" ON "admin_profiles"("auth_user_id");

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "admin_auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_auth_sessions" ADD CONSTRAINT "admin_auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_auth_accounts" ADD CONSTRAINT "admin_auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_auth_two_factors" ADD CONSTRAINT "admin_auth_two_factors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
