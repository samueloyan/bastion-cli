import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const DEFAULT_IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.nyc_output',
]);

export interface WalkOptions {
  extensions: string[];
  maxFileBytes?: number;
}

function shouldSkipDir(name: string): boolean {
  return DEFAULT_IGNORE.has(name);
}

/**
 * Collect files under root matching extensions (recursive), respecting ignore dirs.
 */
export async function collectSourceFiles(root: string, options: WalkOptions): Promise<string[]> {
  const absRoot = path.resolve(root);
  const extSet = new Set(options.extensions.map((e) => (e.startsWith('.') ? e : `.${e}`)));
  const maxBytes = options.maxFileBytes ?? 2 * 1024 * 1024;

  const patterns = options.extensions.map((ext) => {
    const e = ext.startsWith('.') ? ext.slice(1) : ext;
    return path.join(absRoot, '**', `*.${e}`).replace(/\\/g, '/');
  });

  const paths = await glob(patterns, {
    nodir: true,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
    ],
  });

  const result: string[] = [];
  if (options.extensions.map((e) => (e.startsWith('.') ? e.slice(1) : e)).includes('env')) {
    const dotEnv = path.join(absRoot, '.env');
    if (fs.existsSync(dotEnv) && fs.statSync(dotEnv).isFile()) {
      try {
        if (fs.statSync(dotEnv).size <= maxBytes) result.push(dotEnv);
      } catch {
        /* skip */
      }
    }
  }
  for (const file of paths) {
    let rel = path.relative(absRoot, file);
    if (rel.split(path.sep).some((seg) => shouldSkipDir(seg))) continue;
    try {
      const st = fs.statSync(file);
      if (st.size > maxBytes) continue;
    } catch {
      continue;
    }
    const ext = path.extname(file).toLowerCase();
    if (extSet.has(ext)) result.push(file);
  }

  return [...new Set(result)].sort();
}

export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}
