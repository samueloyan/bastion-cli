import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { Finding } from '../types';
import { fileExists, readFileSafe } from '../utils/file-walker';
import { frameworksForScanner } from './framework-tags';
import type { IdGen } from './types-internal';

const SCANNER_ID = 'env-security';

const KEY_PATTERN =
  /sk-(?!ant-)[a-zA-Z0-9_-]{20,}|sk-ant-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{35}|AKIA[A-Z0-9]{16}/;

export async function scanEnvSecurity(rootDir: string, nextId: IdGen): Promise<Finding[]> {
  const findings: Finding[] = [];
  const envPath = path.join(rootDir, '.env');
  const gitignorePath = path.join(rootDir, '.gitignore');
  const examplePath = path.join(rootDir, '.env.example');

  const envContent = fileExists(envPath) ? readFileSafe(envPath) : null;
  const gitignore = fileExists(gitignorePath) ? readFileSafe(gitignorePath) ?? '' : '';
  const envGitignored = /(^|\n)\s*\.env\s*($|\n)/m.test(gitignore) || /(^|\n)\s*\.env\*\s*($|\n)/m.test(gitignore);

  if (envContent && KEY_PATTERN.test(envContent)) {
    if (!envGitignored) {
      findings.push({
        id: nextId('critical'),
        title: '.env contains secrets and is not listed in .gitignore',
        severity: 'critical',
        file: '.env',
        line: 1,
        code: '(environment file with credentials)',
        description:
          'API-style material is present in .env while .gitignore does not exclude .env, risking accidental commit and supply-chain exposure.',
        fix: 'Add .env to .gitignore, provide .env.example with placeholders, and rotate any exposed credentials.',
        frameworks: frameworksForScanner(SCANNER_ID),
        scannerId: SCANNER_ID,
      });
    }
  }

  if (envContent && !fileExists(examplePath)) {
    findings.push({
      id: nextId('medium'),
      title: 'Missing .env.example for documented configuration',
      severity: 'medium',
      file: '.env',
      line: 1,
      code: '.env present without .env.example',
      description: 'A .env file exists but no .env.example template was found for safe onboarding.',
      fix: 'Add .env.example with dummy values and document required variables.',
      frameworks: frameworksForScanner(SCANNER_ID),
      scannerId: SCANNER_ID,
    });
  }

  const gitHistoryFinding = checkGitHistory(rootDir, nextId);
  if (gitHistoryFinding) findings.push(gitHistoryFinding);

  return findings;
}

function checkGitHistory(rootDir: string, nextId: IdGen): Finding | null {
  const gitDir = path.join(rootDir, '.git');
  if (!fs.existsSync(gitDir)) return null;
  const r = spawnSync('git', ['log', '-1', '--oneline', '--', '.env'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (r.status === 0 && r.stdout?.trim()) {
    return {
      id: nextId('critical'),
      title: 'Git history may include .env commits',
      severity: 'critical',
      file: '.env',
      line: 1,
      code: r.stdout.trim().slice(0, 120),
      description: 'Git reports history touching .env; secrets may exist in repository history even if removed now.',
      fix: 'Rotate all secrets, use git filter-repo or BFG to purge history, and enforce secret scanning in CI.',
      frameworks: frameworksForScanner(SCANNER_ID),
      scannerId: SCANNER_ID,
    };
  }
  return null;
}
