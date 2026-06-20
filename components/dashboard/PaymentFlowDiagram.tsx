import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, Globe2, ShieldCheck, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/SectionLabel";
import { StatusLed, type LedTone } from "@/components/dashboard/StatusLed";
import { cn } from "@/lib/utils";

interface FlowStep {
  title: string;
  detail: string;
  icon: LucideIcon;
  // Node container tone — /10 bg + /30 border + -300/primary text.
  tone: string;
  // Icon chip tone — ring + bg to match the node accent.
  chip: string;
  // LED tone signalling the flow-stage color.
  led: LedTone;
}

const steps: FlowStep[] = [
  {
    title: "x402",
    detail: "HTTP 402 challenge normalizes merchant, amount, and rail.",
    icon: Globe2,
    // Chain / rail node = sky.
    tone: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    chip: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
    led: "sky"
  },
  {
    title: "SAFE",
    detail: "Policy preflight blocks unsafe requests before signing.",
    icon: ShieldCheck,
    // SAFE / firewall / approved node = primary green.
    tone: "border-primary/30 bg-primary/10 text-primary",
    chip: "bg-primary/10 text-primary ring-primary/30",
    led: "green"
  },
  {
    title: "Allowance",
    detail: "Delegatee signs only allowance-backed fixed transfers.",
    icon: Wallet,
    // Capped / needs-review node = amber.
    tone: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    chip: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
    led: "amber"
  },
  {
    title: "Facilitator",
    detail: "Settlement verifier checks the exact SVM outcome.",
    icon: BadgeCheck,
    // Default / neutral settlement node = muted.
    tone: "border-border bg-muted text-muted-foreground",
    chip: "bg-muted text-muted-foreground ring-border",
    led: "neutral"
  }
];

export function PaymentFlowDiagram() {
  return (
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardHeader>
        <SectionLabel>Payment flow</SectionLabel>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="contents">
                <div className={cn("min-w-0 rounded-md border p-3", step.tone)}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md ring-1",
                        step.chip
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Mono uppercase console kicker */}
                      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Step {index + 1}
                      </div>
                      <div className="truncate font-mono text-sm font-medium">{step.title}</div>
                    </div>
                    <StatusLed tone={step.led} className="mt-0.5 self-start" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-muted-foreground">{step.detail}</div>
                </div>
                {index < steps.length - 1 ? (
                  <div className="hidden h-full items-center justify-center md:flex">
                    <ArrowRight className="my-2 size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
