import { createSafeClient } from "../../lib/sdk/createSafeClient";
import type { SafePayResult } from "../../lib/safe/types";

export type BasicAgentScenario = "approved" | "blocked" | "full";

export interface BasicAgentOptions {
  baseUrl: string;
  dryRun?: boolean;
  scenario?: BasicAgentScenario;
}

interface AgentStep {
  label: string;
  resourcePath: string;
  agentReason: string;
}

export interface BasicAgentStepResult {
  label: string;
  resourceUrl: string;
  result: SafePayResult;
}

function resourceUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

function scenarioSteps(scenario: BasicAgentScenario): AgentStep[] {
  if (scenario === "blocked") {
    return [
      {
        label: "blocked fake merchant",
        resourcePath: "/api/x402/fake-merch",
        agentReason: "Agent wants a souvenir jersey, but this merchant is outside the match-day intent."
      }
    ];
  }

  const approved: AgentStep = {
    label: "approved match stats",
    resourcePath: "/api/x402/stats",
    agentReason: "Agent needs live match stats to answer the user."
  };

  if (scenario === "approved") {
    return [approved];
  }

  return [
    approved,
    {
      label: "approved transit",
      resourcePath: "/api/x402/transit",
      agentReason: "Agent needs the best stadium route."
    },
    {
      label: "approved food voucher",
      resourcePath: "/api/x402/food",
      agentReason: "Agent needs a halftime food option."
    },
    {
      label: "blocked fake merchant",
      resourcePath: "/api/x402/fake-merch",
      agentReason: "Agent wants a souvenir jersey, but this merchant is outside the match-day intent."
    },
    {
      label: "duplicate stats request",
      resourcePath: "/api/x402/stats",
      agentReason: "Agent retries the same stats request."
    },
    {
      label: "over-limit premium feed",
      resourcePath: "/api/x402/premium-feed",
      agentReason: "Agent requests the premium live feed."
    },
    {
      label: "metadata leak redaction",
      resourcePath: "/api/x402/metadata-leak",
      agentReason: "Email marcus@example.com at Hotel Central for shuttle pickup."
    }
  ];
}

function printStep(label: string, resource: string, dryRun: boolean, result: SafePayResult): void {
  console.log(`Paid resource needed: ${resource}`);
  console.log(`SAFE pay call: POST /api/safe/pay${dryRun ? " --dry-run" : ""}`);
  console.log(`SAFE decision: ${result.decision.reasonCode} (${result.decision.action})`);

  if (result.settlement?.txSignature) {
    console.log(`Tx signature: ${result.settlement.txSignature}`);
  }

  if (result.explorerUrl) {
    console.log(`Explorer URL: ${result.explorerUrl}`);
  }

  if (result.resource) {
    console.log(`Final answer/resource result: ${JSON.stringify(result.resource.body)}`);
  } else if (dryRun) {
    console.log("Final answer/resource result: dry run stopped before settlement.");
  } else {
    console.log(`Final answer/resource result: no paid fetch after ${label}.`);
  }
}

function shouldHaveSettlement(result: SafePayResult): boolean {
  return result.decision.action === "approve" || result.decision.action === "redact_and_approve";
}

export async function runBasicAgent(options: BasicAgentOptions): Promise<BasicAgentStepResult[]> {
  const scenario = options.scenario ?? "approved";
  const dryRun = options.dryRun === true;
  const safe = createSafeClient({ baseUrl: options.baseUrl });
  const results: BasicAgentStepResult[] = [];

  console.log("Agent intent: Plan my World Cup match day.");

  for (const step of scenarioSteps(scenario)) {
    const url = resourceUrl(options.baseUrl, step.resourcePath);
    const result = await safe.pay({
      resourceUrl: url,
      agentReason: step.agentReason,
      dryRun
    });

    printStep(step.label, url, dryRun, result);

    if (!dryRun && shouldHaveSettlement(result) && result.settlement?.settlementStatus !== "settled") {
      throw new Error(`SAFE settlement failed for ${step.label}: ${result.settlement?.error ?? "missing settlement"}`);
    }

    results.push({ label: step.label, resourceUrl: url, result });
  }

  return results;
}
