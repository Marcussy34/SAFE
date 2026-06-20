import { Activity, Database, ShieldCheck } from "lucide-react";

import { AgentRunPanel } from "@/components/dashboard/AgentRunPanel";
import { AuditTimeline } from "@/components/dashboard/AuditTimeline";
import { PaymentFlowDiagram } from "@/components/dashboard/PaymentFlowDiagram";
import { PolicyPanel } from "@/components/dashboard/PolicyPanel";
import { StatusMetric } from "@/components/dashboard/StatusMetric";

export function SafeDashboard() {
  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-neutral-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">SAFE</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-neutral-950 sm:text-3xl">
              Spend Authorization Firewall for Agents
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Operational view for x402 agent payments, Solana allowance settlement, policy preflight,
              redaction, and audit outcomes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
              Policy active
            </span>
            <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 font-medium text-sky-700">
              Devnet demo
            </span>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <StatusMetric
            label="Rail"
            value="x402 exact"
            detail="HTTP 402 challenge with normalized payment requirements."
            icon={Activity}
            tone="sky"
          />
          <StatusMetric
            label="Settlement"
            value="Solana devnet"
            detail="Allowance-backed fixed transfer verification path."
            icon={Database}
            tone="amber"
          />
          <StatusMetric
            label="Firewall"
            value="Pre-signing"
            detail="Unsafe requests are rejected before delegatee signing."
            icon={ShieldCheck}
            tone="emerald"
          />
        </section>

        <section className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <PolicyPanel />
          <AgentRunPanel />
        </section>

        <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <PaymentFlowDiagram />
          <AuditTimeline />
        </section>
      </div>
    </main>
  );
}
