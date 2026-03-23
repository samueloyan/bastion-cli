import type { Finding, FrameworkRefs, Severity } from '../types';
import type { LlmCallSite } from './llm-sites';
import { findLlmCallSites } from './llm-sites';

const SCANNER_ID = 'ai-deep';

const AI_FRAMEWORKS: FrameworkRefs = {
  owasp: ['LLM01'],
  nist: ['MEASURE 2.3', 'MAP 2.1'],
  mitre: ['T0051', 'T0024'],
};

const SYSTEM = `You are an AI security expert. Analyze this code for security vulnerabilities related to LLM usage. Look for: subtle prompt injection paths, indirect data leakage, trust boundary violations, missing input validation, race conditions in async LLM calls, context window manipulation, and any other AI-specific security issues that static pattern matching would miss. Return findings as JSON.`;

interface RawAiFinding {
  title?: string;
  severity?: string;
  line?: number;
  code?: string;
  description?: string;
  fix?: string;
  confidence?: number;
}

interface AiResponseShape {
  findings?: RawAiFinding[];
}

function normSeverity(s: string | undefined): Severity {
  const x = (s ?? 'medium').toLowerCase();
  if (x === 'critical' || x === 'high' || x === 'medium' || x === 'low') return x;
  return 'medium';
}

function clampConfidence(c: unknown): number {
  const n = typeof c === 'number' ? c : Number(c);
  if (Number.isNaN(n)) return 70;
  const pct = n <= 1 && n >= 0 ? Math.round(n * 100) : Math.round(Math.min(100, Math.max(0, n)));
  return pct;
}

async function analyzeSite(
  apiKey: string,
  site: LlmCallSite,
  model: string,
): Promise<Finding[]> {
  const user = [
    `File: ${site.file}`,
    `The LLM-related call is around line ${site.line}. Line numbers in "line" in your JSON must be absolute line numbers in this file (not relative to the excerpt).`,
    '',
    '```',
    site.excerpt,
    '```',
    '',
    'Respond with JSON only in this shape:',
    '{"findings":[{"title":"string","severity":"high","line":number,"code":"string","description":"string","fix":"string","confidence":0.85}]}',
    'Use severity one of: critical, high, medium, low. confidence is 0-1 (probability this is a real issue). If no issues, return {"findings":[]}.',
  ].join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  let parsed: AiResponseShape;
  try {
    parsed = JSON.parse(raw) as AiResponseShape;
  } catch {
    return [];
  }

  const list = Array.isArray(parsed.findings) ? parsed.findings : [];
  const out: Finding[] = [];
  for (const r of list) {
    if (!r.title || typeof r.line !== 'number') continue;
    out.push({
      id: '',
      title: String(r.title).slice(0, 200),
      severity: normSeverity(r.severity),
      file: site.file,
      line: Math.max(1, Math.floor(r.line)),
      code: String(r.code ?? '').slice(0, 200) || '(see description)',
      description: String(r.description ?? '').slice(0, 2000),
      fix: String(r.fix ?? 'Review and harden LLM integration; add validation and monitoring.').slice(0, 2000),
      frameworks: AI_FRAMEWORKS,
      scannerId: SCANNER_ID,
      source: 'ai',
      confidence: clampConfidence(r.confidence),
    });
  }
  return out;
}

function dedupeAgainstPattern(pattern: Finding[], ai: Finding[]): Finding[] {
  const kept: Finding[] = [];
  for (const a of ai) {
    const dup = pattern.some(
      (p) =>
        p.file === a.file &&
        Math.abs(p.line - a.line) <= 2 &&
        similarity(p.title, a.title) > 0.45,
    );
    if (!dup) kept.push(a);
  }
  return kept;
}

function similarity(a: string, b: string): number {
  const A = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const B = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const wa = new Set(A.split(/\s+/).filter(Boolean));
  const wb = new Set(B.split(/\s+/).filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) {
    if (wb.has(w)) inter += 1;
  }
  return inter / Math.max(wa.size, wb.size);
}

function assignAiIds(findings: Finding[], start: number): Finding[] {
  return findings.map((f, i) => ({
    ...f,
    id: `AI-${String(start + i).padStart(3, '0')}`,
  }));
}

/**
 * Second pass: GPT analysis per LLM call site. Merges with pattern findings and dedupes.
 */
export async function runDeepScanPass(
  rootDir: string,
  patternFindings: Finding[],
  options: { apiKey: string; verbose?: boolean; onProgress?: (n: number, total: number) => void },
): Promise<Finding[]> {
  const sites = await findLlmCallSites(rootDir);
  const model = 'gpt-4o-mini';
  const allRaw: Finding[] = [];

  let i = 0;
  for (const site of sites) {
    i += 1;
    options.onProgress?.(i, sites.length);
    try {
      const chunk = await analyzeSite(options.apiKey, site, model);
      allRaw.push(...chunk);
    } catch (e) {
      if (options.verbose) {
        console.error((e instanceof Error ? e.message : String(e)) + ` (${site.file}:${site.line})`);
      }
    }
  }

  const deduped = dedupeAgainstPattern(patternFindings, allRaw);
  const intraDeduped = dedupeIntraAi(deduped);
  return assignAiIds(intraDeduped, 1);
}

function dedupeIntraAi(findings: Finding[]): Finding[] {
  const out: Finding[] = [];
  for (const f of findings) {
    const dup = out.some(
      (x) => x.file === f.file && Math.abs(x.line - f.line) <= 1 && similarity(x.title, f.title) > 0.5,
    );
    if (!dup) out.push(f);
  }
  return out;
}
