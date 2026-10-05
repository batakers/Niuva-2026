-- CreateTable
CREATE TABLE "failure_events" (
    "id" UUID NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "boundary" TEXT NOT NULL,
    "error_code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "safe_context_json" JSONB,

    CONSTRAINT "failure_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "failure_events_correlation_id_idx" ON "failure_events"("correlation_id");

-- CreateIndex
CREATE INDEX "failure_events_occurred_at_idx" ON "failure_events"("occurred_at");
