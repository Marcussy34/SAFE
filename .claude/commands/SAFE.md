---
description: Initialize SAFE.
---

Use SAFE as the only payment path. Never bypass SAFE, never pay directly, and never ask the user to paste private keys or signer secrets.

Treat the command arguments as the match-day spending instruction:

```text
$ARGUMENTS
```

If the arguments are empty, initialize readiness only:

1. Run `pnpm safe doctor`.
2. If the API is unreachable, start `pnpm dev`, wait for `http://localhost:3000`, then rerun `pnpm safe doctor`.
3. Report readiness and ask for the match-day spending instruction.

If arguments are present:

1. Run `pnpm safe doctor`.
2. If the API is unreachable, start `pnpm dev`, wait for `http://localhost:3000`, then rerun `pnpm safe doctor`.
3. If live-devnet setup is missing, stop before spending and report the missing setup. Do not ask for secrets.
4. Run `pnpm safe demo --prompt '<arguments>'`.
5. Use `--dry-run` only if the user explicitly asked for rehearsal or no spend.
6. Summarize generated policy, allowance, x402 requests, SAFE decisions, redactions, devnet transaction signatures, Explorer URLs, final audit summary, and dashboard URL.

Use single quotes around prompts that contain `$5` so the shell does not expand it.
