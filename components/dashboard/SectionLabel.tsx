import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
}

/** Console-style section header rendered as `// LABEL` in tracked uppercase mono. */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
        className
      )}
    >
      <span aria-hidden="true" className="text-primary/70">
        {"//"}
      </span>
      {children}
    </div>
  );
}
