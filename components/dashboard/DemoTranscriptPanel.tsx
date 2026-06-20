"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Terminal
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/SectionLabel";
import { StatusLed, type LedTone } from "@/components/dashboard/StatusLed";
import { cn } from "@/lib/utils";
import type { SafeDemoRunRecord, SafeDemoRunStep } from "@/lib/demo/demoRunner";

interface DemoStateResponse {
  runs: SafeDemoRunRecord[];
}

function formatUsdc(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "none";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function decisionTone(step: SafeDemoRunStep): LedTone {
  if (step.decision.action === "approve") {
    return "green";
  }

  if (step.decision.action === "redact_and_approve") {
    return "amber";
  }

  return "red";
}

function decisionClass(step: SafeDemoRunStep) {
  if (step.decision.action === "approve") {
    return "border-primary/30 bg-primary/10 text-primary";
  }

  if (step.decision.action === "redact_and_approve") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }

  return "border-red-400/30 bg-red-400/10 text-red-300";
}

function settlementLabel(step: SafeDemoRunStep, dryRun: boolean) {
  if (step.settlement?.settlementStatus) {
    return step.settlement.settlementStatus;
  }

  if (dryRun) {
    return "dry_run";
  }

  return step.decision.action === "reject" ? "blocked" : "not_submitted";
}

function outcomeIcon(step: SafeDemoRunStep) {
  if (step.decision.action === "approve") {
    return ShieldCheck;
  }

  if (step.decision.action === "redact_and_approve") {
    return ShieldAlert;
  }

  return ShieldX;
}

async function readDemoRuns(): Promise<SafeDemoRunRecord[]> {
  const response = await fetch("/api/safe/demo/state", { cache: "no-store" });
  const body = (await response.json()) as DemoStateResponse;

  if (!response.ok || !Array.isArray(body.runs)) {
    throw new Error("Unable to load SAFE demo transcript.");
  }

  return body.runs;
}

export function DemoTranscriptPanel() {
  const [runs, setRuns] = useState<SafeDemoRunRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRun = runs[0];

  const summaryBadges = useMemo(() => {
    if (!latestRun) {
      return [];
    }

    return [
      ["approved", latestRun.summary.approved, "border-primary/30 bg-primary/10 text-primary"],
      ["redacted", latestRun.summary.redacted, "border-amber-400/30 bg-amber-400/10 text-amber-300"],
      ["blocked", latestRun.summary.blocked, "border-red-400/30 bg-red-400/10 text-red-300"],
      ["settled", latestRun.summary.settled, "border-sky-400/30 bg-sky-400/10 text-sky-300"]
    ] as const;
  }, [latestRun]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setRuns(await readDemoRuns());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load SAFE demo transcript.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(refresh, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return (
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Terminal className="size-4 text-sky-400" aria-hidden="true" />
            CLI Demo Transcript
          </CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">
            Latest server-owned run from <span className="font-mono text-foreground">pnpm safe demo</span>.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-border bg-muted font-mono text-[11px] text-muted-foreground">
            <StatusLed tone={latestRun ? "green" : "neutral"} pulse={Boolean(latestRun)} />
            {latestRun ? formatTimestamp(latestRun.completedAt) : "waiting"}
          </Badge>
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive" className="rounded-md">
            <CircleAlert className="size-4" aria-hidden="true" />
            <AlertTitle>Transcript unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!latestRun && !error ? (
          <div className="rounded-md border border-dashed border-border bg-muted p-4 font-mono text-sm text-muted-foreground">
            No CLI demo run has been recorded yet.
          </div>
        ) : null}

        {latestRun ? (
          <>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-md border border-border bg-muted p-3">
                <SectionLabel>User Intent</SectionLabel>
                <div className="mt-2 text-sm leading-6 text-foreground">{latestRun.prompt}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 font-mono text-sky-300">
                    {latestRun.mode}
                  </Badge>
                  <Badge variant="outline" className="border-border bg-card font-mono text-muted-foreground">
                    budget {formatUsdc(latestRun.generatedPolicy.maxTotalUsdc)}
                  </Badge>
                  <Badge variant="outline" className="border-border bg-card font-mono text-muted-foreground">
                    per payment {formatUsdc(latestRun.generatedPolicy.perPaymentCapUsdc)}
                  </Badge>
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted p-3">
                <SectionLabel>Final Audit Summary</SectionLabel>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {summaryBadges.map(([label, value, className]) => (
                    <Badge key={label} variant="outline" className={cn("justify-start font-mono", className)}>
                      {label} {value}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 grid gap-1 font-mono text-xs text-muted-foreground">
                  <div>attempted {formatUsdc(latestRun.summary.attemptedSpendUsdc)}</div>
                  <div>settled {formatUsdc(latestRun.summary.settledSpendUsdc)}</div>
                  <div>audit records {latestRun.summary.auditRecords}</div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted p-3">
              <SectionLabel>Generated Policy</SectionLabel>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Allowed</div>
                  <div className="mt-1 break-words text-sm text-foreground">
                    {formatList(latestRun.generatedPolicy.allowedCategories)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Blocked</div>
                  <div className="mt-1 break-words text-sm text-foreground">
                    {formatList(latestRun.generatedPolicy.blockedCategories)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Domains</div>
                  <div className="mt-1 break-all font-mono text-xs leading-5 text-foreground">
                    {formatList(latestRun.generatedPolicy.allowedDomains)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">PII</div>
                  <div className="mt-1 font-mono text-sm text-foreground">{latestRun.generatedPolicy.piiMode}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {latestRun.steps.map((step, index) => {
                const Icon = outcomeIcon(step);
                const explorerUrl = step.explorerUrl ?? step.settlement?.explorerUrl;

                return (
                  <div key={`${latestRun.runId}-${step.id}`} className="rounded-md border border-border bg-muted p-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-card ring-1 ring-border">
                          <Icon className="size-4 text-foreground" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-display font-medium text-foreground">
                              {index + 1}. {step.label}
                            </div>
                            <Badge variant="outline" className={cn("font-mono", decisionClass(step))}>
                              <StatusLed tone={decisionTone(step)} className="mr-1.5" />
                              {formatStatus(step.decision.action)}
                            </Badge>
                          </div>
                          <div className="mt-1 break-all font-mono text-xs leading-5 text-muted-foreground">
                            {step.resourceUrl}
                          </div>
                          <div className="mt-2 text-xs leading-5 text-muted-foreground">{step.decision.reason}</div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                        <Badge
                          variant="outline"
                          className="h-auto max-w-full whitespace-normal break-all border-border bg-card text-left font-mono leading-5 text-muted-foreground"
                        >
                          {step.decision.reasonCode}
                        </Badge>
                        <Badge variant="outline" className="border-border bg-card font-mono text-muted-foreground">
                          {formatStatus(settlementLabel(step, latestRun.summary.dryRun))}
                        </Badge>
                        {explorerUrl ? (
                          <Button
                            render={<a href={explorerUrl} target="_blank" rel="noreferrer" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-md"
                          >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            Explorer
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Merchant</div>
                        <div className="mt-1 break-all font-mono text-xs text-foreground">{step.request.merchantDomain}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Amount</div>
                        <div className="mt-1 font-mono text-xs text-foreground">
                          {formatUsdc(step.request.amountUsdc)} {step.request.token}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Tx</div>
                        <div className="mt-1 break-all font-mono text-xs text-foreground">
                          {step.settlement?.txSignature ?? step.auditRecord?.txSignature ?? "Not submitted"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
