export interface PiiScanResult {
  detected: boolean;
  entities: string[];
  redactedText: string;
}

interface PiiPattern {
  entity: string;
  regex: RegExp;
  replacement: string;
  shouldRedact?: (match: string, input: string, offset: number) => boolean;
}

const PATTERNS: PiiPattern[] = [
  {
    entity: "email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[REDACTED_EMAIL]"
  },
  {
    entity: "credit_card",
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    replacement: "[REDACTED_CARD]",
    shouldRedact: (match, input, offset) => hasCardContext(input, offset) && passesLuhn(match)
  },
  {
    entity: "phone",
    regex: /\+?\d[\d\s().-]{7,}\d/g,
    replacement: "[REDACTED_PHONE]",
    shouldRedact: (match, input, offset) => hasPhoneContext(match, input, offset)
  },
  {
    entity: "hotel",
    regex: /\b[Hh]otel\s+[A-Z][A-Za-z0-9]*(?:[ -][A-Z][A-Za-z0-9]*)*/g,
    replacement: "[REDACTED_HOTEL]"
  }
];

function contextWindow(input: string, offset: number) {
  return input.slice(Math.max(0, offset - 24), offset).toLowerCase();
}

function hasCardContext(input: string, offset: number) {
  return /\b(card|credit|bill|billing|payment)\b/.test(contextWindow(input, offset));
}

function hasPhoneContext(match: string, input: string, offset: number) {
  return match.trim().startsWith("+") || match.includes("(") || /\b(call|phone|tel|text|sms)\b/.test(contextWindow(input, offset));
}

function passesLuhn(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum % 10 === 0;
}

export function scanAndRedactPii(input: string): PiiScanResult {
  let redactedText = input;
  const entities = new Set<string>();

  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;
    redactedText = redactedText.replace(pattern.regex, (match: string, offset: number) => {
      if (pattern.shouldRedact && !pattern.shouldRedact(match, redactedText, offset)) {
        return match;
      }
      entities.add(pattern.entity);
      return pattern.replacement;
    });
  }

  return {
    detected: entities.size > 0,
    entities: [...entities],
    redactedText
  };
}
