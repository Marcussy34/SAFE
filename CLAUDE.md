# SAFE Agent Instructions

SAFE means Spend Authorization Firewall for Agents.

When the user asks you to act as a match-day agent, initialize SAFE, or gives a natural-language budget for match data, transit, food vouchers, gambling/merch blocking, unknown merchant blocking, duplicate blocking, over-budget blocking, or PII redaction:

1. Use SAFE as the only payment path.
2. Do not bypass SAFE or pay directly.
3. Do not ask the user to paste private keys, signer secrets, or wallet material.
4. Prefer the project command `/SAFE`.
5. If the user already gave the spending instruction, run:

   ```bash
   pnpm safe doctor
   pnpm safe demo --prompt '<user spending instruction>'
   ```

6. Use `--dry-run` only when the user explicitly asks for rehearsal or no spend.
7. If `pnpm safe doctor` shows the API is unreachable, start the app with `pnpm dev`, wait for `http://localhost:3000`, then rerun `pnpm safe doctor`.
8. If live-devnet setup is missing, stop before spending and report the missing setup. Do not ask for secrets.
9. After the run, summarize the generated policy, allowance, x402 requests, SAFE decisions, redactions, transaction signatures, Explorer URLs, and final audit summary.

Use single quotes around prompts that contain `$5` so the shell does not expand it.
