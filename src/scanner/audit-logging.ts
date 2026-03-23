import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'tsx', 'js', 'jsx', 'py'];
const SCANNER_ID = 'audit-logging';

const LOGGER = /\b(logger\.|console\.(log|info|debug|warn)|winston|pino|bunyan|structlog)\b/;
const LLM_CALL = /\.chat\.completions\.create|\.messages\.create|invoke\s*\(|AgentExecutor|bindTools/;

export async function scanAuditLogging(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  const findings: Finding[] = [];

  for (const file of files) {
    const code = readFileSafe(file);
    if (!code) continue;
    if (!LLM_CALL.test(code)) continue;
    if (LOGGER.test(code)) continue;
    const rel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);
    const line = firstLineMatching(code, LLM_CALL) ?? 1;
    findings.push({
      id: nextId('medium'),
      title: 'LLM or agent invocation without nearby audit logging',
      severity: 'medium',
      file: rel,
      line,
      code: snippetLine(code, line),
      description:
        'No logger/console/winston/pino usage detected in the same file as LLM or tool calls, limiting traceability for security reviews.',
      fix: 'Log prompt metadata (not secrets), tool invocations, model id, latency, and outcomes to a structured audit sink.',
      frameworks: frameworksForScanner(SCANNER_ID),
      scannerId: SCANNER_ID,
    });
  }

  return dedupe(findings);
}

function firstLineMatching(code: string, re: RegExp): number | null {
  const lines = code.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1;
  }
  return null;
}

function snippetLine(code: string, line: number): string {
  return code.split(/\r?\n/)[line - 1]?.trim().slice(0, 200) ?? '';
}

function dedupe(items: Finding[]): Finding[] {
  const s = new Set<string>();
  const out: Finding[] = [];
  for (const f of items) {
    if (s.has(f.file)) continue;
    s.add(f.file);
    out.push(f);
  }
  return out;
}
