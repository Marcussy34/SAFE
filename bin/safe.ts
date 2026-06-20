import { createSafeClient, SafeClientError } from "../lib/sdk/createSafeClient";
import { runBasicAgent, type BasicAgentScenario } from "../examples/basic-agent/basicAgent";
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
  console.log("  safe pay <resourceUrl> [--dry-run] [--base-url http://localhost:3000]");
  console.log("  safe agent run [--dry-run] [--scenario approved|blocked|full] [--base-url http://localhost:3000]");
  console.log("  safe audit [--base-url http://localhost:3000]");
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
