"use client";

import { useState } from "react";
import {
  ExternalLink,
  LoaderCircle,
  Play,
  ShieldAlert,
  ShieldCheck,
  ShieldX
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AttemptAction =
  | "approve"
  | "reject"
  | "redact_and_approve"
  | "ask_human"
  | "update_allowance_required";

interface AgentAttempt {
  label: string;
  request: {
    merchantDomain: string;
    amountUsdc: number;
  };
  decision: {
    action: AttemptAction | string;
    reasonCode: string;
    reason: string;
  };
  auditRecord?: {
    settlementStatus: string;
  };
  settlement?: {
    settlementStatus: string;
    txSignature?: string;
    explorerUrl?: string;
    error?: string;
  };
}

interface AgentRunResult {
  attempts: AgentAttempt[];
}

function formatUsdc(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatAction(action: string) {
  return action.replaceAll("_", " ");
}

function getAttemptState(action: string) {
  if (action === "approve") {
    return {
      label: "Approved",
      Icon: ShieldCheck,
      badgeClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
      iconClass: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30"
    };
  }

  if (action === "redact_and_approve") {
    return {
      label: "Redacted",
      Icon: ShieldAlert,
      badgeClass: "border-amber-400/30 bg-amber-400/10 text-amber-300",
      iconClass: "bg-amber-400/10 text-amber-300 ring-amber-400/30"
    };
  }

  return {
    label: "Rejected",
    Icon: ShieldX,
    badgeClass: "border-red-400/30 bg-red-400/10 text-red-300",
    iconClass: "bg-red-400/10 text-red-300 ring-red-400/30"
  };
}

function settlementClass(status: string) {
  if (status === "settled" || status === "verified") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "failed") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

function isAgentRunResult(body: unknown): body is AgentRunResult {
  return (
    typeof body === "object" &&
    body !== null &&
    "attempts" in body &&
    Array.isArray((body as AgentRunResult).attempts)
  );
}

function errorMessageFromBody(body: unknown) {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return "Agent run failed.";
}

export function AgentRunPanel() {
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAgent() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/run", { method: "POST" });
      const body: unknown = await response.json();

      if (!response.ok || !isAgentRunResult(body)) {
        throw new Error(errorMessageFromBody(body));
      }

      setResult(body);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Agent run failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">World Cup Agent Run</CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">
            Executes the scripted x402 spend attempts against SAFE.
          </div>
        </div>
        <Button onClick={runAgent} disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          {loading ? "Running" : "Run Agent"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="destructive" className="rounded-md">
            <ShieldX className="size-4" aria-hidden="true" />
            <AlertTitle>Run failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!result && !error ? (
          <div className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
            No run data yet.
          </div>
        ) : null}

        {result?.attempts.map((attempt) => {
          const state = getAttemptState(attempt.decision.action);
          const settlementStatus =
            attempt.settlement?.settlementStatus ?? attempt.auditRecord?.settlementStatus ?? "not_attempted";
          const StateIcon = state.Icon;

          return (
            <div key={attempt.label} className="rounded-md border border-border p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ring-1",
                      state.iconClass
                    )}
                  >
                    <StateIcon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 break-words font-medium text-foreground">{attempt.label}</div>
                      <Badge variant="outline" className={state.badgeClass}>
                        {state.label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="min-w-0 truncate">{attempt.request.merchantDomain}</span>
                      <span className="font-medium text-foreground">{formatUsdc(attempt.request.amountUsdc)}</span>
                      <span className="capitalize">{formatAction(attempt.decision.action)}</span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{attempt.decision.reason}</div>
                    {attempt.settlement?.error ? (
                      <div className="mt-1 text-xs leading-5 text-red-400">{attempt.settlement.error}</div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                  <Badge
                    variant="outline"
                    className="h-auto max-w-full whitespace-normal break-all border-border bg-muted text-left leading-5 text-muted-foreground"
                  >
                    {attempt.decision.reasonCode}
                  </Badge>
                  <Badge variant="outline" className={settlementClass(settlementStatus)}>
                    {formatAction(settlementStatus)}
                  </Badge>
                  {attempt.settlement?.explorerUrl ? (
                    <Button
                      render={
                        <a href={attempt.settlement.explorerUrl} target="_blank" rel="noreferrer" />
                      }
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
