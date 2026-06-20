"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, Clock3, ReceiptText, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/SectionLabel";
import { StatusLed, type LedTone } from "@/components/dashboard/StatusLed";
import type { AuditRecord } from "@/lib/types";

interface AuditResponse {
  records: AuditRecord[];
}

function formatUsdc(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function sortNewestFirst(records: AuditRecord[]) {
  return [...records].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
}

// Decision badge tone: approve = Solana green accent, redact = amber review, else red blocked.
function decisionClass(decision: string) {
  if (decision === "approve") {
    return "border-primary/30 bg-primary/10 text-primary";
  }

  if (decision === "redact_and_approve") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  }

  return "border-red-400/30 bg-red-400/10 text-red-300";
}

// Settlement badge tone: settled/verified = green accent, failed = red, else neutral.
function settlementClass(status: string) {
  if (status === "settled" || status === "verified") {
    return "border-primary/30 bg-primary/10 text-primary";
  }

  if (status === "failed") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

// Drives the per-row outcome LED in the timeline rail.
function ledTone(record: AuditRecord): LedTone {
  if (record.decision === "approve") {
    return "green";
  }

  if (record.decision === "redact_and_approve") {
    return "amber";
  }

  return "red";
}

function StatusIcon({ record }: { record: AuditRecord }) {
  if (record.decision === "approve") {
    return <CircleCheck className="size-4 text-primary" aria-hidden="true" />;
  }

  if (record.decision === "redact_and_approve") {
    return <ShieldAlert className="size-4 text-amber-400" aria-hidden="true" />;
  }

  return <CircleX className="size-4 text-red-400" aria-hidden="true" />;
}

export function AuditTimeline() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchAudit() {
      try {
        const response = await fetch("/api/audit", { cache: "no-store" });
        const body = (await response.json()) as AuditResponse;

        if (!response.ok || !Array.isArray(body.records)) {
          throw new Error("Audit fetch failed.");
        }

        if (active) {
          setRecords(sortNewestFirst(body.records));
          setError(null);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : "Audit fetch failed.");
        }
      }
    }

    void fetchAudit();
    const interval = window.setInterval(fetchAudit, 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex min-w-0 items-center gap-2 font-display text-base">
          <ReceiptText className="size-4 shrink-0 text-sky-400" aria-hidden="true" />
          <span className="truncate">Audit Timeline</span>
        </CardTitle>
        <Badge
          variant="outline"
          className="shrink-0 border-border bg-muted font-mono text-muted-foreground"
        >
          {records.length} records
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="destructive" className="rounded-md">
            <CircleX className="size-4" aria-hidden="true" />
            <AlertTitle>Audit polling failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {records.length === 0 && !error ? (
          <div className="rounded-md border border-dashed border-border bg-muted p-4 font-mono text-sm text-muted-foreground">
            No audit events yet.
          </div>
        ) : null}

        {records.length > 0 ? <SectionLabel>Event log</SectionLabel> : null}

        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.auditId} className="rounded-md border border-border bg-muted p-3 text-sm">
              <div className="flex items-start gap-3">
                {/* Outcome rail: tone LED above the decision icon chip */}
                <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1.5">
                  <StatusLed tone={ledTone(record)} />
                  <div className="flex size-7 items-center justify-center rounded-md bg-card ring-1 ring-border">
                    <StatusIcon record={record} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 truncate font-mono font-medium text-foreground">
                      {record.merchantDomain}
                    </div>
                    <div className="font-mono font-medium text-foreground">{formatUsdc(record.amountUsdc)}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline" className={`font-mono ${decisionClass(record.decision)}`}>
                      {formatStatus(record.decision)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="h-auto max-w-full whitespace-normal break-all border-border bg-card text-left font-mono leading-5 text-muted-foreground"
                    >
                      {record.reasonCode}
                    </Badge>
                    <Badge variant="outline" className={`font-mono ${settlementClass(record.settlementStatus)}`}>
                      {formatStatus(record.settlementStatus)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      {formatTimestamp(record.timestamp)}
                    </span>
                    {record.txSignature ? (
                      <span className="min-w-0 truncate">tx {record.txSignature}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
