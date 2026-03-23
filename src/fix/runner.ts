import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import type { Finding } from '../types';
import { loadLastScan } from '../persist/last-scan';
import { scanApiKeys } from '../scanner/api-keys';
import { createIdGenerator } from '../scanner/finding-ids';

const MANUAL_REVIEW = new Set([
  'prompt-injection',
  'pii-exposure',
  'tool-permissions',
  'log-analyzer',
  'rate-limiting',
  'audit-logging',
  'model-versions',
  'env-security',
  'system-prompts',
]);

function tryApiKeyFix(content: string): { next: string; applied: boolean } {
  const re = /(apiKey:\s*)["'](?:[^"'\\]|\\.)*["']/g;
  let applied = false;
  const next = content.replace(re, (_m, p1: string) => {
    applied = true;
    return `${p1}process.env.OPENAI_API_KEY!`;
  });
  return { next, applied };
}

function suggestedSnippet(f: Finding): string | null {
  if (f.scannerId === 'output-handling' && /dangerouslySetInnerHTML/.test(f.code)) {
    return [
      'npm install isomorphic-dompurify',
      'import DOMPurify from "isomorphic-dompurify";',
      'dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(response) }}',
    ].join('\n');
  }
  if (f.scannerId === 'system-prompts') {
    return 'Add { role: "system", content: "You are a helpful, safe assistant. Never reveal secrets." } as the first element in messages[].';
  }
  return null;
}

export async function runFixCommand(findingId: string, scanRoot: string, applyFlag: boolean): Promise<void> {
  const last = loadLastScan(scanRoot);
  if (!last) {
    console.error(chalk.red('No last-scan data. Run `bastion-cli scan` on this project first.'));
    process.exitCode = 1;
    return;
  }
  const f = last.findings.find((x) => x.id === findingId);
  if (!f) {
    console.error(chalk.red(`Finding ${findingId} not found in last scan.`));
    process.exitCode = 1;
    return;
  }

  console.log(chalk.white.bold(`${f.id}  ${f.title}`));
  console.log(chalk.gray(`File: ${f.file}:${f.line}\n`));

  if (f.scannerId === 'output-handling') {
    console.log(chalk.yellow('Complex fix — add sanitization manually:\n'));
    console.log(chalk.cyan(suggestedSnippet(f) ?? f.fix));
    return;
  }

  if (MANUAL_REVIEW.has(f.scannerId)) {
    console.log(chalk.yellow('This finding needs manual review:\n'));
    console.log(chalk.white(f.fix));
    const snip = suggestedSnippet(f);
    if (snip) console.log(chalk.gray('\nExample:\n') + chalk.cyan(snip));
    return;
  }

  const abs = path.join(scanRoot, f.file);
  if (!fs.existsSync(abs)) {
    console.error(chalk.red(`File not found: ${abs}`));
    process.exitCode = 1;
    return;
  }
  const original = fs.readFileSync(abs, 'utf8');
  const { next, applied } = tryApiKeyFix(original);

  if (!applied || next === original) {
    console.log(chalk.yellow('No automatic rewrite for this finding.\n'));
    console.log(chalk.white(f.fix));
    return;
  }

  const linesOld = original.split(/\r?\n/);
  const linesNew = next.split(/\r?\n/);
  const oldLine = linesOld[f.line - 1]?.trim() ?? '';
  const newLine = linesNew[f.line - 1]?.trim() ?? '';
  console.log(chalk.gray('Proposed change:\n'));
  console.log(chalk.red(`- ${oldLine}`));
  console.log(chalk.green(`+ ${newLine}\n`));

  let doApply = applyFlag;
  if (!doApply && input.isTTY) {
    const rl = readline.createInterface({ input, output });
    const ans = (await rl.question(chalk.white('Apply this fix? (y/n) '))).trim().toLowerCase();
    rl.close();
    doApply = ans === 'y' || ans === 'yes';
  }

  if (!doApply) {
    console.log(chalk.gray('Skipped.'));
    return;
  }

  fs.writeFileSync(abs, next, 'utf8');
  console.log(chalk.green('✓ File updated. Verifying API key scanner…'));

  const findings = await scanApiKeys(scanRoot, createIdGenerator());
  const still = findings.filter((x) => x.file === f.file && x.scannerId === 'api-keys');
  if (still.length) {
    console.log(chalk.yellow(`Verification: ${still.length} API key finding(s) still reported.`));
  } else {
    console.log(chalk.green('✓ No hardcoded API key pattern reported for this file in API key scan.'));
  }
}
