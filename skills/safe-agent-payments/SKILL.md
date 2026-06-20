---
name: safe-agent-payments
description: Use SAFE as the payment firewall for external x402 agent payments. Trigger when an agent needs to call SAFE over HTTP, use createSafeClient, dry-run or settle a paid resource, inspect SAFE state/audit, or understand SAFE's preflight/pay safety rules.
---

# SAFE Agent Payments

Use this skill when an external agent needs to pay for an x402 resource through SAFE.

SAFE means Spend Authorization Firewall for Agents. It is the payment boundary between an agent and a delegated Solana allowance. Agents do not sign payment transactions directly. Agents ask SAFE to decide, audit, and settle.

## Current Integration State

- SAFE exposes an external-agent HTTP API under `/api/safe/*`.
- Agents can call SAFE directly over HTTP, through `lib/sdk/createSafeClient.ts`, or through the local CLI in `bin/safe.ts`.
- `preflight` and `dryRun` are read-only. They do not write audit records and do not mutate replay state.
- A real `pay` call writes an audit record and settles only approved or redacted-approved decisions.
- Approved live payments settle on Solana devnet and return a transaction signature plus Explorer URL.
- Rejected requests produce no transaction.

## Core Rule

Never sign x402 or payment transactions from the agent.

The agent may fetch paid resources and inspect x402 challenges. SAFE is the only component that may decide whether to settle and request signing/settlement.

## Rules

- Use `safe.preflight()` for advisory checks when you already have a parsed payment requirement.
- Use `safe.pay({ resourceUrl, dryRun: true })` to test the whole resource path with no spend.
- Use `safe.pay({ resourceUrl })` for a real payment attempt.
- Treat a SAFE rejection as final unless a human explicitly overrides it.
- Continue only after `approve` or `redact_and_approve` with `settlement.settlementStatus === "settled"` for real payments.
- Record the returned `auditRecord`, `txSignature`, and `explorerUrl` in the agent trace.
- Do not retry rejected or duplicate payments in a loop.
- Do not claim production public x402 facilitator compatibility. This demo supports the local SAFE facilitator/devnet path.

## HTTP API

Base URL is usually `http://localhost:3000`.

```text
POST /api/safe/preflight
POST /api/safe/pay
GET  /api/safe/state
GET  /api/safe/audit
```

`POST /api/safe/preflight` accepts:

```ts
{
  requirement: DemoPaymentRequirement;
  agentReason?: string;
}
```

It returns:

```ts
{
  request: NormalizedPaymentRequest;
  decision: PolicyDecision;
}
```

This is advisory only. It does not settle, write audit, or remember replay.

`POST /api/safe/pay` accepts either:

```ts
{
  resourceUrl: string;
  agentReason?: string;
  dryRun?: boolean;
}
```

or:

```ts
{
  requirement: DemoPaymentRequirement;
  agentReason?: string;
  dryRun?: boolean;
}
```

It returns the request, SAFE decision, and, for non-dry real attempts, audit and settlement data:

```ts
{
  request: NormalizedPaymentRequest;
  decision: PolicyDecision;
  dryRun: boolean;
  auditRecord?: AuditRecord;
  settlement?: {
    settlementStatus: "settled" | "failed";
    txSignature?: string;
    explorerUrl?: string;
    error?: string;
  };
  explorerUrl?: string;
  resource?: {
    url: string;
    status: number;
    ok: boolean;
    body: unknown;
  };
}
```

## SDK Usage

Prefer the SDK when writing TypeScript agents in this repo.

```ts
import { createSafeClient } from "@/lib/sdk/createSafeClient";

const safe = createSafeClient({ baseUrl: "http://localhost:3000" });

const dryRun = await safe.pay({
  resourceUrl: "http://localhost:3000/api/x402/stats",
  agentReason: "Agent needs match stats for the user.",
  dryRun: true
});

if (dryRun.decision.action === "reject") {
  throw new Error(`SAFE rejected payment: ${dryRun.decision.reasonCode}`);
}

const result = await safe.pay({
  resourceUrl: "http://localhost:3000/api/x402/stats",
  agentReason: "Agent needs match stats for the user."
});

if (result.decision.action === "reject") {
  throw new Error(`SAFE rejected payment: ${result.decision.reasonCode}`);
}

if (result.settlement?.settlementStatus !== "settled") {
  throw new Error(`SAFE did not settle: ${result.settlement?.error ?? "missing settlement"}`);
}

console.log(result.auditRecord?.auditId);
console.log(result.settlement.txSignature);
console.log(result.explorerUrl);
console.log(result.resource?.body);
```

Available SDK calls:

```ts
await safe.preflight({ requirement, agentReason });
await safe.pay({ resourceUrl, agentReason, dryRun });
await safe.pay({ requirement, agentReason, dryRun });
await safe.state();
await safe.audit();
```

## CLI Usage

Use the CLI for local/manual checks.

```bash
./node_modules/.bin/tsx bin/safe.ts doctor
./node_modules/.bin/tsx bin/safe.ts state
./node_modules/.bin/tsx bin/safe.ts pay http://localhost:3000/api/x402/stats --dry-run
./node_modules/.bin/tsx bin/safe.ts pay http://localhost:3000/api/x402/stats
./node_modules/.bin/tsx bin/safe.ts agent run --dry-run
./node_modules/.bin/tsx bin/safe.ts audit
```

Set `SAFE_BASE_URL` or pass `--base-url` when the app is not on `http://localhost:3000`.

## Example Agent

The standalone example is:

```bash
./node_modules/.bin/tsx examples/basic-agent/run.ts --dry-run
./node_modules/.bin/tsx examples/basic-agent/run.ts
```

Scenarios:

```bash
./node_modules/.bin/tsx examples/basic-agent/run.ts --scenario approved --dry-run
./node_modules/.bin/tsx examples/basic-agent/run.ts --scenario blocked --dry-run
./node_modules/.bin/tsx examples/basic-agent/run.ts --scenario full --dry-run
```

The example prints the agent intent, paid resource, SAFE call, SAFE decision, tx signature when settled, and resource result.

## Demo Resources

Use these local x402 demo resources:

```text
/api/x402/stats          approved match-data resource
/api/x402/transit        approved transit resource
/api/x402/food           approved food-voucher resource
/api/x402/fake-merch     blocked merchant scenario
/api/x402/premium-feed   over per-payment cap scenario
/api/x402/metadata-leak  use with sensitive agentReason to test redaction
```

For PII redaction, call:

```ts
await safe.pay({
  resourceUrl: "http://localhost:3000/api/x402/metadata-leak",
  agentReason: "Email marcus@example.com at Hotel Central for shuttle pickup.",
  dryRun: true
});
```

Expected decision is `PII_REDACTED` with `redact_and_approve`.

## Decision Handling

Handle decisions exactly:

- `approve`: payment is allowed. For real `pay`, require settled evidence before using the resource.
- `redact_and_approve`: payment is allowed only after SAFE sanitizes metadata. Use returned request/settlement evidence.
- `reject`: stop. Do not sign, settle, fetch paid content, or retry blindly.
- `ask_human` or `update_allowance_required`: stop and ask a human or setup flow. Do not bypass SAFE.

Common reason codes:

```text
POLICY_OK
PII_REDACTED
MERCHANT_NOT_ALLOWLISTED
DUPLICATE_PAYMENT_REQUEST
DUPLICATE_RESOURCE_REQUEST
AMOUNT_OVER_PER_PAYMENT_CAP
ALLOWANCE_CAP_EXCEEDED
INTENT_SCOPE_MISMATCH
```

## Operational Checks

Before live payment:

1. Start the app: `./node_modules/.bin/next start --hostname 127.0.0.1 --port 3000` after a build, or use the existing running server.
2. Run `./node_modules/.bin/tsx bin/safe.ts doctor`.
3. Confirm readiness is acceptable for the task.
4. Run a dry-run payment first.
5. Run the real payment only if the dry-run decision is allowed.
6. Confirm `settlementStatus === "settled"` and record the Explorer URL.
7. Check `safe.audit()` or `bin/safe.ts audit` for the audit record.

## Failure Handling

- If SAFE API returns an HTTP error, report the error and do not attempt manual payment.
- If `settlementStatus` is `failed`, stop and report `settlement.error`.
- If the app returns a 402 resource challenge but SAFE cannot parse it, stop and report that the resource is not compatible with this demo SAFE parser.
- If the resource URL returns non-402 before payment, stop and report the unexpected status.
- If a duplicate decision appears, treat it as a replay guard success. Do not try to evade it.

## Repo Pointers

- API routes: `app/api/safe/*`
- Service layer: `lib/safe/safePaymentService.ts`
- SDK: `lib/sdk/createSafeClient.ts`
- CLI: `bin/safe.ts`
- Example agent: `examples/basic-agent/run.ts`
- Demo x402 routes: `app/api/x402/*`
- Audit store: `lib/store/memoryStore.ts`
- Replay guard: `lib/policy/replayGuard.ts`

## Do Not

- Do not import `runWorldCupAgentScenario()` for external-agent proof.
- Do not bypass `createSafeClient` by copying SAFE payment logic into agents.
- Do not mutate replay state during advisory checks.
- Do not write audit records for dry-runs.
- Do not expose signer secrets, private keys, or raw credentials in logs.
