# Product Requirements

Use this as the short build-facing version of the PRD. Do not paste the entire PRD unless the project is complex.

## Users

- Primary users: B2B product/engineering/design/procurement teams; retail/B2C customers; Owner/Admin Niuva.
- Main problem: Niuva needs one understandable operational experience across service inquiries, custom manufacturing, and ready-made commerce.
- Product position: Product-development partner with manufacturing capability.
- Core promise: `Idea → Design → Prototype → Finished Product`.

## Primary journeys

- B2B: `Landing → Service/Case Study → Project Brief → Admin Review → Consultation/Quotation`.
- Ready-made: `Shop → Product/Variant → Cart → Guest Checkout → Shipping → Payment → Order Status`.
- Custom print: `Private Upload → Operator Review/Slice → Pricing v1 Quote → Approval → Payment → Production/QC → Shipping Payment → Completion`.

## Must-Have Features

- **Company Profile, Services & Case Studies** — Explain Niuva beyond 3D printing, expose four services and selected projects, and route users to B2B, Custom Print, or Shop on desktop/mobile.
- **B2B Project Brief** — Server-validated required fields, private reference attachment, reference ID, success state, admin visibility, and WhatsApp continuation.
- **Ready-Made Product Catalog** — Categories, product variants, prices, stock, media, out-of-stock protection, and basic admin CRUD.
- **Cart & Guest Checkout** — Add/update/remove items, authoritative totals, contact/address capture, order creation, and duplicate checkout/payment protection without mandatory account.
- **Online Payment** — Midtrans Snap tied to the correct order; verified idempotent server webhook is authoritative; sandbox flow passes.
- **Ready-Made Shipping** — Biteship rates from server-owned product/address data; selected rate and price are stored as an order snapshot; provider failure cannot corrupt the order.
- **Private Custom 3D File Upload** — STL/3MF/OBJ plus manual-review STEP/STP; private bucket, random key, validation, expiring access, tenant isolation, and unit/scale confirmation.
- **Custom Print Review & Pricing v1** — Operator enters verified material, weight, duration, configuration, and notes; Decimal calculation stores full breakdown, snapshots, rule version, and final HALF_UP total.
- **Order Status** — Secure token/reference access, human-readable retail/custom states, audit history, no internal notes, and rejected invalid transitions.
- **Thin Admin Dashboard** — Authenticated Action Queue plus orders, inquiries, custom reviews, products/stock, portfolio, and pricing operations with minimum audit information.
- **Transactional Email** — Order received, payment confirmed, quote ready, shipped, and relevant admin notifications; delivery failure cannot corrupt transactional state.

## Nice-To-Have Features

- Basic 3D model preview.
- Simple product category filtering.
- Promo/announcement CRUD.
- Basic inventory adjustment history.
- Courier booking from admin.
- Richer order email templates.
- Verified order-status search.
- Basic analytics dashboard.

These may not delay P0.

## Out Of Scope

- Customer account.
- Automatic browser/server slicing.
- Instant final 3D pricing from file geometry.
- Full CMS or page builder.
- Full inventory ledger, procurement, or warehouse workflow.
- Financial dashboard or accounting.
- Membership automation.
- Rental reservation.
- Production scheduler or printer queue.
- Automated custom shipping before final package measurement.
- Customer-facing AI.
- Microservices, Kubernetes, event bus, multi-region, or dedicated search infrastructure.

## Success Signals

- Every P0 flow passes the pre-launch QA checklist.
- At least three end-to-end test transactions succeed.
- B2B submission appears in admin and can be followed up.
- Custom print reaches quote/payment and the full production/shipping state flow.
- Owner completes all core admin tasks without a critical usability blocker.
- Zero critical payment/shipping blockers at production release.
- Public key pages target under three seconds under reasonable mobile testing.

## UI/UX requirements

- Tone: Professional, Innovative, Precise, Creative, Trustworthy.
- Direction: Precision Industrial + Creative Accent using real Niuva project, product, workshop, process, and material evidence.
- Use the existing blue/white identity as input, but do not invent permanent colors or typography before UI Foundation approval.
- Avoid generic SaaS composition, indiscriminate cards, gradients, glassmorphism, glowing borders, decorative blobs, and oversized pills.
- Public pages may be expressive; checkout/payment stay predictable; admin stays operational.
- Target WCAG 2.1 AA basics, responsive desktop/mobile behavior, visible focus, descriptive errors, and reduced motion.

## Timeline and constraints

- Target: 1–4 weeks with one AI-assisted developer.
- Budget: approximately Rp1.000.000 first month and at most Rp500.000/month recurring, subject to live provider verification.
- Reliability outranks visual quality; visual quality outranks speculative scalability.
- Never cut public positioning, project brief, catalog core, custom request/operator quote, payment, basic shipping, thin admin, security/private files, or order status.

## Decisions required before production

- Pricing policy for 1–49 g and communal ABS.
- Maximum upload size and final customer-file retention.
- Permission to publish client names/logos and factual case-study outcomes.
- Initial launch products, variants, images, and stock.
- Custom quotation service-level promise.
- Provider onboarding/readiness and live pricing for Midtrans, Biteship, R2, Clerk, Neon, Resend, Sentry, and Vercel.
