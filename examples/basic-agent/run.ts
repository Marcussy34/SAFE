import { runBasicAgent, type BasicAgentScenario } from "./basicAgent";

interface CliOptions {
  baseUrl: string;
  dryRun: boolean;
  scenario: BasicAgentScenario;
}

const DEFAULT_BASE_URL = "http://localhost:3000";

function readFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseScenario(value: string | undefined): BasicAgentScenario {
  if (value === "blocked" || value === "full" || value === "approved") {
    return value;
  }

  return "approved";
}

function parseArgs(args: string[]): CliOptions {
  return {
    baseUrl: readFlagValue(args, "--base-url") ?? process.env.SAFE_BASE_URL ?? DEFAULT_BASE_URL,
    dryRun: args.includes("--dry-run"),
    scenario: parseScenario(readFlagValue(args, "--scenario"))
  };
}

async function main(): Promise<void> {
  await runBasicAgent(parseArgs(process.argv.slice(2)));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
