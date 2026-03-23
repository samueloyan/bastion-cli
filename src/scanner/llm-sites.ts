import * as path from 'path';
import { collectSourceFiles, readFileSafe } from '../utils/file-walker';
import { LLM_CALL_PATTERN } from './metrics';

const CODE_EXT = ['ts', 'tsx', 'js', 'jsx', 'py'];

const CONTEXT_BEFORE = 10;
const CONTEXT_AFTER = 9;

export interface LlmCallSite {
  file: string;
  line: number;
  /** Numbered excerpt; first line = `startLine` in the file */
  startLine: number;
  excerpt: string;
}

export async function findLlmCallSites(rootDir: string): Promise<LlmCallSite[]> {
  const files = await collectSourceFiles(rootDir, { extensions: CODE_EXT });
  const sites: LlmCallSite[] = [];

  for (const abs of files) {
    const content = readFileSafe(abs);
    if (!content) continue;
    const rel = path.relative(rootDir, abs).replace(/\\/g, '/') || path.basename(abs);
    const lines = content.split(/\r?\n/);
    const re = new RegExp(LLM_CALL_PATTERN.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const idx = m.index;
      const line = content.slice(0, idx).split(/\r?\n/).length;
      const startLine = Math.max(1, line - CONTEXT_BEFORE);
      const endLine = Math.min(lines.length, line + CONTEXT_AFTER);
      const excerptLines = lines.slice(startLine - 1, endLine);
      const excerpt = excerptLines
        .map((ln, i) => `${String(startLine + i).padStart(5)}| ${ln}`)
        .join('\n');
      sites.push({ file: rel, line, startLine, excerpt });
    }
  }

  return sites;
}
