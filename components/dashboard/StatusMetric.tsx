import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "neutral" | "emerald" | "sky" | "amber" | "red";

const toneClasses: Record<MetricTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200"
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
    <Card className="rounded-md border border-neutral-200 bg-white shadow-none ring-0">
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
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </div>
          <div className="mt-1 truncate text-xl font-semibold text-neutral-950">
            {value}
          </div>
          <div className="mt-1 text-sm leading-5 text-neutral-600">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}
