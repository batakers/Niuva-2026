CREATE TABLE "request_rate_limits" (
  "key" TEXT NOT NULL,
  "namespace" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "reset_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "request_rate_limits_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "request_rate_limits_count_check" CHECK ("count" > 0)
);
CREATE INDEX "request_rate_limits_reset_at_idx" ON "request_rate_limits"("reset_at");
