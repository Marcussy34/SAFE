import type { SafeDemoState } from "@/lib/runtime/demoState";
import type { SafePayInput, SafePayResult, SafePreflightInput, SafePreflightResult } from "@/lib/safe/types";
import type { AuditRecord } from "@/lib/types";

export interface SafeClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface SafeAuditResult {
  records: AuditRecord[];
}

export interface SafeClient {
  preflight(input: SafePreflightInput): Promise<SafePreflightResult>;
  pay(input: SafePayInput): Promise<SafePayResult>;
  state(): Promise<SafeDemoState>;
  audit(): Promise<SafeAuditResult>;
}

export class SafeClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown
  ) {
    super(message);
    this.name = "SafeClientError";
  }
}

function endpoint(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString();
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    return typeof error === "string" ? error : fallback;
  }

  return fallback;
}

export function createSafeClient(options: SafeClientOptions): SafeClient {
  const fetcher = options.fetchImpl ?? fetch;

  async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(endpoint(options.baseUrl, path), {
      ...init,
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers
      }
    });
    const body = await readResponseBody(response);

    if (!response.ok) {
      throw new SafeClientError(errorMessage(body, `SAFE API request failed with HTTP ${response.status}.`), response.status, body);
    }

    return body as T;
  }

  return {
    preflight(input) {
      return requestJson<SafePreflightResult>("/api/safe/preflight", {
        method: "POST",
        body: JSON.stringify(input)
      });
    },
    pay(input) {
      return requestJson<SafePayResult>("/api/safe/pay", {
        method: "POST",
        body: JSON.stringify(input)
      });
    },
    state() {
      return requestJson<SafeDemoState>("/api/safe/state");
    },
    audit() {
      return requestJson<SafeAuditResult>("/api/safe/audit");
    }
  };
}
