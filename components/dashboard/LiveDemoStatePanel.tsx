"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  WalletCards
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SafeDemoState } from "@/lib/runtime/demoState";

function shortAddress(value?: string) {
  if (!value) {
    return "Not available";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function statusBadge(ok: boolean, label: string) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0",
        ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"
      )}
    >
      {label}
    </Badge>
  );
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Not available";
  }

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

function formatUnixSeconds(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(Number(value) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatAtomicUsdc(value?: string) {
  if (!value) {
    return "Not available";
  }

  const amount = Number(value) / 1_000_000;
  return Number.isFinite(amount) ? `${amount.toFixed(2)} USDC` : "Not available";
}

async function readDemoState(): Promise<SafeDemoState> {
  const response = await fetch("/api/demo/state", { cache: "no-store" });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error("Unable to load live demo state.");
  }

  return body as SafeDemoState;
}

export function LiveDemoStatePanel() {
  const [state, setState] = useState<SafeDemoState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setState(await readDemoState());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load live demo state.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);

    function handleDemoStateUpdate() {
      void refresh();
    }

    window.addEventListener("safe-demo-state-updated", handleDemoStateUpdate);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("safe-demo-state-updated", handleDemoStateUpdate);
    };
  }, [refresh]);

  return (
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-sky-400" aria-hidden="true" />
            Live Devnet State
          </CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">
            Browser-visible readiness, allowance, balances, and audit state.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            {state ? `Updated ${formatTimestamp(state.generatedAt)}` : "Loading"}
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
            <AlertTitle>State unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {state?.liveError ? (
          <Alert className="rounded-md border-amber-400/30 bg-amber-400/10 text-amber-200">
            <CircleAlert className="size-4 text-amber-300" aria-hidden="true" />
            <AlertTitle>Live state warning</AlertTitle>
            <AlertDescription>{state.liveError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-4">
          <div className="rounded-md border border-border bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Runtime</div>
              {statusBadge(state?.readiness.mode === "live-devnet", state?.readiness.mode ?? "loading")}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{state?.readiness.network ?? "Loading network"}</div>
          </div>

          <div className="rounded-md border border-border bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">RPC</div>
              {statusBadge(Boolean(state?.readiness.checks.find((check) => check.id === "rpc")?.ok), "checked")}
            </div>
            <div className="mt-2 min-w-0 break-all text-sm text-muted-foreground">
              {state?.readiness.rpcUrl ?? "Loading RPC"}
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mint</div>
              <WalletCards className="size-4 text-sky-400" aria-hidden="true" />
            </div>
            <div className="mt-2 min-w-0 break-all text-sm text-muted-foreground">
              {shortAddress(state?.readiness.mint)}
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Allowance</div>
              {statusBadge(Boolean(state?.allowanceStatus?.fixedDelegationExists), state?.allowanceStatus?.fixedDelegationExists ? "ready" : "needed")}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {formatAtomicUsdc(state?.allowanceStatus?.fixedDelegationAmountAtomicUnits)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-md border border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Env Wallet Balances
            </div>
            {state?.balances.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>SOL</TableHead>
                    <TableHead>USDC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.balances.map((balance) => (
                    <TableRow key={balance.label}>
                      <TableCell className="whitespace-normal font-medium text-foreground">{balance.label}</TableCell>
                      <TableCell className="max-w-56 whitespace-normal break-all text-muted-foreground">
                        {balance.address}
                        <div className="mt-1 text-xs text-muted-foreground">ATA {shortAddress(balance.usdcAta)}</div>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{balance.sol}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{balance.usdc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                Configure live demo signers to show env wallet balances here.
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-400" aria-hidden="true" />
              Server Checks
            </div>
            <div className="grid gap-2">
              {state?.readiness.checks.map((check) => (
                <div key={check.id} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  {check.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                  )}
                  <span className="font-medium text-foreground">{check.label}:</span>
                  <span className="min-w-0 break-words">{check.detail}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Delegator</span>
                <span className="min-w-0 flex-1 break-all text-right font-medium text-foreground">
                  {shortAddress(state?.allowanceStatus?.owner)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Delegatee</span>
                <span className="min-w-0 flex-1 break-all text-right font-medium text-foreground">
                  {shortAddress(state?.allowanceStatus?.delegatee)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Fixed PDA</span>
                <span className="min-w-0 flex-1 break-all text-right font-medium text-foreground">
                  {shortAddress(state?.allowanceStatus?.fixedDelegationPda)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Expiry</span>
                <span className="min-w-0 flex-1 text-right font-medium text-foreground">
                  {formatUnixSeconds(state?.allowanceStatus?.fixedDelegationExpiryTs)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
