/**
 * Store copy compliance scanner ([§J.1], SCR refs).
 */
export type CopyScanIssue = { pattern: string; scr: string; message: string };

const RULES: Array<{ pattern: RegExp; scr: string; message: string }> = [
  {
    pattern: /\bcash\s*out\b|\bcash\s+out\b|\bwithdraw\b|\bwithdrawal\b|\bredeem\s+for\s+cash\b/i,
    scr: "SCR-2, SCR-7",
    message: "Possible cash-out / withdrawal language ([SCR-2], [SCR-7]).",
  },
  {
    pattern: /\bprofit\b|\bearn\s+money\b|\bmake\s+money\b|\bincome\b|\bROI\b/i,
    scr: "SCR-2, SCR-7",
    message: "Possible profit / income claims ([SCR-2], [SCR-7]).",
  },
  {
    pattern: /\breal\s+money\b|\bcash\s+prize\b|\breal-money\b|\bwager\b/i,
    scr: "SCR-1, SCR-7",
    message: "Possible real-money gambling framing ([SCR-1], [SCR-7]).",
  },
  {
    pattern: /\bguaranteed\b|\balways\s+wins\b|\bnever\s+loses\b|\b100%\s+chance\b/i,
    scr: "SCR-7",
    message: "Guarantee / certainty language ([SCR-7]).",
  },
  {
    pattern: /\bincreases\s+odds\b|\bboosts\s+payout\b|\bbetter\s+RNG\b|\bhigher\s+jackpot\s+rate\b|\bimproves\s+win\s+rate\b/i,
    scr: "SCR-4",
    message: "Gameplay-effect claims ([SCR-4]).",
  },
];

export function scanStoreCopy(text: string): CopyScanIssue[] {
  const issues: CopyScanIssue[] = [];
  if (!text.trim()) {
    return issues;
  }
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      issues.push({
        pattern: rule.pattern.source,
        scr: rule.scr,
        message: rule.message,
      });
    }
  }
  return issues;
}
