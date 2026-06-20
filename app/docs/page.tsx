import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Coins,
  ExternalLink,
  FileText,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Network,
  Search,
  ShieldCheck,
  Terminal,
  Zap
} from "lucide-react";

import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SAFE Docs - Spend Authorization Firewall for Agents",
  description: "Official SAFE documentation for Solana allowance-backed agent payments and x402-style settlement."
};

const navGroups = [
  {
    title: "Get Started",
    links: [
      ["Introduction", "#introduction"],
      ["Current State", "#current-state"],
      ["Quickstart", "#quickstart"]
    ]
  },
  {
    title: "Architecture",
    links: [
      ["System Flow", "#system-flow"],
      ["Policy Engine", "#policy-engine"],
      ["Runtime Modes", "#runtime-modes"]
    ]
  },
  {
    title: "Protocols",
    links: [
      ["Solana Allowances", "#solana-allowances"],
      ["x402 Boundary", "#x402-boundary"],
      ["AP2 Intent Layer", "#ap2-intent-layer"]
    ]
  },
  {
    title: "Reference",
    links: [
      ["API Routes", "#api-routes"],
      ["Environment", "#environment"],
      ["Demo Claims", "#demo-claims"]
    ]
  }
];

const onThisPage = [
  ["Introduction", "#introduction"],
  ["System Flow", "#system-flow"],
  ["x402 Boundary", "#x402-boundary"],
  ["API Routes", "#api-routes"],
  ["Demo Claims", "#demo-claims"]
];

const quickstartCommands = `pnpm install
pnpm dev

# Check configured devnet balances
pnpm safe:devnet:balances

# Create/reuse the fixed allowance
SAFE_DEMO_MODE=false pnpm safe:devnet:setup-allowance

# Submit one real devnet allowance-backed settlement
SAFE_DEMO_MODE=false pnpm safe:devnet:smoke

# Probe public x402 verification compatibility
pnpm safe:x402:public:verify`;

const envRows = [
  ["SOLANA_RPC_URL", "Devnet RPC endpoint used by the app and scripts."],
  ["SOLANA_RPC_WS_URL", "Optional websocket endpoint for confirmation subscriptions."],
  ["SAFE_DEMO_MODE", "`true` for mock mode, `false` for live devnet settlement."],
  ["SAFE_DEMO_MINT", "Official devnet USDC mint used by the demo."],
  ["SAFE_USER_SIGNER_BASE58", "User/delegator keypair. Keep this local only."],
  ["SAFE_SESSION_SECRET_BASE58", "Agent/delegatee keypair. Keep this local only."],
  ["SAFE_FACILITATOR_SECRET_BASE58", "Transaction sponsor keypair. Keep this local only."]
];

const apiRows = [
  ["GET", "/api/x402/stats", "Returns a match-data x402 payment challenge."],
  ["GET", "/api/x402/transit", "Returns a transit x402 payment challenge."],
  ["GET", "/api/x402/food", "Returns a food voucher x402 payment challenge."],
  ["GET", "/api/x402/fake-merch", "Blocked merchant scenario for the firewall demo."],
  ["POST", "/api/preflight", "Normalizes payment requirements and evaluates SAFE policy."],
  ["POST", "/api/facilitator/verify", "Mock/custom verifier for allowance-backed x402 payloads."],
  ["POST", "/api/facilitator/settle", "Mock/custom settlement endpoint for approved payments."],
  ["GET", "/api/agent/run", "Runs the scripted World Cup agent scenario."]
];

function Section({
  id,
  eyebrow,
  title,
  children
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-white/10 py-10 first:border-t-0 first:pt-0">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">{eyebrow}</p> : null}
      <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">{title}</h2>
      <div className="mt-5 space-y-5 text-sm leading-6 text-zinc-300">{children}</div>
    </section>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "emerald" | "sky" | "amber";
}) {
  const tones = {
    emerald: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200",
    sky: "border-sky-400/20 bg-sky-400/8 text-sky-200",
    amber: "border-amber-400/20 bg-amber-400/8 text-amber-200"
  };

  return (
    <div className={cn("rounded-lg border p-4", tones[tone])}>
      <Icon className="size-4" />
      <p className="mt-5 text-xs uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/60 p-4 text-[13px] leading-6 text-emerald-100 shadow-inner shadow-black/30">
      <code>{children}</code>
    </pre>
  );
}

function FlowNode({ label, detail, tone = "default" }: { label: string; detail: string; tone?: "default" | "safe" | "chain" }) {
  const tones = {
    default: "border-zinc-700 bg-zinc-950 text-zinc-200",
    safe: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    chain: "border-sky-400/30 bg-sky-400/10 text-sky-100"
  };

  return (
    <div className={cn("min-w-0 rounded-lg border p-4", tones[tone])}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{detail}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden items-center justify-center text-zinc-600 lg:flex">
      <ArrowRight className="size-4" />
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#070909] text-zinc-100">
      <div className="border-b border-white/10 bg-[#070909]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
            <span className="grid size-7 place-items-center rounded-md border border-emerald-400/30 bg-emerald-400/10">
              <ShieldCheck className="size-4 text-emerald-300" />
            </span>
            SAFE Docs
          </Link>
          <div className="ml-auto hidden h-8 min-w-[260px] items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs text-zinc-500 md:flex">
            <Search className="size-3.5" />
            Search documentation
            <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">⌘K</span>
          </div>
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:text-white"
          >
            App
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)_220px] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-8 space-y-7 text-sm">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{group.title}</p>
                <div className="space-y-1">
                  {group.links.map(([label, href]) => (
                    <a
                      key={href}
                      href={href}
                      className="block rounded-md px-2 py-1.5 text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <article className="min-w-0">
          <section id="introduction" className="scroll-mt-28 pb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <BookOpen className="size-3.5" />
              Official SAFE documentation
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
              Spend Authorization Firewall for Agents
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300">
              SAFE lets an agent spend from a capped Solana allowance, but only after a deterministic firewall approves the
              x402-style payment request. Approved payments settle on Solana devnet. Blocked payments are never signed.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <StatBlock icon={Coins} label="Settlement" value="Real devnet USDC" tone="sky" />
              <StatBlock icon={ShieldCheck} label="Firewall" value="Pre-signing policy" tone="emerald" />
              <StatBlock icon={Network} label="Protocol" value="x402-style exact SVM" tone="amber" />
            </div>
          </section>

          <Section id="current-state" eyebrow="Status" title="Current State">
            <p>
              SAFE is a working hackathon demo with real Solana devnet allowance settlement. It uses official devnet USDC,
              Solana Subscriptions/Allowances, and a SAFE policy layer that checks merchant, amount, category, replay, PII,
              recipient, and AP2-style intent constraints before signing.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Live on devnet", "Fixed delegation setup and transferFixed settlement are wired."],
                ["Public x402 probed", "Direct wallet x402 verifies publicly; allowance wrapper needs allowlisting."],
                ["Policy-first", "Unsafe requests stop before the delegatee signs."],
                ["Not mainnet", "This is a devnet demo, not production payment infrastructure."]
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="quickstart" eyebrow="Run" title="Quickstart">
            <p>Use demo mode for UI review. Use live mode only when the devnet wallets and official devnet USDC are funded.</p>
            <CodeBlock>{quickstartCommands}</CodeBlock>
            <div className="flex gap-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm leading-6">
                Live mode spends devnet USDC from the configured user allowance. Keep private keys in `.env.local` only.
              </p>
            </div>
          </Section>

          <Section id="system-flow" eyebrow="Architecture" title="System Flow">
            <div className="grid gap-3 lg:grid-cols-[1fr_32px_1fr_32px_1fr]">
              <FlowNode label="Agent asks for a paid resource" detail="The API returns HTTP 402 payment requirements." />
              <Arrow />
              <FlowNode label="SAFE evaluates the request" detail="Policy, merchant, intent, duplicate, and metadata checks run first." tone="safe" />
              <Arrow />
              <FlowNode label="Solana settles approved spend" detail="The delegatee signs transferFixed and the facilitator submits." tone="chain" />
            </div>
            <div className="rounded-lg border border-white/10 bg-zinc-950 p-4">
              <p className="text-sm font-semibold text-white">Core model</p>
              <div className="mt-3 grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
                <p>
                  <span className="text-emerald-300">Solana allowance:</span> hard monetary boundary.
                </p>
                <p>
                  <span className="text-emerald-300">x402:</span> per-request paid API negotiation.
                </p>
                <p>
                  <span className="text-emerald-300">SAFE:</span> semantic firewall before signing.
                </p>
                <p>
                  <span className="text-emerald-300">Facilitator:</span> verification, sponsorship, submission.
                </p>
              </div>
            </div>
          </Section>

          <Section id="policy-engine" eyebrow="Firewall" title="Policy Engine">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                [KeyRound, "Allowance", "Delegation PDA, cap, expiry, delegatee, and remaining capacity."],
                [FileText, "Payment", "Amount, asset mint, network, x402 scheme, recipient, memo, and resource."],
                [LockKeyhole, "Risk", "Merchant trust, category allowlist, duplicate request, and PII leakage."],
                [GitBranch, "Intent", "Local AP2-style intent scope that binds the agent task to allowed domains."]
              ].map(([Icon, title, body]) => {
                const TypedIcon = Icon as ComponentType<{ className?: string }>;

                return (
                  <div key={title as string} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <TypedIcon className="size-4 text-emerald-300" />
                    <h3 className="mt-3 text-sm font-semibold text-white">{title as string}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{body as string}</p>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section id="runtime-modes" eyebrow="Modes" title="Runtime Modes">
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Behavior</th>
                    <th className="px-4 py-3">Use</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-zinc-300">
                  <tr>
                    <td className="px-4 py-3 font-mono text-emerald-200">SAFE_DEMO_MODE=true</td>
                    <td className="px-4 py-3">Uses mock verification and demo signatures.</td>
                    <td className="px-4 py-3">UI demos and local review.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-sky-200">SAFE_DEMO_MODE=false</td>
                    <td className="px-4 py-3">Uses real Solana devnet settlement.</td>
                    <td className="px-4 py-3">Hackathon proof with explorer receipts.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="solana-allowances" eyebrow="Solana" title="Solana Allowances">
            <p>
              The user creates a fixed allowance to the SAFE session signer. Approved payments call the Solana
              Subscriptions/Allowances program through `transferFixed`, moving USDC from the user token account to the
              merchant associated token account.
            </p>
            <CodeBlock>{`Program: De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44
Mint:    4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
Rail:    x402_solana_allowance_devnet`}</CodeBlock>
          </Section>

          <Section id="x402-boundary" eyebrow="Protocol" title="x402 Boundary">
            <p>
              x402 works publicly for direct Solana wallet payments. SAFE allowance-backed transactions are different:
              it calls the Subscriptions program, which emits the token transfer as an inner instruction. A facilitator
              must support simulation-based verification and allowlist the Subscriptions program.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
                <Zap className="size-4 text-emerald-200" />
                <h3 className="mt-3 text-sm font-semibold text-white">Public x402 direct payment</h3>
                <p className="mt-1 text-sm text-zinc-300">Verified successfully against the public facilitator on devnet.</p>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
                <AlertTriangle className="size-4 text-amber-200" />
                <h3 className="mt-3 text-sm font-semibold text-white">SAFE allowance wrapper</h3>
                <p className="mt-1 text-sm text-zinc-300">Rejected publicly until the Subscriptions program is allowlisted.</p>
              </div>
            </div>
          </Section>

          <Section id="ap2-intent-layer" eyebrow="Protocol" title="AP2 Intent Layer">
            <p>
              SAFE currently implements AP2-style intent constraints locally. It does not claim full AP2 credential exchange.
              The intent binds the agent session to allowed domains, categories, budget, and expiry before any payment is signed.
            </p>
          </Section>

          <Section id="api-routes" eyebrow="Reference" title="API Routes">
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-zinc-300">
                  {apiRows.map(([method, route, purpose]) => (
                    <tr key={route}>
                      <td className="px-4 py-3 font-mono text-xs text-emerald-200">{method}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-100">{route}</td>
                      <td className="px-4 py-3">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="environment" eyebrow="Reference" title="Environment">
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Variable</th>
                    <th className="px-4 py-3">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-zinc-300">
                  {envRows.map(([name, meaning]) => (
                    <tr key={name}>
                      <td className="px-4 py-3 font-mono text-xs text-sky-200">{name}</td>
                      <td className="px-4 py-3">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="demo-claims" eyebrow="Positioning" title="Demo Claims">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
                <h3 className="text-sm font-semibold text-white">Say this</h3>
                <p className="mt-2 text-sm text-zinc-300">
                  SAFE is a working Solana devnet agent-payment firewall using real allowances, real USDC settlement,
                  x402-style paid API flow, and AP2-style intent enforcement.
                </p>
              </div>
              <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-4">
                <h3 className="text-sm font-semibold text-white">Do not claim this yet</h3>
                <p className="mt-2 text-sm text-zinc-300">
                  Not full production x402 compatibility with every facilitator. Not full AP2 credential exchange. Not mainnet-ready.
                </p>
              </div>
            </div>
          </Section>
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-8 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">On this page</p>
            <div className="mt-3 space-y-1 text-sm">
              {onThisPage.map(([label, href]) => (
                <a key={href} href={href} className="block rounded-md py-1.5 text-zinc-400 transition hover:text-white">
                  {label}
                </a>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3">
              <Terminal className="size-4 text-emerald-300" />
              <p className="mt-2 text-xs leading-5 text-emerald-100">
                Devnet mode is live. Use the smoke command only when the allowance and token balance are ready.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
