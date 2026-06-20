---
name: safe-agent-payments
description: Use SAFE as the payment firewall for x402 agent payments
---

# SAFE Agent Payments

Use this skill when an agent needs to satisfy an x402 paid resource through SAFE.

## Rules

- Never sign x402 or payment transactions directly from the agent.
- Call `safe.preflight()` for advisory checks.
- Call `safe.pay()` for a real payment attempt.
- Treat a SAFE rejection as final unless a human explicitly overrides it.
- Use the returned audit record and transaction receipt in the agent trace.
- Record the Explorer URL when SAFE returns one.

## Flow

1. Fetch the paid resource normally.
2. If the resource returns an x402 challenge, send either the `resourceUrl` or parsed `requirement` to SAFE.
3. For dry checks, call `safe.pay({ resourceUrl, dryRun: true })` or `safe.preflight({ requirement })`.
4. For settlement, call `safe.pay({ resourceUrl })`.
5. Continue only when SAFE returns `approve` or `redact_and_approve` with settled payment evidence.

## TypeScript Example

```ts
import { createSafeClient } from "@/lib/sdk/createSafeClient";

const safe = createSafeClient({ baseUrl: "http://localhost:3000" });
const result = await safe.pay({
  resourceUrl: "http://localhost:3000/api/x402/stats",
  agentReason: "Agent needs match stats for the user."
});

if (result.decision.action === "reject") {
  throw new Error(`SAFE rejected payment: ${result.decision.reasonCode}`);
}

console.log(result.auditRecord?.auditId);
console.log(result.settlement?.txSignature);
```
