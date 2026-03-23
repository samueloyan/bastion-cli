import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'tsx', 'js', 'jsx'];
const SCANNER_ID = 'tool-permissions';

const DANGEROUS_ACCESS = /\b(write|system|external|admin)\b/i;

export async function scanToolPermissions(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  const findings: Finding[] = [];

  for (const file of files) {
    const code = readFileSafe(file);
    if (!code) continue;
    if (!/agentTools|tools\s*=\s*\[|Tool\(|createTool|function\s+calling/i.test(code)) continue;
    const rel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);

    const usedMatch = code.match(/usedTools\s*=\s*\[([^\]]+)\]/);
    const used = new Set<string>();
    if (usedMatch) {
      const inner = usedMatch[1];
      const names = inner.match(/["']([^"']+)["']/g) ?? [];
      for (const n of names) used.add(n.replace(/["']/g, ''));
    }

    const toolBlocks = extractToolObjects(code);
    const definedNames: { name: string; access?: string; line: number }[] = [];
    for (const b of toolBlocks) {
      const nameM = b.body.match(/name\s*:\s*["']([^"']+)["']/);
      const accessM = b.body.match(/access\s*:\s*["']([^"']+)["']/);
      if (nameM) definedNames.push({ name: nameM[1], access: accessM?.[1], line: b.line });
    }

    if (definedNames.length === 0) continue;

    const usedCount = definedNames.filter((d) => used.has(d.name)).length;
    const ratio = usedCount / definedNames.length;

    for (const d of definedNames) {
      if (!d.access) continue;
      if (DANGEROUS_ACCESS.test(d.access) && !used.has(d.name)) {
        findings.push({
          id: nextId('high'),
          title: `Dangerous tool defined but unused: ${d.name}`,
          severity: 'high',
          file: rel,
          line: d.line,
          code: `tool: ${d.name} (access: ${d.access})`,
          description:
            'A high-privilege tool (database write, filesystem, email, code execution, external HTTP) is registered but not referenced in used tools, increasing attack surface if the agent is hijacked.',
          fix: 'Remove unused tools, narrow scopes, require human approval for destructive actions, and enforce least privilege.',
          frameworks: frameworksForScanner(SCANNER_ID),
          scannerId: SCANNER_ID,
        });
      }
    }

    if (definedNames.length > 5 && ratio < 0.5 && used.size > 0) {
      findings.push({
        id: nextId('high'),
        title: 'Many agent tools defined with low utilization',
        severity: 'high',
        file: rel,
        line: definedNames[0]?.line ?? 1,
        code: `${definedNames.length} tools defined, ${usedCount} appear used`,
        description:
          'Tool count exceeds five and fewer than half appear in the declared used set, which can indicate excessive agency or dead dangerous capabilities.',
        fix: 'Prune unused tools and split agents by least privilege.',
        frameworks: frameworksForScanner(SCANNER_ID),
        scannerId: SCANNER_ID,
      });
    }
  }

  return dedupe(findings);
}

function extractToolObjects(code: string): { body: string; line: number }[] {
  const out: { body: string; line: number }[] = [];
  const re = /\{\s*name\s*:\s*["'][^"']+["'][^}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    out.push({ body: m[0], line: code.slice(0, m.index).split(/\r?\n/).length });
  }
  return out;
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
