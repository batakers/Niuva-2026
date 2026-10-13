CREATE TABLE "deployment_database_bindings" (
    "id" INTEGER NOT NULL,
    "binding_id" UUID NOT NULL,
    "deployment_tier" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_database_bindings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "deployment_database_bindings_singleton_check" CHECK ("id" = 1),
    CONSTRAINT "deployment_database_bindings_tier_check" CHECK ("deployment_tier" IN ('local-test', 'staging', 'production'))
);

CREATE UNIQUE INDEX "deployment_database_bindings_binding_id_key" ON "deployment_database_bindings"("binding_id");
