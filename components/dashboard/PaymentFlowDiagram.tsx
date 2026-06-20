import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, Globe2, ShieldCheck, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FlowStep {
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}

const steps: FlowStep[] = [
  {
    title: "x402",
    detail: "HTTP 402 challenge normalizes merchant, amount, and rail.",
    icon: Globe2,
    tone: "border-sky-200 bg-sky-50 text-sky-700"
  },
  {
    title: "SAFE",
    detail: "Policy preflight blocks unsafe requests before signing.",
    icon: ShieldCheck,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  {
    title: "Allowance",
    detail: "Delegatee signs only allowance-backed fixed transfers.",
    icon: Wallet,
    tone: "border-amber-200 bg-amber-50 text-amber-700"
  },
  {
    title: "Facilitator",
    detail: "Settlement verifier checks the exact SVM outcome.",
    icon: BadgeCheck,
    tone: "border-neutral-200 bg-neutral-50 text-neutral-700"
  }
];

export function PaymentFlowDiagram() {
  return (
    <Card className="rounded-md border border-neutral-200 bg-white shadow-none ring-0">
      <CardHeader>
        <CardTitle className="text-base">Payment Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="contents">
                <div className={cn("min-w-0 rounded-md border p-3", step.tone)}>
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/80 ring-1 ring-current/15">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wide opacity-75">
                        Step {index + 1}
                      </div>
                      <div className="truncate font-medium">{step.title}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-neutral-600">{step.detail}</div>
                </div>
                {index < steps.length - 1 ? (
                  <div className="hidden h-full items-center justify-center md:flex">
                    <ArrowRight className="my-2 size-4 text-neutral-400" aria-hidden="true" />
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
