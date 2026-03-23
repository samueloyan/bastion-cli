import type { Finding, ScoreLabel } from '../types';

const PENALTIES: Record<string, number> = {
  critical: 15,
  high: 10,
  medium: 5,
  low: 2,
};

export function scoreFromFindings(findings: Finding[]): { score: number; label: ScoreLabel } {
  let score = 100;
  for (const f of findings) {
    score -= PENALTIES[f.severity] ?? 0;
  }
  score = Math.max(0, score);
  let label: ScoreLabel;
  if (score >= 80) label = 'GOOD';
  else if (score >= 60) label = 'MODERATE';
  else if (score >= 40) label = 'POOR';
  else label = 'CRITICAL';
  return { score, label };
}

export function scoreLabelDisplay(label: ScoreLabel): string {
  return label;
}
