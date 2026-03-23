import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'yml', 'yaml', 'toml'];
const SCANNER_ID = 'model-versions';

const DEPRECATED: { pattern: RegExp; label: string; severity: 'low' | 'medium' }[] = [
  { pattern: /text-davinci-003/g, label: 'text-davinci-003 (deprecated)', severity: 'medium' },
  { pattern: /code-davinci-002/g, label: 'code-davinci-002 (deprecated)', severity: 'medium' },
  { pattern: /gpt-3\.5-turbo-0301|gpt-3\.5-turbo-0613|gpt-3\.5-turbo-1106/g, label: 'Old gpt-3.5-turbo snapshot', severity: 'low' },
];

export async function scanModelVersions(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  const findings: Finding[] = [];

  for (const file of files) {
    const code = readFileSafe(file);
    if (!code) continue;
    const rel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);
    const lines = code.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const d of DEPRECATED) {
        const re = new RegExp(d.pattern.source, d.pattern.flags);
        if (re.test(line)) {
          findings.push({
            id: nextId(d.severity),
            title: `Outdated or deprecated model reference: ${d.label}`,
            severity: d.severity,
            file: rel,
            line: i + 1,
            code: line.trim().slice(0, 200),
            description: 'Model string matches a deprecated or legacy snapshot that may lack safety improvements.',
            fix: 'Upgrade to a supported model version and pin with automated checks.',
            frameworks: frameworksForScanner(SCANNER_ID),
            scannerId: SCANNER_ID,
          });
        }
      }
    });
  }

  return dedupe(findings);
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
