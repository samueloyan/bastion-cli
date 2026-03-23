import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { parseJsTs, traverse } from '../utils/ast-parser';
import * as t from '@babel/types';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'tsx', 'js', 'jsx'];
const SCANNER_ID = 'pii-exposure';

const PII_FIELDS = /email|phone|ssn|socialSecurity|taxId|dob|dateOfBirth|passport|creditCard/i;

function fileHasRedaction(code: string): boolean {
  return /\b(redact|mask|scrub|anonymize|hashPII|removePII)\b/i.test(code);
}

export async function scanPiiExposure(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  const findings: Finding[] = [];

  for (const file of files) {
    const code = readFileSafe(file);
    if (!code) continue;
    const ast = parseJsTs(file, code);
    if (!ast) continue;
    const rel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);

    traverse(ast, {
      TemplateLiteral(tplPath) {
        const quasi = tplPath.node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('');
        if (!PII_FIELDS.test(quasi)) return;
        const hasMember = tplPath.node.expressions.some(
          (e) =>
            t.isMemberExpression(e) &&
            t.isIdentifier(e.property) &&
            PII_FIELDS.test(e.property.name),
        );
        const hasObjRef = tplPath.node.expressions.some(
          (e) => t.isIdentifier(e) && /user|customer|profile|record|row|data/i.test(e.name),
        );
        if (!hasMember && !hasObjRef) return;
        if (fileHasRedaction(code) && /redact|mask|scrub/i.test(quasi)) return;
        const line = tplPath.node.loc?.start.line ?? 1;
        const src = code.split(/\r?\n/)[line - 1]?.trim() ?? '';
        findings.push({
          id: nextId('high'),
          title: 'PII may flow into LLM prompts',
          severity: 'high',
          file: rel,
          line,
          code: src.slice(0, 200),
          description:
            'Prompt construction references PII fields (email, phone, SSN, etc.) or user records without evident redaction before sending to a provider.',
          fix: 'Redact or tokenize PII before model calls, minimize fields sent, and log only hashed identifiers.',
          frameworks: frameworksForScanner(SCANNER_ID),
          scannerId: SCANNER_ID,
        });
      },
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
