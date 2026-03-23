import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'js', 'tsx', 'jsx', 'py', 'env', 'yml', 'yaml', 'json', 'toml'];
const SCANNER_ID = 'api-keys';

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'OpenAI-style key', re: /sk-(?!ant-)[a-zA-Z0-9_-]{20,}/g },
  { name: 'Anthropic API key', re: /sk-ant-[a-zA-Z0-9]{20,}/g },
  { name: 'Google API key', re: /AIza[a-zA-Z0-9_-]{35}/g },
  { name: 'AWS access key', re: /AKIA[A-Z0-9]{16}/g },
];

const CONFIG_LINE = /^\s*[A-Za-z0-9_]*(?:KEY|SECRET|TOKEN)\s*=\s*.+$/;

export async function scanApiKeys(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const content = readFileSafe(file);
    if (content === null) continue;
    const lines = content.split(/\r?\n/);
    const rel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      let lineHasCredential = false;
      for (const { name, re } of PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        const lineRe = new RegExp(re.source, re.flags);
        while ((m = lineRe.exec(line)) !== null) {
          const raw = m[0];
          const key = `${rel}:${lineNo}:${raw.slice(0, 20)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          lineHasCredential = true;
          findings.push({
            id: nextId('critical'),
            title: `Hardcoded credential (${name})`,
            severity: 'critical',
            file: rel,
            line: lineNo,
            code: line.trim().slice(0, 200),
            description: `A credential matching ${name} appears in source or config. Secrets in repositories can be exfiltrated and abused.`,
            fix: 'Move secrets to a vault or environment variables injected at runtime; rotate exposed keys immediately.',
            frameworks: frameworksForScanner(SCANNER_ID),
            scannerId: SCANNER_ID,
          });
        }
      }
      const ext = path.extname(file).toLowerCase();
      if (
        !lineHasCredential &&
        ['.env', '.yml', '.yaml', '.json', '.toml'].includes(ext) &&
        CONFIG_LINE.test(line)
      ) {
        const key = `${rel}:${lineNo}:config`;
        if (seen.has(key)) return;
        seen.add(key);
        const masked = line.replace(/=\s*.+/, '=***');
        findings.push({
          id: nextId('critical'),
          title: 'Sensitive KEY/SECRET/TOKEN in config',
          severity: 'critical',
          file: rel,
          line: lineNo,
          code: masked.slice(0, 200),
          description: 'Configuration line declares KEY, SECRET, or TOKEN. Ensure values are not committed and are loaded securely.',
          fix: 'Use .env.example with placeholders, keep real .env out of version control, and use secret managers in production.',
          frameworks: frameworksForScanner(SCANNER_ID),
          scannerId: SCANNER_ID,
        });
      }
    });
  }

  return findings;
}
