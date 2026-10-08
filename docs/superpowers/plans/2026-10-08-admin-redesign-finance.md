# Niuva Admin Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` after implementation authorization. Delegation requires explicit selection. Read master/spec and complete A1 before this package.

**Goal:** Menyediakan invoice seluruh layanan, transfer B2B, pengeluaran, unduh PDF, serta koreksi/pembatalan oleh Owner dan Admin dengan jejak yang benar.

**Architecture:** Finance menghubungkan dokumen/tagihan ke sumber bisnis existing melalui BillingCase. Pembayaran provider tetap dibaca dari PaymentAttempt/PaymentEvent; transfer B2B dan pengeluaran memiliki catatan manual append/reversal. Invoice terbit menyimpan snapshot immutable; state pembayaran dihitung terpisah sehingga satu invoice proyek dapat menerima DP dan pelunasan.

**Tech Stack:** Prisma/PostgreSQL, Zod, existing MoneyDecimal, AdminAccess, AuditLog, Next Node route handler; proposed PDFKit 0.20.2 server-only and compatible type definitions.

**Spec:** [S12–S17 and planning confirmations](../specs/2026-10-08-admin-redesign-design.md). **Master:** [global plan/dependency review](2026-10-08-admin-redesign-implementation.md).

## Global Constraints

- Both Owner and Admin have FINANCE_READ/WRITE/CORRECT. Only Owner manages B2B billing terms/DP and bank instructions. Corrections require reasons and history; no hard deletes.
- One B2B invoice for the agreed project total; FULL or DEPOSIT_BALANCE, nominal DP chosen Owner; direct transfer verified Owner/Admin.
- IDR integer strings at boundaries; MoneyDecimal internally; positive actual payments/expenses, no authoritative Number arithmetic.
- Provider payment states/holds/refunds remain existing authority. Finance correction cannot edit provider confirmations or initiate refunds.
- Customer lifecycle lock/closure markers apply to new reads/writes/exports; no email-based relink or new indefinite legal-retention assumption.
- Actual issuer/bank details are entered by Owner in UI; no fabricated account, tax rate, DP percentage, or production email/provider activation.

## Review Focus

1. Double-click/two operators/concurrent receipt correction: one effect, no double allocation or lost balance (B1–B3).
2. Production and later shipping for one custom order: distinct source amounts; no duplicate provider charge/invoice income (B2/B5).
3. Cancel/correct a paid invoice: recorded money stays attributable to its BillingCase; cancellation never silently refunds or removes receipts (B2–B3).
4. Account closure while invoice is issued/downloaded: no recreated-customer linkage or exported closed identity (B1–B2).
5. Long invoice text, missing required bank setup, oversized/mislabeled proof, PDF runtime/build: clear bounded behavior, private files and usable export (B2/B4).

## Shared contracts

Create `src/modules/finance/types.ts` as the single contract owner. `MoneyRp = string` is validated canonical IDR, never an arbitrary numeric string at mutation boundaries.

```ts
type BillingSource =
  | Readonly<{ kind: "ORDER_TOTAL" | "CUSTOM_SHIPPING"; orderId: string }>
  | Readonly<{ kind: "B2B"; inquiryId: string }>;
type PaymentState = "UNPAID" | "PARTIAL" | "PAID" | "REVIEW" | "NO_PAYMENT_REQUIRED";
type InvoiceState = "DRAFT" | "ISSUED" | "VOID" | "SUPERSEDED";
type FinanceRange = "30d" | "13m";
type BillingCaseView = Readonly<{
  id: string; source: BillingSource; version: number;
  totalRp: MoneyRp; paidRp: MoneyRp; remainingRp: MoneyRp;
  paymentState: PaymentState; mode: "FULL" | "DEPOSIT_BALANCE";
  depositRp: MoneyRp | null; currentInvoiceId: string | null;
}>;
type FinanceSummary = Readonly<{
  range: FinanceRange; grossConfirmedReceiptsRp: MoneyRp;
  validExpensesRp: MoneyRp; needsReviewCount: number;
  points: readonly Readonly<{ key: string; receiptsRp: MoneyRp; expensesRp: MoneyRp }>[];
}>;
```

Also define `InvoiceView` (id, number/null for draft, state, version, billingCase, immutable issue details, safe history links), `InvoiceDocument` (immutable issuer/buyer/line items/IDR totals/terms/instructions plus separately dated payment summary), `FinancePaymentView` (source PROVIDER/MANUAL, reference, amount, actual date, state, invoice/source link), `ExpenseView` (id, version, date/category/amount/description, state, proof links, correction history). All list methods return existing `AdminReadPage<T>`.

## B1 — Finance schema, source adapter, permissions, and privacy

**Files:** Modify `prisma/schema.prisma`, `src/modules/customer-privacy/lifecycle.ts`, `repository.ts`; create new `admin_finance` migration, `src/modules/finance/types.ts`, `schema.ts`, `repository.ts`, `source.ts`, `money.ts`; tests `tests/integration/admin-finance-invariants.test.ts`, `tests/integration/admin-finance-privacy.test.ts`.

**Interfaces:** Consumes A1 permissions, existing `lockCustomerBusinessWrite`, source Order/quote/PaymentAttempt and `MoneyDecimal`. Produces `loadBillingSource(access: AdminAccess, source: BillingSource): Promise<BillingSourceSnapshot>`, where the snapshot declares source identity/version, authorized current amount, bill-to, and any payment-review condition. Provides repository transactions for source/actor/lifecycle locks, idempotency, version checks, and audit.

- [ ] Add DB tests for unique source/case/invoice revision and number, exactly one source FK, invalid money/DP, repeated reversal, inactive actor, closed customer, and serialize closure versus creation. Manual/expense fixtures are explicitly synthetic TEST data.

  ```ts
  expect(caseAfterClosure.customerId).toBeNull();
  expect(newCustomerCaseIds).not.toContain(oldBillingCaseId);
  expect(duplicateIssueCount).toBe(1);
  ```

- [ ] Run `corepack pnpm test:integration` with the new `tests/integration/admin-finance-invariants.test.ts` and `tests/integration/admin-finance-privacy.test.ts` cases included for expected missing behavior.
- [ ] Add models: BillingCase (unique stable source key, optional customer, order/inquiry source, Owner-approved B2B quote/terms/version), Invoice (case/revision/state/immutable document/number), InvoiceSequence (Jakarta month counter), ManualB2BPaymentEntry (case/amount/date/reference/idempotency/reversal link/actor), ExpenseEntry (amount/date/category/description/proof/idempotency/reversal/replacement/actor), BillingInstructions (Owner-managed versioned issuer/bank details). Include explicit `FINANCIAL_EVIDENCE` file purpose, optional admin uploader and expense-proof relation in this new migration; existing CAD records retain their purpose/lifecycle. Store corrections via immutable original + linked reversal/replacement and reason/audit. New SQL checks/FKs/unique keys must reject illegal combinations independently from UI.
- [ ] Provider payments are not copied into a second mutable ledger. Source adapter reads ready-made Order total, Custom Print accepted production quote/charge, and prepared CUSTOM_SHIPPING charge after final package/rate validation. Match source amounts to existing purpose-specific charge where available; inconsistent sources enter REVIEW instead of guessed totals. B2B requires an accepted proposal and Owner terms; do not create retail Orders or provider attempts for it.
- [ ] Preserve customer lifecycle lock order. On closure detach new Customer relations, mark closed source, redact new buyer contact snapshot fields separately from immutable financial amounts. Block named invoice downloads/search on closed sources; anonymized financial totals/history remain. Extend Customer data export with its own financial records only; no internal-only notes or unrelated account data. Retention period remains separately unresolved, not a new default coded here.
- [ ] Generate/review/apply additive SQL on isolated test/development DB only. Run schema validate + tests. Deliverable: safe persisted finance foundation/source contracts.

## B2 — Invoice lifecycle, issuer settings, and PDF download

**Files:** Create `src/modules/finance/invoice-service.ts`, `invoice-document.ts`, `invoice-pdf.ts`, `billing-settings-service.ts`, `src/app/admin/finance/settings/page.tsx`, `actions.ts`, `src/app/api/admin/invoices/[id]/pdf/route.ts`; modify `package.json`, `pnpm-lock.yaml` only for reviewed PDF dependency; add approved Space Grotesk font files/license under `src/modules/finance/pdf-assets/` after checking existing licensed sources. Tests `tests/unit/invoice-document.test.ts`, `tests/integration/admin-invoices.test.ts`, `tests/e2e-admin-auth/admin-invoice-download.spec.ts`.

**Interfaces:** `InvoiceService.createDraft(access, input: unknown): Promise<InvoiceView>`, `issue(access, input: unknown): Promise<InvoiceView>`, `replace(access, input: unknown): Promise<InvoiceView>`, `void(access, input: unknown): Promise<InvoiceView>`, `document(access, id: string): Promise<InvoiceDocument>`. `renderInvoicePdf(document: InvoiceDocument): Promise<Uint8Array>`; `BillingSettingsService.load(access)` returns validated current issuer/instructions, `save(access, input: unknown)` requires BILLING_SETTINGS_MANAGE and expectedVersion.

- [ ] Test both roles issuing/correcting/voiding; Admin cannot modify terms/DP or bank details via forged invoice payload. Verify same idempotency issues once, concurrent monthly counters unique, source-change conflict, issued total immutable, invoice void retains receipts, replacement carries source case/receipt context, zero source shows NO_PAYMENT_REQUIRED without a fabricated receipt. No automatic email send.

  ```ts
  expect(afterPayment.invoice.totalRp).toBe(issued.invoice.totalRp);
  expect(afterVoid.billingCase.paidRp).toBe(beforeVoid.billingCase.paidRp);
  expect(invoiceNumbers.size).toBe(concurrentIssueCount);
  ```

- [ ] Run new unit/integration tests for failures, then implement draft review→issue with a transaction locking source/case/sequence/actor and version/idempotency keys. Draft has no final number; issued invoice gets `INV-YYYYMM-000001` using Jakarta issue month. Preserve voided numbers. No editing issued financial snapshots in place; corrections link a replacement revision and audit reason.
- [ ] Implement one active B2B invoice per source case, with full total, FULL or DP/balance schedule copied from Owner terms. A linked correction preserves the original/voided invoice number and replaces the active revision atomically; it never creates two active receivables for the same project. Production invoice and later shipping invoice are separate purpose cases for Custom Print; no early shipping amount. Invoice issue changes document state, not payment authority/order fulfillment/project completion.
- [ ] Add Owner billing settings for actual issuer identity/bank instructions, optimistic version/history. Both roles read the current configured instructions for draft review. Issue requires valid setup; draft preview displays an honest setup-needed state. Changing settings does not change old issued instructions. No unapproved tax computation or claim to generate tax invoices.
- [ ] Install proposed exact `pdfkit@0.20.2` only after rechecking API/license/advisories/runtime compatibility; add compatible pinned types if needed, verify lockfile. Use Node runtime and an isolated server-only adapter, local licensed Space Grotesk, fixed plain-text template, bounded strings/lines, pagination and readable headings. Do not fetch user-provided asset URLs or file paths. Implement `/api/admin/invoices/[id]/pdf` with active/MFA/FINANCE_READ, source privacy guard, no-store and application/pdf attachment headers.
- [ ] Test invoice HTML preview and actual downloaded PDF on one/multiple pages, long text, both roles, unauthorized/closed source denial, production build bundle/font availability. Use a legitimate PDF parser/viewer in verification, not only a `%PDF` header assertion. Tagged structure/title/language follow PDFKit docs; do not claim certified PDF/UA without separate validation.
- [ ] Re-run domain tests, `corepack pnpm typecheck`, `corepack pnpm build`, and invoice download E2E. Deliverable: real downloadable PDF and traceable invoice lifecycle.

## B3 — Owner B2B terms, verified transfer, and correction

**Files:** Create `src/modules/finance/b2b-billing-service.ts`, `manual-payment-service.ts`; add `src/app/admin/inquiries/[id]/billing/page.tsx`, `actions.ts`, `billing-form.tsx`; modify `src/app/admin/inquiries/[id]/page.tsx` to link billing; tests `tests/integration/b2b-billing.test.ts`, `tests/e2e-admin-auth/admin-b2b-billing.spec.ts`.

**Interfaces:** `B2BBillingService.setTerms(access, input: unknown): Promise<BillingCaseView>` accepts inquiryId, acceptedQuoteId, expectedVersion, mode, depositRp and optional agreed due dates. Only Owner may call it. `ManualPaymentService.record(access, input: unknown): Promise<FinancePaymentView>`, `reverse(access, input: unknown): Promise<FinancePaymentView>`, `correct(access, input: unknown): Promise<FinancePaymentView>` are available to both roles with reason/idempotency/expectedVersion.

- [ ] Fixture proposal total `1000000`, Owner DP `300000`: first confirmed transfer `300000` gives PARTIAL/remaining `700000`; second `700000` gives PAID/remaining `0`. Admin forged DP change denied; both roles may reverse/correct manual entries with reason. Preserve originals. Reversing/correcting provider payments through this service must be denied.

  ```ts
  expect(afterDp).toMatchObject({totalRp: "1000000", paidRp: "300000", remainingRp: "700000", paymentState: "PARTIAL"});
  expect(afterBalance.remainingRp).toBe("0");
  expect(afterCorrection.invoice.totalRp).toBe("1000000");
  ```

- [ ] Run `corepack pnpm test:integration` with the new `tests/integration/b2b-billing.test.ts` cases included for expected failure, then implement Owner terms under source/case locks. FULL has no DP; DEPOSIT_BALANCE requires `0 < DP < total`, no default percentage. Due dates are optional agreed inputs, no invented payment deadline. Terms changes after issue require a new approved revision and linked invoice correction.
- [ ] Implement confirm form: actual received date, amount, reference, optional note, confirmation that funds were checked. Positive IDR and non-future received date; reject amount above outstanding with review guidance rather than silently clamping. Multiple transfers may satisfy the two agreed stages without creating arbitrary new installment schedules. Duplicate request key has one effect; duplicate bank reference in the same case is surfaced for review.
- [ ] Record/reverse/correct transaction locks case and original payment entry; a payment can be reversed once. Correction links reversal+replacement atomically, requires reason, recalculates outstanding from valid entries, and logs actor/time. Invoice cancellation leaves receipts on the case; UI explicitly shows them for follow-up. No automatic refund, WON transition, production start, or provider request.
- [ ] Add B2B billing screen with total/DP/paid/remaining, single invoice link, transfer history and contextual next action. Owner sees editable terms; Admin sees read-only terms and permitted recording/correction actions. Confirmation and history distinguish bookkeeping corrections from money movements.
- [ ] Run concurrent tests: same request twice; two operators exceeding remaining; reversal versus second transfer; changed accepted proposal; actor deactivated before commit. Re-run integration/E2E. Deliverable: agreed one-invoice/two-stage manual B2B workflow.

## B4 — Expenses and private optional evidence

**Files:** Create `src/modules/finance/expense-service.ts`, `evidence-service.ts`, `src/app/admin/finance/expenses/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `actions.ts`, `expense-form.tsx`, `src/app/api/admin/finance/evidence/route.ts`; modify existing `src/modules/files/lifecycle.ts`, `repository.ts`, `download-service.ts` only for purpose-aware finance support. Consume the evidence purpose/uploader/proof schema already created in B1; do not edit its applied migration. If an additional schema amendment is necessary, create a separate additive migration. Tests `tests/integration/admin-expenses.test.ts`, `tests/backend/financial-evidence.test.ts`, `tests/e2e-admin-auth/admin-expenses.spec.ts`.

**Interfaces:** `ExpenseService.record(access, input: unknown): Promise<ExpenseView>`, `correct(access, input: unknown): Promise<ExpenseView>`, `void(access, input: unknown): Promise<ExpenseView>`. `FinancialEvidenceService.prepare(access, input: unknown)` returns an authenticated private upload intent; `verifyAndAttach(access, input: unknown)` validates actual file bytes/purpose/link. Reuse existing storage adapter/gates, not a new provider.

- [ ] Test both roles recording/correcting/voiding, required reason, repeated-submit idempotency, concurrent version conflicts, valid expense counted once, reversed original excluded from current expense totals. Real expected dates/category/amount/description round-trip; optional attachment absent does not block saving.

  ```ts
  expect(afterCorrect.validExpensesRp).toBe("120000"); // original TEST 100000 replaced by 120000
  expect(afterVoid.validExpensesRp).toBe("0");
  ```

- [ ] Run new integration/backend tests; implement actual-date positive-IDR expense record and append/reversal correction with expectedVersion/idempotency/audit. No destructive delete or clearing audit history.
- [ ] Implement upload/download behavior using B1's `FINANCIAL_EVIDENCE` purpose/admin uploader/proof relation: private JPEG/PNG/PDF up to `10 * 1024 * 1024` bytes. Validate actual MIME/signature, size, file ownership/purpose, and private download authorization; reject disguised executable, other-record file binding, public bucket, and forged upload intent. Test exactly limit and limit+1.
- [ ] Ensure existing CAD orphan/14–60–90-day cleanup does not select financial evidence. No financial retention duration is guessed; enable real evidence storage only after its retention policy is set. Synthetic development upload/authorization works with the test adapter. If configured storage is unavailable, show attachment-unavailable state and allow expense without evidence.
- [ ] Implement list/new/full detail including category/date/amount/description, optional evidence, corrections/history and return context. Both roles use same operations. Re-run tests and authenticated browser flow. Deliverable: usable expenses with protected optional proof and correct aggregates.

## B5 — Finance read UI, cross-links, and reporting contract

**Files:** Create `src/modules/finance/read-service.ts`, `read-repository.ts`, `summary.ts`, `src/app/admin/finance/page.tsx`, `invoices/page.tsx`, `invoices/[id]/page.tsx`, `payments/page.tsx`, `payments/[id]/page.tsx`, `actions.ts`; modify `src/app/admin/orders/[id]/page.tsx`, `src/app/admin/custom-print/[id]/page.tsx`, `src/app/admin/customers/[id]/page.tsx`, A2 target resolver/A3 search; tests `tests/integration/admin-finance-read.test.ts`, `tests/e2e-admin-auth/admin-finance.spec.ts`.

**Interfaces:** `FinanceReadService.invoices(access, raw): Promise<AdminReadPage<InvoiceView>>`, `invoice(access,id): Promise<InvoiceView|null>`, `payments(access,raw): Promise<AdminReadPage<FinancePaymentView>>`, `payment(access,id): Promise<FinancePaymentView|null>`, `expenses(access,raw): Promise<AdminReadPage<ExpenseView>>`, `summary(access, range: FinanceRange): Promise<FinanceSummary>`. Query schemas own q/page/service/status/date validation. Returned links are actual authorized records.

- [ ] Test pagination/search/source filters; replayed PaymentEvents count one settlement per PaymentAttempt; a new invoice never adds receipt income; pending/expired/failed attempts excluded. Receipts are confirmed gross incoming amounts by actual date (provider settledAt, valid manual receivedAt), corrections exclude replaced/reversed manual records. Full/partial refund and late-payment exceptions are marked separately using existing operational-state; do not infer unknown partial refund values or present gross as profit/net balance.

  ```ts
  expect(summaryAfterDraft.grossConfirmedReceiptsRp).toBe(summaryBeforeDraft.grossConfirmedReceiptsRp);
  expect(summaryAfterWebhookReplay.grossConfirmedReceiptsRp).toBe(summaryBeforeWebhookReplay.grossConfirmedReceiptsRp);
  ```

- [ ] Run integration cases, then implement source-union reads and Decimal aggregation with Jakarta windows from analytics contract. For invoices, distinguish document lifecycle from payment state; provider issues force REVIEW and preserve fulfillment hold. Handle voided/no-active-invoice cases without losing receipts.
- [ ] Build actual finance lists/details with review/issue/download/correct/void actions, status filters and related source/customer links. Confirmation dialogs show record/amount/action/reason and preserve form on failures. Payment provider records remain read-only source facts. Invoice draft creation is initiated from legitimate source detail; invoice list routes to source selection rather than a freeform arbitrary-total invoice.
- [ ] Add billing/invoice links to Orders, Custom Print, B2B and legitimate Customer history; complete global-search kinds and notification resolver. Enable Keuangan menu only when destinations work. No automated email/send flow or public invoice portal is added.
- [ ] Run unit/backend/integration targeted suites, Finance E2E, typecheck/schema/build. Deliverable: complete daily Finance module and FinanceSummary consumed by C2/C3.
