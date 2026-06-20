import { describe, expect, it } from "vitest";
import { scanAndRedactPii } from "@/lib/policy/piiScanner";

describe("scanAndRedactPii", () => {
  it("detects and redacts email and hotel metadata", () => {
    const result = scanAndRedactPii("Email marcus@example.com at Hotel Central for shuttle pickup.");

    expect(result.detected).toBe(true);
    expect(result.entities).toContain("email");
    expect(result.entities).toContain("hotel");
    expect(result.redactedText).toBe("Email [REDACTED_EMAIL] at [REDACTED_HOTEL] for shuttle pickup.");
  });

  it("detects and redacts phone numbers and credit cards", () => {
    const result = scanAndRedactPii("Call +1 (415) 555-0101 and bill card 4242 4242 4242 4242.");

    expect(result.detected).toBe(true);
    expect(result.entities).toContain("phone");
    expect(result.entities).toContain("credit_card");
    expect(result.redactedText).toBe("Call [REDACTED_PHONE] and bill card [REDACTED_CARD].");
  });

  it("does not flag ordinary match data text", () => {
    const result = scanAndRedactPii("Need live stats for Argentina vs Japan.");

    expect(result.detected).toBe(false);
    expect(result.entities).toEqual([]);
    expect(result.redactedText).toBe("Need live stats for Argentina vs Japan.");
  });

  it("does not flag date-like match metadata as a phone number", () => {
    const result = scanAndRedactPii("Match date is 2026-06-19 and order id is 123456789012.");

    expect(result.detected).toBe(false);
    expect(result.redactedText).toBe("Match date is 2026-06-19 and order id is 123456789012.");
  });
});
