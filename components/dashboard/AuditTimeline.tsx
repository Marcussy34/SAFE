"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, Clock3, ReceiptText, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function decisionClass(decision: string) {
  if (decision === "approve") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (decision === "redact_and_approve") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function settlementClass(status: string) {
  if (status === "settled" || status === "verified") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-neutral-200 bg-neutral-50 text-neutral-700";
}

function StatusIcon({ record }: { record: AuditRecord }) {
  if (record.decision === "approve") {
    return <CircleCheck className="size-4 text-emerald-600" aria-hidden="true" />;
  }

  if (record.decision === "redact_and_approve") {
    return <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />;
  }

  return <CircleX className="size-4 text-red-600" aria-hidden="true" />;
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
    <Card className="rounded-md border border-neutral-200 bg-white shadow-none ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <ReceiptText className="size-4 shrink-0 text-sky-600" aria-hidden="true" />
          <span className="truncate">Audit Timeline</span>
        </CardTitle>
        <Badge variant="outline" className="shrink-0 border-neutral-200 bg-neutral-50 text-neutral-700">
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

        {records.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
            No audit records yet.
          </div>
        ) : null}

        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.auditId} className="rounded-md border border-neutral-200 p-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-50 ring-1 ring-neutral-200">
                  <StatusIcon record={record} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 truncate font-medium text-neutral-950">{record.merchantDomain}</div>
                    <div className="font-medium text-neutral-800">{formatUsdc(record.amountUsdc)}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline" className={decisionClass(record.decision)}>
                      {formatStatus(record.decision)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="h-auto max-w-full whitespace-normal break-all border-neutral-200 bg-neutral-50 text-left leading-5 text-neutral-700"
                    >
                      {record.reasonCode}
                    </Badge>
                    <Badge variant="outline" className={settlementClass(record.settlementStatus)}>
                      {formatStatus(record.settlementStatus)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
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
