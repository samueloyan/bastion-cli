import * as path from 'path';
import type { Finding } from '../types';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const EXT = ['ts', 'tsx', 'js', 'jsx', 'py'];
const SCANNER_ID = 'rate-limiting';

const RATE_PKG = /express-rate-limit|@nestjs\/throttler|rate-limiter-flexible|slowDown\s*\(/;
const LLM_HINT = /openai|chat\.completions|Anthropic|llm|invoke\s*\(/i;

export async function scanRateLimiting(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const files = await collectSourceFiles(rootDir, { extensions: EXT });
  let combined = '';
  let sampleRel = '';
  for (const file of files) {
    const code = readFileSafe(file) ?? '';
    combined += `\n${code}`;
    if (LLM_HINT.test(code) && !sampleRel) {
      sampleRel = path.relative(rootDir, file).replace(/\\/g, '/') || path.basename(file);
    }
  }
  if (!sampleRel || RATE_PKG.test(combined)) return [];

  return [
    {
      id: nextId('medium'),
      title: 'No rate limiting detected for LLM usage',
      severity: 'medium',
      file: sampleRel,
      line: 1,
      code: '(project-wide heuristic)',
      description:
        'Source suggests LLM calls but no express-rate-limit, Nest throttler, or rate-limiter-flexible-style usage was found.',
      fix: 'Add per-IP and per-user rate limits, token budgets, and circuit breakers for model calls.',
      frameworks: frameworksForScanner(SCANNER_ID),
      scannerId: SCANNER_ID,
    },
  ];
}
