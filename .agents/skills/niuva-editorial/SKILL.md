---
name: niuva-editorial
description: Review or edit human-facing Niuva copy so it is direct, specific, and recognizably Niuva without inventing claims. Use for public pages, project briefs, product and portfolio descriptions, emails, and UX copy; do not use for code, schemas, or authoritative commercial/legal values.
metadata:
  short-description: Edit Niuva copy without generic AI language or unsupported claims
---

# Niuva Editorial

Use this as an optional editorial pass for Niuva writing. It adapts the
principles of [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop)
to Niuva's evidence-led brand and approval boundaries. It is not an AI
authorship detector, a copy linter, or a replacement for Owner review.

## Scope

Use it for:

- homepage, company-profile, service, project-brief, product, and portfolio copy;
- public CTA labels, helper text, empty/error/success messages, and email drafts;
- drafts intended for B2B, retail/B2C, custom-print, or Owner/Admin audiences.

Do not use it to rewrite:

- source code, identifiers, database fields, API contracts, or test assertions;
- prices, stock, shipping, payment, order statuses, retention periods, or legal text;
- quoted customer content, approved names, technical terms, or factual source data;
- private customer files, credentials, secrets, or production logs.

## Niuva truth and approval rules

Before editing, identify the audience, the action the reader should take, and
the source of every material claim. Use `PRODUCT.md`, the PRD, approved
project requirements, and `docs/source/` as evidence. Preserve unresolved
facts as `TBD`, `OPEN`, or an explicit review item; never resolve them silently.

Never invent or strengthen a claim about:

- client permission, testimonials, outcomes, metrics, inventory, pricing, or
  production readiness;
- Niuva capabilities, provider activation, payment, shipping, or delivery
  promises that are not confirmed;
- a project, product, material, workshop process, or image that is not supported
  by the available evidence.

If an edit changes factual meaning, legal meaning, commercial meaning, or an
Owner decision, stop and flag the change instead of silently rewriting it.

## Editing mode

1. Read the whole draft and identify its core point, audience, CTA, and voice.
2. Make the minimum effective edit: remove filler, untangle sentences, use
   active verbs, and replace abstractions with available facts or mechanisms.
3. Preserve Indonesian meaning, useful technical vocabulary, uncertainty,
   personality, and intentional structure.
4. Look for generic patterns such as throat-clearing openers, fake insight,
   unsupported importance claims, vague authority, synonym cycling, decorative
   fragments, robotic symmetry, and empty recap endings.
5. Do not force every sentence into the same rhythm. A contrast such as
   `bukan hanya ...` may be valid when it clarifies Niuva's positioning.
6. Return the full edited copy, followed by a short `Perubahan` section and
   any `Perlu review Owner` items.

Adapt tone to the operating context:

- B2B: precise, credible, outcome- and process-led;
- retail: concrete, scannable, and low-friction;
- custom print: clear about operator review, quotation, payment, and final
  package measurement; do not imply instant final pricing;
- Owner/Admin: actionable and operational, not promotional.

## Detection mode

When asked to detect or audit, do not rewrite the draft or guess whether AI
wrote it. List each observed pattern, quote the relevant short excerpt, and
give a concise suggested fix. Separate language observations from factual or
Owner-approval concerns.

## Final checklist

- Is the core point clear without generic setup?
- Are claims concrete, traceable, and no stronger than the evidence?
- Is the writer's meaning, voice, and useful uncertainty preserved?
- Are Niuva terms, audience, CTA, and operational expectations correct?
- Did the edit avoid inventing client claims, metrics, inventory, price, or
  provider readiness?
- Are unresolved decisions explicitly flagged rather than filled in?
- Is the result suitable for its surface: public, checkout, email, or admin?
