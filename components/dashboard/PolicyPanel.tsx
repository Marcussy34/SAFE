import {
  Ban,
  CheckCircle,
  Fingerprint,
  Gauge,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DEMO_TOKEN_DECIMALS } from "@/lib/constants";
import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";

function formatUsdc(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatCategory(category: string) {
  return category.replaceAll("_", " ");
}

function formatAtomicUsdc(amountAtomicUnits: string) {
  const amount = Number(amountAtomicUnits) / 10 ** DEMO_TOKEN_DECIMALS;
  return Number.isFinite(amount) ? formatUsdc(amount) : "Unavailable";
}

function formatBoolean(value: boolean) {
  return value ? "Enabled" : "Disabled";
}

export function PolicyPanel() {
  const replay = DEMO_POLICY.replayPolicy;

  return (
    <Card className="rounded-md border border-neutral-200 bg-white shadow-none ring-0">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span className="truncate">Active Policy</span>
          </CardTitle>
          <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
            Enforced
          </Badge>
        </div>
        <div className="break-all text-xs text-neutral-500">{DEMO_POLICY.policyId}</div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Total cap</div>
            <div className="mt-1 font-medium text-neutral-950">{formatUsdc(DEMO_POLICY.totalCapUsdc)}</div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Per payment</div>
            <div className="mt-1 font-medium text-neutral-950">{formatUsdc(DEMO_POLICY.perPaymentCapUsdc)}</div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Per merchant</div>
            <div className="mt-1 font-medium text-neutral-950">{formatUsdc(DEMO_POLICY.perMerchantCapUsdc)}</div>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Human review</div>
            <div className="mt-1 font-medium text-neutral-950">
              Above {formatUsdc(DEMO_POLICY.requireHumanApprovalAboveUsdc)}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <Gauge className="size-3.5 text-sky-600" aria-hidden="true" />
            Allowance
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Type</span>
              <span className="min-w-0 flex-1 text-right font-medium capitalize text-neutral-950">
                {DEMO_POLICY.allowance.type}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Remaining</span>
              <span className="min-w-0 flex-1 text-right font-medium text-neutral-950">
                {formatAtomicUsdc(DEMO_POLICY.allowance.remainingAtomicUnits)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 text-neutral-500">Network</span>
              <span className="min-w-0 flex-1 break-all text-right font-medium text-neutral-950">
                {DEMO_POLICY.network}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <CheckCircle className="size-3.5 text-emerald-600" aria-hidden="true" />
            Allowed categories
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_POLICY.allowedCategories.map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                {formatCategory(category)}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <Ban className="size-3.5 text-red-600" aria-hidden="true" />
            Blocked categories
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_POLICY.blockedCategories.map((category) => (
              <Badge key={category} variant="outline" className="border-red-200 bg-red-50 text-red-700">
                {formatCategory(category)}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Allowed domains</div>
          <div className="flex flex-wrap gap-2">
            {DEMO_POLICY.allowedDomains.map((domain) => (
              <Badge key={domain} variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                {domain}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div className="grid gap-2">
          <div className="flex items-start gap-2">
            <Fingerprint className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-medium text-neutral-950">Replay guard</div>
              <div className="text-xs leading-5 text-neutral-600">
                {replay.idempotencyWindowSeconds}s window. Payment hash{" "}
                {formatBoolean(replay.blockDuplicatePaymentHash).toLowerCase()}, resource fingerprint{" "}
                {formatBoolean(replay.blockDuplicateResourceRequest).toLowerCase()}.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-medium text-neutral-950">PII guard</div>
              <div className="text-xs leading-5 text-neutral-600">
                {DEMO_POLICY.piiPolicy.mode.replaceAll("_", " ")} for{" "}
                {DEMO_POLICY.piiPolicy.blockedEntities.join(", ")}.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
