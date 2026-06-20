# SAFE Architecture

Current as of June 19, 2026.

SAFE means Spend Authorization Firewall for Agents. It is a buyer-side payment firewall for AI agents. The demo shows an agent trying to buy paid API resources, while SAFE decides whether the delegated signer is allowed to sign and settle each payment.

The core idea is simple:

```text
Solana allowance = hard spending boundary.
x402 = per-request paid API challenge.
SAFE = policy firewall before signing.
Facilitator = verifies and settles the signed payment transaction.
```

## Current State

What works now:

- Wallet-based Solana devnet fixed allowance setup.
- Live official devnet USDC settlement through Solana Subscriptions/Allowances.
- Real `transferFixed` devnet transactions for approved agent payments.
- External agent integration through `/api/safe/*`, a thin TypeScript SDK, and a local CLI.
- SAFE policy checks for amount, merchant, recipient, category, duplicate requests, intent scope, and PII.
- Local x402 SVM facilitator settlement with smart-wallet verification enabled.
- Mock facilitator verification in demo mode.
- Public x402 verification probe.

Important x402 boundary:

- Public x402 works for a standard direct Solana wallet payment.
- SAFE's local facilitator allowlists the Solana Subscriptions/Allowances program and verifies inner token transfers.
- Public x402 may still reject SAFE's allowance-backed `transferFixed` wrapper unless that public facilitator enables the same smart-wallet verification and program allowlist.

## System Context

```mermaid
flowchart LR
  User[User wallet] -->|creates capped allowance| Solana[Solana devnet]
  User -->|sets policy and intent| SAFE[SAFE app]
  Agent[AI agent] -->|requests paid resource| PaidAPI[x402 paid APIs]
  PaidAPI -->|HTTP 402 payment requirements| Agent
  Agent -->|payment request| SAFE
  SAFE -->|approve / reject / redact| Agent
  SAFE -->|approved x402 payload| Facilitator[Local x402 facilitator]
  Facilitator -->|simulate / submit| Solana
  Solana -->|receipt| Facilitator
  Facilitator -->|settlement result| SAFE
  SAFE -->|audit log and UI| User
```

SAFE is not trying to replace x402 or Solana allowances. SAFE sits between the agent and the signer.

## Main Components

```mermaid
flowchart TB
  subgraph UI[Next.js app]
    Dashboard[Dashboard]
    Setup["/api/setup/allowance"]
    Readiness["/api/readiness"]
    AgentRun["/api/agent/run"]
    Preflight["/api/preflight"]
    SafeAPI["/api/safe/preflight<br/>/api/safe/pay<br/>/api/safe/state<br/>/api/safe/audit"]
    PolicyAPI["/api/policy"]
    AuditAPI["/api/audit"]
  end

  subgraph External[External integration]
    BasicAgent["examples/basic-agent"]
    SDK["createSafeClient"]
    CLI["bin/safe.ts"]
  end

  subgraph Policy[SAFE policy layer]
    SafeService[safePaymentService]
    Normalizer[x402 payment normalizer]
    Engine[policyEngine]
    Replay[replay guard]
    PII[PII scanner]
    Registry[merchant registry]
    Audit[audit log]
  end

  subgraph SolanaLayer[Solana layer]
    Runtime[runtimePreflight]
    LiveSettlement[liveSettlement]
    WalletSetup[wallet allowance setup]
    AllowanceAdapter[allowance adapter]
    Subscriptions["@solana/subscriptions"]
    Token["@solana-program/token"]
    Kit["@solana/kit"]
  end

  subgraph Payments[x402 / facilitator layer]
    X402Routes["/api/x402/* paid routes"]
    Verify["/api/facilitator/verify"]
    Settle["/api/facilitator/settle"]
    LocalX402[local x402 facilitator]
    PublicProbe[public x402 verify probe]
  end

  Setup --> WalletSetup
  Readiness --> LocalX402
  AgentRun --> Normalizer
  BasicAgent --> SDK
  CLI --> SDK
  SDK --> SafeAPI
  SafeAPI --> SafeService
  SafeService --> Normalizer
  Preflight --> Normalizer
  Normalizer --> Engine
  Engine --> Replay
  Engine --> PII
  Engine --> Registry
  Engine --> Audit
  Engine --> Runtime
  Runtime --> LiveSettlement
  WalletSetup --> Subscriptions
  WalletSetup --> Token
  WalletSetup --> Kit
  LiveSettlement --> Subscriptions
  LiveSettlement --> Token
  LiveSettlement --> Kit
  AgentRun --> X402Routes
  AgentRun --> LocalX402
  Verify --> LocalX402
  Settle --> LocalX402
  PublicProbe --> Payments
```

## Onchain And Offchain Boundary

```mermaid
flowchart LR
  subgraph Offchain[Offchain SAFE host]
    Intent[AP2-style intent JSON]
    Policy[Spend policy]
    Merchant[Merchant registry]
    Decision[Policy decision]
    Payload[x402 payload builder]
    Audit[Audit log]
  end

  subgraph Onchain[Solana devnet]
    Authority[Subscription Authority PDA]
    Delegation[Fixed Delegation PDA]
    UserATA[User USDC ATA]
    MerchantATA[Merchant USDC ATA]
    Program[Subscriptions / Allowances program]
  end

  Policy --> Decision
  Intent --> Decision
  Merchant --> Decision
  Decision -->|approved only| Payload
  Payload -->|transferFixed instruction| Program
  Program --> Authority
  Program --> Delegation
  Program -->|moves USDC| UserATA
  Program -->|receives USDC| MerchantATA
  Decision --> Audit
```

Onchain state enforces money constraints. Offchain policy enforces meaning.

## Allowance Setup Flow

```mermaid
sequenceDiagram
  participant User as User/delegator wallet
  participant SAFE as SAFE setup UI
  participant Sub as Solana Subscriptions program
  participant Chain as Solana devnet

  User->>SAFE: Connect wallet
  SAFE->>Sub: Derive Subscription Authority PDA
  SAFE->>Sub: Derive Fixed Delegation PDA
  SAFE-->>User: Build initSubscriptionAuthority transaction
  User->>Chain: Sign and send init transaction
  Chain-->>SAFE: Confirm init tx signature
  SAFE-->>User: Build createFixedDelegation transaction
  User->>Chain: Sign and send delegation transaction
  Chain-->>SAFE: Confirm delegation tx signature
  SAFE-->>User: Agent now has capped delegated spend
```

Current primary path:

```text
Open the dashboard, connect a devnet wallet, initialize authority, then create allowance.
```

If the dashboard already shows `Subscription authority: exists` and `Fixed delegation: exists`, setup is complete. Do not sign another setup transaction for that wallet; use `Run Agent` instead.

Legacy env-key smoke command:

```bash
SAFE_DEMO_MODE=false pnpm safe:devnet:setup-allowance
```

## External Agent API

External agents should use the SAFE HTTP API instead of importing the scripted dashboard agent.

```text
POST /api/safe/preflight
POST /api/safe/pay
POST /api/safe/demo/run
GET  /api/safe/state
GET  /api/safe/audit
GET  /api/safe/demo/state
```

`/api/safe/preflight` is advisory only. It normalizes the x402 requirement and evaluates policy with a read-only replay check. It does not settle, write audit records, or remember replay state.

`/api/safe/pay` is the real execution path. It can fetch a local x402 resource URL, parse the `402` challenge, evaluate SAFE policy, settle approved or redacted decisions, write audit records, and return the paid resource response. `dryRun: true` uses the same policy path but does not settle, write audit records, or mutate replay state.

`/api/safe/demo/run` is the CLI-first demo path. It turns a natural-language match-day instruction into a per-run SAFE policy, uses that same policy for enforcement, runs the scripted x402 sequence, writes audit records for non-dry runs, and stores a dashboard-visible demo transcript. Generated policies keep the baseline stats merchant `stats-api.demo` allowlisted unless the prompt explicitly blocks match data or stats. Merch prompts can approve only the trusted `official-merch.demo` merch merchant; fake merch stays blocked. Live devnet is the default caller behavior for `pnpm safe demo`; the route fails before execution when live mode is required but the server is not configured with `SAFE_DEMO_MODE=false` and live allowance signers.

`/api/safe/demo/state` returns the newest demo transcripts. The dashboard polls this route so terminal runs and browser state show the same prompt, policy, x402 requests, SAFE decisions, settlement receipts, and audit summary.

Local wrappers:

```bash
./node_modules/.bin/tsx bin/safe.ts demo --prompt 'Let my match-day agent spend up to $5 on match data, transit, and food vouchers. Block gambling, merch, unknown merchants, and PII.'
./node_modules/.bin/tsx bin/safe.ts demo --prompt 'Let my match-day agent spend up to $5 on match data, transit, and food vouchers. Block gambling, merch, unknown merchants, and PII.' --dry-run
./node_modules/.bin/tsx examples/basic-agent/run.ts --dry-run
./node_modules/.bin/tsx bin/safe.ts pay http://localhost:3000/api/x402/stats --dry-run
```

## Approved Payment Flow

```mermaid
sequenceDiagram
  participant Agent as Agent
  participant API as x402 paid API
  participant SAFE as SAFE firewall
  participant Delegate as SAFE delegatee signer
  participant Fac as Local x402 facilitator
  participant Sub as Solana Subscriptions program
  participant Chain as Solana devnet

  Agent->>API: GET paid resource
  API-->>Agent: 402 Payment Required
  Agent->>SAFE: Send x402 payment requirements
  SAFE->>SAFE: Normalize amount, asset, payTo, memo, resource
  SAFE->>SAFE: Check policy, intent, merchant, replay, PII
  SAFE->>Delegate: Approved request may be signed
  Delegate->>SAFE: Partially signed transferFixed transaction
  SAFE->>Fac: x402 exact payload with allowance-backed transaction
  Fac->>Fac: Simulate and verify inner TransferChecked
  Fac->>Chain: Submit sponsored transaction
  Chain->>Sub: Execute transferFixed
  Sub-->>Chain: Inner USDC TransferChecked
  Chain-->>Fac: Confirmed tx signature
  Fac-->>SAFE: Settled
  SAFE-->>Agent: Paid resource can be returned
```

The facilitator should not pull funds from the allowance. The SAFE-approved delegatee signs the transaction. The local x402 facilitator verifies, sponsors, submits, and confirms it.

## Blocked Payment Flow

```mermaid
sequenceDiagram
  participant Agent as Agent
  participant API as x402 paid API
  participant SAFE as SAFE firewall
  participant Delegate as Delegatee signer
  participant Chain as Solana devnet

  Agent->>API: GET paid resource
  API-->>Agent: 402 Payment Required
  Agent->>SAFE: Send payment requirements
  SAFE->>SAFE: Policy check fails
  SAFE-->>Agent: Reject with reason code
  SAFE-xDelegate: No signature requested
  SAFE-xChain: No transaction submitted
```

Examples currently shown by the demo:

- Fake merchant blocked.
- Duplicate stats request blocked.
- Over-limit request blocked.
- Sensitive metadata redacted before signing.

## Policy Decision Model

```mermaid
flowchart TD
  Start[Normalized payment request] --> Expired{Policy / allowance / intent expired?}
  Expired -->|yes| Reject[Reject: not signed]
  Expired -->|no| Rail{Allowed rail, scheme, network, token?}
  Rail -->|no| Reject
  Rail -->|yes| Amount{Within per-payment cap and allowance?}
  Amount -->|no| Reject
  Amount -->|yes| Merchant{Trusted domain and recipient match?}
  Merchant -->|no| Reject
  Merchant -->|yes| Category{Allowed category and intent scope?}
  Category -->|no| Reject
  Category -->|yes| Replay{Duplicate payment or resource?}
  Replay -->|yes| Reject
  Replay -->|no| PII{Sensitive metadata found?}
  PII -->|block mode| Reject
  PII -->|redact mode| Redact[Redact and approve]
  PII -->|none| Approve[Approve]
  Redact --> Sign[Delegatee may sign]
  Approve --> Sign
```

## Future Agentic Verification Mode

This mode is not implemented in the current MVP. It is the next product direction for payments that are unknown to the local registry.

The rule stays strict:

```text
Verifier agents gather evidence.
SAFE makes the decision.
Only SAFE-approved payments can reach signing.
```

```mermaid
flowchart TD
  Request[Normalized payment request] --> Known{Known merchant and recipient?}
  Known -->|trusted| Policy[Run deterministic SAFE policy]
  Known -->|blocked| Reject[Reject]
  Known -->|unknown| Risk{Within auto-verify risk limit?}
  Risk -->|no| Human[Ask human]
  Risk -->|yes| Verifier[Verifier agent gathers evidence]
  Verifier --> Evidence[Evidence bundle]
  Evidence --> Score{Evidence satisfies policy?}
  Score -->|yes| Policy
  Score -->|no reliable evidence| Reject
  Score -->|conflict or high risk| Human
  Policy --> Decision[approve / reject / redact]
```

Evidence bundle examples:

- merchant domain ownership proof
- signed merchant manifest
- recipient wallet ownership proof
- token mint and network match
- expected price range
- category classification
- public docs or KYB signal
- prior SAFE audit history
- matching shared trust database record

The verifier should never receive signing authority, private keys, or permission to bypass SAFE. It can only produce evidence and a recommendation.

## Future Shared Trust Layer

SAFE can improve over time if verified decisions are reusable across agents and deployments.

The long-term trust layer should store verified records, not raw unchecked reports:

```text
merchant domain
verified recipient
token mint and network
category
safe price range
evidence sources
policy version
audit receipt hash
review timestamp
confidence level
```

The database can learn from:

- approved payments
- rejected fake merchants
- recipient mismatches
- over-limit requests
- replay attempts
- PII redaction cases
- human review outcomes
- settled transaction receipts

This is similar to how security products combine local rules with shared reputation intelligence. SAFE applies that pattern to payments instead of network traffic.

Decentralization is a possible later form of the shared trust layer, not a current claim. A decentralized version would need anti-spam controls, sybil resistance, privacy-preserving audit sharing, signed evidence, dispute resolution, and governance.

## Production Reference Architecture

The scalable production design should be private-first and hybrid.

```mermaid
flowchart TB
  Agent[External agent] --> SafeAPI[SAFE API]
  SafeAPI --> LocalPolicy[Local policy engine]
  LocalPolicy --> Cache[Redis cache and replay guard]
  LocalPolicy --> Registry[Postgres trust registry]
  Registry --> Decision[Fast payment decision]
  Decision -->|approved only| Settlement[Allowance settlement]
  Decision -->|unknown| Queue[Verifier job queue]
  Queue --> Verifier[Private verifier agent]
  Verifier --> Evidence[Signed evidence bundle]
  Evidence --> Registry
  Evidence --> Storage[Object storage / IPFS / Filecoin]
  Registry --> Anchor[Solana hash anchor]
  Settlement --> Audit[Private audit log]
  Audit --> Anchor
```

Fast path:

```text
agent -> SAFE -> local policy/cache/registry -> decision
```

Slow path:

```text
unknown merchant -> async verifier job -> evidence bundle -> registry update -> retry or ask human
```

Do not put decentralized storage or public-chain reads in the hot payment path. The hot path needs low latency and clear fail-closed behavior.

Private by default:

- user intent
- raw payment reason
- agent task context
- wallet/payment history
- full audit records
- verifier browsing traces
- rejected sensitive metadata

Safe to share after sanitization:

- verified merchant domain
- verified recipient or token account
- supported token and network
- category
- normal price range
- risk score
- evidence hash
- review status
- expiry timestamp

Recommended infrastructure split:

| Component | Production role |
|---|---|
| Postgres | source of truth for trust records, policy versions, reviews |
| Redis | fast replay guard, risk cache, rate limits, idempotency |
| Queue | async verifier jobs and human-review workflows |
| Object storage | private evidence storage for enterprise deployments |
| IPFS/Filecoin | durable public or semi-public evidence bundles later |
| Solana | hash anchors, merchant attestations, disputes, receipts |
| 0G | later option for AI-native DA, verifier data, or decentralized compute |

## x402 Compatibility Paths

```mermaid
flowchart TD
  X402[x402 SVM exact payment requirement] --> Direct{Direct wallet TransferChecked?}
  Direct -->|yes| PublicOK[Public x402 facilitator verifies today]
  Direct -->|no| Wrapper{Wrapper program produces inner TransferChecked?}
  Wrapper -->|no| Invalid[Not a valid x402 payment]
  Wrapper -->|yes| Sim{Facilitator supports simulation and inner instruction inspection?}
  Sim -->|no| PublicReject[Rejected by facilitator]
  Sim -->|yes| Allowlist{Wrapper program allowlisted?}
  Allowlist -->|no| ProgramReject[Rejected: program not allowed]
  Allowlist -->|yes| Compatible[Compatible allowance-backed x402 settlement]
```

Current public x402 result:

```text
Direct wallet x402 control payload: valid.
SAFE transferFixed allowance payload: rejected.
Reason: smart_wallet_program_not_allowed for the Subscriptions program.
```

## Runtime Modes

```mermaid
flowchart LR
  Mode{SAFE_DEMO_MODE}
  Mode -->|true or unset| Demo[Demo mode]
  Mode -->|false| Live[Live devnet mode]

  Demo --> DemoVerifier[Mock x402 allowance verifier]
  Demo --> DemoSig[Demo tx signatures]
  Demo --> NoSpend[No devnet spend]

  Live --> Devnet[Solana devnet RPC]
  Live --> RealAllowance[Real fixed delegation]
  Live --> LocalFacilitator[Local x402 smart-wallet facilitator]
  LocalFacilitator --> RealTransfer[Real transferFixed USDC settlement]
  Live --> RealReceipts[Explorer receipts]
```

Be careful: live mode spends real devnet USDC from the connected wallet allowance.

## Frontend Demo Surface

The browser dashboard is the primary demo surface, not just the CLI.

What the frontend now shows:

- Live readiness checks for RPC, mode, delegatee signer, facilitator, and legacy smoke signers.
- Env wallet balances for user/delegator, agent/delegatee, and facilitator/sponsor.
- Allowance status, including delegation PDA, delegatee, amount, and expiry.
- One-click agent run with before/after user USDC balances.
- Per-attempt SAFE decision, x402 request fields, facilitator result, payment hash, tx signature, and Explorer link.
- Audit timeline for approved, blocked, redacted, and settled payments.

The CLI scripts remain useful for development, but they are no longer required to explain the product during a demo.

## API Surface

```mermaid
flowchart TB
  Dashboard[Dashboard] --> AgentRun["/api/agent/run"]
  Dashboard --> DemoState["/api/demo/state"]
  Dashboard --> Readiness["/api/readiness"]
  Dashboard --> Setup["/api/setup/allowance"]
  Dashboard --> Policy["/api/policy"]
  Dashboard --> Intent["/api/intent"]
  Dashboard --> Audit["/api/audit"]

  DemoState --> Readiness
  DemoState --> Audit
  AgentRun --> Stats["/api/x402/stats"]
  AgentRun --> Transit["/api/x402/transit"]
  AgentRun --> Food["/api/x402/food"]
  AgentRun --> Fake["/api/x402/fake-merch"]
  AgentRun --> Preflight["/api/preflight"]
  AgentRun --> Verify["/api/facilitator/verify"]
  AgentRun --> Settle["/api/facilitator/settle"]
  Verify --> LocalFacilitator["local x402 facilitator"]
  Settle --> LocalFacilitator
```

## Key Files

| Area | Files |
|---|---|
| Agent scenario | `lib/agent/worldCupAgent.ts` |
| Policy engine | `lib/policy/policyEngine.ts` |
| x402 requirements | `lib/x402/paymentRequirements.ts` |
| Mock x402 payload | `lib/x402/x402Payload.ts` |
| Demo verifier | `lib/facilitator/facilitatorVerifier.ts` |
| Local x402 facilitator | `lib/facilitator/localX402Facilitator.ts` |
| Wallet allowance setup | `lib/solana/walletAllowanceSetup.ts` |
| Live Solana settlement | `lib/solana/liveSettlement.ts` |
| Readiness checks | `lib/runtime/readiness.ts` |
| Frontend demo state | `lib/runtime/demoState.ts` |
| Runtime live preflight | `lib/solana/runtimePreflight.ts` |
| Merchant registry | `lib/fixtures/merchants.ts` |
| Devnet scripts | `scripts/devnet/*` |

## Devnet Commands

```bash
pnpm safe:devnet:balances
# Or use the dashboard wallet setup panel.
SAFE_DEMO_MODE=false pnpm safe:devnet:setup-allowance
SAFE_DEMO_MODE=false pnpm safe:devnet:smoke
pnpm safe:x402:public:verify
```

## What This App Is Not

- Not full production x402 compatibility with every facilitator.
- Not full AP2 credential exchange.
- Not mainnet-ready.
- Not a custodial wallet.
- Not an implemented global trust database yet.
- Not an implemented autonomous verifier-agent network yet.
- Not a decentralized reputation protocol yet.
- Not generated from `solana.new` in the current repo.

## Best Demo Framing

SAFE is a payment firewall for agents. It lets an agent spend from a capped Solana allowance, but only after SAFE approves each x402-style payment request. Good payments settle on devnet. Bad payments never get signed.
