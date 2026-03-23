import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'tsx', 'js', 'jsx', 'vue'];
const SCANNER_ID = 'output-handling';

const INNER_HTML_ASSIGN = /\.innerHTML\s*=/;
const V_HTML = /v-html\s*=/;
const DANGEROUS = /dangerouslySetInnerHTML/;
const SANITIZE = /DOMPurify|sanitize-html|sanitizeHtml|dompurify/i;

export async function scanOutputHandling(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  const findings: Finding[] = [];

  for (const file of files) {
    const code = readFileSafe(file);
    if (!code) continue;
    const rel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);
    const lines = code.split(/\r?\n/);

    lines.forEach((line, i) => {
      if (DANGEROUS.test(line) && !SANITIZE.test(line)) {
        findings.push({
          id: nextId('high'),
          title: 'Insecure output: dangerouslySetInnerHTML with model content',
          severity: 'high',
          file: rel,
          line: i + 1,
          code: line.trim().slice(0, 200),
          description:
            'LLM or remote HTML rendered via dangerouslySetInnerHTML without DOMPurify/sanitize-html allows stored XSS through model output.',
          fix: 'Sanitize HTML before render, prefer plain text or Markdown with a safe renderer, or use Content Security Policy.',
          frameworks: frameworksForScanner(SCANNER_ID),
          scannerId: SCANNER_ID,
        });
      }
      if (V_HTML.test(line) && !SANITIZE.test(line)) {
        findings.push({
          id: nextId('high'),
          title: 'Insecure output: v-html with unsanitized content',
          severity: 'high',
          file: rel,
          line: i + 1,
          code: line.trim().slice(0, 200),
          description: 'Vue v-html renders raw HTML; model-supplied markup can execute scripts.',
          fix: 'Avoid v-html for LLM output or pipe through a trusted sanitizer.',
          frameworks: frameworksForScanner(SCANNER_ID),
          scannerId: SCANNER_ID,
        });
      }
      if (INNER_HTML_ASSIGN.test(line) && !SANITIZE.test(line)) {
        findings.push({
          id: nextId('high'),
          title: 'Insecure output: innerHTML assignment',
          severity: 'high',
          file: rel,
          line: i + 1,
          code: line.trim().slice(0, 200),
          description: 'Direct innerHTML assignment with unsanitized strings is unsafe for LLM-generated content.',
          fix: 'Use textContent, sanitize, or structured rendering.',
          frameworks: frameworksForScanner(SCANNER_ID),
          scannerId: SCANNER_ID,
        });
      }
    });
  }

  return dedupeByLine(findings);
}

function dedupeByLine(items: Finding[]): Finding[] {
  const s = new Set<string>();
  const out: Finding[] = [];
  for (const f of items) {
    const k = `${f.file}:${f.line}`;
    if (s.has(k)) continue;
    s.add(k);
    out.push(f);
  }
  return out;
}
