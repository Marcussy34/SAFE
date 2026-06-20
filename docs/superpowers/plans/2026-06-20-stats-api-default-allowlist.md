# Stats API Default Allowlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `stats-api.demo` allowlisted by default in generated SAFE demo policies unless the prompt explicitly blocks match data or stats.

**Architecture:** The prompt policy builder stays in `lib/demo/demoRunner.ts`. It will add `match_data` as a baseline category after parsing prompt-allowed categories, then remove it only when the prompt explicitly blocks match data or stats.

**Tech Stack:** TypeScript, Vitest, SAFE demo fixtures.

---

### Task 1: Preserve Stats API Baseline

**Files:**
- Modify: `lib/demo/demoRunner.ts`
- Modify: `tests/demo/demoRunner.test.ts`
- Modify: `skills/safe-agent-payments/SKILL.md`

- [x] **Step 1: Update focused expectations first**

Change the prompt-policy tests so single-category prompts still include the stats baseline:

```ts
expect(run.generatedPolicy.allowedCategories).toEqual(["match_data", "food_voucher"]);
expect(run.generatedPolicy.allowedDomains).toEqual(["stats-api.demo", "food-voucher.demo"]);
```

Change the merch prompt expectation so `match_data` remains allowed by default:

```ts
expect(run.generatedPolicy.allowedCategories).toEqual(["match_data", "merch", "gambling"]);
expect(run.generatedPolicy.allowedDomains).toEqual(["stats-api.demo", "official-merch.demo"]);
```

- [x] **Step 2: Implement the minimal parser change**

In `categoriesFromPrompt()`, ensure `match_data` is always present in the candidate categories unless the prompt explicitly blocks the match-data rule:

```ts
const defaultAllowed = new Set<MerchantCategory>(baseline);

if (!explicitlyBlocked.has("match_data")) {
  defaultAllowed.add("match_data");
}

return Array.from(defaultAllowed).filter((category) => !explicitlyBlocked.has(category));
```

- [x] **Step 3: Update SAFE docs**

Update `skills/safe-agent-payments/SKILL.md` to state that generated demo policies keep `stats-api.demo` allowlisted by default unless match data or stats are explicitly blocked.

- [x] **Step 4: Verify**

Run:

```bash
pnpm test:run tests/demo/demoRunner.test.ts tests/fixtures/demoPolicy.test.ts
```

Expected: all listed tests pass.

- [x] **Step 5: No commit**

Do not commit. The repo instructions say not to commit unless the user explicitly asks.

## Self-Review

- Spec coverage: The plan covers the approved behavior, tests, and feature-specific docs.
- Placeholder scan: No placeholders remain.
- Type consistency: Uses existing `MerchantCategory`, `categoriesFromPrompt()`, and generated policy fields.
