import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const equalsIndex = trimmed.indexOf("=");

  if (equalsIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return key ? [key, value] : null;
}

export function loadLocalEnv(): void {
  for (const fileName of [".env", ".env.local"]) {
    const filePath = join(process.cwd(), fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);

      if (parsed && process.env[parsed[0]] === undefined) {
        process.env[parsed[0]] = parsed[1];
      }
    }
  }
}
