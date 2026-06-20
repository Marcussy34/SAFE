# SAFE Pitch

SAFE. The Spend Authorization Firewall for Agents.

SAFE is a buyer-side payment firewall for AI agents. It lets agents transact autonomously without giving them blind wallet access.

## One-Line Pitch

SAFE is a spend firewall for AI agents. It checks every autonomous payment against user intent, policy, merchant trust, replay risk, metadata safety, and allowance state before funds move.

## Short Pitch

AI agents can now pay for APIs, data, tools, compute, and services. The problem is not just "can the agent pay?" The problem is "should this specific agent be allowed to make this specific payment, to this specific merchant, for this specific reason, right now?"

Solana allowances cap how much an agent can spend. x402 lets agents pay for web resources over HTTP. SAFE adds the missing buyer-side control layer. It decides whether each payment is safe before the delegated signer can settle it.

## Problem

Autonomous agents are moving from reading and recommending to acting and transacting.

Today, the safety layer is weak.

A spending cap only answers:

```text
How much can this agent spend?
```

It does not answer:

```text
Should this agent pay this merchant, for this reason, with this metadata, right now?
```

Prompt rules are not enough. Agents can be manipulated, retry payments, leak private metadata, pay fake merchants, or make technically valid payments that violate the user's intent.

The core failure modes are:

- Spend loops: the agent retries the same paid API until budget is gone.
- Fake merchants: the agent pays a malicious endpoint pretending to be trusted.
- Category drift: the user authorized match data, but the agent buys merch or gambling content.
- Overpayment: a resource asks for more than the user intended.
- Metadata leakage: the payment reason includes email, hotel, phone, wallet, or private context.
- Recipient mismatch: the merchant label looks right, but funds go to the wrong address.
- Valid but unsafe payments: the transaction is cryptographically valid, but semantically wrong.

## Solution

SAFE sits between the agent and the payment rail.

Before a payment is signed or settled, SAFE checks:

- merchant trust
- amount limits
- token and network
- recipient correctness
- user intent
- category rules
- duplicate and replay risk
- metadata and PII leakage
- allowance validity
- settlement outcome

If the payment is safe, SAFE allows settlement. If not, SAFE blocks it. If metadata is sensitive, SAFE can redact before approval.

Simple framing:

```text
Solana allowance = hard spending boundary.
x402 = paid API payment challenge.
SAFE = policy firewall before signing.
Facilitator = verifies and settles the transaction.
Audit = record of what happened and why.
```

## Why Now

This is becoming urgent because several shifts are happening at once:

- AI agents are becoming action-taking software, not just chat interfaces.
- x402 makes paid APIs and content accessible through HTTP `402 Payment Required`.
- Solana allowances make delegated stablecoin spending possible.
- Agentic commerce standards like AP2, ACP, MPP, and TAP are emerging.
- Developers are starting to give agents real payment authority.

That creates a new risk: autonomous payments can happen faster than humans can review them.

The missing layer is not another wallet or another payment rail. The missing layer is pre-payment authorization for autonomous agents.

## Why Solana

SAFE uses Solana because the demo needs fast, low-cost, delegated stablecoin settlement.

Solana allowances provide the hard onchain boundary:

```text
The agent cannot spend beyond the delegated allowance.
```

SAFE adds the offchain semantic boundary:

```text
The agent can only spend on the right thing, with the right merchant, for the right reason.
```

If you remove Solana allowances, SAFE loses the onchain delegated spend primitive. If you remove SAFE, the allowance only controls amount, not meaning.

## Why x402

x402 turns paid APIs and paid resources into normal HTTP flows:

1. Agent requests a resource.
2. Server returns `402 Payment Required`.
3. Agent prepares payment.
4. Server or facilitator verifies and settles.
5. Resource is returned.

SAFE fits naturally in this flow because the agent can send the x402 challenge to SAFE before payment. SAFE can then decide whether the agent should pay at all.

## Firewall Analogy

Traditional firewalls do not only ask whether traffic is technically valid. They inspect traffic against local rules, known threat intelligence, reputation databases, and risk signals.

SAFE applies the same pattern to agent payments:

```text
Network firewall = should this traffic pass?
SAFE payment firewall = should this agent payment pass?
```

The analogy is useful, but it should be stated precisely. SAFE is not a network firewall. It is a payment firewall. It checks merchant trust, recipient correctness, amount, category, metadata, replay risk, allowance state, and user intent before money moves.

## How SAFE Works

1. User creates a capped Solana allowance.
2. Agent tries to fetch a paid x402 resource.
3. Resource returns a `402 Payment Required` challenge.
4. Agent sends the resource URL or x402 payment requirement to SAFE.
5. SAFE normalizes the challenge into a structured payment request.
6. SAFE checks policy, merchant registry, replay state, PII, intent, recipient, and allowance state.
7. SAFE returns `approve`, `reject`, or `redact_and_approve`.
8. If rejected, no transaction is created.
9. If approved, SAFE builds and verifies the allowance-backed payment.
10. SAFE settles on Solana devnet through the local facilitator.
11. SAFE returns the tx signature, Explorer URL, paid resource, and audit record.

## Known, Unsafe, And Unknown Payments

SAFE should have three paths:

```text
Known safe payment -> approve within policy.
Known unsafe payment -> reject.
Unknown payment -> fail closed today, verify or ask human in future.
```

That is the core safety model. Unknown should not mean "let the agent decide and pay." Unknown means SAFE needs more evidence before any payment can be signed.

For the MVP, unknown merchants are rejected. In the future, unknown payments can be routed to an agentic verifier.

## Agentic Verification Mode

Agentic verification is the next major product direction.

It works like a bounded auto mode for payment review:

```text
Agent wants to pay an unknown merchant
        ↓
SAFE checks local policy and trust database
        ↓
No trusted record found
        ↓
Verifier agent investigates
        ↓
Verifier produces evidence, not a transaction
        ↓
SAFE evaluates evidence against policy
        ↓
approve / reject / ask human
```

The important boundary:

```text
The verifier agent can gather evidence.
The verifier agent cannot spend.
SAFE remains the decision and signing gate.
```

Evidence can include:

- domain ownership proof
- merchant documentation
- `/.well-known/safe-merchant.json`
- DNS or signed manifest verification
- recipient wallet ownership proof
- token mint and network match
- price consistency
- prior audit history
- shared trust database records
- public reputation or KYB signals

Example auto-mode policy:

- Known trusted merchant under cap: approve.
- Known bad merchant: reject.
- Unknown merchant under $1 with strong evidence: approve or approve once.
- Unknown merchant over threshold: ask human.
- Recipient mismatch: reject.
- No reliable evidence: reject.
- Conflicting evidence: ask human.

This makes SAFE more useful than a static allowlist while keeping the agent from bypassing the payment firewall.

## How SAFE Verifies Reliability

SAFE is not asking an LLM if a payment "looks safe."

SAFE uses deterministic checks against structured data.

### Payment Normalization

SAFE parses the x402 challenge into a `NormalizedPaymentRequest`:

- merchant domain
- amount
- token
- network
- recipient
- resource URL
- description
- agent reason
- task intent
- allowance settlement fields

Every policy check uses this structured request.

### Merchant Verification

SAFE checks a trusted merchant registry.

The registry stores:

- merchant domain
- display name
- category
- trusted recipient address
- trusted recipient token account
- token mint
- max expected price
- trust status

If the merchant is unknown, blocked, or mismatched, SAFE rejects.

Future versions can replace the static registry with a verified merchant registry. That registry can be populated by merchant onboarding, human review, signed evidence, agentic verification, and shared audit history.

### Recipient Verification

SAFE checks that the x402 `payTo` address matches the trusted merchant record.

This blocks a common attack:

```text
"I am the stats API, but pay this scam wallet."
```

If the recipient does not match, SAFE rejects.

### Amount And Token Verification

SAFE checks:

- x402 amount
- atomic token amount
- token mint
- network
- per-payment cap
- remaining allowance

If the amount is too high or the token is wrong, SAFE rejects.

### Intent And Category Verification

The user intent defines what the agent is allowed to do.

For the demo:

```text
User intent: Plan my World Cup match day.
Allowed categories: match data, transit, food voucher.
Blocked categories: merch, gambling, unknown.
```

Even a cheap payment can be blocked if it is outside the task.

### Replay Verification

SAFE fingerprints payment requests.

It detects:

- exact duplicate payment requests
- duplicate resource requests
- retry loops

Advisory preflight and dry-run are read-only. Real payment calls mutate replay state.

### Metadata Safety

SAFE scans the resource URL, description, reason, and memo for sensitive data.

Examples:

- email
- phone
- hotel
- wallet address
- government ID
- credit card-like data

If policy allows redaction, SAFE returns `redact_and_approve`. If policy requires blocking, SAFE rejects.

### Settlement Verification

After approval, SAFE builds an allowance-backed x402 payment.

The facilitator verifies the payment outcome:

- correct network
- correct token
- correct amount
- correct recipient
- correct transfer outcome

In live mode, the transaction is submitted to Solana devnet and SAFE returns a confirmed transaction signature.

## Shared Trust Database

SAFE becomes stronger when verified payment knowledge can be reused.

Every payment attempt can create useful signals:

- approved merchant and recipient pairs
- blocked fake merchants
- suspicious wallets
- over-limit pricing attempts
- duplicate and replay patterns
- metadata leakage patterns
- policy decisions and reason codes
- settlement receipts
- human review outcomes

The long-term goal is a shared trust database for agent payments. The database should not blindly accept every report. It should store verified records with provenance, evidence, policy version, timestamps, and confidence.

Good shared records might say:

```text
Merchant domain: stats-api.example
Verified recipient: token account derived from merchant wallet + USDC mint
Allowed category: match_data
Observed safe price range: $0.01-$0.05
Verification source: signed merchant manifest + audit history
Last reviewed: 2026-06-19
```

Bad shared records might say:

```text
Domain impersonates trusted merchant.
Recipient mismatch observed.
Multiple agents blocked the same wallet.
Human review confirmed scam pattern.
```

This is how SAFE can improve over time:

```text
More usage -> more logged cases -> more reviewed evidence -> better trust data -> safer automatic decisions.
```

The shared database could eventually be decentralized, but that should be framed as a roadmap direction, not an MVP claim.

Decentralization would need solutions for:

- spam reports
- sybil attacks
- false accusations
- privacy-preserving audit sharing
- dispute resolution
- evidence signing
- registry governance
- reputation weighting

Precise phrasing:

> SAFE can start as a local payment firewall, then grow into a shared verification layer. In the long run, parts of that trust layer could be decentralized.

## What Works Today

The current MVP supports:

- Local Next.js SAFE app.
- Dashboard demo.
- External HTTP API under `/api/safe/*`.
- Thin TypeScript SDK wrapper.
- Local CLI.
- Example external agent.
- Dry-run without spend.
- Advisory preflight with no replay or audit mutation.
- Live Solana devnet settlement.
- x402-shaped paid API routes.
- Audit records for real payment attempts.
- Duplicate detection.
- Blocked merchant scenario.
- Over-limit scenario.
- PII redaction scenario.
- Explorer URLs for approved live payments.

## Demo Script

### Setup

Run SAFE locally:

```bash
./node_modules/.bin/next build
./node_modules/.bin/next start --hostname 127.0.0.1 --port 3000
```

Check readiness:

```bash
./node_modules/.bin/tsx bin/safe.ts doctor
```

### Demo 1: Approved Payment

```bash
./node_modules/.bin/tsx bin/safe.ts pay http://localhost:3000/api/x402/stats --dry-run
./node_modules/.bin/tsx bin/safe.ts pay http://localhost:3000/api/x402/stats
```

Show:

- SAFE decision: `POLICY_OK`
- settlement status: `settled`
- transaction signature
- Explorer URL
- paid resource response
- audit record

### Demo 2: Blocked Merchant

```bash
./node_modules/.bin/tsx bin/safe.ts pay http://localhost:3000/api/x402/fake-merch --dry-run
```

Show:

- SAFE decision: `MERCHANT_NOT_ALLOWLISTED`
- no transaction
- no spend

### Demo 3: Over-Limit Payment

```bash
./node_modules/.bin/tsx bin/safe.ts pay http://localhost:3000/api/x402/premium-feed --dry-run
```

Show:

- SAFE decision: `AMOUNT_OVER_PER_PAYMENT_CAP`
- no transaction

### Demo 4: PII Redaction

Use the example agent full scenario:

```bash
./node_modules/.bin/tsx examples/basic-agent/run.ts --scenario full --dry-run
```

Show:

- sensitive metadata gets detected
- SAFE returns `PII_REDACTED`
- SAFE can approve only after sanitization

### Demo 5: Audit

```bash
./node_modules/.bin/tsx bin/safe.ts audit
```

Show:

- decision
- reason code
- merchant
- amount
- settlement status
- transaction signature when settled

## Competitors And Alternatives

### Wallet Spending Caps

They limit how much an agent can spend.

They do not verify merchant, intent, category, duplicate risk, recipient correctness, or metadata safety.

SAFE complements spending caps by checking the meaning of each spend.

### Prompt Rules

Prompt rules are easy to bypass or misinterpret.

SAFE uses deterministic policy checks, not agent self-reporting.

### x402 Facilitators

x402 facilitators verify whether a payment is technically valid.

They do not decide whether the buyer's agent should make that payment under the user's policy.

SAFE is the buyer-side firewall before facilitator settlement.

### AP2, ACP, MPP, TAP

These are emerging standards for agent commerce, mandates, machine payments, and trusted agents.

SAFE is complementary. It can enforce local user policy before using these payment or authorization rails.

### Human Approval

Human approval is safe but too slow for high-frequency micro-payments.

SAFE gives users deterministic guardrails without forcing manual approval for every small API call.

## MVP Boundaries

Today's MVP works inside a controlled trust boundary:

- known demo merchants
- known policy
- known x402 routes
- local SAFE facilitator
- Solana devnet
- local/private SDK and CLI

This is the right first step. SAFE should fail closed when it does not know enough.

Unknown merchant should not mean allow. Unknown merchant should mean reject or ask human.

## Limitations

SAFE is not bulletproof today.

Current limitations:

- Merchant registry is local and static.
- Unknown merchants are blocked instead of automatically verified.
- Agentic verification mode is a product direction, not implemented in today's MVP.
- Shared trust database is not implemented yet.
- Decentralized registry or reputation is not implemented yet.
- Replay guard is in-memory.
- PII scanner is basic.
- Policy is app-local.
- Audit logs are not tamper-proof yet.
- Key custody is local env-based.
- Public x402 facilitator compatibility is limited for allowance-backed smart-wallet style flows.
- Devnet only.
- Resource quality after payment is not guaranteed.

## Future Improvements

The path to production-grade SAFE is replacing local trust with verifiable trust.

### Verified Merchant Registry

Merchants should prove:

- domain ownership
- payment address ownership
- category
- supported tokens
- resource paths
- expected prices

Possible methods:

```text
/.well-known/safe-merchant.json
DNS verification
signed merchant manifests
onchain merchant registry
third-party KYB or reputation provider
```

### Agentic Verifier

Unknown payments should be routed to a verifier agent only inside strict SAFE limits.

The verifier should:

- fetch merchant docs and manifests
- verify domain ownership
- verify recipient ownership
- compare token, network, amount, and resource path
- search prior SAFE audit history
- generate a structured evidence bundle
- recommend approve, reject, or ask human

The verifier should not:

- sign transactions
- submit payments
- override policy
- approve high-risk payments alone
- treat unverifiable claims as trusted

SAFE should make the final decision using deterministic policy over the evidence bundle.

### Signed Payment Challenges

Merchants should sign payment challenges:

```text
resourceUrl + amount + token + payTo + expiry + nonce
```

That lets SAFE verify the payment request was not modified by the agent, proxy, or attacker.

### Shared Trust Layer

SAFE can start local, then grow into a shared verification network.

Every approved, blocked, and reviewed payment can improve:

- verified merchant records
- known bad actors
- risky payment patterns
- policy templates
- duplicate and replay signals
- safe payment templates

This should not be raw crowd-sourcing. New trust entries need verification. Unknown should still fail closed or require human approval.

Pitch phrasing:

> For today's MVP, SAFE works inside a controlled trust boundary. As more agents use SAFE, more payment attempts, blocked cases, merchant records, and edge cases can be logged, reviewed, and verified. Over time, that becomes a shared trust layer for autonomous agent payments.

Future decentralized phrasing:

> The shared trust layer can eventually become decentralized, but only once SAFE has signed evidence, privacy controls, anti-spam protections, and a clear dispute process.

### Durable Replay Protection

Move replay state to:

- Postgres
- Redis
- durable idempotency keys
- per-resource locks
- expiration windows

This prevents duplicate spend across restarts and concurrent agents.

### Tamper-Proof Audit

Future audit logs should be append-only:

- hash-chain audit records
- sign audit batches
- store policy version per decision
- export receipts
- optionally anchor audit hashes onchain

### Better Key Security

Production SAFE should use:

- KMS
- HSM
- TEE
- MPC wallet
- scoped session keys
- hardware wallet approval for high-risk actions

### Stronger Policy Engine

Policy can evolve into:

- signed policy documents
- versioned policy releases
- admin approval workflows
- OPA, Rego, or Cedar-style policy definitions
- simulation tests
- property-based tests

## Business Model Ideas

Possible models:

- Developer SDK and hosted SAFE gateway.
- Usage-based fee on verified payment decisions.
- Enterprise policy and audit dashboard.
- Merchant verification network.
- Premium risk intelligence for agent payments.
- Self-hosted open-source core plus managed cloud.

## Target Users

Initial users:

- developers building payment-capable agents
- AI agent platforms
- x402 API sellers
- wallet teams
- Solana payment apps
- enterprises experimenting with autonomous agents

## Strongest Positioning

Do not pitch SAFE as a wallet.

Do not pitch SAFE as a new payment rail.

Pitch SAFE as the missing buyer-side authorization layer for autonomous payments.

Best framing:

```text
A wallet cap protects the amount.
SAFE protects the meaning of the spend.
```

## Q&A

### What is SAFE?

SAFE is a Spend Authorization Firewall for Agents. It checks whether an AI agent should be allowed to make a payment before the payment is signed or settled.

### What problem does it solve?

Agents can now pay autonomously, but users do not have a reliable way to control what those agents pay for. SAFE adds policy, intent, merchant, replay, metadata, and audit controls before funds move.

### Why is this needed if wallets already have spending caps?

A spending cap only limits the amount. It does not verify the merchant, category, reason, metadata, recipient, or duplicate risk. SAFE checks the meaning of each payment.

### How does SAFE work?

The agent sends the x402 payment challenge to SAFE. SAFE normalizes it into a structured request, evaluates policy, verifies merchant and recipient data, checks replay and metadata, then either rejects, redacts, or settles.

### Does SAFE use an LLM to decide?

No. The MVP uses deterministic TypeScript policy checks over structured payment data.

### What happens if SAFE does not know the merchant?

SAFE fails closed. Unknown merchants are rejected or should require human approval in future versions.

### Could SAFE verify unknown merchants automatically?

Yes, in a future agentic verification mode. SAFE can hand an unknown payment to a verifier agent that gathers evidence about the merchant, domain, recipient wallet, docs, price, and history. The verifier produces evidence. SAFE still makes the final decision.

### Is this like Claude auto mode?

Conceptually, yes. SAFE can allow bounded autonomous decisions inside user-defined permissions. The difference is that the boundary is money. The verifier agent can investigate, but it cannot bypass SAFE or sign payments directly.

### Can the verifier agent decide to spend?

No. The verifier agent can recommend a decision and provide evidence. SAFE remains the final policy gate. If the payment is outside policy, risky, unverifiable, or above the auto-approval threshold, SAFE rejects or asks a human.

### How does SAFE verify the merchant?

The MVP uses a local trusted merchant registry. It checks merchant domain, category, trust status, recipient address, token account, token mint, and expected price.

### What if the merchant lies about its payment address?

SAFE compares the x402 `payTo` address against the trusted registry. If the recipient does not match, SAFE rejects.

### What if the amount changes?

SAFE reads the amount from the x402 requirement and checks it against the policy cap and remaining allowance. Over-limit requests are rejected.

### What if the agent retries the same payment?

SAFE fingerprints payment requests and can reject duplicates or duplicate resource requests.

### What if the payment metadata leaks private data?

SAFE scans metadata such as URL, description, reason, and memo. If sensitive data is found, SAFE can redact and approve or block, depending on policy.

### What exactly settles onchain?

Approved payments settle through Solana devnet using an allowance-backed transfer path. SAFE returns a transaction signature and Explorer URL.

### Is this mainnet ready?

No. The MVP is devnet-only and local/private. Mainnet would need stronger key custody, audits, durable storage, production infrastructure, and verified merchant onboarding.

### Is this npm published?

No. The SDK and CLI work locally today, but they are not yet packaged or published as npm packages.

### Can another developer use it today?

Yes. A developer can clone the repo, run SAFE locally, and integrate with it over HTTP or through the local SDK/CLI.

### Does this replace x402?

No. SAFE complements x402. x402 handles payment negotiation and settlement. SAFE decides whether the buyer's agent should pay.

### Does this replace Solana allowances?

No. Solana allowances cap spend onchain. SAFE adds semantic policy checks before spending.

### Is SAFE decentralized?

The MVP is not fully decentralized. It is a local buyer-side firewall. The roadmap can add signed policies, onchain registries, tamper-proof audit logs, and decentralized trust signals.

### Should the shared database be decentralized?

Possibly, later. It is a strong long-term direction, but it adds hard problems: fake reports, sybil attacks, privacy, dispute resolution, and reputation weighting. For the MVP, it is better to say SAFE can evolve toward decentralized trust, not that it already has it.

### What is the biggest current limitation?

The merchant registry is local and static. SAFE only knows what it has been configured to trust. Unknown merchants must fail closed.

### How does SAFE become more useful over time?

As more payment attempts are logged and reviewed, SAFE can build a stronger shared trust layer of verified merchants, known risky patterns, policy templates, and payment intelligence.

### What makes this defensible?

SAFE can become defensible through the trust layer: verified merchant records, risk history, policy templates, audit infrastructure, and integrations with agent platforms and payment rails.

### Why now?

x402 is making paid web resources programmable. Solana allowances make delegated spending practical. AI agents are starting to transact. That creates the need for pre-payment authorization now.

### What should judges look at in the demo?

They should look at the full path:

```text
external agent -> SAFE HTTP API -> x402 challenge -> policy decision -> allowance settlement -> Solana devnet tx -> audit record
```

### What is the simplest way to explain it?

SAFE lets agents spend autonomously without giving them blind wallet access.

### What is the strongest closing line?

Autonomous agents need more than wallets. They need payment judgment. SAFE is the firewall that decides whether money should move before it moves.

## References

- x402 docs: https://docs.x402.org/
- x402 exact scheme: https://docs.x402.org/schemes/exact
- Solana fixed delegation docs: https://solana.com/docs/payments/subscriptions/fixed-delegation
- SAFE architecture: `architecture.md`
- SAFE external-agent skill: `skills/safe-agent-payments/SKILL.md`
