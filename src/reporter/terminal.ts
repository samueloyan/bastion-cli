import chalk from 'chalk';
import type { ScanResult } from '../types';
import type { FrameworkComplianceBundle } from '../frameworks/compliance';
import type { HistoryEntry } from '../history/score-history';
import { formatScoreHistoryBlock } from '../history/score-history';
import { formatBenchmarkBlock } from './benchmark';
import { formatPlatformComparisonBox } from './comparison';
import { c } from '../utils/colors';

const ACCENT = '#0B8A5E';
const ORANGE_HIGH = '#E37400';
const ORANGE_MEDIUM = '#E67E22';

export interface PrintTerminalOptions {
  historyBefore?: HistoryEntry[];
}

function sevHeader(sev: 'critical' | 'high' | 'medium' | 'low', label: string, count: number): string {
  const base = `■ ${label}`;
  let colored: string;
  if (sev === 'critical') colored = chalk.red.bold(base);
  else if (sev === 'high') colored = chalk.hex(ORANGE_HIGH).bold(base);
  else if (sev === 'medium') colored = chalk.hex(ORANGE_MEDIUM).bold(base);
  else colored = chalk.yellow.bold(base);
  return colored + chalk.gray(` (${count})\n`);
}
/** Inner width between vertical border characters (matches banner). */
const W = 62;

const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, '');

function padInner(plain: string, width = W): string {
  const v = stripAnsi(plain);
  if (v.length >= width) return plain.slice(0, width);
  return plain + ' '.repeat(width - v.length);
}

function rowDouble(contentPlain: string): string {
  return chalk.green('║') + padInner(contentPlain) + chalk.green('║');
}

function rowDoubleStyled(parts: string): string {
  const pad = W - stripAnsi(parts).length;
  return chalk.green('║') + parts + (pad > 0 ? ' '.repeat(pad) : '') + chalk.green('║');
}

function doubleBoxTop(): string {
  return chalk.green('╔' + '═'.repeat(W) + '╗');
}

function doubleBoxSep(): string {
  return chalk.green('╠' + '═'.repeat(W) + '╣');
}

function doubleBoxBottom(): string {
  return chalk.green('╚' + '═'.repeat(W) + '╝');
}

function singleBoxTop(): string {
  return chalk.green('┌' + '─'.repeat(W) + '┐');
}

function singleBoxMid(): string {
  return chalk.green('├' + '─'.repeat(W) + '┤');
}

function singleBoxBottom(): string {
  return chalk.green('└' + '─'.repeat(W) + '┘');
}

function rowSingle(contentPlain: string, borderColor: typeof chalk.green = chalk.green): string {
  return borderColor('│') + padInner(contentPlain) + borderColor('│');
}

function rowSingleStyled(parts: string, borderColor: typeof chalk.green = chalk.green): string {
  const pad = W - stripAnsi(parts).length;
  return borderColor('│') + parts + (pad > 0 ? ' '.repeat(pad) : '') + borderColor('│');
}

function wrapPlain(text: string, width: number): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= width) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > width ? w.slice(0, width) : w;
      while (cur.length > width) {
        lines.push(cur.slice(0, width));
        cur = cur.slice(width);
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Exact BASTION banner: green borders + block letters; white.bold tagline + version. */
export function printBanner(version: string): void {
  const g = chalk.green;
  const verStr = `v${version}`;
  const tagText = 'The AI watching your AI.';
  const prefix = '   ';
  const totalPad = W - prefix.length - tagText.length - verStr.length;
  const padAfterVer = 8;
  const padBeforeVer = Math.max(1, totalPad - padAfterVer);
  const taglineRow =
    g('║') +
    prefix +
    chalk.white.bold(tagText) +
    ' '.repeat(padBeforeVer) +
    chalk.white(verStr) +
    ' '.repeat(padAfterVer) +
    g('║');

  console.log(
    [
      '',
      g('╔══════════════════════════════════════════════════════════════╗'),
      g('║                                                              ║'),
      g('║   ██████╗  █████╗ ███████╗████████╗██╗ ██████╗ ███╗  ██╗   ║'),
      g('║   ██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗ ██║   ║'),
      g('║   ██████╔╝███████║███████╗   ██║   ██║██║   ██║██╔██╗██║   ║'),
      g('║   ██╔══██╗██╔══██║╚════██║   ██║   ██║██║   ██║██║╚████║   ║'),
      g('║   ██████╔╝██║  ██║███████║   ██║   ██║╚██████╔╝██║ ╚███║   ║'),
      g('║   ╚═════╝ ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚══╝   ║'),
      g('║                                                              ║'),
      taglineRow,
      g('║                                                              ║'),
      g('╚══════════════════════════════════════════════════════════════╝'),
      '',
    ].join('\n'),
  );
}

function scoreBar(score: number, barWidth = 36): string {
  const filled = Math.round((score / 100) * barWidth);
  const bar =
    chalk.hex(ACCENT)('█'.repeat(Math.max(0, filled))) + chalk.gray('░'.repeat(Math.max(0, barWidth - filled)));
  return `${bar} ${chalk.white.bold(score)}/100`;
}

function scoreColor(score: number): typeof chalk.green {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  if (score >= 40) return chalk.hex('#E37400');
  return chalk.red;
}

function phase3ScoreBox(result: ScanResult): string {
  const colorFn = scoreColor(result.score);
  const label = colorFn.bold(result.scoreLabel);
  const rows: string[] = [];
  rows.push(doubleBoxTop());
  rows.push(rowDouble(' Summary                                                    '));
  rows.push(doubleBoxSep());
  rows.push(rowDouble(''));
  rows.push(rowDoubleStyled(`  ${chalk.white.bold('Security score')}`));
  rows.push(rowDouble(''));
  rows.push(rowDoubleStyled(`  ${scoreBar(result.score)}`));
  rows.push(rowDouble(''));
  rows.push(rowDoubleStyled(`  ${c.muted('●')} Label: ${label}`));
  rows.push(rowDoubleStyled(`  ${c.muted('●')} Files scanned: ${chalk.white(String(result.metrics.filesScanned))}`));
  rows.push(rowDoubleStyled(`  ${c.muted('●')} LLM call sites: ${chalk.white(String(result.metrics.llmCallSites))}`));
  rows.push(rowDoubleStyled(`  ${c.muted('●')} Agent configs: ${chalk.white(String(result.metrics.agentConfigs))}`));
  rows.push(rowDouble(''));
  rows.push(doubleBoxBottom());
  return rows.join('\n');
}

function codeSnippetBox(code: string): string[] {
  const innerW = W - 4;
  const lines = wrapPlain(code, innerW);
  const out: string[] = [];
  out.push(singleBoxTop());
  for (const ln of lines) {
    out.push(rowSingleStyled(`  ${chalk.gray(ln)}`));
  }
  out.push(singleBoxBottom());
  return out;
}

function phase4Findings(result: ScanResult): string {
  const order = ['critical', 'high', 'medium', 'low'] as const;
  const labels = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' } as const;
  const lines: string[] = [chalk.white.bold('\nFindings\n')];
  if (result.findings.length === 0) {
    lines.push(c.pass('✓ No findings in this scan.\n'));
    return lines.join('');
  }
  for (const sev of order) {
    const group = result.findings.filter((f) => f.severity === sev);
    if (group.length === 0) continue;
    lines.push(sevHeader(sev, labels[sev], group.length));
    for (const f of group) {
      lines.push(`  ${c.info('▶')} ${chalk.white.bold(f.id)} — ${f.title}`);
      lines.push(`     ${c.muted(`${f.file}:${f.line}`)}`);
      lines.push(...codeSnippetBox(f.code));
      lines.push(
        `     ${c.muted('OWASP:')} ${c.blue(f.frameworks.owasp.join(', ') || '—')}  ${c.muted('NIST:')} ${c.blue(f.frameworks.nist.join(', ') || '—')}  ${c.muted('MITRE:')} ${c.blue(f.frameworks.mitre.join(', ') || '—')}`,
      );
      lines.push(`     ${c.pass('Fix:')} ${chalk.green(f.fix)}`);
      lines.push(chalk.gray('     Run: ') + chalk.white.bold(`npx bastion-cli fix ${f.id} --apply`));
      lines.push('');
    }
  }
  return lines.join('\n');
}

function phase5Table(result: ScanResult): string {
  const bySev: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const files = new Set<string>();
  for (const f of result.findings) {
    bySev[f.severity] = (bySev[f.severity] ?? 0) + 1;
    files.add(f.file);
  }
  const rows: [string, string][] = [
    ['Total findings', String(result.findings.length)],
    ['Unique files with findings', String(files.size)],
    ['Critical', String(bySev.critical)],
    ['High', String(bySev.high)],
    ['Medium', String(bySev.medium)],
    ['Low', String(bySev.low)],
  ];
  const out: string[] = [];
  out.push(chalk.white.bold('\nSummary\n'));
  out.push(doubleBoxTop());
  out.push(rowDouble(' Summary                                                    '));
  out.push(doubleBoxSep());
  out.push(
    rowDoubleStyled('  ' + chalk.white.bold('Metric') + ' '.repeat(49) + chalk.white.bold('Value')),
  );
  out.push(chalk.green('╟' + '─'.repeat(W) + '╢'));
  for (const [a, b] of rows) {
    let valPart: string = b;
    if (a === 'Critical') valPart = chalk.red.bold(b);
    else if (a === 'High') valPart = chalk.hex(ORANGE_HIGH).bold(b);
    else if (a === 'Medium') valPart = chalk.hex(ORANGE_MEDIUM).bold(b);
    else if (a === 'Low') valPart = chalk.yellow.bold(b);
    out.push(rowDoubleStyled(`  ${a.padEnd(34)}${valPart}`));
  }
  out.push(doubleBoxBottom());
  out.push('');
  return out.join('\n');
}

function phase6Tree(compliance: FrameworkComplianceBundle): string {
  const lines: string[] = [chalk.white.bold('\nFramework compliance\n')];
  lines.push(c.blue('OWASP LLM Top 10'));
  const owasp = compliance.owasp.controls;
  owasp.forEach((ctl, i) => {
    const mark = ctl.passing ? c.pass('✓') : c.fail('✗');
    const branch = i === owasp.length - 1 ? '└' : '├';
    lines.push(`  ${branch}─ ${mark} ${ctl.id} ${chalk.gray('─')} ${ctl.name}`);
  });
  lines.push('');
  lines.push(c.blue('NIST AI RMF'));
  const nist = compliance.nist.controls;
  nist.forEach((ctl, i) => {
    const mark = ctl.passing ? c.pass('✓') : c.fail('✗');
    const branch = i === nist.length - 1 ? '└' : '├';
    lines.push(`  ${branch}─ ${mark} ${ctl.id} ${chalk.gray('─')} ${ctl.name}`);
  });
  lines.push('');
  lines.push(c.blue('MITRE ATLAS'));
  const mitre = compliance.mitre.techniques;
  mitre.forEach((t, i) => {
    const mark = t.passing ? c.pass('✓') : c.fail('✗');
    const branch = i === mitre.length - 1 ? '└' : '├';
    lines.push(`  ${branch}─ ${mark} ${t.id} ${chalk.gray('─')} ${t.name}`);
  });
  lines.push('');
  return lines.join('\n');
}

function phase7Risk(result: ScanResult): string {
  const n = result.findings.length;
  const crit = result.findings.filter((f) => f.severity === 'critical').length;
  const text =
    n === 0
      ? 'No issues were flagged in this automated pass. Continue with manual review, threat modeling, and regression testing as your system evolves.'
      : `This scan surfaced ${n} issue(s), including ${crit} critical. Unmitigated findings can enable credential theft, prompt injection, data exfiltration, and unsafe rendering of model output—impacting customer trust and compliance posture.`;
  const innerW = W - 4;
  const paras = wrapPlain(text, innerW);
  const rows: string[] = [];
  rows.push(singleBoxTop());
  rows.push(rowSingleStyled(` ${chalk.hex(ACCENT).bold('Risk assessment')}`));
  rows.push(singleBoxMid());
  for (const p of paras) {
    rows.push(rowSingleStyled(` ${chalk.white(p)}`));
  }
  rows.push(singleBoxBottom());
  return rows.join('\n');
}

function phase8Cta(): string {
  const rows: string[] = [];
  rows.push(singleBoxTop());
  rows.push(rowSingleStyled(` ${chalk.white('Harden continuously with the Bastion platform:')}`));
  rows.push(rowSingle(''));
  rows.push(rowSingleStyled(` ${chalk.hex(ACCENT).underline('https://bastion-zeta.vercel.app')}`));
  rows.push(rowSingle(''));
  rows.push(
    rowSingleStyled(` ${chalk.gray('Sign up to track findings, collaborate with your team, and monitor posture over time.')}`),
  );
  rows.push(singleBoxBottom());
  return rows.join('\n');
}

export function printTerminalReport(
  result: ScanResult,
  compliance: FrameworkComplianceBundle,
  opts?: PrintTerminalOptions,
): void {
  printBanner(result.version);
  console.log(phase3ScoreBox(result));
  console.log(formatBenchmarkBlock(result));
  if (opts?.historyBefore && opts.historyBefore.length > 0) {
    console.log(
      formatScoreHistoryBlock(opts.historyBefore, {
        date: result.scanDate,
        score: result.score,
        scoreLabel: result.scoreLabel,
        findingCount: result.findings.length,
      }),
    );
  }
  console.log(phase4Findings(result));
  console.log(phase5Table(result));
  console.log(formatPlatformComparisonBox());
  console.log(phase6Tree(compliance));
  console.log(phase7Risk(result));
  console.log(phase8Cta());
}

export function printContinuousProtectionBlock(): void {
  console.log(chalk.gray('── CONTINUOUS PROTECTION ' + '─'.repeat(62 - 26)));
  console.log('');
  console.log(chalk.white(' Add Bastion to your CI/CD pipeline to catch issues before they ship:'));
  console.log('');
  console.log(chalk.gray(' # .github/workflows/bastion.yml'));
  console.log(chalk.cyan(' - name: Bastion Security Scan'));
  console.log(
    chalk.cyan('   run: npx bastion-cli scan . --upload --api-key ${{ secrets.BASTION_API_KEY }}'),
  );
  console.log('');
  console.log(
    chalk.hex(ACCENT).underline(' Set up in 60 seconds → https://bastion-zeta.vercel.app/settings/api-keys'),
  );
  console.log('');
}
