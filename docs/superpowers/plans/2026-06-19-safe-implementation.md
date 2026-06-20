# SAFE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full SAFE hackathon app: a Next.js dashboard where a scripted agent calls x402-protected APIs, SAFE preflights each payment, approved payments settle through Solana allowance-backed devnet transactions, and blocked payments are shown in an audit log.

**Architecture:** Use a single Next.js App Router project at the repository root. Keep policy, x402 normalization, Solana allowance settlement, facilitator verification, agent orchestration, and audit logging as small TypeScript modules under `lib/`, with App Router API endpoints as thin wrappers. Ship the recommended MVP path first: real x402-shaped challenge/response, real Solana devnet fixed delegation settlement where environment and package APIs allow it, and a custom/mock facilitator verifier that demonstrates exact SVM outcome checks without claiming universal public facilitator compatibility.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, Vitest, Zod, `@x402/core`, `@x402/svm`, `@x402/next`, `@solana/kit`, `@solana/subscriptions`, `@solana-program/token`, Solana wallet adapter.

---

## Source References

- Product spec: `docs/spec/safe-spec.md`
- x402 exact docs: `https://docs.x402.org/schemes/exact`
- x402 SVM spec: `https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_svm.md`
- Solana fixed delegation: `https://solana.com/docs/payments/subscriptions/fixed-delegation`
- Solana recurring delegation: `https://solana.com/docs/payments/subscriptions/recurring-delegation`
- Next.js route handlers: route handler files export `GET`, `POST`, and other HTTP methods from `app/**/route.ts`.
- shadcn/ui setup: initialize with `pnpm dlx shadcn@latest init --defaults`; add components with `pnpm dlx shadcn@latest add ...`.
- Vitest setup: TypeScript tests use `.test.ts`; package script should run `vitest`.

## Commit Rule

Do not commit during execution unless the user explicitly asks for a commit. Each task has a checkpoint step with a recommended commit message only for use after explicit approval.

## File Map

Root config:
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `components.json`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

UI:
- Create: `components/dashboard/SafeDashboard.tsx`
- Create: `components/dashboard/PolicyPanel.tsx`
- Create: `components/dashboard/AgentRunPanel.tsx`
- Create: `components/dashboard/AuditTimeline.tsx`
- Create: `components/dashboard/PaymentFlowDiagram.tsx`
- Create: `components/dashboard/StatusMetric.tsx`
- Create: `components/ui/*` through shadcn CLI

Core domain:
- Create: `lib/types.ts`
- Create: `lib/constants.ts`
- Create: `lib/fixtures/merchants.ts`
- Create: `lib/fixtures/demoPolicy.ts`
- Create: `lib/policy/piiScanner.ts`
- Create: `lib/policy/replayGuard.ts`
- Create: `lib/policy/policyEngine.ts`
- Create: `lib/x402/paymentRequirements.ts`
- Create: `lib/x402/x402Client.ts`
- Create: `lib/x402/x402Payload.ts`
- Create: `lib/solana/addresses.ts`
- Create: `lib/solana/allowanceAdapter.ts`
- Create: `lib/solana/allowanceSettlement.ts`
- Create: `lib/facilitator/facilitatorVerifier.ts`
- Create: `lib/audit/auditLog.ts`
- Create: `lib/store/memoryStore.ts`
- Create: `lib/agent/worldCupAgent.ts`

API routes:
- Create: `app/api/policy/route.ts`
- Create: `app/api/intent/route.ts`
- Create: `app/api/preflight/route.ts`
- Create: `app/api/agent/run/route.ts`
- Create: `app/api/audit/route.ts`
- Create: `app/api/facilitator/verify/route.ts`
- Create: `app/api/facilitator/settle/route.ts`
- Create: `app/api/x402/stats/route.ts`
- Create: `app/api/x402/transit/route.ts`
- Create: `app/api/x402/food/route.ts`
- Create: `app/api/x402/fake-merch/route.ts`

Devnet scripts:
- Create: `scripts/devnet/setup-demo-token.ts`
- Create: `scripts/devnet/setup-fixed-allowance.ts`
- Create: `scripts/devnet/run-settlement-smoke.ts`
- Create: `.env.example`

Tests:
- Create: `tests/policy/piiScanner.test.ts`
- Create: `tests/policy/replayGuard.test.ts`
- Create: `tests/policy/policyEngine.test.ts`
- Create: `tests/x402/paymentRequirements.test.ts`
- Create: `tests/solana/addresses.test.ts`
- Create: `tests/facilitator/facilitatorVerifier.test.ts`
- Create: `tests/agent/worldCupAgent.test.ts`

---

### Task 1: Scaffold the Next.js App and Tooling

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/page.tsx`
- Create: `.env.example`

- [ ] **Step 1: Create `package.json`**

Use this initial package file:

```json
{
  "name": "safe-agent-payment-firewall",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "safe:devnet:setup-token": "tsx scripts/devnet/setup-demo-token.ts",
    "safe:devnet:setup-allowance": "tsx scripts/devnet/setup-fixed-allowance.ts",
    "safe:devnet:smoke": "tsx scripts/devnet/run-settlement-smoke.ts"
  },
  "dependencies": {
    "@hookform/resolvers": "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-label": "latest",
    "@radix-ui/react-progress": "latest",
    "@radix-ui/react-slot": "latest",
    "@radix-ui/react-switch": "latest",
    "@radix-ui/react-tabs": "latest",
    "@solana-program/token": "latest",
    "@solana/kit": "latest",
    "@solana/subscriptions": "latest",
    "@solana/wallet-adapter-react": "latest",
    "@solana/wallet-adapter-wallets": "latest",
    "@x402/core": "latest",
    "@x402/next": "latest",
    "@x402/svm": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "lucide-react": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-hook-form": "latest",
    "tailwind-merge": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@eslint/eslintrc": "latest",
    "@tailwindcss/postcss": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "tailwindcss": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` is created and install exits 0.

- [ ] **Step 3: Add TypeScript, Next, ESLint, Vitest, and CSS config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};

export default config;
```

Create `eslint.config.mjs`:

```js
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**"]
  }
];

export default eslintConfig;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname
    }
  }
});
```

Create `app/globals.css`:

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}

body {
  margin: 0;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAFE - Spend Authorization Firewall for Agents",
  description: "Payment firewall for x402 agents built first on Solana allowances."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">SAFE</h1>
      <p className="mt-2 text-sm text-neutral-600">Spend Authorization Firewall for Agents</p>
    </main>
  );
}
```

Create `.env.example`:

```bash
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SAFE_DEMO_MODE=true
SAFE_SESSION_SECRET_BASE58=
SAFE_FACILITATOR_SECRET_BASE58=
SAFE_DEMO_MINT=
SAFE_SUBSCRIPTION_PROGRAM_ID=
```

- [ ] **Step 4: Initialize shadcn/ui**

Run:

```bash
pnpm dlx shadcn@latest init --defaults
pnpm dlx shadcn@latest add button card table tabs dialog badge progress input label switch separator scroll-area tooltip alert
```

Expected: `components.json`, `lib/utils.ts`, and `components/ui/*` are created.

- [ ] **Step 5: Verify scaffold**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

Expected: typecheck, lint, and build pass. Vitest exits 0 with no tests or with an empty-suite warning depending on current Vitest behavior. If Vitest exits non-zero because no tests exist, add Task 2 tests before treating test verification as complete.

- [ ] **Step 6: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts app components lib .env.example components.json
git commit -m "chore: scaffold SAFE app"
```

---

### Task 2: Define Shared Types, Constants, Merchants, and Demo Policy

**Files:**
- Create: `lib/types.ts`
- Create: `lib/constants.ts`
- Create: `lib/fixtures/merchants.ts`
- Create: `lib/fixtures/demoPolicy.ts`
- Create: `tests/fixtures/demoPolicy.test.ts`

- [ ] **Step 1: Write fixture/type tests**

Create `tests/fixtures/demoPolicy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { MERCHANTS } from "@/lib/fixtures/merchants";
import { SOLANA_DEVNET_CHAIN_ID } from "@/lib/constants";

describe("demo fixtures", () => {
  it("uses the Solana devnet x402 rail", () => {
    expect(DEMO_POLICY.allowedRails).toContain("x402_solana_allowance_devnet");
    expect(DEMO_POLICY.network).toBe(SOLANA_DEVNET_CHAIN_ID);
  });

  it("has trusted merchants for the approved demo flow", () => {
    expect(MERCHANTS["stats-api.demo"].category).toBe("match_data");
    expect(MERCHANTS["transit-api.demo"].category).toBe("transit");
    expect(MERCHANTS["food-voucher.demo"].category).toBe("food_voucher");
  });

  it("marks fake merch as blocked", () => {
    expect(MERCHANTS["fake-merch.demo"].trustStatus).toBe("blocked");
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test:run tests/fixtures/demoPolicy.test.ts
```

Expected: fail because fixture files do not exist.

- [ ] **Step 3: Create shared types**

Create `lib/types.ts`:

```ts
export type DecisionAction =
  | "approve"
  | "reject"
  | "redact_and_approve"
  | "ask_human"
  | "update_allowance_required";

export type PaymentRail = "x402_solana_allowance_devnet";
export type PaymentScheme = "exact";
export type DemoToken = "DEMO_USD" | "USDC" | "USDG";
export type MerchantCategory = "match_data" | "transit" | "food_voucher" | "merch" | "gambling" | "unknown";

export interface MerchantRegistryEntry {
  merchantId: string;
  domain: string;
  displayName: string;
  category: MerchantCategory;
  recipientAddress: string;
  tokenMint: string;
  maxExpectedPriceUsdc: number;
  trustStatus: "trusted_demo" | "blocked";
}

export interface AllowanceDelegation {
  type: "fixed" | "recurring";
  delegationPda: string;
  subscriptionAuthorityPda: string;
  delegatee: string;
  delegatorAta: string;
  tokenMint: string;
  remainingAtomicUnits: string;
  expiresAt: string;
}

export interface SpendPolicy {
  policyId: string;
  scope: string;
  network: string;
  totalCapUsdc: number;
  perPaymentCapUsdc: number;
  perMerchantCapUsdc: number;
  expiresAt: string;
  allowedRails: PaymentRail[];
  allowedTokens: DemoToken[];
  allowedCategories: MerchantCategory[];
  blockedCategories: MerchantCategory[];
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
  allowance: AllowanceDelegation;
  ap2StyleIntentId: string;
}

export interface Ap2StyleIntent {
  intentId: string;
  userIntent: string;
  maxTotalUsdc: number;
  allowedDomains: string[];
  allowedCategories: MerchantCategory[];
  expiresAt: string;
  signature?: string;
}

export interface NormalizedPaymentRequest {
  requestId: string;
  rail: PaymentRail;
  scheme: PaymentScheme;
  network: string;
  amountUsdc: number;
  amountAtomicUnits: string;
  token: DemoToken;
  assetMint: string;
  recipientAddress: string;
  recipientAta: string;
  merchantDomain: string;
  merchantName: string;
  category: MerchantCategory;
  resourceUrl: string;
  description: string;
  reason: string;
  rawRequestHash: string;
  taskId: string;
  intentId: string;
  userIntent: string;
  x402: {
    paymentRequiredStatus: 402;
    payTo: string;
    feePayer: string;
    memo?: string;
    facilitatorUrl: string;
    paymentHeader?: string;
  };
  allowanceSettlement: {
    delegationType: "fixed" | "recurring";
    delegationPda: string;
    instruction: "transferFixed" | "transferRecurring";
    delegatee: string;
  };
}

export interface PolicyDecision {
  action: DecisionAction;
  approvedAmountUsdc?: number;
  reasonCode: string;
  reason: string;
  riskScore: number;
  sanitizedRequest?: NormalizedPaymentRequest;
  requiresUserAction: boolean;
  x402PaymentStatus?: "not_signed" | "signed" | "settled" | "settle_failed";
}

export interface AuditRecord {
  auditId: string;
  timestamp: string;
  policyId: string;
  paymentRequestHash: string;
  merchantDomain: string;
  amountUsdc: number;
  decision: DecisionAction;
  reasonCode: string;
  piiDetected: boolean;
  duplicateDetected: boolean;
  settlementStatus: "not_attempted" | "verified" | "settled" | "failed";
  txSignature?: string;
}

export interface X402AllowancePayload {
  x402Version: 2;
  accepted: {
    scheme: "exact";
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    extra: {
      feePayer: string;
      memo?: string;
    };
  };
  payload: {
    transaction: string;
  };
}

export interface AllowanceVerificationResult {
  valid: boolean;
  reasonCode: string;
  matchingTransferCount: number;
  innerTransferVerified: boolean;
  txSignature?: string;
}
```

- [ ] **Step 4: Create constants**

Create `lib/constants.ts`:

```ts
export const SOLANA_DEVNET_CHAIN_ID = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const DEMO_TOKEN_DECIMALS = 6;
export const DEMO_MINT_PLACEHOLDER = "DemoUsdMint111111111111111111111111111111111";
export const FACILITATOR_PAY_TO_PLACEHOLDER = "Facilitator111111111111111111111111111111111";
export const SAFE_SESSION_SIGNER_PLACEHOLDER = "SafeSession11111111111111111111111111111111";
export const DEMO_FACILITATOR_URL = "https://safe.local/facilitator";

export function usdcToAtomicUnits(amountUsdc: number): string {
  return Math.round(amountUsdc * 10 ** DEMO_TOKEN_DECIMALS).toString();
}
```

- [ ] **Step 5: Create merchant fixtures**

Create `lib/fixtures/merchants.ts`:

```ts
import { DEMO_MINT_PLACEHOLDER } from "@/lib/constants";
import type { MerchantRegistryEntry } from "@/lib/types";

export const MERCHANTS: Record<string, MerchantRegistryEntry> = {
  "stats-api.demo": {
    merchantId: "m_stats_api",
    domain: "stats-api.demo",
    displayName: "World Cup Stats API",
    category: "match_data",
    recipientAddress: "StatsMerchant111111111111111111111111111111",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.05,
    trustStatus: "trusted_demo"
  },
  "transit-api.demo": {
    merchantId: "m_transit_api",
    domain: "transit-api.demo",
    displayName: "Match Transit API",
    category: "transit",
    recipientAddress: "TransitMerchant1111111111111111111111111111",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.1,
    trustStatus: "trusted_demo"
  },
  "food-voucher.demo": {
    merchantId: "m_food_voucher",
    domain: "food-voucher.demo",
    displayName: "Food Voucher API",
    category: "food_voucher",
    recipientAddress: "FoodMerchant1111111111111111111111111111111",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.1,
    trustStatus: "trusted_demo"
  },
  "fake-merch.demo": {
    merchantId: "m_fake_merch",
    domain: "fake-merch.demo",
    displayName: "Fake Merch API",
    category: "merch",
    recipientAddress: "FakeMerchant1111111111111111111111111111111",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    maxExpectedPriceUsdc: 0.01,
    trustStatus: "blocked"
  }
};
```

- [ ] **Step 6: Create demo policy**

Create `lib/fixtures/demoPolicy.ts`:

```ts
import {
  DEMO_MINT_PLACEHOLDER,
  SAFE_SESSION_SIGNER_PLACEHOLDER,
  SOLANA_DEVNET_CHAIN_ID
} from "@/lib/constants";
import type { Ap2StyleIntent, SpendPolicy } from "@/lib/types";

export const DEMO_INTENT: Ap2StyleIntent = {
  intentId: "intent_wc_matchday_001",
  userIntent: "Plan my World Cup match day",
  maxTotalUsdc: 5,
  allowedDomains: ["stats-api.demo", "transit-api.demo", "food-voucher.demo"],
  allowedCategories: ["match_data", "transit", "food_voucher"],
  expiresAt: "2026-06-20T23:59:00+08:00"
};

export const DEMO_POLICY: SpendPolicy = {
  policyId: "pol_wc_matchday_001",
  scope: "world_cup_matchday",
  network: SOLANA_DEVNET_CHAIN_ID,
  totalCapUsdc: 5,
  perPaymentCapUsdc: 0.1,
  perMerchantCapUsdc: 1,
  expiresAt: "2026-06-20T23:59:00+08:00",
  allowedRails: ["x402_solana_allowance_devnet"],
  allowedTokens: ["DEMO_USD", "USDC", "USDG"],
  allowedCategories: ["match_data", "transit", "food_voucher"],
  blockedCategories: ["gambling", "merch", "unknown"],
  allowedDomains: DEMO_INTENT.allowedDomains,
  requireHumanApprovalAboveUsdc: 1,
  piiPolicy: {
    mode: "redact_or_block",
    blockedEntities: ["email", "phone", "passport", "hotel", "wallet_address", "government_id", "credit_card"]
  },
  replayPolicy: {
    idempotencyWindowSeconds: 300,
    blockDuplicatePaymentHash: true,
    blockDuplicateResourceRequest: true
  },
  allowance: {
    type: "fixed",
    delegationPda: "FixedDelegation1111111111111111111111111111",
    subscriptionAuthorityPda: "SubscriptionAuthority111111111111111111111",
    delegatee: SAFE_SESSION_SIGNER_PLACEHOLDER,
    delegatorAta: "DelegatorAta111111111111111111111111111111",
    tokenMint: DEMO_MINT_PLACEHOLDER,
    remainingAtomicUnits: "5000000",
    expiresAt: "2026-06-20T23:59:00+08:00"
  },
  ap2StyleIntentId: DEMO_INTENT.intentId
};
```

- [ ] **Step 7: Verify Task 2**

Run:

```bash
pnpm test:run tests/fixtures/demoPolicy.test.ts
pnpm typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 8: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add lib tests package.json pnpm-lock.yaml
git commit -m "feat: add SAFE domain fixtures"
```

---

### Task 3: Build PII Scanner, Replay Guard, and Policy Engine

**Files:**
- Create: `lib/policy/piiScanner.ts`
- Create: `lib/policy/replayGuard.ts`
- Create: `lib/policy/policyEngine.ts`
- Create: `tests/policy/piiScanner.test.ts`
- Create: `tests/policy/replayGuard.test.ts`
- Create: `tests/policy/policyEngine.test.ts`

- [ ] **Step 1: Add PII scanner tests**

Create `tests/policy/piiScanner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scanAndRedactPii } from "@/lib/policy/piiScanner";

describe("scanAndRedactPii", () => {
  it("detects and redacts email and hotel metadata", () => {
    const result = scanAndRedactPii("Email marcus@example.com at Hotel Central for shuttle pickup.");
    expect(result.detected).toBe(true);
    expect(result.entities).toContain("email");
    expect(result.entities).toContain("hotel");
    expect(result.redactedText).toBe("Email [REDACTED_EMAIL] at [REDACTED_HOTEL] for shuttle pickup.");
  });

  it("does not flag ordinary match data text", () => {
    const result = scanAndRedactPii("Need live stats for Argentina vs Japan.");
    expect(result.detected).toBe(false);
    expect(result.redactedText).toBe("Need live stats for Argentina vs Japan.");
  });
});
```

- [ ] **Step 2: Add replay guard tests**

Create `tests/policy/replayGuard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ReplayGuard } from "@/lib/policy/replayGuard";

describe("ReplayGuard", () => {
  it("blocks duplicate fingerprints within the configured window", () => {
    const guard = new ReplayGuard();
    const first = guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1000);
    const second = guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1100);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });

  it("allows the same fingerprint after expiry", () => {
    const guard = new ReplayGuard();
    guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 3, 1000);
    const later = guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 3, 5000);
    expect(later.duplicate).toBe(false);
  });
});
```

- [ ] **Step 3: Add policy engine tests**

Create `tests/policy/policyEngine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEMO_INTENT, DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { evaluatePolicy } from "@/lib/policy/policyEngine";
import type { NormalizedPaymentRequest } from "@/lib/types";

function request(overrides: Partial<NormalizedPaymentRequest> = {}): NormalizedPaymentRequest {
  return {
    requestId: "req_stats_001",
    rail: "x402_solana_allowance_devnet",
    scheme: "exact",
    network: DEMO_POLICY.network,
    amountUsdc: 0.02,
    amountAtomicUnits: "20000",
    token: "DEMO_USD",
    assetMint: DEMO_POLICY.allowance.tokenMint,
    recipientAddress: "StatsMerchant111111111111111111111111111111",
    recipientAta: "StatsMerchantAta111111111111111111111111111",
    merchantDomain: "stats-api.demo",
    merchantName: "World Cup Stats API",
    category: "match_data",
    resourceUrl: "https://stats-api.demo/live/argentina-vs-japan",
    description: "Live match stats",
    reason: "Agent needs live stats for match dashboard",
    rawRequestHash: "hash-req-stats-001",
    taskId: "task_matchday_plan_001",
    intentId: DEMO_INTENT.intentId,
    userIntent: DEMO_INTENT.userIntent,
    x402: {
      paymentRequiredStatus: 402,
      payTo: "StatsMerchant111111111111111111111111111111",
      feePayer: "Facilitator111111111111111111111111111111111",
      memo: "invoice_match_stats_001",
      facilitatorUrl: "https://safe.local/facilitator"
    },
    allowanceSettlement: {
      delegationType: "fixed",
      delegationPda: DEMO_POLICY.allowance.delegationPda,
      instruction: "transferFixed",
      delegatee: DEMO_POLICY.allowance.delegatee
    },
    ...overrides
  };
}

describe("evaluatePolicy", () => {
  it("approves a trusted in-policy request", () => {
    const decision = evaluatePolicy(request(), DEMO_POLICY, DEMO_INTENT, { duplicate: false });
    expect(decision.action).toBe("approve");
    expect(decision.reasonCode).toBe("POLICY_OK");
  });

  it("rejects a blocked merchant", () => {
    const decision = evaluatePolicy(
      request({ merchantDomain: "fake-merch.demo", category: "merch", amountUsdc: 0.05 }),
      DEMO_POLICY,
      DEMO_INTENT,
      { duplicate: false }
    );
    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("MERCHANT_NOT_ALLOWLISTED");
  });

  it("rejects over-limit requests before signing", () => {
    const decision = evaluatePolicy(request({ amountUsdc: 0.5, amountAtomicUnits: "500000" }), DEMO_POLICY, DEMO_INTENT, {
      duplicate: false
    });
    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("AMOUNT_OVER_PER_PAYMENT_CAP");
  });

  it("rejects duplicate requests", () => {
    const decision = evaluatePolicy(request(), DEMO_POLICY, DEMO_INTENT, { duplicate: true });
    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("DUPLICATE_PAYMENT_REQUEST");
  });

  it("redacts sensitive metadata when policy allows redaction", () => {
    const decision = evaluatePolicy(
      request({ reason: "Email marcus@example.com at Hotel Central for shuttle pickup." }),
      DEMO_POLICY,
      DEMO_INTENT,
      { duplicate: false }
    );
    expect(decision.action).toBe("redact_and_approve");
    expect(decision.reasonCode).toBe("PII_REDACTED");
    expect(decision.sanitizedRequest?.reason).toContain("[REDACTED_EMAIL]");
  });
});
```

- [ ] **Step 4: Run tests and confirm failure**

Run:

```bash
pnpm test:run tests/policy
```

Expected: fail because policy modules do not exist.

- [ ] **Step 5: Implement PII scanner**

Create `lib/policy/piiScanner.ts`:

```ts
export interface PiiScanResult {
  detected: boolean;
  entities: string[];
  redactedText: string;
}

const PATTERNS: Array<{ entity: string; regex: RegExp; replacement: string }> = [
  { entity: "email", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[REDACTED_EMAIL]" },
  { entity: "phone", regex: /\+?\d[\d\s().-]{7,}\d/g, replacement: "[REDACTED_PHONE]" },
  { entity: "credit_card", regex: /\b(?:\d[ -]*?){13,16}\b/g, replacement: "[REDACTED_CARD]" },
  { entity: "hotel", regex: /\bhotel\s+[A-Z][A-Za-z0-9 -]*/gi, replacement: "[REDACTED_HOTEL]" }
];

export function scanAndRedactPii(input: string): PiiScanResult {
  let redactedText = input;
  const entities = new Set<string>();

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(redactedText)) {
      entities.add(pattern.entity);
      redactedText = redactedText.replace(pattern.regex, pattern.replacement);
    }
    pattern.regex.lastIndex = 0;
  }

  return {
    detected: entities.size > 0,
    entities: [...entities],
    redactedText
  };
}
```

- [ ] **Step 6: Implement replay guard**

Create `lib/policy/replayGuard.ts`:

```ts
export interface ReplayCheckResult {
  duplicate: boolean;
  fingerprint: string;
  requestHash: string;
}

export class ReplayGuard {
  private readonly seen = new Map<string, { requestHash: string; expiresAtMs: number }>();

  checkAndRemember(
    fingerprint: string,
    requestHash: string,
    windowSeconds: number,
    nowMs = Date.now()
  ): ReplayCheckResult {
    this.prune(nowMs);
    const existing = this.seen.get(fingerprint);
    if (existing && existing.requestHash === requestHash && existing.expiresAtMs > nowMs) {
      return { duplicate: true, fingerprint, requestHash };
    }

    this.seen.set(fingerprint, {
      requestHash,
      expiresAtMs: nowMs + windowSeconds * 1000
    });
    return { duplicate: false, fingerprint, requestHash };
  }

  private prune(nowMs: number) {
    for (const [fingerprint, entry] of this.seen.entries()) {
      if (entry.expiresAtMs <= nowMs) {
        this.seen.delete(fingerprint);
      }
    }
  }
}
```

- [ ] **Step 7: Implement policy engine**

Create `lib/policy/policyEngine.ts`:

```ts
import { scanAndRedactPii } from "@/lib/policy/piiScanner";
import type { Ap2StyleIntent, NormalizedPaymentRequest, PolicyDecision, SpendPolicy } from "@/lib/types";

interface ReplayInput {
  duplicate: boolean;
}

function reject(reasonCode: string, reason: string, riskScore: number): PolicyDecision {
  return {
    action: "reject",
    reasonCode,
    reason,
    riskScore,
    requiresUserAction: false,
    x402PaymentStatus: "not_signed"
  };
}

export function evaluatePolicy(
  request: NormalizedPaymentRequest,
  policy: SpendPolicy,
  intent: Ap2StyleIntent,
  replay: ReplayInput
): PolicyDecision {
  if (!policy.allowedRails.includes(request.rail)) {
    return reject("RAIL_NOT_ALLOWED", "The payment rail is not allowed by policy.", 0.7);
  }

  if (request.scheme !== "exact" || request.network !== policy.network) {
    return reject("X402_REQUIREMENT_MISMATCH", "The x402 scheme or network does not match policy.", 0.75);
  }

  if (request.amountUsdc > policy.perPaymentCapUsdc) {
    return reject("AMOUNT_OVER_PER_PAYMENT_CAP", "The requested payment exceeds the per-payment cap.", 0.8);
  }

  if (BigInt(request.amountAtomicUnits) > BigInt(policy.allowance.remainingAtomicUnits)) {
    return reject("ALLOWANCE_CAP_EXCEEDED", "The allowance does not have enough remaining capacity.", 0.9);
  }

  if (!policy.allowedDomains.includes(request.merchantDomain)) {
    return reject("MERCHANT_NOT_ALLOWLISTED", `${request.merchantDomain} is not allowlisted.`, 0.82);
  }

  if (policy.blockedCategories.includes(request.category) || !policy.allowedCategories.includes(request.category)) {
    return reject("CATEGORY_NOT_ALLOWED", `${request.category} is not allowed for this agent session.`, 0.78);
  }

  if (!intent.allowedDomains.includes(request.merchantDomain) || !intent.allowedCategories.includes(request.category)) {
    return reject("INTENT_SCOPE_MISMATCH", "The payment does not match the AP2-style intent scope.", 0.76);
  }

  if (replay.duplicate) {
    return reject("DUPLICATE_PAYMENT_REQUEST", "This payment request was already approved or evaluated recently.", 0.71);
  }

  const pii = scanAndRedactPii(`${request.resourceUrl} ${request.description} ${request.reason} ${request.x402.memo ?? ""}`);
  if (pii.detected && policy.piiPolicy.mode === "block") {
    return reject("PII_BLOCKED", "Sensitive metadata was detected and policy requires blocking.", 0.85);
  }

  if (pii.detected) {
    return {
      action: "redact_and_approve",
      approvedAmountUsdc: request.amountUsdc,
      reasonCode: "PII_REDACTED",
      reason: "Sensitive metadata was redacted before payment signing.",
      riskScore: 0.22,
      sanitizedRequest: {
        ...request,
        reason: scanAndRedactPii(request.reason).redactedText,
        description: scanAndRedactPii(request.description).redactedText,
        x402: {
          ...request.x402,
          memo: request.x402.memo ? scanAndRedactPii(request.x402.memo).redactedText : request.x402.memo
        }
      },
      requiresUserAction: false,
      x402PaymentStatus: "not_signed"
    };
  }

  return {
    action: "approve",
    approvedAmountUsdc: request.amountUsdc,
    reasonCode: "POLICY_OK",
    reason: "Allowed merchant, category, amount, intent, and metadata.",
    riskScore: 0.08,
    sanitizedRequest: request,
    requiresUserAction: false,
    x402PaymentStatus: "not_signed"
  };
}
```

- [ ] **Step 8: Verify Task 3**

Run:

```bash
pnpm test:run tests/policy
pnpm typecheck
```

Expected: all policy tests pass and typecheck exits 0.

- [ ] **Step 9: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add lib/policy tests/policy
git commit -m "feat: add SAFE policy engine"
```

---

### Task 4: Build x402 Payment Requirements, Normalizer, and Paid API Routes

**Files:**
- Create: `lib/x402/paymentRequirements.ts`
- Create: `app/api/x402/stats/route.ts`
- Create: `app/api/x402/transit/route.ts`
- Create: `app/api/x402/food/route.ts`
- Create: `app/api/x402/fake-merch/route.ts`
- Create: `tests/x402/paymentRequirements.test.ts`

- [ ] **Step 1: Add normalizer tests**

Create `tests/x402/paymentRequirements.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDemoPaymentRequirement, normalizePaymentRequirement } from "@/lib/x402/paymentRequirements";

describe("x402 payment requirements", () => {
  it("normalizes a trusted stats API challenge", () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    const normalized = normalizePaymentRequirement(requirement);
    expect(normalized.merchantDomain).toBe("stats-api.demo");
    expect(normalized.amountUsdc).toBe(0.02);
    expect(normalized.scheme).toBe("exact");
    expect(normalized.rail).toBe("x402_solana_allowance_devnet");
  });

  it("normalizes fake merch as a blocked category candidate", () => {
    const requirement = createDemoPaymentRequirement("fake-merch.demo", "/jersey", "task-1");
    const normalized = normalizePaymentRequirement(requirement);
    expect(normalized.merchantDomain).toBe("fake-merch.demo");
    expect(normalized.category).toBe("merch");
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test:run tests/x402/paymentRequirements.test.ts
```

Expected: fail because `lib/x402/paymentRequirements.ts` does not exist.

- [ ] **Step 3: Implement payment requirements**

Create `lib/x402/paymentRequirements.ts`:

```ts
import crypto from "node:crypto";
import { DEMO_FACILITATOR_URL, FACILITATOR_PAY_TO_PLACEHOLDER, SOLANA_DEVNET_CHAIN_ID, usdcToAtomicUnits } from "@/lib/constants";
import { DEMO_INTENT, DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { MERCHANTS } from "@/lib/fixtures/merchants";
import type { MerchantRegistryEntry, NormalizedPaymentRequest } from "@/lib/types";

export interface DemoPaymentRequirement {
  x402Version: 2;
  scheme: "exact";
  network: string;
  amount: string;
  amountUsdc: number;
  asset: string;
  payTo: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  extra: {
    merchantDomain: string;
    feePayer: string;
    memo: string;
    taskId: string;
  };
}

const PRICE_BY_DOMAIN: Record<string, number> = {
  "stats-api.demo": 0.02,
  "transit-api.demo": 0.05,
  "food-voucher.demo": 0.05,
  "fake-merch.demo": 0.5
};

function requirementForMerchant(merchant: MerchantRegistryEntry, resourcePath: string, taskId: string): DemoPaymentRequirement {
  const amountUsdc = PRICE_BY_DOMAIN[merchant.domain] ?? merchant.maxExpectedPriceUsdc;
  return {
    x402Version: 2,
    scheme: "exact",
    network: SOLANA_DEVNET_CHAIN_ID,
    amount: usdcToAtomicUnits(amountUsdc),
    amountUsdc,
    asset: merchant.tokenMint,
    payTo: merchant.recipientAddress,
    resource: `https://${merchant.domain}${resourcePath}`,
    description: `${merchant.displayName} paid resource`,
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
    extra: {
      merchantDomain: merchant.domain,
      feePayer: FACILITATOR_PAY_TO_PLACEHOLDER,
      memo: `invoice_${merchant.merchantId}_${taskId}`,
      taskId
    }
  };
}

export function createDemoPaymentRequirement(domain: string, resourcePath: string, taskId: string): DemoPaymentRequirement {
  const merchant = MERCHANTS[domain];
  if (!merchant) {
    throw new Error(`Unknown merchant domain: ${domain}`);
  }
  return requirementForMerchant(merchant, resourcePath, taskId);
}

export function createPaymentRequiredResponse(requirement: DemoPaymentRequirement): Response {
  return Response.json(
    {
      error: "X402_PAYMENT_REQUIRED",
      accepts: [requirement]
    },
    {
      status: 402,
      headers: {
        "x-accept-payment": Buffer.from(JSON.stringify(requirement)).toString("base64")
      }
    }
  );
}

export function normalizePaymentRequirement(requirement: DemoPaymentRequirement): NormalizedPaymentRequest {
  const merchant = MERCHANTS[requirement.extra.merchantDomain];
  if (!merchant) {
    throw new Error(`Unknown merchant domain: ${requirement.extra.merchantDomain}`);
  }

  const rawRequestHash = crypto.createHash("sha256").update(JSON.stringify(requirement)).digest("hex");
  return {
    requestId: `req_${rawRequestHash.slice(0, 12)}`,
    rail: "x402_solana_allowance_devnet",
    scheme: requirement.scheme,
    network: requirement.network,
    amountUsdc: requirement.amountUsdc,
    amountAtomicUnits: requirement.amount,
    token: "DEMO_USD",
    assetMint: requirement.asset,
    recipientAddress: requirement.payTo,
    recipientAta: `${requirement.payTo}:ata:${requirement.asset}`,
    merchantDomain: merchant.domain,
    merchantName: merchant.displayName,
    category: merchant.category,
    resourceUrl: requirement.resource,
    description: requirement.description,
    reason: "Agent needs this paid resource to complete the World Cup match-day task.",
    rawRequestHash,
    taskId: requirement.extra.taskId,
    intentId: DEMO_INTENT.intentId,
    userIntent: DEMO_INTENT.userIntent,
    x402: {
      paymentRequiredStatus: 402,
      payTo: requirement.payTo,
      feePayer: requirement.extra.feePayer,
      memo: requirement.extra.memo,
      facilitatorUrl: DEMO_FACILITATOR_URL
    },
    allowanceSettlement: {
      delegationType: "fixed",
      delegationPda: DEMO_POLICY.allowance.delegationPda,
      instruction: "transferFixed",
      delegatee: DEMO_POLICY.allowance.delegatee
    }
  };
}
```

- [ ] **Step 4: Create paid API routes**

Each route should return protected content only when a `payment` query param or `x-payment` header is present. Otherwise it returns HTTP 402.

Create `app/api/x402/stats/route.ts`:

```ts
import { createDemoPaymentRequirement, createPaymentRequiredResponse } from "@/lib/x402/paymentRequirements";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paid = url.searchParams.get("payment") === "settled" || request.headers.has("x-payment");
  if (!paid) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task_matchday_plan_001"));
  }
  return Response.json({ match: "Argentina vs Japan", minute: 72, score: "2-1", x402: "paid" });
}
```

Create `app/api/x402/transit/route.ts`:

```ts
import { createDemoPaymentRequirement, createPaymentRequiredResponse } from "@/lib/x402/paymentRequirements";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paid = url.searchParams.get("payment") === "settled" || request.headers.has("x-payment");
  if (!paid) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("transit-api.demo", "/route/stadium", "task_matchday_plan_001"));
  }
  return Response.json({ route: "Metro M2 to Stadium Gate B", etaMinutes: 18, x402: "paid" });
}
```

Create `app/api/x402/food/route.ts`:

```ts
import { createDemoPaymentRequirement, createPaymentRequiredResponse } from "@/lib/x402/paymentRequirements";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paid = url.searchParams.get("payment") === "settled" || request.headers.has("x-payment");
  if (!paid) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("food-voucher.demo", "/voucher/halftime", "task_matchday_plan_001"));
  }
  return Response.json({ voucher: "Halftime meal voucher", value: "5% off", x402: "paid" });
}
```

Create `app/api/x402/fake-merch/route.ts`:

```ts
import { createDemoPaymentRequirement, createPaymentRequiredResponse } from "@/lib/x402/paymentRequirements";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paid = url.searchParams.get("payment") === "settled" || request.headers.has("x-payment");
  if (!paid) {
    return createPaymentRequiredResponse(createDemoPaymentRequirement("fake-merch.demo", "/jersey", "task_matchday_plan_001"));
  }
  return Response.json({ item: "Unofficial jersey", x402: "paid" });
}
```

- [ ] **Step 5: Verify Task 4**

Run:

```bash
pnpm test:run tests/x402/paymentRequirements.test.ts
pnpm typecheck
pnpm lint
```

Expected: tests, typecheck, and lint pass.

- [ ] **Step 6: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add lib/x402 app/api/x402 tests/x402
git commit -m "feat: add x402 payment challenge routes"
```

---

### Task 5: Add Audit Log and In-Memory Store

**Files:**
- Create: `lib/audit/auditLog.ts`
- Create: `lib/store/memoryStore.ts`
- Create: `app/api/audit/route.ts`

- [ ] **Step 1: Implement audit log and store**

Create `lib/audit/auditLog.ts`:

```ts
import type { AuditRecord, NormalizedPaymentRequest, PolicyDecision } from "@/lib/types";

export function createAuditRecord(
  request: NormalizedPaymentRequest,
  decision: PolicyDecision,
  settlementStatus: AuditRecord["settlementStatus"],
  txSignature?: string
): AuditRecord {
  return {
    auditId: `audit_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    policyId: "pol_wc_matchday_001",
    paymentRequestHash: request.rawRequestHash,
    merchantDomain: request.merchantDomain,
    amountUsdc: request.amountUsdc,
    decision: decision.action,
    reasonCode: decision.reasonCode,
    piiDetected: decision.reasonCode === "PII_REDACTED" || decision.reasonCode === "PII_BLOCKED",
    duplicateDetected: decision.reasonCode === "DUPLICATE_PAYMENT_REQUEST",
    settlementStatus,
    txSignature
  };
}
```

Create `lib/store/memoryStore.ts`:

```ts
import { DEMO_INTENT, DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { ReplayGuard } from "@/lib/policy/replayGuard";
import type { AuditRecord } from "@/lib/types";

const auditRecords: AuditRecord[] = [];

export const memoryStore = {
  policy: DEMO_POLICY,
  intent: DEMO_INTENT,
  replayGuard: new ReplayGuard(),
  appendAudit(record: AuditRecord) {
    auditRecords.unshift(record);
    return record;
  },
  listAudit() {
    return auditRecords;
  },
  clearAudit() {
    auditRecords.length = 0;
  },
  resetReplay() {
    this.replayGuard = new ReplayGuard();
  }
};
```

- [ ] **Step 2: Add audit API route**

Create `app/api/audit/route.ts`:

```ts
import { memoryStore } from "@/lib/store/memoryStore";

export async function GET() {
  return Response.json({ records: memoryStore.listAudit() });
}
```

- [ ] **Step 3: Verify Task 5**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: typecheck and lint pass.

- [ ] **Step 4: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add lib/audit lib/store app/api/audit
git commit -m "feat: add audit store"
```

---

### Task 6: Build Preflight API and Agent Runner

**Files:**
- Create: `app/api/preflight/route.ts`
- Create: `app/api/policy/route.ts`
- Create: `app/api/intent/route.ts`
- Create: `lib/agent/worldCupAgent.ts`
- Create: `app/api/agent/run/route.ts`
- Create: `tests/agent/worldCupAgent.test.ts`

- [ ] **Step 1: Add agent runner test**

Create `tests/agent/worldCupAgent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runWorldCupAgentScenario } from "@/lib/agent/worldCupAgent";
import { memoryStore } from "@/lib/store/memoryStore";

describe("runWorldCupAgentScenario", () => {
  it("approves safe requests and blocks unsafe requests", async () => {
    memoryStore.clearAudit();
    memoryStore.resetReplay();
    const result = await runWorldCupAgentScenario();
    expect(result.attempts).toHaveLength(6);
    expect(result.attempts.some((attempt) => attempt.decision.reasonCode === "POLICY_OK")).toBe(true);
    expect(result.attempts.some((attempt) => attempt.decision.reasonCode === "MERCHANT_NOT_ALLOWLISTED")).toBe(true);
    expect(result.attempts.some((attempt) => attempt.decision.reasonCode === "DUPLICATE_PAYMENT_REQUEST")).toBe(true);
    expect(memoryStore.listAudit().length).toBe(5);
  });
});
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```bash
pnpm test:run tests/agent/worldCupAgent.test.ts
```

Expected: fail because `worldCupAgent.ts` does not exist.

- [ ] **Step 3: Implement preflight route**

Create `app/api/preflight/route.ts`:

```ts
import { createAuditRecord } from "@/lib/audit/auditLog";
import { memoryStore } from "@/lib/store/memoryStore";
import { normalizePaymentRequirement, type DemoPaymentRequirement } from "@/lib/x402/paymentRequirements";
import { evaluatePolicy } from "@/lib/policy/policyEngine";

export async function POST(request: Request) {
  const body = (await request.json()) as { requirement: DemoPaymentRequirement };
  const normalized = normalizePaymentRequirement(body.requirement);
  const replay = memoryStore.replayGuard.checkAndRemember(
    `${normalized.merchantDomain}:${normalized.amountAtomicUnits}:${normalized.resourceUrl}`,
    normalized.rawRequestHash,
    memoryStore.policy.replayPolicy.idempotencyWindowSeconds
  );
  const decision = evaluatePolicy(normalized, memoryStore.policy, memoryStore.intent, replay);
  memoryStore.appendAudit(createAuditRecord(normalized, decision, "not_attempted"));
  return Response.json({ normalized, decision });
}
```

Create `app/api/policy/route.ts`:

```ts
import { memoryStore } from "@/lib/store/memoryStore";

export async function GET() {
  return Response.json({ policy: memoryStore.policy });
}

export async function POST() {
  return Response.json({ policy: memoryStore.policy });
}
```

Create `app/api/intent/route.ts`:

```ts
import { memoryStore } from "@/lib/store/memoryStore";

export async function GET() {
  return Response.json({ intent: memoryStore.intent });
}

export async function POST() {
  return Response.json({ intent: memoryStore.intent });
}
```

- [ ] **Step 4: Implement agent runner**

Create `lib/agent/worldCupAgent.ts`:

```ts
import { createAuditRecord } from "@/lib/audit/auditLog";
import { memoryStore } from "@/lib/store/memoryStore";
import type { NormalizedPaymentRequest, PolicyDecision } from "@/lib/types";
import { createDemoPaymentRequirement, normalizePaymentRequirement } from "@/lib/x402/paymentRequirements";
import { evaluatePolicy } from "@/lib/policy/policyEngine";

export interface AgentAttempt {
  label: string;
  request: NormalizedPaymentRequest;
  decision: PolicyDecision;
}

function evaluate(label: string, domain: string, path: string, mutate?: (request: NormalizedPaymentRequest) => NormalizedPaymentRequest): AgentAttempt {
  const requirement = createDemoPaymentRequirement(domain, path, "task_matchday_plan_001");
  const normalized = mutate ? mutate(normalizePaymentRequirement(requirement)) : normalizePaymentRequirement(requirement);
  const replay = memoryStore.replayGuard.checkAndRemember(
    `${normalized.merchantDomain}:${normalized.amountAtomicUnits}:${normalized.resourceUrl}`,
    normalized.rawRequestHash,
    memoryStore.policy.replayPolicy.idempotencyWindowSeconds
  );
  const decision = evaluatePolicy(normalized, memoryStore.policy, memoryStore.intent, replay);
  memoryStore.appendAudit(createAuditRecord(normalized, decision, decision.action === "approve" || decision.action === "redact_and_approve" ? "verified" : "not_attempted"));
  return { label, request: normalized, decision };
}

export async function runWorldCupAgentScenario() {
  memoryStore.clearAudit();
  memoryStore.resetReplay();
  const stats = evaluate("Approved match stats", "stats-api.demo", "/live/argentina-vs-japan");
  const transit = evaluate("Approved transit route", "transit-api.demo", "/route/stadium");
  const food = evaluate("Approved food voucher", "food-voucher.demo", "/voucher/halftime");
  const fake = evaluate("Blocked fake merch", "fake-merch.demo", "/jersey");
  const duplicate = evaluate("Blocked duplicate stats", "stats-api.demo", "/live/argentina-vs-japan");
  const pii = evaluate("Redacted metadata leak", "stats-api.demo", "/live/pii", (request) => ({
    ...request,
    requestId: "req_pii_stats_001",
    rawRequestHash: "hash-pii-stats-001",
    reason: "Email marcus@example.com at Hotel Central for shuttle pickup."
  }));

  return {
    attempts: [stats, transit, food, fake, duplicate, pii],
    audit: memoryStore.listAudit()
  };
}
```

- [ ] **Step 5: Add agent API route**

Create `app/api/agent/run/route.ts`:

```ts
import { runWorldCupAgentScenario } from "@/lib/agent/worldCupAgent";

export async function POST() {
  const result = await runWorldCupAgentScenario();
  return Response.json(result);
}
```

- [ ] **Step 6: Verify Task 6**

Run:

```bash
pnpm test:run tests/agent/worldCupAgent.test.ts tests/policy tests/x402
pnpm typecheck
pnpm lint
```

Expected: tests, typecheck, and lint pass.

- [ ] **Step 7: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add app/api lib/agent tests/agent
git commit -m "feat: add SAFE preflight agent flow"
```

---

### Task 7: Implement Solana Address Helpers and Allowance Adapter

**Files:**
- Create: `lib/solana/addresses.ts`
- Create: `lib/solana/allowanceAdapter.ts`
- Create: `tests/solana/addresses.test.ts`
- Create: `scripts/devnet/setup-demo-token.ts`
- Create: `scripts/devnet/setup-fixed-allowance.ts`

- [ ] **Step 1: Add address helper tests**

Create `tests/solana/addresses.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveDemoAtaLabel, isLiveSolanaMode } from "@/lib/solana/addresses";

describe("solana address helpers", () => {
  it("creates deterministic demo ATA labels for mock verification", () => {
    expect(deriveDemoAtaLabel("owner", "mint")).toBe("owner:ata:mint");
  });

  it("defaults to demo mode unless SAFE_DEMO_MODE is false", () => {
    expect(isLiveSolanaMode({ SAFE_DEMO_MODE: "true" })).toBe(false);
    expect(isLiveSolanaMode({ SAFE_DEMO_MODE: "false" })).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test:run tests/solana/addresses.test.ts
```

Expected: fail because Solana helper module does not exist.

- [ ] **Step 3: Implement address helpers**

Create `lib/solana/addresses.ts`:

```ts
export function deriveDemoAtaLabel(owner: string, mint: string): string {
  return `${owner}:ata:${mint}`;
}

export function isLiveSolanaMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SAFE_DEMO_MODE === "false";
}
```

- [ ] **Step 4: Implement allowance adapter shell**

Create `lib/solana/allowanceAdapter.ts`:

```ts
import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import type { AllowanceDelegation } from "@/lib/types";

export interface AllowanceState {
  delegation: AllowanceDelegation;
  liveMode: boolean;
  explorerUrl?: string;
}

export async function getAllowanceState(): Promise<AllowanceState> {
  return {
    delegation: DEMO_POLICY.allowance,
    liveMode: process.env.SAFE_DEMO_MODE === "false",
    explorerUrl: process.env.SAFE_DEMO_ALLOWANCE_SIGNATURE
      ? `https://explorer.solana.com/tx/${process.env.SAFE_DEMO_ALLOWANCE_SIGNATURE}?cluster=devnet`
      : undefined
  };
}
```

- [ ] **Step 5: Add devnet setup scripts**

Create `scripts/devnet/setup-demo-token.ts`:

```ts
console.log("SAFE devnet token setup");
console.log("Required output for live execution: SAFE_DEMO_MINT, user ATA, merchant ATAs, and funded delegate/facilitator accounts.");
console.log("Demo mode uses fixture token addresses. Live mode is completed in Task 7 Step 7 after package APIs are confirmed.");
```

Create `scripts/devnet/setup-fixed-allowance.ts`:

```ts
console.log("SAFE fixed allowance setup");
console.log("Required output for live execution: subscription authority PDA, fixed delegation PDA, delegator ATA, delegatee, and setup signature.");
console.log("Use @solana/subscriptions createFixedDelegation with the connected user as delegator and SAFE session signer as delegatee.");
```

- [ ] **Step 6: Verify Task 7**

Run:

```bash
pnpm test:run tests/solana/addresses.test.ts
pnpm typecheck
```

Expected: test and typecheck pass.

- [ ] **Step 7: Live-mode implementation checkpoint**

Before implementing live devnet scripts, run:

```bash
pnpm view @solana/subscriptions version
pnpm view @solana/kit version
pnpm view @solana-program/token version
```

Expected currently observed package families:

```text
@solana/subscriptions: 0.3.x
@solana/kit: 6.x
@solana-program/token: 0.14.x
```

Then update `scripts/devnet/setup-demo-token.ts` and `scripts/devnet/setup-fixed-allowance.ts` against the installed package APIs. Verification for live mode is:

```bash
cp .env.example .env.local
pnpm safe:devnet:setup-token
pnpm safe:devnet:setup-allowance
```

Expected: scripts print devnet mint, token accounts, fixed delegation PDA, setup transaction signature, and explorer URLs.

- [ ] **Step 8: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add lib/solana scripts/devnet tests/solana .env.example
git commit -m "feat: add Solana allowance adapter shell"
```

---

### Task 8: Build Allowance Settlement Payload and Facilitator Verifier

**Files:**
- Create: `lib/solana/allowanceSettlement.ts`
- Create: `lib/x402/x402Payload.ts`
- Create: `lib/facilitator/facilitatorVerifier.ts`
- Create: `app/api/facilitator/verify/route.ts`
- Create: `app/api/facilitator/settle/route.ts`
- Create: `tests/facilitator/facilitatorVerifier.test.ts`
- Create: `scripts/devnet/run-settlement-smoke.ts`

- [ ] **Step 1: Add facilitator verifier tests**

Create `tests/facilitator/facilitatorVerifier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

function request(): NormalizedPaymentRequest {
  return {
    requestId: "req_1",
    rail: "x402_solana_allowance_devnet",
    scheme: "exact",
    network: DEMO_POLICY.network,
    amountUsdc: 0.02,
    amountAtomicUnits: "20000",
    token: "DEMO_USD",
    assetMint: DEMO_POLICY.allowance.tokenMint,
    recipientAddress: "StatsMerchant111111111111111111111111111111",
    recipientAta: "StatsMerchant111111111111111111111111111111:ata:DemoUsdMint111111111111111111111111111111111",
    merchantDomain: "stats-api.demo",
    merchantName: "World Cup Stats API",
    category: "match_data",
    resourceUrl: "https://stats-api.demo/live",
    description: "Live stats",
    reason: "Agent needs stats",
    rawRequestHash: "hash",
    taskId: "task",
    intentId: "intent",
    userIntent: "Plan my World Cup match day",
    x402: {
      paymentRequiredStatus: 402,
      payTo: "StatsMerchant111111111111111111111111111111",
      feePayer: "Facilitator111111111111111111111111111111111",
      memo: "invoice",
      facilitatorUrl: "https://safe.local/facilitator"
    },
    allowanceSettlement: {
      delegationType: "fixed",
      delegationPda: DEMO_POLICY.allowance.delegationPda,
      instruction: "transferFixed",
      delegatee: DEMO_POLICY.allowance.delegatee
    }
  };
}

function payload(): X402AllowancePayload {
  return {
    x402Version: 2,
    accepted: {
      scheme: "exact",
      network: DEMO_POLICY.network,
      amount: "20000",
      asset: DEMO_POLICY.allowance.tokenMint,
      payTo: "StatsMerchant111111111111111111111111111111",
      extra: {
        feePayer: "Facilitator111111111111111111111111111111111",
        memo: "invoice"
      }
    },
    payload: {
      transaction: Buffer.from(
        JSON.stringify({
          mode: "demo",
          transfer: {
            mint: DEMO_POLICY.allowance.tokenMint,
            amount: "20000",
            destinationAta: "StatsMerchant111111111111111111111111111111:ata:DemoUsdMint111111111111111111111111111111111",
            tokenProgram: "spl-token",
            inner: true
          }
        })
      ).toString("base64")
    }
  };
}

describe("verifyAllowancePaymentOutcome", () => {
  it("accepts exactly one matching demo transfer", async () => {
    const result = await verifyAllowancePaymentOutcome(payload(), request());
    expect(result.valid).toBe(true);
    expect(result.matchingTransferCount).toBe(1);
    expect(result.innerTransferVerified).toBe(true);
  });

  it("rejects amount mismatch", async () => {
    const bad = payload();
    bad.accepted.amount = "10000";
    const result = await verifyAllowancePaymentOutcome(bad, request());
    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("AMOUNT_MISMATCH");
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test:run tests/facilitator/facilitatorVerifier.test.ts
```

Expected: fail because verifier module does not exist.

- [ ] **Step 3: Implement x402 payload builder**

Create `lib/x402/x402Payload.ts`:

```ts
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

export function createDemoX402AllowancePayload(request: NormalizedPaymentRequest): X402AllowancePayload {
  const transaction = Buffer.from(
    JSON.stringify({
      mode: "demo",
      instruction: request.allowanceSettlement.instruction,
      transfer: {
        mint: request.assetMint,
        amount: request.amountAtomicUnits,
        destinationAta: request.recipientAta,
        tokenProgram: "spl-token",
        inner: true
      }
    })
  ).toString("base64");

  return {
    x402Version: 2,
    accepted: {
      scheme: "exact",
      network: request.network,
      amount: request.amountAtomicUnits,
      asset: request.assetMint,
      payTo: request.x402.payTo,
      extra: {
        feePayer: request.x402.feePayer,
        memo: request.x402.memo
      }
    },
    payload: {
      transaction
    }
  };
}
```

- [ ] **Step 4: Implement allowance settlement builder**

Create `lib/solana/allowanceSettlement.ts`:

```ts
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";
import { createDemoX402AllowancePayload } from "@/lib/x402/x402Payload";

export async function buildAllowanceBackedPaymentPayload(request: NormalizedPaymentRequest): Promise<X402AllowancePayload> {
  if (process.env.SAFE_DEMO_MODE === "false") {
    throw new Error("Live Solana settlement builder requires Task 8 Step 8 before live demo execution.");
  }
  return createDemoX402AllowancePayload(request);
}
```

- [ ] **Step 5: Implement facilitator verifier**

Create `lib/facilitator/facilitatorVerifier.ts`:

```ts
import type { AllowanceVerificationResult, NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

interface DemoSerializedTransaction {
  mode: "demo";
  transfer?: {
    mint: string;
    amount: string;
    destinationAta: string;
    tokenProgram: string;
    inner: boolean;
  };
}

function decodeDemoTransaction(payload: X402AllowancePayload): DemoSerializedTransaction | null {
  try {
    return JSON.parse(Buffer.from(payload.payload.transaction, "base64").toString("utf8")) as DemoSerializedTransaction;
  } catch {
    return null;
  }
}

export async function verifyAllowancePaymentOutcome(
  payload: X402AllowancePayload,
  request: NormalizedPaymentRequest
): Promise<AllowanceVerificationResult> {
  if (payload.accepted.network !== request.network) {
    return { valid: false, reasonCode: "NETWORK_MISMATCH", matchingTransferCount: 0, innerTransferVerified: false };
  }
  if (payload.accepted.amount !== request.amountAtomicUnits) {
    return { valid: false, reasonCode: "AMOUNT_MISMATCH", matchingTransferCount: 0, innerTransferVerified: false };
  }
  if (payload.accepted.asset !== request.assetMint) {
    return { valid: false, reasonCode: "ASSET_MISMATCH", matchingTransferCount: 0, innerTransferVerified: false };
  }
  if (payload.accepted.payTo !== request.x402.payTo) {
    return { valid: false, reasonCode: "PAY_TO_MISMATCH", matchingTransferCount: 0, innerTransferVerified: false };
  }

  const decoded = decodeDemoTransaction(payload);
  const transfer = decoded?.transfer;
  const matches =
    transfer?.mint === request.assetMint &&
    transfer.amount === request.amountAtomicUnits &&
    transfer.destinationAta === request.recipientAta;

  if (!matches) {
    return { valid: false, reasonCode: "NO_MATCHING_TRANSFER", matchingTransferCount: 0, innerTransferVerified: false };
  }

  return {
    valid: true,
    reasonCode: "EXACT_PAYMENT_VERIFIED",
    matchingTransferCount: 1,
    innerTransferVerified: transfer.inner
  };
}
```

- [ ] **Step 6: Add facilitator API routes**

Create `app/api/facilitator/verify/route.ts`:

```ts
import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { payload: X402AllowancePayload; paymentRequest: NormalizedPaymentRequest };
  const result = await verifyAllowancePaymentOutcome(body.payload, body.paymentRequest);
  return Response.json({ result }, { status: result.valid ? 200 : 400 });
}
```

Create `app/api/facilitator/settle/route.ts`:

```ts
import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { payload: X402AllowancePayload; paymentRequest: NormalizedPaymentRequest };
  const result = await verifyAllowancePaymentOutcome(body.payload, body.paymentRequest);
  if (!result.valid) {
    return Response.json({ result, settlementStatus: "failed" }, { status: 400 });
  }

  const txSignature = `demo_sig_${body.paymentRequest.rawRequestHash.slice(0, 16)}`;
  return Response.json({
    result: { ...result, txSignature },
    settlementStatus: "settled",
    explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`
  });
}
```

- [ ] **Step 7: Verify Task 8 demo mode**

Run:

```bash
pnpm test:run tests/facilitator/facilitatorVerifier.test.ts
pnpm typecheck
pnpm lint
```

Expected: tests, typecheck, and lint pass.

- [ ] **Step 8: Implement live devnet settlement path**

Update `lib/solana/allowanceSettlement.ts` so `SAFE_DEMO_MODE=false` builds a versioned Solana transaction that calls `client.subscriptions.instructions.transferFixed` with these values:

```ts
{
  delegatee: delegateeSigner,
  delegator: userWalletAddress,
  delegatorAta: userAta,
  tokenMint: request.assetMint,
  delegationPda: request.allowanceSettlement.delegationPda,
  amount: BigInt(request.amountAtomicUnits),
  receiverAta: request.recipientAta
}
```

The returned x402 payload must still match:

```ts
{
  x402Version: 2,
  accepted: {
    scheme: "exact",
    network: request.network,
    amount: request.amountAtomicUnits,
    asset: request.assetMint,
    payTo: request.x402.payTo,
    extra: {
      feePayer: request.x402.feePayer,
      memo: request.x402.memo
    }
  },
  payload: {
    transaction: "base64 serialized partially signed versioned transaction"
  }
}
```

Update `scripts/devnet/run-settlement-smoke.ts`:

```ts
console.log("SAFE settlement smoke");
console.log("Run with SAFE_DEMO_MODE=false after token and allowance setup.");
console.log("Expected: one transferFixed transaction, one matching inner TransferChecked, and a devnet explorer URL.");
```

Verification command:

```bash
SAFE_DEMO_MODE=false pnpm safe:devnet:smoke
```

Expected: script prints a real devnet transaction signature and explorer URL. If the installed `@solana/subscriptions` API differs from the docs, update only the adapter and settlement modules, then rerun `pnpm typecheck` before rerunning the smoke script.

- [ ] **Step 9: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add lib/solana lib/x402 lib/facilitator app/api/facilitator tests/facilitator scripts/devnet
git commit -m "feat: add allowance-backed x402 settlement"
```

---

### Task 9: Wire Settlement into the Agent Flow

**Files:**
- Modify: `lib/agent/worldCupAgent.ts`
- Modify: `tests/agent/worldCupAgent.test.ts`

- [ ] **Step 1: Extend agent test for settlement results**

Update `tests/agent/worldCupAgent.test.ts` to include:

```ts
it("settles approved attempts and leaves blocked attempts unsigned", async () => {
  memoryStore.clearAudit();
  const result = await runWorldCupAgentScenario();
  const approved = result.attempts.filter((attempt) => attempt.decision.action === "approve" || attempt.decision.action === "redact_and_approve");
  const blocked = result.attempts.filter((attempt) => attempt.decision.action === "reject");
  expect(approved.every((attempt) => attempt.settlement?.settlementStatus === "settled")).toBe(true);
  expect(blocked.every((attempt) => attempt.settlement === undefined)).toBe(true);
});
```

- [ ] **Step 2: Update agent attempt type and settlement flow**

Modify `lib/agent/worldCupAgent.ts` so `AgentAttempt` includes:

```ts
settlement?: {
  settlementStatus: "settled" | "failed";
  txSignature?: string;
  explorerUrl?: string;
};
```

Convert `evaluate` to `async`, change each scenario call to `await evaluate(...)`, and after an approve or redact-and-approve decision add:

```ts
if (!decision.sanitizedRequest) {
  throw new Error("Approved SAFE decision is missing sanitized request.");
}
const payload = await buildAllowanceBackedPaymentPayload(decision.sanitizedRequest);
const verification = await verifyAllowancePaymentOutcome(payload, decision.sanitizedRequest);
const settlement = verification.valid
  ? {
      settlementStatus: "settled" as const,
      txSignature: `demo_sig_${normalized.rawRequestHash.slice(0, 16)}`,
      explorerUrl: `https://explorer.solana.com/tx/demo_sig_${normalized.rawRequestHash.slice(0, 16)}?cluster=devnet`
    }
  : { settlementStatus: "failed" as const };
```

Append audit records with `settlementStatus: "settled"` for verified approved attempts and `settlementStatus: "not_attempted"` for rejected attempts.

- [ ] **Step 3: Verify Task 9**

Run:

```bash
pnpm test:run tests/agent/worldCupAgent.test.ts tests/facilitator/facilitatorVerifier.test.ts
pnpm typecheck
pnpm lint
```

Expected: tests, typecheck, and lint pass.

- [ ] **Step 4: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add lib/agent tests/agent
git commit -m "feat: wire settlement into agent flow"
```

---

### Task 10: Build the Dashboard UI

**Files:**
- Modify: `app/page.tsx`
- Create: `components/dashboard/SafeDashboard.tsx`
- Create: `components/dashboard/PolicyPanel.tsx`
- Create: `components/dashboard/AgentRunPanel.tsx`
- Create: `components/dashboard/AuditTimeline.tsx`
- Create: `components/dashboard/PaymentFlowDiagram.tsx`
- Create: `components/dashboard/StatusMetric.tsx`

- [ ] **Step 1: Replace home page with dashboard shell**

Modify `app/page.tsx`:

```tsx
import { SafeDashboard } from "@/components/dashboard/SafeDashboard";

export default function HomePage() {
  return <SafeDashboard />;
}
```

- [ ] **Step 2: Create dashboard status metric**

Create `components/dashboard/StatusMetric.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";

export function StatusMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-md">
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-neutral-950">{value}</div>
        <div className="mt-1 text-sm text-neutral-600">{detail}</div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create policy panel**

Create `components/dashboard/PolicyPanel.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";

export function PolicyPanel() {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle>Active Policy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-neutral-500">Total cap</div>
            <div className="font-medium">${DEMO_POLICY.totalCapUsdc.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-neutral-500">Per payment</div>
            <div className="font-medium">${DEMO_POLICY.perPaymentCapUsdc.toFixed(2)}</div>
          </div>
        </div>
        <div>
          <div className="mb-2 text-neutral-500">Allowed categories</div>
          <div className="flex flex-wrap gap-2">
            {DEMO_POLICY.allowedCategories.map((category) => (
              <Badge key={category} variant="secondary">{category}</Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-neutral-500">Allowed domains</div>
          <div className="flex flex-wrap gap-2">
            {DEMO_POLICY.allowedDomains.map((domain) => (
              <Badge key={domain} variant="outline">{domain}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create agent run panel**

Create `components/dashboard/AgentRunPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgentRunResult {
  attempts: Array<{
    label: string;
    request: { merchantDomain: string; amountUsdc: number };
    decision: { action: string; reasonCode: string; reason: string };
    settlement?: { settlementStatus: string; explorerUrl?: string };
  }>;
}

export function AgentRunPanel() {
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runAgent() {
    setLoading(true);
    const response = await fetch("/api/agent/run", { method: "POST" });
    setResult((await response.json()) as AgentRunResult);
    setLoading(false);
  }

  return (
    <Card className="rounded-md">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>World Cup Agent Run</CardTitle>
        <Button onClick={runAgent} disabled={loading}>{loading ? "Running" : "Run Agent"}</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {result?.attempts.map((attempt) => {
          const approved = attempt.decision.action === "approve" || attempt.decision.action === "redact_and_approve";
          return (
            <div key={attempt.label} className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="flex gap-3">
                {approved ? <ShieldCheck className="mt-1 h-4 w-4 text-emerald-600" /> : <ShieldX className="mt-1 h-4 w-4 text-red-600" />}
                <div>
                  <div className="font-medium">{attempt.label}</div>
                  <div className="text-sm text-neutral-600">
                    {attempt.request.merchantDomain} - ${attempt.request.amountUsdc.toFixed(2)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{attempt.decision.reason}</div>
                </div>
              </div>
              <Badge variant={approved ? "default" : "destructive"}>{attempt.decision.reasonCode}</Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create audit timeline and flow diagram**

Create `components/dashboard/AuditTimeline.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AuditRecord {
  auditId: string;
  timestamp: string;
  merchantDomain: string;
  amountUsdc: number;
  decision: string;
  reasonCode: string;
  settlementStatus: string;
}

export function AuditTimeline() {
  const [records, setRecords] = useState<AuditRecord[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch("/api/audit");
      const body = (await response.json()) as { records: AuditRecord[] };
      setRecords(body.records);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {records.map((record) => (
          <div key={record.auditId} className="rounded-md border p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{record.merchantDomain}</span>
              <span className="text-neutral-500">${record.amountUsdc.toFixed(2)}</span>
            </div>
            <div className="mt-1 text-neutral-600">{record.reasonCode} - {record.settlementStatus}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

Create `components/dashboard/PaymentFlowDiagram.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  "Agent calls x402 API",
  "API returns 402 challenge",
  "SAFE preflights policy",
  "Delegatee signs allowance transfer",
  "Facilitator verifies outcome",
  "Paid resource returns"
];

export function PaymentFlowDiagram() {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle>Payment Flow</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border bg-neutral-50 p-3 text-sm">
            <div className="text-xs font-medium text-neutral-500">Step {index + 1}</div>
            <div className="mt-1 font-medium">{step}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Create main dashboard**

Create `components/dashboard/SafeDashboard.tsx`:

```tsx
import { AgentRunPanel } from "@/components/dashboard/AgentRunPanel";
import { AuditTimeline } from "@/components/dashboard/AuditTimeline";
import { PaymentFlowDiagram } from "@/components/dashboard/PaymentFlowDiagram";
import { PolicyPanel } from "@/components/dashboard/PolicyPanel";
import { StatusMetric } from "@/components/dashboard/StatusMetric";

export function SafeDashboard() {
  return (
    <main className="min-h-screen bg-neutral-100 p-4 text-neutral-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2">
          <div className="text-sm font-medium uppercase tracking-wide text-neutral-500">SAFE</div>
          <h1 className="text-3xl font-semibold">Spend Authorization Firewall for Agents</h1>
          <p className="max-w-3xl text-neutral-600">
            Plug-and-play pre-signing firewall for x402 agent payments, built first on Solana allowances.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusMetric label="Rail" value="x402" detail="HTTP 402 challenge and payment payload" />
          <StatusMetric label="Settlement" value="Solana devnet" detail="Allowance-backed transferFixed path" />
          <StatusMetric label="Firewall" value="Pre-signing" detail="Unsafe requests never reach delegatee signing" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <PolicyPanel />
          <AgentRunPanel />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <PaymentFlowDiagram />
          <AuditTimeline />
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Verify Task 10**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: typecheck, lint, and build pass.

- [ ] **Step 8: Visual smoke test**

Run:

```bash
pnpm dev
```

Open `http://localhost:3000`. Click `Run Agent`. Expected:
- Approved stats, transit, and food attempts show approved state.
- Fake merch and duplicate stats show blocked state.
- PII attempt shows redacted approval.
- Audit log updates within one second.

- [ ] **Step 9: Checkpoint**

Run:

```bash
git status --short
```

If the user explicitly asks for a commit, use:

```bash
git add app components
git commit -m "feat: add SAFE dashboard"
```

---

### Task 11: End-to-End API Verification and Devnet Smoke

**Files:**
- Modify only files that fail verification from earlier tasks.

- [ ] **Step 1: API route smoke test**

With `pnpm dev` running, run:

```bash
curl -i http://localhost:3000/api/x402/stats
curl -s -X POST http://localhost:3000/api/agent/run | head -c 500
curl -s http://localhost:3000/api/audit | head -c 500
```

Expected:
- First command returns `HTTP/1.1 402` and JSON with `accepts`.
- Second command returns JSON with `attempts`.
- Third command returns JSON with `records`.

- [ ] **Step 2: Full local verification**

Run:

```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 3: Devnet setup verification**

Run only after `.env.local` has devnet keys and `SAFE_DEMO_MODE=false`:

```bash
pnpm safe:devnet:setup-token
pnpm safe:devnet:setup-allowance
SAFE_DEMO_MODE=false pnpm safe:devnet:smoke
```

Expected:
- Token setup prints a demo mint and token accounts.
- Allowance setup prints Subscription Authority PDA and fixed delegation PDA.
- Smoke script prints a devnet transaction signature and explorer URL.

- [ ] **Step 4: Documentation update**

Modify `docs/spec/safe-spec.md` only if implementation differs from the plan. Add a short implementation note near section 15.6 with:

```markdown
Implementation note: The hackathon app uses demo-mode facilitator verification by default and switches to live Solana devnet settlement when `SAFE_DEMO_MODE=false` and devnet keys are configured.
```

- [ ] **Step 5: Final status**

Run:

```bash
git status --short
```

Expected: only files touched by the implementation are changed.

If the user explicitly asks for a commit, use:

```bash
git add .
git commit -m "feat: implement SAFE hackathon app"
```

---

## Definition of Done

- The dashboard runs locally with `pnpm dev`.
- The user can click `Run Agent` and see approved, blocked, duplicate, and redacted payment attempts.
- x402-protected routes return HTTP 402 challenges before payment and protected JSON after payment simulation.
- SAFE policy checks run before settlement payload construction.
- Approved attempts create allowance-backed x402 payloads.
- The custom/mock facilitator verifies exact payment outcome fields: network, amount, asset mint, `payTo`, and exactly one matching transfer.
- Devnet live mode has scripts for demo token setup, fixed allowance setup, and settlement smoke testing.
- The app clearly labels demo-mode verification versus live devnet mode.
- Verification commands pass: `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Known Implementation Risks

- Public x402 facilitators may reject allowance-backed transactions unless simulation-based verification and the Solana Subscriptions program allowlist are enabled.
- The Solana Subscriptions TypeScript SDK API may require small adapter changes against the installed version.
- Live devnet setup needs funded devnet signers for user, SAFE session signer, and facilitator sponsor.
- The hackathon path should default to mock/custom facilitator verification while still preserving the real allowance-backed transaction path for devnet smoke tests.
