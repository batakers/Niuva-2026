CREATE TYPE "AdminInvitationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'ACCEPTED');
CREATE TABLE "admin_invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "token_hash" TEXT,
    "status" "AdminInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "invited_by_admin_id" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_invitations_email_key" ON "admin_invitations"("email");
CREATE UNIQUE INDEX "admin_invitations_token_hash_key" ON "admin_invitations"("token_hash");
CREATE INDEX "admin_invitations_invited_by_admin_id_idx" ON "admin_invitations"("invited_by_admin_id");
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_admin_id_fkey" FOREIGN KEY ("invited_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
