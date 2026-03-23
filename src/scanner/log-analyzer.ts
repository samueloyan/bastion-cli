import * as fs from 'fs';
import * as path from 'path';
import type { Finding, LogAnalysisSummary } from '../types';
import { dirExists, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const SCANNER_ID = 'log-analyzer';

const PATTERNS: { type: string; re: RegExp }[] = [
  { type: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: 'phone', re: /\b\d{3}-\d{3}-\d{4}\b|\b\d{3}-\d{4}-\d{4}\b/g },
  { type: 'credit_card', re: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
];

export async function analyzeLogs(logDir: string, nextId: IdGen): Promise<{ findings: Finding[]; summary: LogAnalysisSummary }> {
  const findings: Finding[] = [];
  const byType: Record<string, number> = {};
  let total = 0;
  let filesAnalyzed = 0;

  if (!dirExists(logDir)) {
    return {
      findings: [],
      summary: { totalMatches: 0, byType: {}, filesAnalyzed: 0 },
    };
  }

  const entries = fs.readdirSync(logDir, { withFileTypes: true });
  const logFiles = entries.filter((e) => e.isFile()).map((e) => path.join(logDir, e.name));

  for (const file of logFiles) {
    const text = readFileSafe(file);
    if (text === null) continue;
    filesAnalyzed += 1;
    for (const { type, re } of PATTERNS) {
      const matches = text.match(re);
      const n = matches?.length ?? 0;
      if (n > 0) {
        byType[type] = (byType[type] ?? 0) + n;
        total += n;
      }
    }
  }

  if (total > 0) {
    const relLog = path.basename(logDir);
    findings.push({
      id: nextId('high'),
      title: 'PII patterns detected in log files',
      severity: 'high',
      file: `${relLog}/`,
      line: 1,
      code: `Total sensitive-pattern matches: ${total}`,
      description: `Log analysis found ${total} pattern matches (${Object.entries(byType)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}).`,
      fix: 'Redact logs at write time, restrict log access, and avoid recording full prompts with PII.',
      frameworks: frameworksForScanner(SCANNER_ID),
      scannerId: SCANNER_ID,
    });
  }

  return {
    findings,
    summary: { totalMatches: total, byType, filesAnalyzed },
  };
}
