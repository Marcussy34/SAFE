import Link from "next/link";
import { Activity, BookOpen, Database, ShieldCheck } from "lucide-react";

import { AgentRunPanel } from "@/components/dashboard/AgentRunPanel";
import { AuditTimeline } from "@/components/dashboard/AuditTimeline";
import { LiveDemoStatePanel } from "@/components/dashboard/LiveDemoStatePanel";
import { PaymentFlowDiagram } from "@/components/dashboard/PaymentFlowDiagram";
import { PolicyPanel } from "@/components/dashboard/PolicyPanel";
import { StatusMetric } from "@/components/dashboard/StatusMetric";
import { WalletAllowancePanel } from "@/components/dashboard/WalletAllowancePanel";

export function SafeDashboard() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SAFE</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
              Spend Authorization Firewall for Agents
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Operational view for x402 agent payments, Solana allowance settlement, policy preflight,
              redaction, and audit outcomes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/docs"
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
            >
              <BookOpen className="size-3.5" />
              Docs
            </Link>
            <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 font-medium text-emerald-300">
              Policy active
            </span>
            <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-1 font-medium text-sky-300">
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

        <WalletAllowancePanel />

        <LiveDemoStatePanel />

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
