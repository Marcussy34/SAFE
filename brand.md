# Brand — SAFE (Spend Authorization Firewall for Agents)

_Status: active_

SAFE's visual identity is a **security firewall console**: a calm near-black operator
surface, hairline structure, monospaced data, and one decisive Solana-green accent that
means "authorized / live / safe". Restraint is the rule — green is an accent, never the
body text. Decided with the user on 2026-06-20.

## Direction

**Firewall console.** Operational, terminal-influenced, data-dense. Status LEDs, mono
labels, hairline dividers. It should read like a real security console an operator trusts,
not a marketing site.

## Color

Dark mode only (the app forces `.dark`). Tokens live in `app/globals.css`.

| Role | Token | Value (oklch) | Use |
|------|-------|---------------|-----|
| Background | `--background` | `0.15 0.006 240` | near-black console base (faint cool tint) |
| Panel | `--card` | `0.185 0.006 240` | raised surfaces, slightly above background |
| Muted surface | `--muted` | `0.22 0.006 240` | inset sub-boxes |
| Foreground | `--foreground` | `0.96 0.003 240` | near-white primary text |
| Muted text | `--muted-foreground` | `0.7 0.01 240` | labels, secondary text |
| Border | `--border` | `1 0 0 / 8%` | hairline structure |
| **Primary (Solana green)** | `--primary` | `0.86 0.2 163` | accents, active states, focus ring, live LED |
| Primary text-on | `--primary-foreground` | `0.18 0.02 165` | dark text on green fills |
| Destructive | `--destructive` | `0.62 0.21 18` | blocked / error |

**Status palette** (used sparingly as LEDs / badges, never as body text):
- **Green** = approved / live / enforced (the primary)
- **Amber** = capped / needs human review
- **Red** = blocked / rejected
- **Sky** = neutral info / chain

**Guardrails:** green is an accent only. Background stays calm. Maintain WCAG AA contrast
(≥4.5:1 body, ≥3:1 large text/icons). No neon washes.

## Typography

Wired via `next/font` in `app/layout.tsx`.

| Role | Family | CSS var | Used for |
|------|--------|---------|----------|
| Display / headings | **Space Grotesk** | `--font-display` (`--font-heading`) | h1–h3, card titles, wordmark |
| Body / UI | **Geist** | `--font-sans` | paragraphs, labels, controls |
| Data / mono | **JetBrains Mono** | `--font-mono` | addresses, tx hashes, policy IDs, USDC amounts, network, code |

Apply `font-mono` to every on-chain value (addresses, hashes, amounts, IDs). This is the
single biggest "this is a real crypto product" signal.

## Console primitives

- `StatusLed` (`components/dashboard/StatusLed.tsx`) — small glowing dot, tone-driven
  (`green | amber | red | sky | neutral`), glow via `currentColor`.
- `SectionLabel` (`components/dashboard/SectionLabel.tsx`) — uppercase, tracked, mono,
  muted section header (e.g. `// ACTIVE POLICY`).
- `.console-aura` / `.console-grid` utilities in `globals.css` — faint green header glow
  and subtle terminal grid backdrop. Keep both very subtle.

## Voice

Terse, technical, operator-facing. Active voice. Name the exact thing: "Policy active",
"Blocked: untrusted merchant", "Settled on devnet". No filler, no marketing adjectives.
