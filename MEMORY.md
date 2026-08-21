# Memory

Update this after major decisions, completed phases, or bugs that future agents need to know about. Keep it short.

## Current State

- Current task: Step 4 workspace setup from the supplied Niuva PRD and Tech Design
- Current phase: Foundation / implementation planning
- Next step: Propose the smallest Phase 1 plan, resolve bootstrap location, and wait for approval before creating application code
- Blocked by: No blocker for planning; production-impacting TBDs are listed below

## Decisions

- 2026-08-21 — `docs/PRD-Niuva-MVP.md` is product scope authority and `docs/TechDesign-Niuva-MVP.md` is technical authority for this fresh workspace.
- 2026-08-21 — User guidance level is C (somewhere in between), overriding the older Level A metadata for explanation style only.
- 2026-08-21 — Use a Next.js/TypeScript modular monolith with managed services; no product AI, microservices, automatic slicer, or customer account in MVP.
- 2026-08-21 — UI work must stop at a source-based UI Foundation / Visual Proof checkpoint before broad screen propagation.
- 2026-08-21 — Agent files were instantiated from vibe-coding-prompt-template commit `254bae5682d11fb27012f407d619bf55828ae639`.

## AI / Tooling Decisions

- 2026-08-21 — Primary development tool is Codex. `AGENTS.md` and `agent_docs/` are the source of truth; no model is pinned in project config.
- 2026-08-21 — No optional project skills or subagents were generated because they were not selected.
- 2026-08-21 — AI is development assistance only; generated code still requires tests, browser checks, and human review.

## Known Issues

- Application code and `package.json` do not exist yet, so pnpm verification commands are not runnable.
- Tech Design bootstrap command creates a nested `niuva/` directory, while this workspace is already the intended project root; resolve this before scaffolding.
- Owner confirmation required: pricing for 1–49 g and communal ABS.
- Before production: decide maximum upload size, file retention, portfolio client/logo permissions, initial inventory, and custom quote SLA.
- Midtrans/Biteship/R2/Clerk/Vercel production onboarding, credentials, DNS, and deployment require explicit authorization and live provider verification.
- Exact brand colors and typography remain pending UI Foundation work based on actual Niuva identity assets.

## Completed

- [x] Step 4 agent-documentation scaffold
- [ ] Application scaffold
- [ ] UI Foundation / Visual Proof approval
- [ ] Core data model
- [ ] Auth
- [ ] Core MVP flow
- [ ] Launch checks
