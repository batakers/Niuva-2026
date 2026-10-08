-- CreateTable
CREATE TABLE "site_information" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'PUBLIC_PROFILE',
    "version" INTEGER NOT NULL,
    "values_json" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by_admin_id" UUID NOT NULL,

    CONSTRAINT "site_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_information_revisions" (
    "id" UUID NOT NULL,
    "site_information_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "values_json" JSONB NOT NULL,
    "actor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_information_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_information_scope_key" ON "site_information"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "site_information_revisions_site_information_id_version_key" ON "site_information_revisions"("site_information_id", "version");

-- AddForeignKey
ALTER TABLE "site_information" ADD CONSTRAINT "site_information_published_by_admin_id_fkey" FOREIGN KEY ("published_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_information_revisions" ADD CONSTRAINT "site_information_revisions_site_information_id_fkey" FOREIGN KEY ("site_information_id") REFERENCES "site_information"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_information_revisions" ADD CONSTRAINT "site_information_revisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
