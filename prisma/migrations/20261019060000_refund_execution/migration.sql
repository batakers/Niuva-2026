-- AlterTable
ALTER TABLE "refund_cases" ADD COLUMN     "completed_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "refund_merchant_rules" (
    "id" UUID NOT NULL,
    "merchant_binding" TEXT NOT NULL,
    "payment_type" TEXT NOT NULL,
    "provider_channel" TEXT,
    "route" TEXT NOT NULL,
    "max_age_seconds" INTEGER NOT NULL,
    "max_attempts" INTEGER NOT NULL,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "evidence_reference" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,

    CONSTRAINT "refund_merchant_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_executions" (
    "id" UUID NOT NULL,
    "allocation_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "refund_key" TEXT NOT NULL,
    "public_reason" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'READY',
    "merchant_rule_id" UUID,
    "first_attempt_at" TIMESTAMPTZ(6),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6),
    "last_checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_execution_attempts" (
    "id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "submission_key" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "eligibility_evidence" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CHECKING',
    "attempt_number" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "refund_execution_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_observations" (
    "id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "outcome" TEXT NOT NULL,
    "proof_hash" CHAR(64),
    "checked_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refund_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_manual_authorizations" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "submission_key" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "case_version" INTEGER NOT NULL,
    "amount_rp" DECIMAL(18,0) NOT NULL,
    "execution_ids_json" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "provider_resolution_reference" TEXT NOT NULL,
    "recipient_verification_reference" TEXT NOT NULL,
    "authorized_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_manual_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_manual_payouts" (
    "id" UUID NOT NULL,
    "authorization_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "submission_key" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "transfer_reference" TEXT NOT NULL,
    "evidence_reference" TEXT NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_manual_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_completions" (
    "id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "amount_rp" DECIMAL(18,0) NOT NULL,
    "provider_reference" TEXT,
    "manual_payout_id" UUID,
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refund_merchant_rules_merchant_binding_payment_type_valid_u_idx" ON "refund_merchant_rules"("merchant_binding", "payment_type", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "refund_executions_allocation_id_key" ON "refund_executions"("allocation_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_executions_refund_key_key" ON "refund_executions"("refund_key");

-- CreateIndex
CREATE INDEX "refund_executions_state_last_checked_at_idx" ON "refund_executions"("state", "last_checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "refund_execution_attempts_submission_key_key" ON "refund_execution_attempts"("submission_key");

-- CreateIndex
CREATE UNIQUE INDEX "refund_execution_attempts_execution_id_attempt_number_key" ON "refund_execution_attempts"("execution_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "refund_observations_execution_id_run_id_key" ON "refund_observations"("execution_id", "run_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_manual_authorizations_submission_key_key" ON "refund_manual_authorizations"("submission_key");

-- CreateIndex
CREATE UNIQUE INDEX "refund_manual_payouts_authorization_id_key" ON "refund_manual_payouts"("authorization_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_manual_payouts_submission_key_key" ON "refund_manual_payouts"("submission_key");

-- CreateIndex
CREATE UNIQUE INDEX "refund_manual_payouts_transfer_reference_key" ON "refund_manual_payouts"("transfer_reference");

-- CreateIndex
CREATE UNIQUE INDEX "refund_completions_execution_id_key" ON "refund_completions"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_completions_provider_reference_key" ON "refund_completions"("provider_reference");

-- AddForeignKey
ALTER TABLE "refund_merchant_rules" ADD CONSTRAINT "refund_merchant_rules_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_executions" ADD CONSTRAINT "refund_executions_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "refund_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_executions" ADD CONSTRAINT "refund_executions_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "refund_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_executions" ADD CONSTRAINT "refund_executions_merchant_rule_id_fkey" FOREIGN KEY ("merchant_rule_id") REFERENCES "refund_merchant_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_execution_attempts" ADD CONSTRAINT "refund_execution_attempts_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "refund_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_execution_attempts" ADD CONSTRAINT "refund_execution_attempts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_observations" ADD CONSTRAINT "refund_observations_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "refund_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_manual_authorizations" ADD CONSTRAINT "refund_manual_authorizations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "refund_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_manual_authorizations" ADD CONSTRAINT "refund_manual_authorizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_manual_payouts" ADD CONSTRAINT "refund_manual_payouts_authorization_id_fkey" FOREIGN KEY ("authorization_id") REFERENCES "refund_manual_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_manual_payouts" ADD CONSTRAINT "refund_manual_payouts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_completions" ADD CONSTRAINT "refund_completions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "refund_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_completions" ADD CONSTRAINT "refund_completions_manual_payout_id_fkey" FOREIGN KEY ("manual_payout_id") REFERENCES "refund_manual_payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE refund_merchant_rules ADD CONSTRAINT refund_merchant_rule_contract CHECK (
  route IN ('refund', 'refund/online/direct') AND max_age_seconds > 0 AND max_attempts > 0
  AND valid_until > valid_from AND length(btrim(merchant_binding)) BETWEEN 1 AND 200
  AND payment_type ~ '^[a-z0-9_]{1,80}$' AND length(btrim(evidence_reference)) BETWEEN 10 AND 200
);
ALTER TABLE refund_executions ADD CONSTRAINT refund_execution_state CHECK (
  state IN ('READY', 'CHECKING', 'SUBMITTING', 'ACCEPTED', 'RETRYABLE', 'UNKNOWN', 'REJECTED', 'EXCEPTION', 'MANUAL_AUTHORIZED', 'CONFIRMED')
  AND refund_key ~ '^[A-Za-z0-9_-]{1,100}$' AND length(btrim(public_reason)) BETWEEN 10 AND 255
  AND attempt_count >= 0 AND ((attempt_count = 0 AND first_attempt_at IS NULL) OR (attempt_count > 0 AND first_attempt_at IS NOT NULL AND merchant_rule_id IS NOT NULL))
);
ALTER TABLE refund_execution_attempts ADD CONSTRAINT refund_execution_attempt_state CHECK (
  state IN ('CHECKING', 'SUBMITTING', 'PREFLIGHT_HELD', 'MERCHANT_HELD', 'ACCEPTED', 'RETRYABLE', 'UNKNOWN', 'INVALID_AMOUNT', 'BANK_DENIED')
  AND request_hash ~ '^[a-f0-9]{64}$' AND length(btrim(eligibility_evidence)) BETWEEN 10 AND 200
  AND ((attempt_number IS NULL AND started_at IS NULL) OR (attempt_number > 0 AND started_at IS NOT NULL))
);
ALTER TABLE refund_observations ADD CONSTRAINT refund_observation_evidence CHECK (
  outcome ~ '^[A-Z_]{1,64}$' AND (proof_hash IS NULL OR proof_hash ~ '^[a-f0-9]{64}$')
);
ALTER TABLE refund_manual_authorizations ADD CONSTRAINT refund_manual_authorization_evidence CHECK (
  amount_rp > 0 AND case_version > 1 AND request_hash ~ '^[a-f0-9]{64}$'
  AND jsonb_typeof(execution_ids_json) = 'array' AND jsonb_array_length(execution_ids_json) > 0
  AND length(btrim(reason)) BETWEEN 10 AND 1000
  AND length(btrim(provider_resolution_reference)) BETWEEN 10 AND 200
  AND length(btrim(recipient_verification_reference)) BETWEEN 10 AND 200
);
ALTER TABLE refund_manual_payouts ADD CONSTRAINT refund_manual_payout_evidence CHECK (
  request_hash ~ '^[a-f0-9]{64}$' AND paid_at <= recorded_at
  AND length(btrim(transfer_reference)) BETWEEN 10 AND 200 AND length(btrim(evidence_reference)) BETWEEN 10 AND 200
);
ALTER TABLE refund_completions ADD CONSTRAINT refund_completion_source CHECK (
  amount_rp > 0 AND ((source = 'PROVIDER' AND provider_reference IS NOT NULL AND manual_payout_id IS NULL)
    OR (source = 'MANUAL' AND provider_reference IS NULL AND manual_payout_id IS NOT NULL))
);

CREATE FUNCTION niuva_refund_evidence_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Refund evidence is append-only'; END;
$$;
CREATE TRIGGER refund_merchant_rule_immutable BEFORE UPDATE OR DELETE ON refund_merchant_rules FOR EACH ROW EXECUTE FUNCTION niuva_refund_evidence_immutable();
CREATE TRIGGER refund_observation_immutable BEFORE UPDATE OR DELETE ON refund_observations FOR EACH ROW EXECUTE FUNCTION niuva_refund_evidence_immutable();
CREATE TRIGGER refund_manual_authorization_immutable BEFORE UPDATE OR DELETE ON refund_manual_authorizations FOR EACH ROW EXECUTE FUNCTION niuva_refund_evidence_immutable();
CREATE TRIGGER refund_manual_payout_immutable BEFORE UPDATE OR DELETE ON refund_manual_payouts FOR EACH ROW EXECUTE FUNCTION niuva_refund_evidence_immutable();
CREATE TRIGGER refund_completion_immutable BEFORE UPDATE OR DELETE ON refund_completions FOR EACH ROW EXECUTE FUNCTION niuva_refund_evidence_immutable();
CREATE TRIGGER refund_execution_no_delete BEFORE DELETE ON refund_executions FOR EACH ROW EXECUTE FUNCTION niuva_refund_evidence_immutable();
CREATE TRIGGER refund_attempt_no_delete BEFORE DELETE ON refund_execution_attempts FOR EACH ROW EXECUTE FUNCTION niuva_refund_evidence_immutable();
CREATE FUNCTION niuva_refund_execution_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.id, NEW.allocation_id, NEW.approval_id, NEW.refund_key, NEW.public_reason, NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id, OLD.allocation_id, OLD.approval_id, OLD.refund_key, OLD.public_reason, OLD.created_at)
    OR (OLD.first_attempt_at IS NOT NULL AND ROW(NEW.first_attempt_at, NEW.merchant_rule_id) IS DISTINCT FROM ROW(OLD.first_attempt_at, OLD.merchant_rule_id))
    OR NEW.attempt_count < OLD.attempt_count THEN RAISE EXCEPTION 'Refund intent cannot be replaced'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER refund_execution_guard BEFORE UPDATE ON refund_executions FOR EACH ROW EXECUTE FUNCTION niuva_refund_execution_guard();
CREATE FUNCTION niuva_refund_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.id, NEW.execution_id, NEW.owner_id, NEW.submission_key, NEW.request_hash, NEW.eligibility_evidence, NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id, OLD.execution_id, OLD.owner_id, OLD.submission_key, OLD.request_hash, OLD.eligibility_evidence, OLD.created_at)
    OR OLD.finished_at IS NOT NULL
    OR (OLD.started_at IS NOT NULL AND ROW(NEW.started_at, NEW.attempt_number) IS DISTINCT FROM ROW(OLD.started_at, OLD.attempt_number))
    THEN RAISE EXCEPTION 'Refund attempt cannot be replaced'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER refund_attempt_guard BEFORE UPDATE ON refund_execution_attempts FOR EACH ROW EXECUTE FUNCTION niuva_refund_attempt_guard();

-- Preserve approved sibling names; their implementations remain separate PRs.
ALTER TABLE operational_job_states DROP CONSTRAINT operational_job_name;
ALTER TABLE operational_job_states ADD CONSTRAINT operational_job_name CHECK (name IN (
  'OUTBOX_DELIVERY', 'OUTBOX_EXPIRY', 'CUSTOMER_AUTH_CLEANUP', 'CUSTOMER_PRIVACY_CLEANUP',
  'INVENTORY_RESERVATIONS', 'CUSTOMER_FILE_RETENTION', 'PAYMENT_RECONCILIATION', 'OUTBOX_BUSINESS', 'REFUND_RECONCILIATION'
));
