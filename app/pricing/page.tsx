import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Database,
  Gauge,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Terminal,
  Zap
} from "lucide-react";

import { SectionLabel } from "@/components/dashboard/SectionLabel";
import { StatusLed } from "@/components/dashboard/StatusLed";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SAFE Pricing - Developer Gateway",
  description: "Developer SaaS pricing for SAFE hosted policy decisions, preflights, audit logs, and agent spend controls."
};

const pricingTiers = [
  {
    name: "Local SDK",
    label: "Free forever",
    price: "$0",
    period: "local",
    description: "Build and test SAFE inside your own agent stack before sending traffic through the hosted gateway.",
    cta: "Start local",
    href: "/docs#quickstart",
    icon: Terminal,
    tone: "sky" as const,
    features: [
      "Free TypeScript SDK and CLI",
      "Local preflight and dry-run flows",
      "Self-hosted policy engine",
      "Demo merchant registry",
      "Community support"
    ],
    metrics: [
      ["Hosted decisions", "0 included"],
      ["Active agents", "Local only"],
      ["Audit retention", "Local logs"]
    ]
  },
  {
    name: "Developer Gateway",
    label: "Recommended",
    price: "$29",
    period: "month",
    description: "Hosted SAFE gateway for payment-capable agents that need managed preflights and basic audit history.",
    cta: "Open docs",
    href: "/docs#api-routes",
    icon: ShieldCheck,
    tone: "green" as const,
    featured: true,
    features: [
      "100k policy decisions / month",
      "3 active agent projects",
      "Hosted preflight and pay API",
      "7-day audit retention",
      "$2 per extra 10k decisions"
    ],
    metrics: [
      ["Hosted decisions", "100k / mo"],
      ["Active agents", "3 projects"],
      ["Audit retention", "7 days"]
    ]
  },
  {
    name: "Scale Gateway",
    label: "Usage based",
    price: "$149",
    period: "month",
    description: "Higher-volume gateway for teams running multiple agents, paid tools, or API marketplace pilots.",
    cta: "Review architecture",
    href: "/docs#system-flow",
    icon: Gauge,
    tone: "amber" as const,
    features: [
      "1M policy decisions / month",
      "25 active agent projects",
      "Team policy templates",
      "90-day audit retention",
      "$1 per extra 10k decisions"
    ],
    metrics: [
      ["Hosted decisions", "1M / mo"],
      ["Active agents", "25 projects"],
      ["Audit retention", "90 days"]
    ]
  }
];

const comparisonRows = [
  ["Local SDK", "Free", "No hosted traffic", "Self-managed"],
  ["Policy decision", "Included in paid tiers", "Preflight, dry-run, or pay evaluation", "Billed per decision"],
  ["Active agent", "Paid tier limit", "One production agent/project using a gateway key", "Keeps abuse boundaries simple"],
  ["Settlement", "No payment-volume fee", "SAFE charges for authorization, not money movement", "Rails stay separate"],
  ["Audit log", "Tiered retention", "Decision reason, merchant, amount, and outcome", "Export later"]
];

const featureGroups = [
  {
    title: "Gateway",
    icon: Zap,
    items: ["Hosted `/preflight` and `/pay` endpoints", "Low-latency policy decisions", "Agent and API-key scoped traffic"]
  },
  {
    title: "Policy",
    icon: LockKeyhole,
    items: ["Merchant trust checks", "Amount and category caps", "Replay and metadata leak controls"]
  },
  {
    title: "Audit",
    icon: ReceiptText,
    items: ["Decision history", "Reason codes", "Settlement and block outcomes"]
  },
  {
    title: "Registry",
    icon: Database,
    items: ["Verified merchant records", "Recipient binding", "Price-range intelligence"]
  }
];

const faqs = [
  [
    "Why not charge a percentage of payment volume?",
    "SAFE is the authorization layer, not the payment rail. Billing on decisions keeps pricing predictable and avoids taxing every micro-payment."
  ],
  [
    "What counts as a policy decision?",
    "Every hosted SAFE evaluation counts once: preflight, dry-run pay, or live pay. Rejected requests still count because the gateway did the safety work."
  ],
  [
    "Is the local SDK still free?",
    "Yes. The SDK, CLI, local policy engine, and demo integration stay free so developers can integrate before sending hosted traffic."
  ],
  [
    "Is this production billing yet?",
    "No. This page frames the first commercial packaging. The current app is still a developer preview and devnet-first."
  ]
];

function toneClasses(tone: "green" | "amber" | "sky") {
  return {
    green: "border-primary/30 bg-primary/10 text-primary",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    sky: "border-sky-400/30 bg-sky-400/10 text-sky-200"
  }[tone];
}

function PricingCard({
  tier
}: {
  tier: (typeof pricingTiers)[number];
}) {
  const Icon = tier.icon;

  return (
    <Card
      className={cn(
        "rounded-lg border-border bg-card/80",
        tier.featured && "border-primary/40 bg-primary/5 ring-primary/20"
      )}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className={cn("grid size-9 place-items-center rounded-md border", toneClasses(tier.tone))}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="font-display text-lg">{tier.name}</CardTitle>
            <CardDescription className="mt-1 leading-5">{tier.description}</CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge variant={tier.featured ? "default" : "outline"}>{tier.label}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        <div>
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl font-semibold tracking-normal text-foreground">{tier.price}</span>
            <span className="pb-1 text-sm text-muted-foreground">/{tier.period}</span>
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {tier.name === "Local SDK" ? "no hosted meter" : "decision-metered gateway"}
          </p>
        </div>

        <Separator />

        <div className="grid gap-2">
          {tier.metrics.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-md bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="font-mono text-xs text-foreground">{value}</span>
            </div>
          ))}
        </div>

        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {tier.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="bg-muted/30">
        <Link
          href={tier.href}
          className={cn(
            buttonVariants({
              variant: tier.featured ? "default" : "outline",
              size: "lg"
            }),
            "w-full"
          )}
        >
          {tier.cta}
          <ArrowRight data-icon="inline-end" />
        </Link>
      </CardFooter>
    </Card>
  );
}

function FeatureTile({
  icon: Icon,
  title,
  children
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-4">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <h3 className="mt-4 font-display text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      {/* Shared SAFE console backdrop. Keep the texture quiet behind the pricing data. */}
      <div aria-hidden="true" className="console-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-lg border border-border bg-card/40">
          <div aria-hidden="true" className="console-aura pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-8 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-md font-mono text-sm font-medium tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="grid size-7 place-items-center rounded-md border border-primary/30 bg-primary/10">
                  <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                </span>
                SAFE<span className="text-muted-foreground">{"//pricing"}</span>
              </Link>

              <Badge variant="outline" className="font-mono uppercase tracking-wide">
                <StatusLed tone="green" pulse />
                developer saas
              </Badge>

              <nav className="ml-auto flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <Link
                  href="/docs"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <BookOpen className="size-3.5" aria-hidden="true" />
                  Docs
                </Link>
                <Link
                  href="/"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Activity className="size-3.5" aria-hidden="true" />
                  Console
                </Link>
              </nav>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80">
                  $ safe gateway meter --unit policy_decision
                </p>
                <h1 className="mt-3 max-w-4xl font-display text-3xl font-semibold tracking-normal text-foreground sm:text-5xl">
                  Pricing for hosted agent-payment authorization.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  Keep the local SDK free. Charge for the hosted SAFE gateway that evaluates x402 payment
                  requests, blocks unsafe spend, and records audit-ready decisions before funds move.
                </p>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                  <CreditCard className="size-4" aria-hidden="true" />
                  billing principle
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Bill for authorization decisions and active agents. Do not take a payment-volume cut while
                  SAFE is proving the developer gateway wedge.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <SectionLabel>Plans</SectionLabel>
          <div className="grid items-stretch gap-4 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-3">
            <SectionLabel>Metering model</SectionLabel>
            <div className="overflow-x-auto rounded-lg border border-border bg-card/70">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/70 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Pricing</th>
                    <th className="px-4 py-3">Definition</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {comparisonRows.map(([item, pricing, definition, reason]) => (
                    <tr key={item}>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{item}</td>
                      <td className="px-4 py-3 text-foreground">{pricing}</td>
                      <td className="px-4 py-3">{definition}</td>
                      <td className="px-4 py-3">{reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <SectionLabel>What paid tiers include</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {featureGroups.map((group) => (
                <FeatureTile key={group.title} icon={group.icon} title={group.title}>
                  <ul className="flex flex-col gap-1">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <BadgeCheck className="mt-1 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </FeatureTile>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <SectionLabel>Enterprise path</SectionLabel>
            <Card className="rounded-lg border-border bg-card/80">
              <CardHeader>
                <CardTitle className="font-display text-lg">Custom governance</CardTitle>
                <CardDescription>
                  For agent platforms, wallets, and teams that need dedicated controls before mainnet spend.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                {[
                  "Custom decision volume",
                  "Dedicated tenant and gateway keys",
                  "Longer audit retention",
                  "Merchant registry onboarding",
                  "Team policy review workflows"
                ].map((item) => (
                  <div key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="bg-muted/30">
                <Link href="/docs#demo-claims" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
                  Read current production boundary
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </CardFooter>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <SectionLabel>Questions</SectionLabel>
            <div className="grid gap-3 md:grid-cols-2">
              {faqs.map(([question, answer]) => (
                <div key={question} className="rounded-lg border border-border bg-card/70 p-4">
                  <h3 className="font-display text-sm font-semibold text-foreground">{question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
