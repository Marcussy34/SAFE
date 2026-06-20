## **SpendShield** 

Agentic Payment Firewall for Solana Allowances _Complete Product, Market, Technical, and Hackathon Build Docs_ 

Prepared for a one-day Solana Payments MVP hackathon 

Version 0.1 | June 2026 

## **Core thesis** 

Solana allowances can cap how much an agent may spend. SpendShield adds the missing layer: what the agent may spend on, when it may spend, which merchant it may pay, what metadata may leave the agent host, and whether the request is a duplicate or policy violation. 

_Document status: product specification and build plan. Not legal, financial, or security-audit advice._ 

SpendShield v0.1 | Page 1 

## **Contents** 

- 1. Executive summary 

- 2. One-line positioning and judge pitch 

- 3. Why this is a real Solana Payments project 

- 4. Why now: the agentic payments landscape 

- 5. The actual problem 

- 6. Existing solutions and workarounds 

- 7. Product definition 

- 8. Target users and wedge use cases 

- 9. World Cup match-day demo use case 

- 10. Product architecture 

- 11. Policy model and decision engine 

- 12. Threat model and controls 

- 13. Product flows 

- 14. MVP scope for a one-day hackathon 

- 15. Technical build plan 

- 16. Demo script and judging narrative 

- 17. Competitive positioning 

- 18. Business model and roadmap 

- 19. Metrics and success criteria 

- 20. Risks, objections, and responses 

- 21. Final positioning 

- Appendix A. Data schemas and TypeScript interfaces 

- Appendix B. Example policy decisions 

- Appendix C. Sources and references 

Citation note: bracketed references such as [1] point to the source list in Appendix C. 

SpendShield v0.1 | Page 2 

## **1. Executive summary** 

SpendShield is a pre-execution firewall for autonomous agent payments. It sits between an AI agent and the payment rail, normalizes a payment request, evaluates that request against a deterministic user policy, and only then lets the delegated wallet or allowance execute the payment. 

The project is not merely an AI wallet with a spending limit. That would be too shallow because capped delegated spending is already becoming native in the ecosystem. Solana Subscriptions & Allowances now support fixed allowances, recurring delegations, and subscription plans, with fixed allowances described as a building block for AI agents that need to operate within a budget [1]. 

The project is also not a replacement for x402, MPP, AP2, ACP, Visa TAP, or Mastercard Verifiable Intent. Those protocols handle parts of payment transport, mandate creation, identity, merchant recognition, or verifiable authorization. SpendShield has a narrower but valuable job: enforce user-defined payment policy before an autonomous agent signs or submits a payment. 

## **The missing question** 

Most payment rails can verify that a payment is technically valid. SpendShield asks whether this specific agent should be allowed to make this specific payment, to this specific recipient, for this specific purpose, with this specific metadata, right now. 

That distinction matters because agentic payments are fast, frequent, and often invisible. A human checkout may involve one deliberate action. An agent task can involve dozens or thousands of small payments for APIs, data, compute, MCP tools, content, routing, model calls, and onchain services. A signed payment can be valid and still violate the user's intent. 

For the hackathon, the strongest implementation is a World Cup match-day assistant that uses Solana stablecoin allowances to pay for useful microservices - match data, transit, and food vouchers - while SpendShield blocks scam merchants, restricted categories, duplicate payment attempts, over-budget requests, and sensitive metadata leaks. 

## **1.1 Product category** 

|**Not this**|**Actually this**|
|---|---|
|**Generic AI shopping assistant**|Policy-controlled delegated payments for autonomous agents|
|**New payment rail**|Pre-execution policy layer that wraps payment rails|
|**Wallet with a cap**|Semantic rules over Solana allowances: merchant, category,<br>metadata, replay, and intent|
|**Retail checkout clone**|Machine-payment safety layer for APIs, agents, and Web3<br>workflows|



## **2. One-line positioning and judge pitch** 

One-liner: SpendShield lets AI agents spend autonomously without giving them blind wallet access. 

Technical one-liner: SpendShield is a cross-protocol preflight policy engine for agentic payments across Solana allowances, x402-style HTTP payments, MPP-style machine payments, and future AP2-style mandates. It enforces budget, merchant trust, category rules, metadata privacy, replay protection, and human-approval thresholds before any payment is signed or submitted. 

## **Best hackathon pitch:** 

## **Judge pitch** 

Solana now makes delegated stablecoin payments possible through Subscriptions & Allowances. SpendShield makes that safe for AI agents. The user grants a capped allowance, then SpendShield enforces what the agent can actually spend on before every payment. 

SpendShield v0.1 | Page 3 

## **Simple explainer:** 

|**Layer**|**What it answers**|
|---|---|
|**Solana allowance**|How much can this agent spend, and until when?|
|**SpendShield policy**|What is the agent allowed to spend on, with whom, and under<br>which conditions?|
|**Payment rail**|How does value move to the merchant or service?|
|**Audit log**|What happened, what was blocked, and why?|



## **3. Why this is a real Solana Payments project** 

SpendShield fits the Solana Payments track because it is fundamentally a payment authorization and control layer for Solana stablecoin allowances. The track is not only about monthly subscriptions. It is about programmable payment relationships: subscriptions, recurring transfers, scheduled payouts, payroll, and delegated spending. SpendShield applies the same primitive to a new high-growth category: autonomous agent spending. 

## **3.1 The core Solana relationship** 

```
User wallet
  -> creates capped allowance for agent
      -> SpendShield evaluates each attempted payment
          -> approved payment executes on Solana
          -> rejected payment never reaches signing
              -> audit log records the decision
```

In other words, the Solana allowance enforces the hard monetary boundary; SpendShield enforces the semantic boundary. A user can say: "My agent may spend up to $5 today, but only on match data, transit, and food vouchers; never on gambling, ticket resale, unknown merchants, duplicate requests, or metadata that leaks my email or hotel." 

## **3.2 Track mapping** 

|**Payments track theme**|**How SpendShield fits**|
|---|---|
|**Recurring payment protocol**|Built on Solana Subscriptions & Allowances, using fixed allowances<br>first and recurring budgets later [1].|
|**Programmable money**|User policy determines what money can be used for, not just how<br>much can be moved.|
|**Scheduled/delegated transfers**|An agent receives a capped, time-bound spending delegation.|
|**Subscriptions**|Future users can grant recurring weekly or monthly agent budgets<br>for APIs, research, data, compute, or DeFi automation.|
|**Real-world usefulness**|Prevents uncontrolled AI-agent spend, duplicate charges, scam<br>merchants, and private-data leaks.|
|**Stablecoin settlement**|Approved payments settle with SPL stablecoins or a demo token on<br>Solana.|
|**Solana-native demo**|Wallet connection, allowance creation, delegated agent key,<br>stablecoin transfer, and transaction/audit receipts are all centered on<br>Solana.|



## **3.3 What must be shown in the MVP** 

- Create an agent allowance: token, cap, expiry, delegate, and revocation state. 

- Show the agent attempting real or simulated stablecoin payments. 

SpendShield v0.1 | Page 4 

- Show SpendShield approving safe requests and blocking unsafe ones before signing. 

- Show remaining allowance and total blocked unsafe spend. 

- Show Solana transaction receipts for approved payments, or a devnet/mock transfer if time is limited. 

If the MVP only says "AI checks whether a payment is safe," it is not strongly tied to the payments track. If it shows "Solana allowance -> agent payment attempt -> policy preflight -> stablecoin payment or block," it is clearly a Solana payments product. 

## **4. Why now: the agentic payments landscape** 

The reason SpendShield is timely is that the payment rails for autonomous agents are now arriving at the same time. This creates a security and policy gap above the rails. 

## **4.1 Solana allowances** 

Solana Subscriptions & Allowances support three payment models: fixed allowances, recurring delegations, and subscription plans. Fixed allowances let a user pre-authorize capped spending with optional expiration, which maps directly to AI agents acting within a budget [1]. 

## **4.2 x402 and HTTP-native payments** 

x402 is an internet-native payment standard based on the HTTP 402 Payment Required flow. A server can require payment before serving a resource; the client prepares and submits a payment payload; the server verifies and settles directly or through a facilitator [3]. Coinbase documentation describes facilitators as services that handle payment verification and settlement so sellers do not need to run blockchain infrastructure [4][5]. 

The Linux Foundation announced the x402 Foundation as a neutral home for the protocol, with the goal of embedding payments directly into web interactions so AI agents, APIs, and apps can transact value as easily as they exchange data [6]. Solana also frames x402 as a protocol for payment-gated APIs and services [2]. 

## **4.3 Stripe MPP and machine payments** 

Stripe's Machine Payments documentation describes programmatic payments where agents pay for API calls or services, with pay-per-use models as low as 0.01 USDC [7]. Stripe and Tempo also introduced MPP as an open standard for agents and services to coordinate payments programmatically, including microtransactions and recurring payments [8]. 

## **4.4 AP2, ACP, Visa TAP, and Mastercard Verifiable Intent** 

Google's Agent Payments Protocol, AP2, addresses the authorization and accountability problem by using signed mandates that capture user intent and transaction details for agent-led commerce [11][12]. OpenAI's Agentic Commerce documentation describes one-time delegated payment requests with a maximum chargeable amount and expiry for Instant Checkout flows [13]. Visa's Trusted Agent Protocol gives merchants a cryptographic method to distinguish legitimate agents from bots [14][15]. Mastercard's Verifiable Intent creates a tamper-resistant record of what a user authorized when an AI agent acts on their behalf [16][17]. 

## **4.5 Security research signals** 

Recent preprints have explored risks in x402 and agentic payment execution, including metadata leakage, replay attempts, context-binding failures, cross-resource substitution, concurrency race conditions, and policy enforcement gaps. These papers should be treated as research signals rather than final consensus, but they strongly support the need for pre-execution policy enforcement and runtime verification [18][19][20][21]. 

## **Why this creates a product gap** 

Payment standards are solving how agents pay. SpendShield solves whether the agent should be allowed to pay under the user's policy before the payment is signed. 

## **5. The actual problem** 

The problem is not that AI agents lack a way to move money. That is being solved by payment protocols and delegated spending primitives. The deeper problem is that autonomous payments can be technically valid and still be unsafe, unintended, duplicative, privacy-leaking, or out of scope. 

SpendShield v0.1 | Page 5 

## **5.1 Failure modes** 

|**Failure mode**|**Concrete example**|**Why it hurts**|
|---|---|---|
|**Spend loop**|Agent retries a paid API call 300 times.|Small charges accumulate; budget disappears<br>without a single obvious theft.|
|**Prompt injection**|A webpage tells the agent to pay a fake<br>"official" endpoint.|The agent follows malicious tool context rather<br>than the user's real intent.|
|**Merchant spoofing**|Endpoint claims to be a match-data API but<br>pays a random wallet.|User pays a scam recipient while seeing a<br>plausible merchant name.|
|**Category drift**|User authorized transit and match data; agent<br>buys merch or gambling content.|Payment is within budget but violates purpose.|
|**Overpayment**|An API raises price from $0.02 to $2.00 mid-<br>task.|User's allowance can be drained by abnormal<br>pricing.|
|**Metadata leakage**|Payment reason includes email, hotel, phone,<br>wallet, or internal company project.|Sensitive data is transmitted to server/facilitator<br>before settlement.|
|**Duplicate/replay**|Same payment request or proof is reused for<br>multiple resource requests.|User or merchant experiences double charge,<br>free-riding, or inconsistent access.|
|**Task mismatch**|World Cup assistant starts paying for unrelated<br>services.|Delegated authority exceeds original task<br>boundaries.|



## **5.2 Why normal checkout guardrails are insufficient** 

Human checkout has friction but also inspection. A person can see a merchant, price, basket, and final confirmation. Agentic payments invert that assumption: the agent may transact at machine speed and may pay for many small resources as part of one task. Human approval for every micro-payment destroys the product experience; no approval creates blind delegated spend. SpendShield fills the middle: deterministic policy checks before signing, with human escalation only when needed. 

## **5.3 The exact problem statement** 

## **Problem statement** 

Autonomous agents are beginning to pay for APIs, data, compute, content, and onchain services. Current protocols can verify payment validity, but users and developers lack a universal way to enforce intent, privacy, merchant trust, category rules, replay protection, and approval thresholds across emerging payment rails. 

## **6. Existing solutions and workarounds** 

SpendShield is only valuable if it does not duplicate native guardrails. The following comparison defines where the gap remains. 

|**Existing layer**|**What it solves**|**What remains unsolved**|**SpendShield position**|
|---|---|---|---|
|**Solana Allowances**|Capped delegated spend, expiry,<br>recurring budgets, subscription<br>patterns [1].|Semantic policy: merchant, category,<br>metadata, duplicate checks, task<br>scope.|Use as the enforcement primitive.|
|**x402**|HTTP-native payment request and<br>response flow for paid resources [3].|Buyer-side decision on whether an<br>agent should pay at all.|Wrap with preflight checks.|
|**x402 Facilitator**|Verifies and settles payments for<br>sellers without blockchain<br>infrastructure [4][5].|Does not decide if the buyer's agent<br>should satisfy the request.|Complement as buyer-side firewall.|
|**Stripe MPP**|Programmatic machine payments,<br>microtransactions, recurring<br>payments [7][8].|Cross-rail user policy and Web3<br>wallet/allowance semantics.|Support later as an input rail.|
|**Google AP2**|Signed mandates for user intent and|Implementation across non-AP2|Compile or export compatible|



SpendShield v0.1 | Page 6 

||accountable agent commerce [11]<br>[12].|x402/Solana/MCP/API/DeFi flows.|constraints where possible.|
|---|---|---|---|
|**OpenAI ACP**|Structured ChatGPT checkout with<br>one-time delegated payment requests<br>and caps [13].|Arbitrary API, MCP, DeFi, and Web3<br>agent payments.|Do not compete; focus outside<br>structured retail checkout.|
|**Visa TAP**|Merchant recognition of legitimate<br>agents through cryptographic signals<br>[14][15].|User-side policy over what the agent<br>may spend on.|Complementary trust signal.|
|**Mastercard Verifiable Intent**|Tamper-resistant proof of what a user<br>authorized [16][17].|Runtime policy enforcement before<br>non-card Web3 or API payments.|Complementary evidence layer.|



## **6.1 The nuanced answer: is this already native?** 

|**Context**|**Native protection level**|**Does SpendShield matter?**|
|---|---|---|
|**ChatGPT Instant Checkout / ACP retail**<br>**checkout**|High for one-time, human-confirmed retail<br>purchases.|Low to medium.|
|**AP2-compliant merchant checkout**|High for mandate-based authorization.|Medium as policy compiler and runtime<br>checker.|
|**Visa/Mastercard agent commerce**|Medium to high for card-network flows.|Medium for enterprise policy overlays.|
|**x402 machine payments**|Medium for settlement, lower for user-side<br>policy.|High.|
|**Solana allowance-based agent spending**|Medium for cap and expiry.|High.|
|**MCP tools + paid APIs**|Fragmented.|High.|
|**DeFi automation agents**|Low.|Very high.|



Conclusion: SpendShield should not be a generic shopping checkout guardrail. It should be a machine-payment and Web3-agent policy firewall, starting with Solana allowances plus x402-style paid APIs. 

## **7. Product definition** 

## **7.1 What SpendShield is** 

- A pre-execution payment firewall that evaluates payment requests before an agent signs or submits them. 

- A policy engine that converts user/developer rules into deterministic checks. 

- A payment request normalizer that supports Solana transfers, Solana allowances, x402-style requests, and later MPP/AP2 inputs. 

- A metadata privacy layer that blocks or redacts sensitive payment reason strings, resource URLs, descriptions, and memos. 

- A replay and duplicate-payment guard. 

- A merchant and endpoint trust registry. 

- A developer SDK and wallet integration layer. 

- An audit log for approved, blocked, redacted, and escalated payment attempts. 

## **7.2 What SpendShield is not** 

- Not a new chain, stablecoin, or payment processor. 

- Not a replacement for Solana allowances, x402, MPP, AP2, ACP, Visa TAP, or Mastercard Verifiable Intent. 

- Not a full fraud-detection network or legal compliance engine. 

- Not a custodian or wallet that holds user funds. 

- Not a chatbot. The agent can be any external system; SpendShield is the guardrail around payment execution. 

## **7.3 Core decisions returned by the firewall** 

**Decision Meaning** 

SpendShield v0.1 | Page 7 

|**approve**|Request is safe under policy. Send to wallet/allowance<br>execution.|
|---|---|
|**reject**|Request violates policy. Do not sign. Record reason.|
|**redact_and_approve**|Metadata contained sensitive data that can be safely removed<br>before signing.|
|**ask_human**|Risk is ambiguous or above threshold. Require one-time<br>approval or policy update.|
|**update_allowance_required**|Policy permits the request but allowance cap/expiry/remaining<br>balance prevents execution.|



## **8. Target users and wedge use cases** 

## **8.1 Primary users** 

|**User**|**Pain**|**Why SpendShield helps**|
|---|---|---|
|**AI agent developers**|Need agents that can pay for tools and APIs<br>without uncontrolled wallet access.|Provides SDK preflight and policy decisions.|
|**Wallet providers**|Need safer delegated-spend UX for agent<br>mode.|Embeds policy checks and revocation<br>dashboard.|
|**MCP tool developers**|Want pay-per-call tools but cannot ask users to<br>approve every request.|Enforces budgets and duplicate guards.|
|**API marketplaces**|Need buyer confidence for per-request<br>payments.|Adds trusted merchant registry and spend<br>controls.|
|**DeFi automation agents**|Need paid simulations, RPC, price feeds, and<br>execution without giving bots broad wallet<br>authority.|Combines allowance caps with purpose-based<br>policy.|
|**Enterprises**|Need procurement, data, and research agents<br>with spend governance and audit trails.|Offers team policies, approvals, and logs.|



## **8.2 Best wedge use case** 

## **Start with x402/Solana machine payments** 

The initial wedge should be safe micro-payments for APIs and agent tools on Solana, not broad consumer shopping. The reason is simple: API payments are frequent, small, autonomous, and impractical for human approval every time. 

## **8.3 Expansion use cases** 

- AI research agent that buys datasets, search credits, and API calls under a research budget. 

- Developer agent that pays for model calls, testnet faucets, RPC credits, and CI compute. 

- DeFi agent that pays for transaction simulation, MEV protection, oracle reads, and keeper services. 

- Travel or event agent that pays for transit, content, food vouchers, and local services. 

- Enterprise procurement agent with vendor allowlists and approval thresholds. 

- Recurring agent budget: $20/week for approved APIs, with automatic revocation and audit trail. 

## **9. World Cup match-day demo use case** 

The hackathon needs a simple, emotionally clear demo. The World Cup match-day assistant provides a concrete story while still demonstrating a general Web3 payment infrastructure problem. 

SpendShield v0.1 | Page 8 

## **9.1 Persona** 

A fan is in KL for a World Cup viewing event. They have an AI assistant that can pay for small digital services: live match data, public transit routing, food vouchers, and fan-zone information. The user does not want to approve every $0.02 API call, but also does not want the assistant to pay scam merchants or leak personal details. 

## **9.2 User policy** 

```
For today's match, my agent can spend up to $5 total.
Allowed categories: match_data, transit, food_voucher.
Blocked categories: gambling, ticket_resale, merch, adult, unknown.
Max per payment: $0.10.
```

```
Block duplicate payment requests within 5 minutes.
```

```
Block or redact metadata containing email, phone, hotel, wallet address, passport, or government ID.
Require human approval above $1.00.
```

## **9.3 Demo payment attempts** 

|**Attempt**|**Decision**|**Reason**|
|---|---|---|
|**$0.02 to Match Stats API**|Approved|Allowed category, allowlisted domain, within<br>cap.|
|**$0.03 to Transit Route API**|Approved|Allowed category, known merchant, within<br>budget.|
|**$0.05 to Food Voucher API**|Approved|Allowed category, trusted merchant.|
|**$0.50 to Fake Merch API**|Blocked|Merchant not allowlisted and category is<br>blocked.|
|**Duplicate $0.02 stats request**|Blocked|Same resource/merchant/amount/task within<br>replay window.|
|**Stats request with email and hotel in**<br>**reason**|Redacted or blocked|Sensitive metadata detected before signing.|



## **9.4 Demo thesis** 

## **Demo takeaway** 

The agent still feels autonomous because safe micro-payments go through automatically. The wallet still feels safe because unsafe requests never reach signing. 

## **10. Product architecture** 

## **10.1 High-level architecture** 

```
User Policy
   -> SpendShield Policy Compiler
      -> Agent attempts paid action
         -> x402 / Solana / MPP payment request
            -> SpendShield Normalizer
               -> Preflight Checks
                  - budget and expiry
                  - rail and token
                  - recipient and domain
                  - merchant registry
                  - category rules
                  - duplicate/replay
                  - metadata PII
                  - task-intent scope
                  - human approval threshold
```

SpendShield v0.1 | Page 9 

```
               -> Decision
```

```
                  - approve
                  - reject
                  - redact_and_approve
                  - ask_human
                  - update_allowance_required
               -> Wallet / Solana allowance execution
                  -> Receipt + audit log
```

## **10.2 Components** 

|**Component**|**Role**|**MVP implementation**|
|---|---|---|
|**Policy Builder**|Lets user define caps, categories, merchants,<br>expiry, and privacy rules.|Form UI with presets.|
|**Policy Compiler**|Turns rules into deterministic JSON policy.|Server-side TypeScript object.|
|**Payment Normalizer**|Converts x402/Solana/MPP-like requests into<br>one internal schema.|Mock x402 + Solana transfer adapter.|
|**Policy Engine**|Evaluates normalized request against policy.|Pure TypeScript rules.|
|**Merchant Registry**|Maps domains to categories, recipient<br>addresses, expected prices, and trust status.|Static JSON file.|
|**PII Filter**|Scans resource URLs, descriptions, reasons,<br>and memos.|Regex + simple string rules.|
|**Replay Guard**|Blocks duplicate request hashes and resource<br>fingerprints.|In-memory cache or SQLite.|
|**Solana Adapter**|Executes approved payments through<br>allowance/delegate flow.|Devnet/mock transfer.|
|**Audit Log**|Records every approve/reject/redact/escalate<br>decision.|SQLite/Supabase/local JSON.|



## **10.3 Onchain vs offchain boundary** 

|**Layer**|**Should be onchain?**|**Reason**|
|---|---|---|
|**Allowance cap, expiry, delegate,**<br>**revocation**|Yes|Hard monetary constraints must be<br>enforceable by Solana program logic.|
|**Stablecoin transfer or payment**<br>**settlement**|Yes|Actual approved payment should settle on<br>Solana.|
|**Policy evaluation**|Offchain for MVP|Faster to build; complex semantic checks<br>should be deterministic but do not need to be<br>onchain initially.|
|**Merchant registry**|Offchain first|Needs iteration; can later become signed,<br>attested, or decentralized.|
|**PII detection**|Offchain|Requires text processing and should run<br>before metadata leaves the agent host.|
|**Audit log hash**|Optional onchain|Can anchor tamper evidence later without<br>storing sensitive logs onchain.|



## **10.4 Production hardening direction** 

```
Agent key cannot spend directly.
SpendShield signer is required for execution.
Allowance program enforces cap, expiry, and revocation.
```

SpendShield v0.1 | Page 10 

```
Policy decision is signed by SpendShield.
Payment instruction includes request-bound hash.
Audit record stores decision, hash, reason code, and receipt.
```

## **11. Policy model and decision engine** 

## **11.1 Policy object** 

```
{
  "policy_id": "pol_wc_matchday_001",
  "scope": "world_cup_matchday",
  "expires_at": "2026-06-20T23:59:00+08:00",
  "budget": {
    "total_cap_usdc": 5.0,
    "per_payment_cap_usdc": 0.10,
    "per_merchant_cap_usdc": 1.00
  },
  "allowed_rails": ["solana_allowance", "x402_solana", "mock"],
  "allowed_tokens": ["USDC", "USDG", "DEMO_USD"],
  "allowed_categories": ["match_data", "transit", "food_voucher"],
  "blocked_categories": ["gambling", "ticket_resale", "merch", "adult", "unknown"],
  "allowed_domains": ["stats-api.demo", "transit-api.demo", "food-voucher.demo"],
  "require_human_approval_above_usdc": 1.00,
  "pii_policy": {
    "mode": "redact_or_block",
    "blocked_entities": ["email", "phone", "passport", "hotel", "wallet_address", "government_id",
"credit_card"]
  },
  "replay_policy": {
    "idempotency_window_seconds": 300,
    "block_duplicate_payment_hash": true,
    "block_duplicate_resource_request": true
  }
}
```

## **11.2 Normalized payment request** 

```
{
  "payment_request_id": "req_123",
  "rail": "x402_solana",
  "amount": { "value": 0.02, "currency": "USDC" },
  "recipient": {
    "address": "SOLANA_RECIPIENT_ADDRESS",
    "domain": "stats-api.demo",
    "display_name": "World Cup Stats API"
  },
  "resource": {
    "url": "https://stats-api.demo/live/argentina-vs-japan",
    "description": "Live match stats",
    "reason": "Agent needs live stats for match dashboard"
  },
  "category": "match_data",
  "agent_context": {
    "task_id": "task_matchday_plan_001",
    "user_intent": "Plan my World Cup match day",
    "session_id": "session_abc"
  },
  "raw_request_hash": "hash_of_original_payload"
}
```

## **11.3 Deterministic check order** 

1. Check policy expiry and allowance status. 

2. Check rail and token are allowed. 

3. Check amount against per-payment cap, merchant cap, and remaining total budget. 

4. Check merchant domain and recipient address against registry. 

SpendShield v0.1 | Page 11 

5. Check category against allowed and blocked lists. 

6. Check task scope and request purpose. 

7. Check duplicate request hash and resource fingerprint. 

8. Scan metadata for PII and decide block/redact/approve. 

9. Escalate to human if amount or risk exceeds threshold. 

10. Return signed decision and sanitized request if approved. 

## **11.4 Risk score** 

For the MVP, the decision can be rule-based without a complex score. For a production version, a transparent risk score helps decide whether to approve, reject, or ask the user. 

```
risk_score =
  0.25 * merchant_risk +
  0.20 * category_risk +
  0.20 * amount_anomaly +
  0.15 * metadata_risk +
  0.10 * replay_risk +
  0.10 * task_mismatch_risk
```

Do not make final approval depend only on an LLM. LLMs can help classify ambiguous merchants or summarize reasons, but the final spend decision should be deterministic and explainable. 

## **12. Threat model and controls** 

## **12.1 Assets to protect** 

- User funds 

- Delegated allowance 

- Payment credentials 

- User intent 

- Sensitive metadata 

- Merchant trust assumptions 

- Agent task boundaries 

- Auditability 

- Revocation path 

## **12.2 Assume these actors can be malicious or wrong** 

- LLM output 

- Agent planner 

- Webpage content 

- Merchant endpoint 

- MCP tool output 

- Payment metadata 

- Discovery/recommendation layer 

- Merchant-provided category 

- Facilitator response 

- Any natural-language instruction inside tool context 

## **12.3 Threat-control matrix** 

|**Threat**|**Example**|**Control**|
|---|---|---|
|**Wallet drain via loop**|Agent pays same API hundreds of times.|Total cap, rate limit, replay guard.|
|**Prompt injection**|Tool output says pay attacker endpoint.|Domain allowlist, task-scope rules, merchant<br>registry.|
|**Merchant spoofing**|Fake official stats API.|Verified merchant registry, recipient binding.|
|**Recipient mismatch**|Trusted domain but unexpected address.|Domain-to-address registry check.|
|**Overpayment**|Price jump from $0.02 to $2.00.|Per-payment cap and expected-price check.|



SpendShield v0.1 | Page 12 

|**Metadata leakage**|Reason includes email or hotel.|PII scanner and redact/block mode.|
|---|---|---|
|**Replay/duplicate**|Same request submitted twice.|Idempotency keys and request fingerprinting.|
|**Cross-resource substitution**|Payment proof for A used for B.|Request-bound hash and resource binding.|
|**Policy bypass**|Agent signs directly.|Adapter architecture and delegated key<br>restrictions.|
|**User fatigue**|Too many confirmation prompts.|Auto-approve low-risk; escalate only<br>ambiguous/high-risk.|



## **12.4 Privacy principle** 

Payment metadata should be treated as data leaving the trust boundary. The firewall must inspect and sanitize it before it is sent to the merchant, facilitator, or chain. This is especially important for x402-style payments where resource URLs, descriptions, and reason strings can travel alongside payment requests [18]. 

## **13. Product flows** 

## **13.1 Policy setup flow** 

11. User connects Solana wallet. 

12. User chooses agent, token, total cap, expiry, and revocation setting. 

13. User selects policy preset: World Cup match-day, API research, DeFi automation, or custom. 

14. User edits categories, allowlisted domains, max per payment, PII mode, and replay window. 

15. User creates Solana allowance or demo allowance. 

16. SpendShield displays policy ID, remaining budget, delegate, expiry, and revoke button. 

## **13.2 Payment approval flow** 

17. Agent requests a paid resource. 

18. Resource server returns a payment request, such as x402-style HTTP 402 challenge. 

19. SpendShield normalizes the payment request. 

20. Policy engine evaluates checks. 

21. If approved, sanitized payment request goes to wallet/allowance adapter. 

22. If rejected, no signing occurs; audit log records reason. 

23. If metadata can be redacted safely, sanitized metadata is used and original sensitive text is not sent. 

24. Receipt and remaining allowance are displayed. 

## **13.3 Human escalation flow** 

Human approval should be rare. Ask for approval when the payment is not obviously safe or unsafe: new merchant below hard cap, ambiguous category, unusual amount, non-redactable PII, or task mismatch. The UI should offer "approve once," "approve merchant for this session," or "reject." 

```
{
  "decision": "ask_human",
  "reason": "New merchant requesting $0.75. This is below the total budget but above the usual per-
call threshold.",
  "options": ["Approve once", "Approve merchant for this session", "Reject"]
}
```

## **14. MVP scope for a one-day hackathon** 

## **14.1 MVP objective** 

Demonstrate that an AI agent can make Solana-based stablecoin payments autonomously while SpendShield enforces user policy before execution. The MVP should be reliable, visual, and easy to understand in a two-minute demo. 

SpendShield v0.1 | Page 13 

## **14.2 Must-have features** 

- Policy builder UI with budget, expiry, allowed categories, blocked categories, merchant allowlist, PII mode, and duplicate protection. 

- Mock World Cup assistant with scripted payment attempts. 

- Three mock paid APIs: match stats, transit, food voucher. 

- One fake/scam endpoint that tries to trigger a blocked payment. 

- Payment request normalizer. 

- Budget, category, merchant, PII, and duplicate checks. 

- Solana wallet connection and allowance-like flow; real devnet transfer if feasible. 

- Decision dashboard with approved, blocked, redacted, and remaining allowance. 

- Audit log. 

## **14.3 Should-have features** 

- Redact-and-approve mode 

- Human approval threshold 

- Revocation button 

- Receipt display 

- Onchain transaction link or devnet explorer link 

- x402-compatible mock request/response format 

## **14.4 Non-goals** 

- Full AP2 implementation 

- Full x402 facilitator 

- Production-grade fraud detection 

- Real FIFA integration 

- Real regulated gambling or prediction-market payment flow 

- Complex natural-language policy compiler 

- Custody of user funds 

## **14.5 One-day schedule** 

|**Time block**|**Build focus**|
|---|---|
|**Hour 0-1**|Scaffold app with solana.new or preferred stack; define demo policy<br>and mock APIs.|
|**Hour 1-2.5**|Build policy builder UI and JSON policy object.|
|**Hour 2.5-4**|Build policy engine: budget, category, merchant, PII, duplicate.|
|**Hour 4-5.5**|Build mock x402/Solana payment request flow and Solana<br>wallet/transfer adapter.|
|**Hour 5.5-6.5**|Build dashboard: decisions, remaining allowance, receipts, audit log.|
|**Hour 6.5-7.5**|Polish demo and failure cases.|
|**Hour 7.5-8**|Rehearse two-minute script and backup screenshots.|



## **15. Technical build plan** 

## **15.1 Suggested stack** 

|**Layer**|**Recommendation**|
|---|---|
|**Frontend**|Next.js / React with Solana wallet adapter.|
|**Backend**|Next API routes or Node/Express.|
|**Policy engine**|Pure TypeScript functions for deterministic checks.|



SpendShield v0.1 | Page 14 

|**Storage**|SQLite, Supabase, or in-memory JSON for the hackathon.|
|---|---|
|**Solana**|Devnet transfer or allowance-like mock if allowance SDK setup is too<br>slow.|
|**Payment protocol**|Mock x402-style HTTP 402 challenge first; real x402 integration if<br>time permits.|
|**AI agent**|Scripted agent flow for demo reliability; optional LLM wrapper later.|



## **15.2 Suggested file structure** 

```
/spendshield
  /app
    /dashboard
    /policy
    /demo
  /lib
    policyEngine.ts
    piiScanner.ts
    replayGuard.ts
    paymentNormalizer.ts
    merchantRegistry.ts
    auditLog.ts
    solanaAdapter.ts
  /mock-apis
    matchStatsApi.ts
    transitApi.ts
    foodVoucherApi.ts
    fakeMerchApi.ts
  /types
    policy.ts
    paymentRequest.ts
    decision.ts
    audit.ts
```

## **15.3 API endpoints** 

|**Endpoint**|**Method**|**Purpose**|
|---|---|---|
|**/api/policy**|POST|Create policy object and return policy ID.|
|**/api/preflight**|POST|Normalize and evaluate payment request.|
|**/api/pay**|POST|Execute approved payment via Solana<br>adapter.|
|**/api/audit**|GET|Return audit log for dashboard.|
|**/api/mock/stats**|GET|Paid match stats API returns 402-style<br>challenge if no payment.|
|**/api/mock/transit**|GET|Paid transit API returns 402-style challenge.|
|**/api/mock/fake-merch**|GET|Malicious or blocked endpoint for demo.|



## **15.4 Minimal payment flow pseudocode** 

```
const request = await agent.getPaymentRequest(resourceUrl);
const normalized = normalizePaymentRequest(request);
const decision = await spendShield.preflight(normalized, activePolicy);
```

```
if (decision.action === "approve" || decision.action === "redact_and_approve") {
  const tx = await solanaAdapter.payWithAllowance(decision.sanitizedRequest);
  await auditLog.record({ decision, tx });
  return tx;
}
```

SpendShield v0.1 | Page 15 

```
if (decision.action === "ask_human") {
  return ui.requestApproval(decision);
}
await auditLog.record({ decision });
throw new Error(decision.reason);
```

## **15.5 Minimal database schema** 

```
policies(policy_id, wallet, delegate, token, cap, expires_at, policy_json, created_at)
merchants(domain, name, category, recipient_address, max_expected_price, trust_status)
payment_attempts(attempt_id, policy_id, request_hash, merchant_domain, amount, category, decision,
reason_code, created_at)
```

```
spend_ledger(policy_id, amount, merchant_domain, tx_signature, created_at)
replay_cache(fingerprint, request_hash, expires_at)
```

## **15.6 Implementation levels** 

|**Level**|**What to build**|**When**|
|---|---|---|
|**Demo-safe mock**|Mock allowance, mock stablecoin transfer,<br>real policy engine.|Use if Solana integration slows down.|
|**Devnet MVP**|Connect wallet, create/represent allowance,<br>execute devnet SPL transfer on approval.|Ideal hackathon target.|
|**Production direction**|Real allowance program integration, signed<br>policy decisions, request-bound hashes,<br>audited SDK.|Post-hackathon.|



## **16. Demo script and judging narrative** 

## **16.1 Two-minute demo script** 

|**Time**|**Narrative**|**Screen**|
|---|---|---|
|**0:00-0:20**|AI agents can now pay for APIs and services,<br>but a spending cap is not enough. We need<br>policy before payment signing.|Problem slide or dashboard intro.|
|**0:20-0:45**|User creates a $5 Solana allowance for a World<br>Cup assistant and defines allowed categories,<br>merchant list, PII rules, and duplicate<br>protection.|Policy builder.|
|**0:45-1:15**|Agent pays for match stats, transit, and food<br>voucher. Payments are automatically approved<br>because they match policy.|Live approved transactions and remaining<br>allowance.|
|**1:15-1:45**|Agent attempts fake merch, duplicate request,<br>and PII-leaking metadata. SpendShield<br>blocks/redacts before signing.|Decision dashboard with red/green outcomes.|
|**1:45-2:00**|Solana allowances enforce the cap;<br>SpendShield enforces intent. This is<br>programmable money for autonomous agents.|Audit log and closing line.|



## **16.2 What judges should remember** 

- This is not a generic AI safety app; it is policy-controlled delegated payments on Solana. 

- The demo uses agentic micro-payments, a current and growing payments use case. 

- The problem remains even when payment rails verify signatures and settlement. 

SpendShield v0.1 | Page 16 

- The product is complementary to Solana allowances, x402, MPP, AP2, ACP, Visa TAP, and Mastercard Verifiable Intent. 

- The MVP can be built in one day because the core decision engine is deterministic and demoable. 

## **16.3 Backup one-sentence close** 

## **Closing sentence** 

Payment rails move value. SpendShield decides whether an autonomous agent should be allowed to move it. 

## **17. Competitive positioning** 

## **17.1 The wedge** 

SpendShield should own the phrase "pre-execution payment firewall." It does not need to own the payment rail, wallet, or agent. It integrates into them. 

## **17.2 Competitive map** 

|**Category**|**Examples**|**SpendShield differentiation**|
|---|---|---|
|**Payment rails**|x402, MPP, Solana transfers|Rails execute payments; SpendShield decides<br>whether execution is allowed.|
|**Allowance primitives**|Solana Subscriptions & Allowances|Allowances cap spend; SpendShield defines<br>permissible purpose and context.|
|**Agent commerce mandates**|AP2, ACP|Structured commerce flows; SpendShield<br>handles open-ended API/Web3/MCP payments<br>and can compile constraints.|
|**Agent identity/trust**|Visa TAP, agent registries|Identity proves who the agent is; SpendShield<br>checks whether this payment fits the user<br>policy.|
|**Wallet UX**|Embedded wallets, agent wallets|Wallets manage keys; SpendShield protects<br>delegated execution.|
|**Fraud/compliance platforms**|Enterprise risk engines|Broad fraud/compliance; SpendShield is<br>developer-first and payment-request-level.|



## **17.3 Why this can be defensible** 

- Cross-protocol normalization becomes valuable as agentic payment standards fragment. 

- Merchant registry and recipient binding improve over time with network effects. 

- Policy templates become reusable: match-day, research, DeFi, procurement, developer agent, enterprise. 

- Audit logs and decision histories create enterprise trust and compliance value. 

- Wallet and SDK integrations create distribution. 

## **18. Business model and roadmap** 

## **18.1 Business model** 

|**Model**|**Customer**|**Pricing idea**|
|---|---|---|
|**Developer SaaS**|Agent and API developers|Free tier + per 10,000 preflight decisions.|
|**Wallet integration**|Solana wallets and embedded wallet<br>providers|Monthly platform fee or usage-based SDK<br>license.|
|**API marketplace safety layer**|API marketplaces and paid tool directories|Merchant verification and protected payment<br>volume fee.|



SpendShield v0.1 | Page 17 

|**Enterprise agent governance**|Companies deploying<br>procurement/research/data agents|Seat-based or policy-decision-based<br>enterprise plan.|
|---|---|---|
|**Premium registry**|Merchants and API providers|Verification, category certification, and<br>recipient binding.|



## **18.2 Roadmap** 

|**Version**|**Scope**|
|---|---|
|**v0 - Hackathon**|Policy builder, mock x402 requests, Solana allowance demo, World<br>Cup agent, merchant allowlist, PII scan, replay guard, dashboard.|
|**v1 - SDK**|spendshield-js, x402 wrapper, Solana adapter, signed policy<br>decisions, hosted dashboard.|
|**v2 - Multi-rail**|MPP support, AP2 mandate import/export, multiple wallets,<br>production PII scanner, merchant registry.|
|**v3 - Enterprise**|Team policies, multi-approver flows, vendor onboarding, audit<br>export, spend anomaly detection.|
|**v4 - Protocol hardening**|Request-bound signatures, onchain policy attestations,<br>decentralized merchant reputation, verifiable receipts.|



## **19. Metrics and success criteria** 

## **19.1 Product metrics** 

- Number of payments preflighted. 

- Percentage of autonomous payments approved without human intervention. 

- Number and value of blocked unsafe payments. 

- Number of PII leaks prevented. 

- Duplicate payment attempts blocked. 

- Average policy decision latency. 

- Developer integration time. 

- Revocation usage rate. 

## **19.2 Security metrics** 

- False-positive rate for blocked payments. 

- False-negative rate for PII detection. 

- Replay detection coverage. 

- Merchant mismatch detection rate. 

- Policy bypass attempts. 

- Audit completeness and tamper-evidence coverage. 

## **19.3 Hackathon success criteria** 

|**Criterion**|**Pass condition**|
|---|---|
|**Payments-track clarity**|Judges can explain how the project uses Solana allowances and<br>stablecoin payments.|
|**Problem clarity**|Judges understand why a cap alone is insufficient for agentic<br>payments.|
|**Demo reliability**|All approve/block/redact paths work live.|
|**Novelty**|Project is not a normal subscription/payroll/ticketing app.|
|**Extensibility**|Architecture could support x402, MPP, AP2, MCP tools, and DeFi<br>agents later.|



SpendShield v0.1 | Page 18 

## **20. Risks, objections, and responses** 

|**Objection**|**Response**|
|---|---|
|**AP2 already solves this.**|AP2 is important and complementary. SpendShield focuses on runtime<br>preflight policy across Solana allowances, x402, MPP, MCP tools, and<br>non-AP2 Web3 flows.|
|**Solana allowances already solve this.**|Allowances cap spend. They do not decide merchant trust, category,<br>metadata privacy, duplicate requests, or task scope.|
|**x402 facilitators already verify payments.**|Facilitators verify seller-side payment satisfaction. SpendShield verifies<br>buyer-side policy before signing.|
|**This is too security-heavy for one day.**|The MVP only needs a deterministic rules engine with five checks:<br>amount, merchant, category, PII, duplicate.|
|**The market is too early.**|Agentic payment rails are being launched by Solana, Coinbase/x402,<br>Stripe/MPP, Google/AP2, OpenAI/ACP, Visa, and Mastercard. The need<br>is emerging now [1][6][8][11][13][14][16].|
|**Why would users trust another layer?**|SpendShield should be non-custodial, transparent, open-source-friendly,<br>and integrated at the wallet/SDK level. It blocks signing rather than<br>holding funds.|
|**What about false positives?**|Use clear reason codes, approve-once options, and policy templates. For<br>micro-payments, block high-risk patterns and escalate ambiguous ones.|



## **20.1 Biggest product risk** 

The biggest risk is positioning too broadly as an "AI payments wallet." That makes the project easy to dismiss as shallow or redundant. The sharp positioning is: a pre-execution policy firewall for Solana agent allowances and machine-payment requests. 

## **21. Final positioning** 

## **21.1 Product positioning** 

## **Primary positioning** 

SpendShield is the policy firewall for Solana agentic payments. 

Long version: As AI agents begin paying for APIs, services, compute, content, and onchain actions, users need more than a wallet allowance. SpendShield enforces user intent before every autonomous payment: budget, category, merchant trust, metadata privacy, replay protection, and human approval thresholds. It uses Solana allowances as the spend primitive and wraps x402/MPP-style machine payments with a pre-execution security layer. 

## **21.2 Hackathon positioning** 

## **Hackathon version** 

For World Cup match-day agents, SpendShield lets your AI assistant pay for useful services like match data, transit, and food vouchers, while blocking scams, duplicate charges, restricted categories, and private-data leaks. 

## **21.3 Startup positioning** 

## **Startup version** 

Agentic payments are creating the same need that web traffic created for firewalls. Payment rails move value; 

SpendShield v0.1 | Page 19 

SpendShield decides whether the agent should be allowed to move it. 

## **21.4 Developer positioning** 

```
const decision = await spendShield.preflight(paymentRequest, userPolicy);
```

```
if (decision.action === "approve") {
  return wallet.sign(decision.sanitizedPaymentRequest);
}
if (decision.action === "redact_and_approve") {
  return wallet.sign(decision.sanitizedPaymentRequest);
}
```

```
return block(decision.reason);
```

## **Appendix A. Data schemas and TypeScript interfaces** 

## **A.1 Core interfaces** 

```
export type DecisionAction =
  | "approve"
  | "reject"
  | "redact_and_approve"
  | "ask_human"
  | "update_allowance_required";
export interface SpendPolicy {
  policyId: string;
  totalCapUsdc: number;
  perPaymentCapUsdc: number;
  expiresAt: string;
  allowedRails: string[];
  allowedTokens: string[];
  allowedCategories: string[];
  blockedCategories: string[];
  allowedDomains: string[];
  requireHumanApprovalAboveUsdc: number;
  piiPolicy: {
    mode: "block" | "redact_or_block";
    blockedEntities: string[];
  };
  replayPolicy: {
    idempotencyWindowSeconds: number;
    blockDuplicatePaymentHash: boolean;
    blockDuplicateResourceRequest: boolean;
  };
}
export interface NormalizedPaymentRequest {
  requestId: string;
  rail: "x402_solana" | "solana_transfer" | "mpp" | "mock";
  amountUsdc: number;
  token: "USDC" | "USDG" | "DEMO_USD";
  recipientAddress: string;
  merchantDomain: string;
  merchantName: string;
  category: string;
  resourceUrl: string;
  description: string;
  reason: string;
  rawRequestHash: string;
  taskId: string;
  userIntent: string;
}
```

```
export interface PolicyDecision {
  action: DecisionAction;
```

SpendShield v0.1 | Page 20 

```
  approvedAmountUsdc?: number;
  reasonCode: string;
  reason: string;
  riskScore: number;
  sanitizedRequest?: NormalizedPaymentRequest;
  requiresUserAction: boolean;
}
```

## **A.2 Merchant registry entry** 

```
{
  "merchant_id": "m_stats_api",
  "domain": "stats-api.demo",
  "display_name": "World Cup Stats API",
  "category": "match_data",
  "verified_recipients": ["SOLANA_RECIPIENT_ADDRESS"],
  "max_expected_price_usdc": 0.05,
  "reputation": "trusted_demo",
  "last_verified_at": "2026-06-20T10:00:00+08:00"
}
```

## **A.3 Audit record** 

```
{
  "audit_id": "audit_789",
  "timestamp": "2026-06-20T18:31:22+08:00",
  "agent_id": "agent_matchday_001",
  "policy_id": "pol_wc_matchday_001",
  "payment_request_hash": "0xabc",
  "merchant_domain": "fake-merch.demo",
  "amount_usdc": 0.50,
  "decision": "reject",
  "reason_code": "MERCHANT_NOT_ALLOWLISTED",
  "pii_detected": false,
  "duplicate_detected": false,
  "onchain_tx": null
}
```

## **Appendix B. Example policy decisions** 

## **B.1 Approved request** 

```
{
  "action": "approve",
  "reason_code": "POLICY_OK",
  "reason": "Allowed category, verified merchant, amount within cap, no PII, no duplicate.",
  "risk_score": 0.08,
  "requires_user_action": false
}
```

## **B.2 Blocked merchant** 

```
{
  "action": "reject",
  "reason_code": "MERCHANT_NOT_ALLOWLISTED",
  "reason": "fake-merch.demo is not allowed under the active World Cup match-day policy.",
  "risk_score": 0.82,
  "requires_user_action": false
}
```

SpendShield v0.1 | Page 21 

## **B.3 Duplicate request** 

```
{
  "action": "reject",
  "reason_code": "DUPLICATE_PAYMENT_REQUEST",
  "reason": "A payment for this resource, merchant, amount, and task was already approved 42 seconds
ago.",
  "risk_score": 0.71,
  "requires_user_action": false
}
```

## **B.4 Redact and approve** 

```
{
  "action": "redact_and_approve",
  "reason_code": "PII_REDACTED",
  "reason": "Email and hotel name were removed from payment metadata before signing.",
  "risk_score": 0.22,
  "requires_user_action": false,
  "sanitized_reason": "Book shuttle for user [REDACTED_EMAIL] staying at [REDACTED_LOCATION]."
}
```

## **B.5 Human escalation** 

```
{
  "action": "ask_human",
  "reason_code": "NEW_MERCHANT_ABOVE_AUTO_APPROVAL_THRESHOLD",
  "reason": "New merchant requests $0.75. This is below total budget but above normal per-call
threshold.",
  "risk_score": 0.48,
  "requires_user_action": true
}
```

## **Appendix C. Sources and references** 

External references used for market context and protocol descriptions. URLs are included so the reader can verify current details. Some research references are preprints and should be treated as signals, not final consensus. 

- **[1] Solana Foundation.** Solana Now Has Native Subscriptions & Allowances. https://solana.com/news/subscriptions and-allowances 

**[2] Solana Foundation.** What is x402? Payment Protocol for AI Agents on Solana. https://solana.com/x402/what-isx402 

**[3] x402 Foundation.** Welcome to x402 - Introduction. https://docs.x402.org/introduction 

**[4] Coinbase Developer Platform.** x402 Overview. https://docs.cdp.coinbase.com/x402/welcome 

**[5] Coinbase Developer Platform.** x402 Facilitator. https://docs.cdp.coinbase.com/x402/core-concepts/facilitator 

**[6] Linux Foundation.** Linux Foundation launches the x402 Foundation. https://www.linuxfoundation.org/press/linuxfoundation-is-launching-the-x402-foundation-and-welcoming-the-contribution-of-the-x402-protocol 

**[7] Stripe Docs.** Machine payments. https://docs.stripe.com/payments/machine 

- - **[8] Stripe Blog.** Introducing the Machine Payments Protocol. https://stripe.com/blog/machine payments protocol 

**[9] Stripe Docs.** x402 payments. https://docs.stripe.com/payments/machine/x402 

**[10] Stripe Docs.** MPP payments. https://docs.stripe.com/payments/machine/mpp 

- **[11] Google Cloud Blog.** Announcing Agent Payments Protocol (AP2). https://cloud.google.com/blog/products/ai machine-learning/announcing-agents-to-payments-ap2-protocol 

- **[12] AP2 Documentation.** Agent Payments Protocol Documentation. https://ap2 protocol.org/ 

- **[13] OpenAI Developers.** Agentic Commerce - Key concepts. https://developers.openai.com/commerce/guides/key concepts 

- - **[14] Visa Developer.** Trusted Agent Protocol - Getting Started. https://developer.visa.com/capabilities/trusted agent protocol/docs-getting-started 

SpendShield v0.1 | Page 22 

**[15] Visa GitHub.** Trusted Agent Protocol README. 

- - https://github.com/visa/trusted agent protocol/blob/main/README.md 

- **[16] Mastercard.** How Verifiable Intent builds trust in agentic AI commerce. https://www.mastercard.com/my/en/news and-trends/stories/2026/verifiable-intent.html 

**[17] FIDO Alliance.** Building the Trust Layer for Agentic Payments with AP2 and Verifiable Intent. https://fidoalliance.org/building-the-trust-layer-for-agentic-payments-with-ap2-and-verifiable-intent/ **[18] arXiv preprint.** Hardening x402: PII-Safe Agentic Payments via Pre-Execution Metadata Filtering. https://arxiv.org/abs/2604.11430 

**[19] arXiv preprint.** Five Attacks on x402 Agentic Payment Protocol. https://arxiv.org/abs/2605.11781 

**[20] arXiv preprint.** Free-Riding in the AI Economy: Logic Flaws in x402-Enabled Payment Systems. https://arxiv.org/abs/2605.30998 

**[21] arXiv preprint.** APEX: Agent Payment Execution with Policy for Autonomous Agent API Access. https://arxiv.org/abs/2604.02023 

SpendShield v0.1 | Page 23 

