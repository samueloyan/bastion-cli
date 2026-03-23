import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { bastionPath, ensureBastionDir } from '../utils/bastion-local';

export interface HistoryEntry {
  date: string;
  score: number;
  scoreLabel: string;
  findingCount: number;
}

export interface HistoryFile {
  scans: HistoryEntry[];
}

const HISTORY_FILE = 'history.json';

export function loadHistory(scanRoot: string): HistoryEntry[] {
  const p = bastionPath(scanRoot, HISTORY_FILE);
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(raw) as HistoryFile;
    return Array.isArray(j.scans) ? j.scans : [];
  } catch {
    return [];
  }
}

export function appendHistory(scanRoot: string, entry: HistoryEntry): void {
  ensureBastionDir(scanRoot);
  const prev = loadHistory(scanRoot);
  const scans = [...prev, entry].slice(-20);
  fs.writeFileSync(bastionPath(scanRoot, HISTORY_FILE), JSON.stringify({ scans }, null, 2), 'utf8');
}

const W = 62;

function bar(score: number, width = 20): string {
  const f = Math.round((score / 100) * width);
  return chalk.hex('#0B8A5E')('█'.repeat(f)) + chalk.gray('░'.repeat(Math.max(0, width - f)));
}

export function formatScoreHistoryBlock(
  beforeScan: HistoryEntry[],
  current: { date: string; score: number; scoreLabel: string; findingCount: number },
): string {
  if (beforeScan.length === 0) return '';
  const lines: string[] = [];
  lines.push(chalk.gray('── SCORE HISTORY ' + '─'.repeat(W - 17)));
  const recent = beforeScan.slice(-4);
  for (const e of recent) {
    const d = new Date(e.date);
    const ds = `${d.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`.padEnd(8);
    const sc = `${e.score}/100`.padEnd(8);
    const lbl = e.scoreLabel.padEnd(10);
    lines.push(` ${chalk.white(ds)} ${chalk.bold(sc)} ${bar(e.score)}  ${chalk.hex('#0B8A5E')(lbl)}`);
  }
  {
    const d = new Date(current.date);
    const ds = `${d.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`.padEnd(8);
    const sc = `${current.score}/100`.padEnd(8);
    const lbl = current.scoreLabel.padEnd(10);
    lines.push(` ${chalk.white(ds)} ${chalk.bold(sc)} ${bar(current.score)}  ${chalk.hex('#0B8A5E')(lbl)}`);
  }
  const prev = beforeScan[beforeScan.length - 1];
  if (prev) {
    const delta = current.score - prev.score;
    if (delta > 0) lines.push(chalk.green(`\n ${' '.repeat(35)}▲ +${delta} improving`));
    else if (delta < 0) lines.push(chalk.red(`\n ${' '.repeat(35)}▼ ${delta} regressing`));
  }
  lines.push('');
  return lines.join('\n');
}

export function gitignoreSuggestion(scanRoot: string): string | null {
  const gitignore = path.join(scanRoot, '.gitignore');
  let content = '';
  try {
    content = fs.readFileSync(gitignore, 'utf8');
  } catch {
    return chalk.yellow(`\nTip: add ${chalk.bold('.bastion/')} to your project .gitignore to keep scan cache local.\n`);
  }
  if (!content.split(/\r?\n/).some((l) => /^\s*\.bastion\/?\s*$/.test(l))) {
    return chalk.yellow(
      `\nTip: add ${chalk.bold('.bastion/')} to ${chalk.bold('.gitignore')} so score history and last-scan data stay local.\n`,
    );
  }
  return null;
}
