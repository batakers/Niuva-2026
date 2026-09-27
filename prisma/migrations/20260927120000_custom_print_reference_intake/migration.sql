CREATE TYPE "CustomPrintIntakeMode" AS ENUM ('MODEL_READY', 'REFERENCE_ONLY');

ALTER TABLE "custom_print_requests"
  ADD COLUMN "intake_mode" "CustomPrintIntakeMode" NOT NULL DEFAULT 'MODEL_READY',
  ADD COLUMN "reference_link" TEXT;
