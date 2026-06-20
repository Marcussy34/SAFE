import { createHash } from "node:crypto";
import type { PaymentRequiredV2, PaymentRequirementsV2 } from "@x402/core/schemas";
import { DEMO_FACILITATOR_URL, FACILITATOR_PAY_TO_PLACEHOLDER, SOLANA_DEVNET_CHAIN_ID, usdcToAtomicUnits } from "@/lib/constants";
import { DEMO_INTENT, DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { MERCHANTS } from "@/lib/fixtures/merchants";
import type { MerchantRegistryEntry, NormalizedPaymentRequest } from "@/lib/types";

export type DemoPaymentRequirement = Omit<PaymentRequirementsV2, "scheme" | "extra"> & {
  scheme: "exact";
  extra: {
    merchantDomain: string;
    amountUsdc: number;
    resourceUrl: string;
    description: string;
    mimeType: "application/json";
    feePayer: string;
    memo: string;
    taskId: string;
  };
};

export type DemoPaymentRequiredBody = Omit<PaymentRequiredV2, "accepts"> & {
  error: string;
  resource: {
    url: string;
    description: string;
    mimeType: "application/json";
  };
  accepts: DemoPaymentRequirement[];
};

const PRICE_BY_DOMAIN: Partial<Record<string, number>> = {
  "stats-api.demo": 0.02,
  "transit-api.demo": 0.05,
  "food-voucher.demo": 0.05
};

function encodePaymentRequirement(requirement: DemoPaymentRequirement): string {
  return Buffer.from(JSON.stringify(requirement), "utf8").toString("base64");
}

function encodePaymentRequiredBody(body: DemoPaymentRequiredBody): string {
  return Buffer.from(JSON.stringify(body), "utf8").toString("base64");
}

function resourceUrl(domain: string, resourcePath: string): string {
  const normalizedPath = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;
  return `https://${domain}${normalizedPath}`;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }

  return value;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function assertAmountMatchesExtra(requirement: DemoPaymentRequirement): void {
  const expectedAtomicUnits = usdcToAtomicUnits(requirement.extra.amountUsdc);

  if (expectedAtomicUnits !== requirement.amount) {
    throw new Error("Payment amount mismatch between x402 amount and SAFE amount metadata.");
  }
}

function requirementForMerchant(merchant: MerchantRegistryEntry, resourcePath: string, taskId: string): DemoPaymentRequirement {
  const amountUsdc = PRICE_BY_DOMAIN[merchant.domain] ?? merchant.maxExpectedPriceUsdc;
  const description = `${merchant.displayName} paid resource`;

  return {
    scheme: "exact",
    network: SOLANA_DEVNET_CHAIN_ID,
    amount: usdcToAtomicUnits(amountUsdc),
    asset: merchant.tokenMint,
    payTo: merchant.recipientAddress,
    maxTimeoutSeconds: 60,
    extra: {
      merchantDomain: merchant.domain,
      amountUsdc,
      resourceUrl: resourceUrl(merchant.domain, resourcePath),
      description,
      mimeType: "application/json",
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

export function withDemoPaymentAmount(requirement: DemoPaymentRequirement, amountUsdc: number): DemoPaymentRequirement {
  return {
    ...requirement,
    amount: usdcToAtomicUnits(amountUsdc),
    extra: {
      ...requirement.extra,
      amountUsdc
    }
  };
}

export function createPaymentRequiredBody(requirement: DemoPaymentRequirement): DemoPaymentRequiredBody {
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: requirement.extra.resourceUrl,
      description: requirement.extra.description,
      mimeType: requirement.extra.mimeType
    },
    accepts: [requirement]
  };
}

export function createPaymentRequiredResponse(requirement: DemoPaymentRequirement): Response {
  const body = createPaymentRequiredBody(requirement);
  const encodedBody = encodePaymentRequiredBody(body);
  const encodedRequirement = encodePaymentRequirement(requirement);

  return Response.json(body, {
    status: 402,
    headers: {
      "PAYMENT-REQUIRED": encodedBody,
      "x-safe-demo-accept-payment": encodedRequirement
    }
  });
}

export function normalizePaymentRequirement(requirement: DemoPaymentRequirement): NormalizedPaymentRequest {
  const merchant = MERCHANTS[requirement.extra.merchantDomain];

  if (!merchant) {
    throw new Error(`Unknown merchant domain: ${requirement.extra.merchantDomain}`);
  }

  assertAmountMatchesExtra(requirement);

  const rawRequestHash = createHash("sha256").update(canonicalStringify(requirement)).digest("hex");
  const paymentHeader = encodePaymentRequiredBody(createPaymentRequiredBody(requirement));

  return {
    requestId: `req_${rawRequestHash.slice(0, 12)}`,
    rail: "x402_solana_allowance_devnet",
    scheme: requirement.scheme,
    network: requirement.network,
    amountUsdc: requirement.extra.amountUsdc,
    amountAtomicUnits: requirement.amount,
    token: "DEMO_USD",
    assetMint: requirement.asset,
    recipientAddress: requirement.payTo,
    recipientAta: merchant.recipientAta,
    merchantDomain: merchant.domain,
    merchantName: merchant.displayName,
    category: merchant.category,
    resourceUrl: requirement.extra.resourceUrl,
    description: requirement.extra.description,
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
      facilitatorUrl: DEMO_FACILITATOR_URL,
      paymentHeader
    },
    allowanceSettlement: {
      delegationType: "fixed",
      delegationPda: DEMO_POLICY.allowance.delegationPda,
      instruction: "transferFixed",
      delegatee: DEMO_POLICY.allowance.delegatee
    }
  };
}

export function hasX402PaymentAttempt(request: Request): boolean {
  const url = new URL(request.url);

  if (request.headers.has("payment-signature")) {
    return true;
  }

  if (url.searchParams.get("payment") === "settled") {
    return true;
  }

  return request.headers.get("x-safe-demo-payment") === "settled";
}
