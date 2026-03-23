import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'tsx', 'js', 'jsx', 'py'];
const SCANNER_ID = 'system-prompts';

const LLM_BLOCK =
  /(?:chat\.completions\.create|messages\.create|completions\.create)\s*\(\s*\{[^}]*messages\s*:\s*\[([\s\S]*?)\]/g;

export async function scanSystemPrompts(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  const findings: Finding[] = [];

  for (const file of files) {
    const code = readFileSafe(file);
    if (!code) continue;
    if (!/chat\.completions\.create|messages\.create/.test(code)) continue;
    const rel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);
    let m: RegExpExecArray | null;
    const re = new RegExp(LLM_BLOCK.source, LLM_BLOCK.flags);
    while ((m = re.exec(code)) !== null) {
      const block = m[1] ?? '';
      const hasSystem = /role\s*:\s*['"]system['"]/.test(block) || /"role"\s*:\s*"system"/.test(block);
      if (hasSystem) {
        const hardcoded =
          /content\s*:\s*[`'"][^`'"]{20,}/.test(block) && !/process\.env|config\.|getenv/i.test(block);
        if (hardcoded) {
          const line = lineAtIndex(code, m.index);
          findings.push({
            id: nextId('medium'),
            title: 'System prompt appears hardcoded in source',
            severity: 'medium',
            file: rel,
            line,
            code: snippetLine(code, line),
            description:
              'A system message is embedded directly in code rather than configuration or a policy store, making updates and auditing harder.',
            fix: 'Load system instructions from versioned configuration, feature flags, or a policy service.',
            frameworks: frameworksForScanner(SCANNER_ID),
            scannerId: SCANNER_ID,
          });
        }
        continue;
      }
      const line = lineAtIndex(code, m.index);
      findings.push({
        id: nextId('medium'),
        title: 'LLM call missing explicit system message',
        severity: 'medium',
        file: rel,
        line,
        code: snippetLine(code, line),
        description:
          'Messages array has no system role. Without a fixed system instruction, model behavior is less predictable and harder to govern.',
        fix: 'Add a dedicated system message for policy, safety, and tool-use rules separate from user content.',
        frameworks: frameworksForScanner(SCANNER_ID),
        scannerId: SCANNER_ID,
      });
    }
  }

  return dedupe(findings);
}

function lineAtIndex(code: string, idx: number): number {
  return code.slice(0, idx).split(/\r?\n/).length;
}

function snippetLine(code: string, line: number): string {
  return code.split(/\r?\n/)[line - 1]?.trim().slice(0, 200) ?? '';
}

function dedupe(items: Finding[]): Finding[] {
  const s = new Set<string>();
  const out: Finding[] = [];
  for (const f of items) {
    const k = `${f.file}:${f.line}:${f.title}`;
    if (s.has(k)) continue;
    s.add(k);
    out.push(f);
  }
  return out;
}
