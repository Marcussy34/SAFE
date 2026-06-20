import { createSafeClient, SafeClientError } from "../lib/sdk/createSafeClient";
import { runBasicAgent, type BasicAgentScenario } from "../examples/basic-agent/basicAgent";
import type { SafeDemoRunRecord } from "../lib/demo/demoRunner";
import type { SafePayResult } from "../lib/safe/types";

const DEFAULT_BASE_URL = "http://localhost:3000";

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function baseUrlFrom(args: string[]): string {
  return readFlagValue(args, "--base-url") ?? process.env.SAFE_BASE_URL ?? DEFAULT_BASE_URL;
}

function scenarioFrom(args: string[]): BasicAgentScenario {
  const scenario = readFlagValue(args, "--scenario");

  if (scenario === "approved" || scenario === "blocked" || scenario === "full") {
    return scenario;
  }

  return "approved";
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  safe doctor [--base-url http://localhost:3000]");
  console.log("  safe state [--base-url http://localhost:3000]");
  console.log("  safe demo [--prompt \"...\"] [--dry-run] [--base-url http://localhost:3000]");
  console.log("  safe pay <resourceUrl> [--dry-run] [--base-url http://localhost:3000]");
  console.log("  safe agent run [--dry-run] [--scenario approved|blocked|full] [--base-url http://localhost:3000]");
  console.log("  safe audit [--base-url http://localhost:3000]");
}

function formatUsdc(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatAction(value: string): string {
  return value.replaceAll("_", " ");
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}

function printPayResult(result: SafePayResult): void {
  console.log(`Decision: ${result.decision.reasonCode} (${result.decision.action})`);

  if (result.settlement) {
    console.log(`Settlement: ${result.settlement.settlementStatus}`);
  }

  if (result.settlement?.txSignature) {
    console.log(`Tx signature: ${result.settlement.txSignature}`);
  }

  if (result.explorerUrl) {
    console.log(`Explorer URL: ${result.explorerUrl}`);
  }

  if (result.resource) {
    console.log(`Resource: ${JSON.stringify(result.resource.body)}`);
  }
}

function shouldHaveSettlement(result: SafePayResult): boolean {
  return result.decision.action === "approve" || result.decision.action === "redact_and_approve";
}

function printDemoRun(run: SafeDemoRunRecord): void {
  console.log(`SAFE demo run: ${run.runId}`);
  console.log(`Mode: ${run.mode}${run.summary.dryRun ? " (no settlement)" : " (devnet settlement)"}`);
  console.log(`User intent: ${run.prompt}`);
  console.log("");
  console.log("Generated policy:");
  console.log(`- Budget: ${formatUsdc(run.generatedPolicy.maxTotalUsdc)} total, ${formatUsdc(run.generatedPolicy.perPaymentCapUsdc)} per payment`);
  console.log(`- Allow: ${formatList(run.generatedPolicy.allowedCategories)}`);
  console.log(`- Block: ${formatList(run.generatedPolicy.blockedCategories)}`);
  console.log(`- Domains: ${formatList(run.generatedPolicy.allowedDomains)}`);
  console.log(`- PII: ${run.generatedPolicy.piiMode}`);
  console.log(`- Allowance: ${run.allowance.remainingAtomicUnits} atomic units, expires ${run.allowance.expiresAt}`);
  console.log("");

  for (const [index, step] of run.steps.entries()) {
    console.log(`${index + 1}. ${step.label}`);
    console.log(`   x402 request: ${step.request.merchantDomain} ${formatUsdc(step.request.amountUsdc)} ${step.request.token}`);
    console.log(`   resource: ${step.resourceUrl}`);
    console.log(`   SAFE decision: ${step.decision.reasonCode} (${formatAction(step.decision.action)})`);
    console.log(`   reason: ${step.decision.reason}`);

    if (step.settlement) {
      console.log(`   settlement: ${step.settlement.settlementStatus}`);
    } else if (step.decision.action === "reject") {
      console.log("   settlement: blocked before signing");
    } else if (run.summary.dryRun) {
      console.log("   settlement: skipped by dry-run");
    }

    if (step.settlement?.txSignature) {
      console.log(`   tx: ${step.settlement.txSignature}`);
    }

    if (step.explorerUrl ?? step.settlement?.explorerUrl) {
      console.log(`   explorer: ${step.explorerUrl ?? step.settlement?.explorerUrl}`);
    }

    if (step.resource) {
      console.log(`   resource result: ${JSON.stringify(step.resource.body)}`);
    }
  }

  console.log("");
  console.log("Final audit summary:");
  console.log(
    `- approved=${run.summary.approved} redacted=${run.summary.redacted} blocked=${run.summary.blocked} settled=${run.summary.settled} failed=${run.summary.failed}`
  );
  console.log(`- attempted spend=${formatUsdc(run.summary.attemptedSpendUsdc)} settled spend=${formatUsdc(run.summary.settledSpendUsdc)}`);
  console.log(`- audit records=${run.summary.auditRecords}`);
  console.log("Dashboard: /api/safe/demo/state and the SAFE dashboard transcript panel show this run.");
}

async function runDoctor(args: string[]): Promise<void> {
  const safe = createSafeClient({ baseUrl: baseUrlFrom(args) });
  const state = await safe.state();
  const failedChecks = state.readiness.checks.filter((check) => !check.ok);

  console.log(`SAFE API reachable at ${baseUrlFrom(args)}`);
  console.log(`Mode: ${state.readiness.mode}`);
  console.log(`Network: ${state.readiness.network}`);
  console.log(`Readiness: ${state.readiness.checks.length - failedChecks.length}/${state.readiness.checks.length} checks passing`);

  for (const check of state.readiness.checks) {
    console.log(`- ${check.ok ? "ok" : "fail"} ${check.label}: ${check.detail}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const safe = createSafeClient({ baseUrl: baseUrlFrom(args) });

  if (!command || args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  if (command === "doctor") {
    await runDoctor(args);
    return;
  }

  if (command === "state") {
    console.log(JSON.stringify(await safe.state(), null, 2));
    return;
  }

  if (command === "audit") {
    console.log(JSON.stringify(await safe.audit(), null, 2));
    return;
  }

  if (command === "demo") {
    const dryRun = args.includes("--dry-run");
    const run = await safe.demoRun({
      prompt: readFlagValue(args, "--prompt"),
      dryRun,
      requireLive: !dryRun
    });

    printDemoRun(run);

    if (!dryRun && run.summary.failed > 0) {
      throw new Error(`SAFE demo had ${run.summary.failed} failed settlement(s).`);
    }

    return;
  }

  if (command === "pay") {
    const resourceUrl = args[1];

    if (!resourceUrl || resourceUrl.startsWith("--")) {
      throw new Error("safe pay requires a resource URL.");
    }

    const dryRun = args.includes("--dry-run");
    const result = await safe.pay({ resourceUrl, dryRun });
    printPayResult(result);

    if (!dryRun && shouldHaveSettlement(result) && result.settlement?.settlementStatus !== "settled") {
      throw new Error(`SAFE settlement failed: ${result.settlement?.error ?? "missing settlement"}`);
    }

    return;
  }

  if (command === "agent" && args[1] === "run") {
    await runBasicAgent({
      baseUrl: baseUrlFrom(args),
      dryRun: args.includes("--dry-run"),
      scenario: scenarioFrom(args)
    });
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  if (error instanceof SafeClientError) {
    console.error(`SAFE API error (${error.status}): ${error.message}`);
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }

  process.exitCode = 1;
});
