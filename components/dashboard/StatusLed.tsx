import { cn } from "@/lib/utils";

export type LedTone = "green" | "amber" | "red" | "sky" | "neutral";

// Tone drives the dot color; the glow reuses currentColor so one value covers both.
const toneColor: Record<LedTone, string> = {
  green: "text-primary", // Solana green = approved / live
  amber: "text-amber-400", // capped / needs review
  red: "text-red-400", // blocked / error
  sky: "text-sky-400", // neutral info / chain
  neutral: "text-muted-foreground"
};

interface StatusLedProps {
  tone?: LedTone;
  /** Slow opacity pulse for "live" indicators (auto-disabled under reduced motion). */
  pulse?: boolean;
  className?: string;
}

/** Small glowing console status dot. Decorative — status is also conveyed in text. */
export function StatusLed({ tone = "neutral", pulse = false, className }: StatusLedProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full bg-current shadow-[0_0_8px_currentColor]",
        toneColor[tone],
        pulse && "led-pulse",
        className
      )}
    />
  );
}
