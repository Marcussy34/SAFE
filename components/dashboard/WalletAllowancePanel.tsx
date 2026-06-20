"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  CheckCircle2,
  CircleAlert,
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
import { cn } from "@/lib/utils";

type SetupAction = "initSubscriptionAuthority" | "createFixedDelegation";

interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface SafeReadiness {
  mode: "demo" | "live-devnet";
  rpcUrl: string;
  mint: string;
  subscriptionsProgram: string;
  localFacilitator: {
    enabled: boolean;
    feePayer?: string;
  };
  checks: ReadinessCheck[];
}

interface WalletAllowanceStatus {
  owner: string;
  delegatee: string;
  mint: string;
  userAta: string;
  subscriptionAuthorityPda: string;
  fixedDelegationPda: string;
  subscriptionAuthorityExists: boolean;
  fixedDelegationExists: boolean;
  fixedDelegationAmountAtomicUnits?: string;
  fixedDelegationExpiryTs?: string;
  userSol: string;
  userUsdc: string;
}

interface PreparedTransaction {
  transactionBase64: string;
}

function shortAddress(value?: string) {
  if (!value) {
    return "Not configured";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function base64ToBytes(value: string) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
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

async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : "Request failed.";
    throw new Error(message);
  }

  return body as T;
}

function walletSetupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Wallet setup transaction failed.";
  const nestedError =
    typeof error === "object" && error !== null && "error" in error ? (error as { error?: unknown }).error : undefined;
  const nestedMessage =
    nestedError instanceof Error
      ? nestedError.message
      : typeof nestedError === "object" && nestedError !== null && "message" in nestedError
        ? String((nestedError as { message?: unknown }).message)
        : undefined;

  if (message === "Unexpected error" || message.includes("simulate")) {
    return nestedMessage && nestedMessage !== message
      ? nestedMessage
      : "Wallet simulation failed. Refresh setup status; if authority and allowance already exist, no setup transaction is needed.";
  }

  return nestedMessage && nestedMessage !== message ? `${message}: ${nestedMessage}` : message;
}

export function WalletAllowancePanel() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [readiness, setReadiness] = useState<SafeReadiness | null>(null);
  const [status, setStatus] = useState<WalletAllowanceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<SetupAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const ownerAddress = useMemo(() => publicKey?.toBase58(), [publicKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const readinessBody = await readJson<{ readiness: SafeReadiness }>(await fetch("/api/readiness"));
      setReadiness(readinessBody.readiness);

      if (ownerAddress) {
        const params = new URLSearchParams({ owner: ownerAddress });
        const statusBody = await readJson<{ status: WalletAllowanceStatus }>(
          await fetch(`/api/setup/allowance?${params.toString()}`)
        );
        setStatus(statusBody.status);
      } else {
        setStatus(null);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load setup status.");
    } finally {
      setLoading(false);
    }
  }, [ownerAddress]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  async function submitSetupAction(action: SetupAction) {
    if (!ownerAddress) {
      setError("Connect a wallet before creating allowance transactions.");
      return;
    }

    if (action === "initSubscriptionAuthority" && status?.subscriptionAuthorityExists) {
      setError(null);
      setInfo("Subscription authority already exists. No wallet signature is needed.");
      return;
    }

    if (action === "createFixedDelegation" && status?.fixedDelegationExists) {
      setError(null);
      setInfo("Allowance already exists. Run the agent; no wallet signature is needed.");
      return;
    }

    setActionLoading(action);
    setError(null);
    setInfo(null);
    setLastSignature(null);

    try {
      const response = await fetch("/api/setup/allowance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ownerAddress })
      });
      const body = await readJson<{ transaction: PreparedTransaction }>(response);
      const transaction = VersionedTransaction.deserialize(base64ToBytes(body.transaction.transactionBase64));
      const signature = await sendTransaction(transaction, connection, { skipPreflight: false });

      await connection.confirmTransaction(signature, "confirmed");
      setLastSignature(signature);
      await refresh();
    } catch (setupError) {
      setError(walletSetupErrorMessage(setupError));
    } finally {
      setActionLoading(null);
    }
  }

  const authorityReady = Boolean(status?.subscriptionAuthorityExists);
  const allowanceReady = Boolean(status?.fixedDelegationExists);
  const canInitAuthority = Boolean(ownerAddress) && !authorityReady && actionLoading === null;
  const canCreateDelegation = Boolean(ownerAddress) && authorityReady && !allowanceReady && actionLoading === null;

  return (
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4 text-sky-400" aria-hidden="true" />
            Devnet Developer Preview
          </CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">
            Connect a wallet, create the allowance, then run the agent through SAFE.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
          <WalletMultiButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive" className="rounded-md">
            <CircleAlert className="size-4" aria-hidden="true" />
            <AlertTitle>Setup issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {lastSignature ? (
          <Alert className="rounded-md border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
            <CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" />
            <AlertTitle>Transaction confirmed</AlertTitle>
            <AlertDescription className="break-all">{lastSignature}</AlertDescription>
          </Alert>
        ) : null}

        {info ? (
          <Alert className="rounded-md border-sky-400/30 bg-sky-400/10 text-sky-200">
            <CheckCircle2 className="size-4 text-sky-300" aria-hidden="true" />
            <AlertTitle>Setup ready</AlertTitle>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Runtime</div>
              {statusBadge(readiness?.mode === "live-devnet", readiness?.mode ?? "loading")}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{readiness?.rpcUrl ?? "Loading RPC"}</div>
            <div className="mt-1 break-all text-xs text-muted-foreground">{readiness?.mint ?? "Loading mint"}</div>
          </div>

          <div className="rounded-md border border-border bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wallet</div>
              {statusBadge(Boolean(ownerAddress), ownerAddress ? "connected" : "not connected")}
            </div>
            <div className="mt-2 break-all text-sm text-muted-foreground">{ownerAddress ?? "No wallet selected"}</div>
            <div className="mt-1 text-xs text-muted-foreground">{status?.userSol ?? "SOL balance unavailable"}</div>
          </div>

          <div className="rounded-md border border-border bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Facilitator</div>
              {statusBadge(Boolean(readiness?.localFacilitator.enabled), readiness?.localFacilitator.enabled ? "ready" : "missing")}
            </div>
            <div className="mt-2 break-all text-sm text-muted-foreground">
              {shortAddress(readiness?.localFacilitator.feePayer)}
            </div>
            <div className="mt-1 break-all text-xs text-muted-foreground">
              {shortAddress(readiness?.subscriptionsProgram)}
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">User USDC ATA</span>
              <span className="min-w-0 flex-1 break-all text-right font-medium text-foreground">
                {status?.userAta ?? "Connect wallet"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">User USDC</span>
              <span className="min-w-0 flex-1 break-all text-right font-medium text-foreground">
                {status?.userUsdc ?? "Unavailable"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Subscription authority</span>
              <span className="flex items-center gap-2">
                {statusBadge(Boolean(status?.subscriptionAuthorityExists), status?.subscriptionAuthorityExists ? "exists" : "needed")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Fixed delegation</span>
              <span className="flex items-center gap-2">
                {statusBadge(Boolean(status?.fixedDelegationExists), status?.fixedDelegationExists ? "exists" : "needed")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Delegatee</span>
              <span className="min-w-0 flex-1 break-all text-right font-medium text-foreground">
                {status?.delegatee ?? "Not configured"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => void submitSetupAction("initSubscriptionAuthority")}
              disabled={!canInitAuthority}
              className="justify-start"
              variant={authorityReady ? "outline" : "default"}
            >
              {actionLoading === "initSubscriptionAuthority" ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-4" aria-hidden="true" />
              )}
              {authorityReady ? "Authority initialized" : "Initialize authority"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void submitSetupAction("createFixedDelegation")}
              disabled={!canCreateDelegation}
              className="justify-start"
            >
              {actionLoading === "createFixedDelegation" ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-4" aria-hidden="true" />
              )}
              {allowanceReady ? "Allowance ready" : "Create allowance"}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          {readiness?.checks.map((check) => (
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
      </CardContent>
    </Card>
  );
}
