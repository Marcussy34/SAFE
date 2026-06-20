import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { StatusLed, type LedTone } from "@/components/dashboard/StatusLed";
import { cn } from "@/lib/utils";

type MetricTone = "neutral" | "emerald" | "sky" | "amber" | "red";

// Icon chip background per tone.
const toneChip: Record<MetricTone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  emerald: "bg-primary/10 text-primary ring-primary/30",
  sky: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
  amber: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  red: "bg-red-400/10 text-red-300 ring-red-400/30"
};

// Map metric tone to the LED tone vocabulary.
const toneLed: Record<MetricTone, LedTone> = {
  neutral: "neutral",
  emerald: "green",
  sky: "sky",
  amber: "amber",
  red: "red"
};

interface StatusMetricProps {
  label: string;
  value: string;
  detail: string;
  icon?: LucideIcon;
  tone?: MetricTone;
}

export function StatusMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral"
}: StatusMetricProps) {
  return (
    <Card className="rounded-md border border-border bg-card shadow-none ring-0">
      <CardContent className="flex min-h-28 gap-3 p-4">
        {Icon ? (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md ring-1",
              toneChip[tone]
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            {/* Mono uppercase console label */}
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </div>
            <StatusLed tone={toneLed[tone]} pulse={tone === "emerald"} />
          </div>
          <div className="mt-1.5 truncate font-display text-xl font-semibold text-foreground">
            {value}
          </div>
          <div className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}
