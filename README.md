# SAFE — Spend Authorization Firewall for Agents

> A buyer-side payment firewall for AI agents. SAFE sits between an agent and the
> signer and decides — per request — whether a delegated payment is allowed to be
> signed and settled on Solana.

Built on the **x402** paid-API protocol and **Solana** fixed allowances. An agent
hits a paid resource, gets an HTTP `402` challenge, and asks SAFE to pay. SAFE
checks the request against a spend policy *before* anything is signed, then settles
approved payments through a local x402 facilitator.

```text
Solana allowance = hard spending boundary.
x402            = per-request paid API challenge.
SAFE            = policy firewall before signing.
Facilitator     = verifies and settles the signed payment transaction.
```

---

## Why it exists

AI agents that can spend money are dangerous without a hard boundary. A capped
Solana allowance limits *how much* can ever move; SAFE adds a policy layer that
limits *what* it can be spent on. Every payment is checked for:

- **Amount** — per-payment cap and total budget
- **Merchant** — only known/allowlisted merchants
- **Recipient** — settlement address must match the expected merchant
- **Category** — allow match-data/transit/food, block gambling/merch/etc.
- **Duplicate (replay)** — the same paid request cannot be charged twice
- **Intent scope** — payment must fit the user's stated intent
- **PII** — sensitive data in requests is redacted or blocked

Approved payments settle as real `transferFixed` devnet USDC transactions through
Solana Subscriptions/Allowances. Rejected payments never reach the signer.

---

## How it works

```text
User wallet ──creates capped allowance──▶ Solana devnet
User wallet ──sets policy + intent──────▶ SAFE
   AI agent ──requests paid resource────▶ x402 paid API ──402──▶ agent
   AI agent ──payment request───────────▶ SAFE ──approve/reject/redact──▶ agent
       SAFE ──approved x402 payload─────▶ local facilitator ──submit──▶ Solana
       SAFE ──audit log + dashboard────▶ User
```

SAFE does not replace x402 or Solana allowances — it sits between the agent and the
signer. Full diagrams and the on/off-chain boundary are in
[`docs/architecture.md`](docs/architecture.md).

---

## Quickstart (demo mode)

Demo mode (`SAFE_DEMO_MODE=true`) runs the full policy flow with mock settlement —
no wallet or on-chain setup required. Uses **pnpm**.

```bash
pnpm install
cp -n .env.example .env.local   # create .env.local if absent (defaults are demo-safe)
pnpm dev                        # http://localhost:3000
```

In a second terminal, run the match-day demo through the CLI:

```bash
pnpm safe doctor                # check the SAFE API is reachable + readiness
pnpm safe demo --prompt 'Let my match-day agent spend up to $5 on match data, transit, and food vouchers. Block gambling, merch, unknown merchants, and PII.'
```

> Use **single quotes** around any prompt containing `$5` so your shell does not
> expand it.

Add `--dry-run` to rehearse the policy decisions without settling anything.

---

## CLI

The CLI (`bin/safe.ts`) talks to the running SAFE API. Invoke via `pnpm safe <cmd>`:

| Command | What it does |
|---|---|
| `safe doctor` | Check the API is reachable and print readiness checks |
| `safe state` | Dump full readiness/state JSON |
| `safe demo --prompt "..." [--dry-run]` | Turn a natural-language budget into a policy and run the scripted x402 sequence |
| `safe pay <resourceUrl> [--dry-run]` | Pay a single x402 resource through SAFE |
| `safe agent run [--dry-run] [--scenario approved\|blocked\|full]` | Run the scripted dashboard agent |
| `safe audit` | Print the audit log JSON |

All commands accept `--base-url http://localhost:3000` (defaults to localhost).

---

## HTTP API

External agents should integrate over HTTP rather than importing the dashboard agent:

| Route | Purpose |
|---|---|
| `POST /api/safe/preflight` | **Advisory only** — normalizes the x402 requirement and evaluates policy. No settlement, no audit, no replay state. |
| `POST /api/safe/pay` | **Execution path** — fetches the x402 resource, parses the `402`, evaluates policy, settles approved/redacted decisions, writes audit, returns the paid response. `dryRun: true` skips settlement/audit/replay. |
| `POST /api/safe/demo/run` | CLI-first demo path — natural-language prompt → per-run policy → scripted x402 sequence → audit + dashboard transcript. |
| `GET /api/safe/state` | Current readiness + state. |
| `GET /api/safe/audit` | Audit log. |
| `GET /api/safe/demo/state` | Newest demo transcripts (polled by the dashboard). |

### SDK

A thin TypeScript client lives at [`lib/sdk/createSafeClient.ts`](lib/sdk/createSafeClient.ts).
See [`examples/basic-agent/`](examples/basic-agent/) for a minimal external agent:

```bash
pnpm exec tsx examples/basic-agent/run.ts --dry-run
```

---

## Live devnet setup

To settle real devnet USDC instead of mocking, switch off demo mode and provide
allowance signers. **Never paste private keys into chat or commit them** — keep them
in `.env.local` only.

1. Set `SAFE_DEMO_MODE=false` and fill the signer/allowance vars in `.env.local`
   (see [`.env.example`](.env.example)).
2. Preferred path: open the dashboard, connect a devnet wallet, initialize the
   subscription authority, then create the fixed allowance.
3. Verify on-chain state and run the smoke test:

```bash
pnpm safe:devnet:balances           # check wallet/ATA balances
pnpm safe:devnet:setup-token        # set up the demo USDC mint (if needed)
pnpm safe:devnet:setup-allowance    # create the fixed allowance (env-key path)
pnpm safe:devnet:smoke              # end-to-end settlement smoke test
pnpm safe:x402:public:verify        # probe a public x402 facilitator
```

Key env vars (full list in `.env.example`):

| Var | Meaning |
|---|---|
| `SAFE_DEMO_MODE` | `true` = mock settlement, `false` = live devnet |
| `NEXT_PUBLIC_SOLANA_CLUSTER` / `SOLANA_RPC_URL` | Cluster + RPC endpoint |
| `SAFE_*_SECRET_BASE58` / `SAFE_USER_SIGNER_BASE58` | Signer material (live mode) |
| `SAFE_DEMO_MINT` | Demo USDC mint address |
| `SAFE_ALLOWANCE_AMOUNT_ATOMIC_UNITS` | Allowance cap in atomic units |

> x402 boundary: SAFE's local facilitator allowlists the Solana
> Subscriptions/Allowances program and verifies inner token transfers. A *public*
> x402 facilitator may reject SAFE's allowance-backed `transferFixed` wrapper unless
> it enables the same smart-wallet verification.

---

## Project structure

```text
app/            Next.js routes + API endpoints (app/api/safe/*, /x402/*, /facilitator/*)
lib/            Core logic
  policy/         policy engine, replay guard, PII scanner, fingerprinting
  solana/         allowance setup, live settlement, runtime preflight
  x402/           payment requirements + payload builder
  facilitator/    local x402 facilitator + verifier
  safe/           payment service + types
  sdk/            createSafeClient (external integration)
  audit/          audit log
components/      dashboard panels + shadcn/ui components
bin/safe.ts     CLI entrypoint
examples/       basic external-agent example
scripts/devnet/ devnet setup + smoke scripts
skills/         external-agent integration skill
tests/          vitest suites (mirrors lib/ layout)
docs/           spec, architecture, pitch materials
```

---

## Testing

```bash
pnpm test          # vitest watch mode
pnpm test:run      # single run (CI)
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint
```

---

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui ·
`@solana/kit` · `@solana/subscriptions` · `@x402/core` / `@x402/next` / `@x402/svm` ·
Redis (`ioredis`) replay store · Zod · Vitest.

---

## Docs

- [Architecture](docs/architecture.md) — components, diagrams, on/off-chain boundary, flows
- [Product spec](docs/spec/safe-spec.md) — full Spend Authorization Firewall spec
- [Pitch deck](docs/pitch/hackathon-deck.html) · [Pitch notes](docs/pitch/pitch.md)
- [Implementation plans](docs/superpowers/plans/)
