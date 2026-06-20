import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "neutral" | "emerald" | "sky" | "amber" | "red";

const toneClasses: Record<MetricTone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  emerald: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  sky: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
  amber: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  red: "bg-red-400/10 text-red-300 ring-red-400/30"
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
              toneClasses[tone]
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 truncate text-xl font-semibold text-foreground">
            {value}
          </div>
          <div className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}
