import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { parseJsTs, traverse } from '../utils/ast-parser';
import * as t from '@babel/types';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'tsx', 'js', 'jsx'];
const SCANNER_ID = 'prompt-injection';

const USER_LIKE =
  /^(userInput|userMessage|userData|message|body|query|text|input|content|promptText|msg)$/i;
const USER_MEMBER = /^(user|req|request|params|body|query)$/i;

function looksLikeUserBinding(name: string): boolean {
  if (USER_LIKE.test(name)) return true;
  return false;
}

function memberLooksUserish(expr: t.Expression): boolean {
  if (t.isIdentifier(expr) && USER_MEMBER.test(expr.name)) return true;
  if (t.isMemberExpression(expr) && !expr.computed && t.isIdentifier(expr.object)) {
    return USER_MEMBER.test(expr.object.name) || /^userData$/i.test(expr.object.name);
  }
  return false;
}

function exprLooksUserDriven(expr: t.Expression): boolean {
  if (t.isIdentifier(expr)) return looksLikeUserBinding(expr.name);
  if (t.isMemberExpression(expr)) return memberLooksUserish(expr);
  if (t.isOptionalMemberExpression(expr)) {
    const obj = expr.object;
    if (t.isIdentifier(obj) && USER_MEMBER.test(obj.name)) return true;
    return false;
  }
  return false;
}

function fileHasLlmCall(code: string): boolean {
  return (
    /\.chat\.completions\.create\s*\(/.test(code) ||
    /\.messages\.create\s*\(/.test(code) ||
    /invoke\s*\(/.test(code)
  );
}

function fileHasSanitization(code: string): boolean {
  return /\b(sanitize|sanitise|escapeHtml|DOMPurify|validator\.|redact|maskPII|scrub)\b/i.test(code);
}

function templateLooksPrompt(quasi: string, expressionCount: number): boolean {
  if (
    /assistant|helpful|answer|question|instruction|system:|user:|analyze|profile|customer|prompt/i.test(quasi)
  ) {
    return true;
  }
  return expressionCount > 0 && quasi.replace(/\s/g, '').length >= 8;
}

export async function scanPromptInjection(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  const findings: Finding[] = [];

  for (const file of files) {
    const code = readFileSafe(file);
    if (!code || !fileHasLlmCall(code)) continue;
    const ast = parseJsTs(file, code);
    if (!ast) continue;
    const rel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);

    traverse(ast, {
      TemplateLiteral(tplPath) {
        const { quasis, expressions } = tplPath.node;
        const fullQuasi = quasis.map((q) => q.value.cooked ?? q.value.raw).join('');
        if (!templateLooksPrompt(fullQuasi, expressions.length)) return;
        const risky = expressions.some((e) => t.isExpression(e) && exprLooksUserDriven(e));
        if (!risky) return;
        if (fileHasSanitization(code) && /sanitize|redact|maskPII|scrub/i.test(fullQuasi)) return;
        const line = tplPath.node.loc?.start.line ?? 1;
        const srcSlice = code.split(/\r?\n/)[line - 1]?.trim() ?? '';
        findings.push({
          id: nextId('critical'),
          title: 'Possible prompt injection: user-controlled data in LLM prompt',
          severity: 'critical',
          file: rel,
          line,
          code: srcSlice.slice(0, 200),
          description:
            'User-controlled values appear interpolated into a prompt template without evident sanitization. Variable flow: user input → unsanitized → prompt → LLM call.',
          fix: 'Validate and sanitize untrusted input, use structured tool APIs, separate system instructions from user content, and apply content policies server-side.',
          frameworks: frameworksForScanner(SCANNER_ID),
          scannerId: SCANNER_ID,
        });
      },
      BinaryExpression(binPath) {
        if (binPath.node.operator !== '+') return;
        const { left, right } = binPath.node;
        const strSide = t.isStringLiteral(left) || t.isStringLiteral(right);
        const idSide =
          (t.isIdentifier(right) && looksLikeUserBinding(right.name)) ||
          (t.isIdentifier(left) && looksLikeUserBinding(left.name)) ||
          (t.isMemberExpression(right) && memberLooksUserish(right)) ||
          (t.isMemberExpression(left) && memberLooksUserish(left));
        if (!strSide || !idSide) return;
        if (!fileHasLlmCall(code)) return;
        const line = binPath.node.loc?.start.line ?? 1;
        const srcSlice = code.split(/\r?\n/)[line - 1]?.trim() ?? '';
        findings.push({
          id: nextId('critical'),
          title: 'Possible prompt injection: string concatenation with user input',
          severity: 'critical',
          file: rel,
          line,
          code: srcSlice.slice(0, 200),
          description:
            'String concatenation builds prompts with user-derived fragments, which can enable injection if input is hostile.',
          fix: 'Use parameterized message roles, avoid string concatenation for untrusted text, and enforce allowlisted templates.',
          frameworks: frameworksForScanner(SCANNER_ID),
          scannerId: SCANNER_ID,
        });
      },
    });
  }

  return dedupeFindings(findings);
}

function dedupeFindings(items: Finding[]): Finding[] {
  const m = new Map<string, Finding>();
  for (const f of items) {
    const k = `${f.file}:${f.line}:${f.title}`;
    if (!m.has(k)) m.set(k, f);
  }
  return [...m.values()];
}
