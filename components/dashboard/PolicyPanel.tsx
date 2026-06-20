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
import { SectionLabel } from "@/components/dashboard/SectionLabel";
import { StatusLed } from "@/components/dashboard/StatusLed";
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
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 font-display text-base">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">Active Policy</span>
          </CardTitle>
          <Badge
            variant="outline"
            className="inline-flex shrink-0 items-center gap-1.5 border-primary/30 bg-primary/10 text-primary"
          >
            <StatusLed tone="green" pulse />
            Enforced
          </Badge>
        </div>
        <div className="break-all font-mono text-xs text-muted-foreground">{DEMO_POLICY.policyId}</div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-muted p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total cap</div>
            <div className="mt-1 font-mono font-medium text-foreground">{formatUsdc(DEMO_POLICY.totalCapUsdc)}</div>
          </div>
          <div className="rounded-md border border-border bg-muted p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Per payment</div>
            <div className="mt-1 font-mono font-medium text-foreground">{formatUsdc(DEMO_POLICY.perPaymentCapUsdc)}</div>
          </div>
          <div className="rounded-md border border-border bg-muted p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Per merchant</div>
            <div className="mt-1 font-mono font-medium text-foreground">{formatUsdc(DEMO_POLICY.perMerchantCapUsdc)}</div>
          </div>
          <div className="rounded-md border border-border bg-muted p-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Human review</div>
            <div className="mt-1 font-mono font-medium text-foreground">
              Above {formatUsdc(DEMO_POLICY.requireHumanApprovalAboveUsdc)}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <SectionLabel>
            <Gauge className="size-3.5 text-sky-400" aria-hidden="true" />
            Allowance
          </SectionLabel>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Type</span>
              <span className="min-w-0 flex-1 text-right font-medium capitalize text-foreground">
                {DEMO_POLICY.allowance.type}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Remaining</span>
              <span className="min-w-0 flex-1 text-right font-mono font-medium text-foreground">
                {formatAtomicUsdc(DEMO_POLICY.allowance.remainingAtomicUnits)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Network</span>
              <span className="min-w-0 flex-1 break-all text-right font-mono font-medium text-foreground">
                {DEMO_POLICY.network}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <SectionLabel className="mb-2">
            <CheckCircle className="size-3.5 text-primary" aria-hidden="true" />
            Allowed categories
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            {DEMO_POLICY.allowedCategories.map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary"
              >
                {formatCategory(category)}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel className="mb-2">
            <Ban className="size-3.5 text-red-400" aria-hidden="true" />
            Blocked categories
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            {DEMO_POLICY.blockedCategories.map((category) => (
              <Badge key={category} variant="outline" className="border-red-400/30 bg-red-400/10 text-red-300">
                {formatCategory(category)}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel className="mb-2">Allowed domains</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {DEMO_POLICY.allowedDomains.map((domain) => (
              <Badge
                key={domain}
                variant="outline"
                className="border-sky-400/30 bg-sky-400/10 font-mono text-sky-300"
              >
                {domain}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div className="grid gap-2">
          <div className="flex items-start gap-2">
            <Fingerprint className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-medium text-foreground">Replay guard</div>
              <div className="text-xs leading-5 text-muted-foreground">
                <span className="font-mono text-foreground">{replay.idempotencyWindowSeconds}s</span> window. Payment hash{" "}
                {formatBoolean(replay.blockDuplicatePaymentHash).toLowerCase()}, resource fingerprint{" "}
                {formatBoolean(replay.blockDuplicateResourceRequest).toLowerCase()}.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-sky-400" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-medium text-foreground">PII guard</div>
              <div className="text-xs leading-5 text-muted-foreground">
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
