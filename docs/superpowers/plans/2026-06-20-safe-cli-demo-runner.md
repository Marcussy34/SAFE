# SAFE CLI Demo Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CLI-first live-devnet demo command backed by a server-side demo runner whose transcript is visible in the dashboard.

**Architecture:** Introduce a focused `lib/demo/demoRunner.ts` module that converts a natural-language prompt into the existing match-day policy snapshot, executes the scripted x402 flow through SAFE, and stores a dashboard-readable transcript in `memoryStore`. Add `/api/safe/demo/run` and `/api/safe/demo/state` as thin route wrappers, then add SDK, CLI, and dashboard consumers. Live devnet is the default for `safe demo`; explicit `--dry-run` rehearses without settlement.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript, Vitest, existing SAFE SDK/CLI, existing Solana/x402 SAFE service modules, React dashboard with shadcn/ui and lucide-react.

---

## File Map

- Create: `lib/demo/demoRunner.ts` — prompt parsing, policy snapshot, live readiness guard, x402 step execution, transcript persistence.
- Modify: `lib/store/memoryStore.ts` — store/list/clear demo run transcripts.
- Create: `app/api/safe/demo/run/route.ts` — POST runner endpoint.
- Create: `app/api/safe/demo/state/route.ts` — GET transcript endpoint.
- Modify: `lib/sdk/createSafeClient.ts` — add `demoRun()` and `demoState()`.
- Modify: `bin/safe.ts` — add `safe demo --prompt "..." [--dry-run]`.
- Create: `components/dashboard/DemoTranscriptPanel.tsx` — poll and render CLI/API demo transcript.
- Modify: `components/dashboard/SafeDashboard.tsx` — place the transcript near the live demo section.
- Test: `tests/demo/demoRunner.test.ts` — runner behavior, dry-run behavior, live guard behavior, transcript storage.
- Test: `tests/sdk/createSafeClient.test.ts` — SDK route calls for demo run/state.
- Update docs: `architecture.md` and `skills/safe-agent-payments/SKILL.md` CLI/API sections.

## Tasks

### Task 1: Add Demo Runner Tests

- [ ] Create `tests/demo/demoRunner.test.ts`.
- [ ] Test that `runSafeDemo({ dryRun: true, requireLive: false })` records the prompt, generated policy, seven expected step outcomes, zero settled transactions, and a summary.
- [ ] Test that live mode is rejected before execution when `requireLive: true` but `SAFE_DEMO_MODE` is not `false`.
- [ ] Test that `memoryStore.listDemoRuns()` returns newest-first clones and preserves the latest transcript for the dashboard.
- [ ] Run `pnpm test:run tests/demo/demoRunner.test.ts` and verify the expected missing-module failure.

### Task 2: Implement Demo Runner and Store

- [ ] Add demo transcript types and store methods to `memoryStore`.
- [ ] Implement `lib/demo/demoRunner.ts` with deterministic prompt parsing for the match-day demo prompt.
- [ ] Use existing `safePay()` for each x402 request so audit records and settlement behavior stay centralized.
- [ ] Add live guard checks before spending starts when `requireLive` is true.
- [ ] Run `pnpm test:run tests/demo/demoRunner.test.ts` and make it pass.

### Task 3: Add API Routes and SDK Support

- [ ] Add `POST /api/safe/demo/run`.
- [ ] Add `GET /api/safe/demo/state`.
- [ ] Extend `createSafeClient()` with `demoRun()` and `demoState()`.
- [ ] Add SDK tests for request path, body, and response parsing.
- [ ] Run the SDK and demo tests.

### Task 4: Add CLI Command

- [ ] Add `safe demo --prompt "..." [--dry-run] [--base-url ...]`.
- [ ] Default to live devnet by sending `dryRun: false` and `requireLive: true`.
- [ ] Print prompt, generated policy, allowance, every x402 step, SAFE decision, settlement/explorer data, and final summary.
- [ ] Keep `--dry-run` explicit and labeled as rehearsal.

### Task 5: Add Dashboard Transcript Panel

- [ ] Create `DemoTranscriptPanel` that polls `/api/safe/demo/state`.
- [ ] Render prompt, generated policy, summary counts/spend, each step outcome, and tx links.
- [ ] Insert it into `SafeDashboard` under the live demo section.
- [ ] Keep styling aligned with existing dashboard cards.

### Task 6: Docs and Verification

- [ ] Update `architecture.md` with the CLI-first demo runner route and dashboard transcript state.
- [ ] Update `skills/safe-agent-payments/SKILL.md` with `safe demo` usage and live-default warning.
- [ ] Run focused tests.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm lint`.
- [ ] Do not commit unless explicitly requested.
