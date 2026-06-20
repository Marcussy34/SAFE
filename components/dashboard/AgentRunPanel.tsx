"use client";

import { useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  LoaderCircle,
  Play,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Terminal,
  WalletCards
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { SafeDemoState } from "@/lib/runtime/demoState";
import type { AuditRecord, NormalizedPaymentRequest, PolicyDecision } from "@/lib/types";

type AttemptAction =
  | "approve"
  | "reject"
  | "redact_and_approve"
  | "ask_human"
  | "update_allowance_required";

interface AgentSettlement {
  settlementStatus: "settled" | "failed";
  txSignature?: string;
  explorerUrl?: string;
  error?: string;
}

interface AgentAttempt {
  label: string;
  request: NormalizedPaymentRequest;
  decision: PolicyDecision & {
    action: AttemptAction | string;
  };
  auditRecord?: AuditRecord;
  settlement?: AgentSettlement;
}

interface AgentRunResult {
  attempts: AgentAttempt[];
  audit?: AuditRecord[];
}

type RunLogLevel = "info" | "success" | "warn" | "error";

interface RunLogEntry {
  id: number;
  timestamp: string;
  level: RunLogLevel;
  command: string;
  detail?: string;
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

async function readDemoState(): Promise<SafeDemoState> {
  const response = await fetch("/api/demo/state", { cache: "no-store" });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error("Unable to load demo state.");
  }

  return body as SafeDemoState;
}

function settlementStatus(attempt: AgentAttempt) {
  return attempt.settlement?.settlementStatus ?? attempt.auditRecord?.settlementStatus ?? "not_attempted";
}

function userBalance(state: SafeDemoState | null) {
  return state?.balances.find((balance) => balance.label === "user/delegator");
}

function numericUsdc(balance?: string) {
  const match = balance?.match(/^([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

function balanceDelta(before: SafeDemoState | null, after: SafeDemoState | null) {
  const beforeAmount = numericUsdc(userBalance(before)?.usdc);
  const afterAmount = numericUsdc(userBalance(after)?.usdc);

  if (beforeAmount === null || afterAmount === null) {
    return "Unavailable";
  }

  const delta = afterAmount - beforeAmount;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} USDC`;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shortHash(value?: string) {
  if (!value) {
    return "not available";
  }

  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function logLevelClass(level: RunLogLevel) {
  if (level === "success") {
    return "text-emerald-300";
  }

  if (level === "warn") {
    return "text-amber-300";
  }

  if (level === "error") {
    return "text-red-300";
  }

  return "text-sky-300";
}

function FieldRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 break-all text-xs leading-5 text-foreground">{value || "Not available"}</div>
    </div>
  );
}

function TerminalLog({ entries, running }: { entries: RunLogEntry[]; running: boolean }) {
  return (
    <div className="rounded-md border border-border bg-black/70 p-3 font-mono text-xs shadow-inner">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Terminal className="size-3.5 text-sky-400" aria-hidden="true" />
          Agent Execution Log
        </div>
        <Badge variant="outline" className="border-border bg-white/5 font-sans text-muted-foreground">
          {running ? "running" : entries.length ? "complete" : "idle"}
        </Badge>
      </div>

      {entries.length === 0 ? (
        <div className="text-muted-foreground">safe$ waiting for Run Agent</div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div key={entry.id} className="grid gap-1 sm:grid-cols-[84px_minmax(0,1fr)]">
              <div className="text-muted-foreground">{entry.timestamp}</div>
              <div className="min-w-0">
                <div className="break-words">
                  <span className={cn("mr-2", logLevelClass(entry.level))}>safe$</span>
                  <span className="text-foreground">{entry.command}</span>
                </div>
                {entry.detail ? (
                  <div className="mt-0.5 break-words pl-8 leading-5 text-muted-foreground">{entry.detail}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentRunPanel() {
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [beforeState, setBeforeState] = useState<SafeDemoState | null>(null);
  const [afterState, setAfterState] = useState<SafeDemoState | null>(null);
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logSequence = useRef(0);

  const summary = useMemo(() => {
    const attempts = result?.attempts ?? [];
    const settled = attempts.filter((attempt) => settlementStatus(attempt) === "settled");
    const blocked = attempts.filter((attempt) => attempt.decision.action === "reject");
    const redacted = attempts.filter((attempt) => attempt.decision.action === "redact_and_approve");
    const spend = settled.reduce((total, attempt) => total + attempt.request.amountUsdc, 0);

    return {
      settled: settled.length,
      blocked: blocked.length,
      redacted: redacted.length,
      spend
    };
  }, [result]);

  function appendLog(level: RunLogLevel, command: string, detail?: string) {
    const id = logSequence.current + 1;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    logSequence.current = id;
    setRunLog((entries) => [
      ...entries,
      {
        id,
        timestamp,
        level,
        command,
        detail
      }
    ]);
  }

  async function runAgent() {
    setLoading(true);
    setError(null);
    setResult(null);
    setAfterState(null);
    setRunLog([]);
    logSequence.current = 0;

    try {
      appendLog("info", "safe run --agent world-cup --network devnet", "Starting x402 allowance-backed demo run.");
      appendLog("info", "GET /api/demo/state", "Reading user balance, allowance PDA, RPC, and facilitator readiness.");
      const before = await readDemoState();
      setBeforeState(before);
      appendLog(
        "success",
        "state ready",
        `user=${userBalance(before)?.usdc ?? "unknown"} allowance=${
          before.allowanceStatus?.fixedDelegationExists ? "ready" : "missing"
        }`
      );

      appendLog("info", "POST /api/agent/run", "Agent is requesting paid resources and waiting for SAFE preflight.");
      appendLog("info", "x402 challenge loop", "Normalizing merchant, amount, asset, recipient, and resource metadata.");

      const response = await fetch("/api/agent/run", { method: "POST" });
      const body: unknown = await response.json();

      if (!response.ok || !isAgentRunResult(body)) {
        throw new Error(errorMessageFromBody(body));
      }

      appendLog("success", "agent response received", `${body.attempts.length} payment attempts returned.`);

      for (const attempt of body.attempts) {
        const status = settlementStatus(attempt);
        const amount = formatUsdc(attempt.request.amountUsdc);

        appendLog(
          "info",
          `x402 challenge ${attempt.request.merchantDomain}`,
          `${amount} ${attempt.request.token} for ${attempt.request.resourceUrl}`
        );
        await wait(90);

        appendLog(
          attempt.decision.action === "reject" ? "warn" : "success",
          `SAFE decision ${attempt.decision.reasonCode}`,
          `${formatAction(attempt.decision.action)}: ${attempt.decision.reason}`
        );
        await wait(90);

        if (attempt.decision.action === "redact_and_approve") {
          appendLog("warn", "metadata redacted", "Sensitive metadata was removed before signing.");
          await wait(90);
        }

        if (status === "settled") {
          appendLog(
            "success",
            "facilitator verify + submit",
            `settled tx=${shortHash(attempt.settlement?.txSignature ?? attempt.auditRecord?.txSignature)}`
          );
        } else if (status === "failed") {
          appendLog("error", "facilitator settlement failed", attempt.settlement?.error ?? "No transaction submitted.");
        } else {
          appendLog("warn", "signing skipped", "SAFE blocked the request before delegatee signing.");
        }

        await wait(90);
      }

      setResult(body);

      appendLog("info", "GET /api/demo/state --after", "Refreshing balances and audit state after settlement.");
      const after = await readDemoState();
      setAfterState(after);
      appendLog("success", "run complete", `delta=${balanceDelta(before, after)} auditRecords=${after.audit.length}`);
      window.dispatchEvent(new Event("safe-demo-state-updated"));
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Agent run failed.";
      appendLog("error", "run failed", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4 text-sky-400" aria-hidden="true" />
            World Cup Agent Run
          </CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">
            Runs the agent, preflights every x402 request, settles approved requests, and captures receipts.
          </div>
          <div className="mt-2 text-xs leading-5 text-amber-300">
            Live mode spends real devnet USDC from the configured allowance.
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
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive" className="rounded-md">
            <ShieldX className="size-4" aria-hidden="true" />
            <AlertTitle>Run failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!result && !error ? (
          <div className="rounded-md border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
            No run data yet. Click Run Agent to produce browser-visible SAFE decisions and devnet receipts.
          </div>
        ) : null}

        <TerminalLog entries={runLog} running={loading} />

        {result ? (
          <div className="space-y-3 rounded-md border border-border bg-muted p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Run Overview</div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Settled</div>
                <div className="mt-1 text-xl font-semibold text-emerald-300">{summary.settled}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Blocked</div>
                <div className="mt-1 text-xl font-semibold text-red-300">{summary.blocked}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Redacted</div>
                <div className="mt-1 text-xl font-semibold text-amber-300">{summary.redacted}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Devnet spend</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{formatUsdc(summary.spend)}</div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <WalletCards className="size-3.5 text-sky-400" aria-hidden="true" />
                  User USDC Before
                </div>
                <div className="mt-2 break-all text-sm font-medium text-foreground">
                  {userBalance(beforeState)?.usdc ?? "Unavailable"}
                </div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <WalletCards className="size-3.5 text-emerald-400" aria-hidden="true" />
                  User USDC After
                </div>
                <div className="mt-2 break-all text-sm font-medium text-foreground">
                  {userBalance(afterState)?.usdc ?? "Unavailable"}
                </div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Delta</div>
                <div className="mt-2 text-sm font-medium text-foreground">{balanceDelta(beforeState, afterState)}</div>
              </div>
            </div>
          </div>
        ) : null}

        {result?.attempts.map((attempt) => {
          const state = getAttemptState(attempt.decision.action);
          const status = settlementStatus(attempt);
          const StateIcon = state.Icon;

          return (
            <div key={attempt.label} className="rounded-md border border-border p-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
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

                <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                  <Badge
                    variant="outline"
                    className="h-auto max-w-full whitespace-normal break-all border-border bg-muted text-left leading-5 text-muted-foreground"
                  >
                    {attempt.decision.reasonCode}
                  </Badge>
                  <Badge variant="outline" className={settlementClass(status)}>
                    {formatAction(status)}
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

              <div className="mt-3 grid gap-3 rounded-md border border-border bg-muted p-3 md:grid-cols-2 xl:grid-cols-4">
                <FieldRow label="x402 scheme" value={`${attempt.request.scheme} / ${attempt.request.network}`} />
                <FieldRow label="Asset mint" value={attempt.request.assetMint} />
                <FieldRow label="Pay to" value={attempt.request.x402.payTo} />
                <FieldRow label="Recipient ATA" value={attempt.request.recipientAta} />
                <FieldRow label="Resource" value={attempt.request.resourceUrl} />
                <FieldRow label="Facilitator" value={attempt.request.x402.facilitatorUrl} />
                <FieldRow label="Allowance instruction" value={attempt.request.allowanceSettlement.instruction} />
                <FieldRow label="Delegatee" value={attempt.request.allowanceSettlement.delegatee} />
              </div>

              <div className="mt-3 grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-3">
                <FieldRow
                  label="Facilitator result"
                  value={status === "settled" ? "verified and submitted" : status === "failed" ? "failed" : "not submitted"}
                />
                <FieldRow label="Tx signature" value={attempt.settlement?.txSignature ?? attempt.auditRecord?.txSignature} />
                <FieldRow label="Payment hash" value={attempt.auditRecord?.paymentRequestHash ?? attempt.request.rawRequestHash} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
