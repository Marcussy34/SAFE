import Link from "next/link";
import { Activity, BookOpen, Database, ShieldCheck } from "lucide-react";

import { AgentRunPanel } from "@/components/dashboard/AgentRunPanel";
import { AuditTimeline } from "@/components/dashboard/AuditTimeline";
import { LiveDemoStatePanel } from "@/components/dashboard/LiveDemoStatePanel";
import { PaymentFlowDiagram } from "@/components/dashboard/PaymentFlowDiagram";
import { PolicyPanel } from "@/components/dashboard/PolicyPanel";
import { SectionLabel } from "@/components/dashboard/SectionLabel";
import { StatusLed } from "@/components/dashboard/StatusLed";
import { StatusMetric } from "@/components/dashboard/StatusMetric";
import { WalletAllowancePanel } from "@/components/dashboard/WalletAllowancePanel";

export function SafeDashboard() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      {/* Faint terminal grid backdrop — security-console texture, kept subtle. */}
      <div aria-hidden="true" className="console-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        {/* Console top bar */}
        <header className="relative overflow-hidden rounded-lg border border-border bg-card/40">
          <div aria-hidden="true" className="console-aura pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-md border border-primary/30 bg-primary/10">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                </span>
                <span className="font-mono text-sm font-medium tracking-tight text-foreground">
                  SAFE<span className="text-muted-foreground">{"//firewall"}</span>
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-primary">
                <StatusLed tone="green" pulse />
                live
              </span>

              <div className="ml-auto flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <Link
                  href="/docs"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <BookOpen className="size-3.5" />
                  Docs
                </Link>
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-medium uppercase tracking-wide text-primary">
                  policy active
                </span>
                <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-1 font-medium uppercase tracking-wide text-sky-300">
                  devnet
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80">
                $ spend-authorization-firewall
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Spend Authorization Firewall for Agents
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Operational view for x402 agent payments, Solana allowance settlement, policy preflight,
                redaction, and audit outcomes.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-3">
          <SectionLabel>Signals</SectionLabel>
          <div className="grid gap-3 md:grid-cols-3">
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
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>Wallet &amp; allowance</SectionLabel>
          <WalletAllowancePanel />
        </section>

        <section className="space-y-3">
          <SectionLabel>Live demo</SectionLabel>
          <LiveDemoStatePanel />
        </section>

        <section className="space-y-3">
          <SectionLabel>Policy &amp; agent run</SectionLabel>
          <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <PolicyPanel />
            <AgentRunPanel />
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>Payment flow &amp; audit</SectionLabel>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <PaymentFlowDiagram />
            <AuditTimeline />
          </div>
        </section>
      </div>
    </main>
  );
}
