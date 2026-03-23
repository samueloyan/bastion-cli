import chalk from 'chalk';

const W = 62;

function row(text: string): string {
  const g = chalk.green;
  const plain = text.replace(/\u001b\[[0-9;]*m/g, '');
  return g('│') + text + ' '.repeat(Math.max(0, W - plain.length)) + g('│');
}

export function formatPlatformComparisonBox(): string {
  const g = chalk.green;
  const title = '─── WHAT YOU GET WITH BASTION PLATFORM ';
  const topPad = Math.max(0, W - title.length);
  const lines: string[] = [];
  lines.push(g('┌' + title + '─'.repeat(topPad) + '┐'));
  lines.push(row(' '.repeat(W)));
  lines.push(row('  CLI (what you just ran)     Platform (free trial)'));
  lines.push(row('  ─────────────────────────   ─────────────────────'));
  lines.push(row('  ✓ Static code scan          ✓ Real-time monitoring'));
  lines.push(row('  ✓ One-time report           ✓ Continuous scoring'));
  lines.push(row('  ✗ No runtime protection     ✓ AI-powered gateway'));
  lines.push(row('  ✗ No threat blocking        ✓ Block attacks live'));
  lines.push(row('  ✗ No PII redaction          ✓ Auto-redact PII'));
  lines.push(row('  ✗ No compliance reports     ✓ One-click PDF reports'));
  lines.push(row('  ✗ No team collaboration     ✓ Team dashboard'));
  lines.push(row('  ✗ No incident response      ✓ Auto incident mgmt'));
  lines.push(row('  ✗ Point in time             ✓ 24/7 monitoring'));
  lines.push(row(' '.repeat(W)));
  lines.push(g('└' + '─'.repeat(W) + '┘'));
  lines.push('');
  return lines.join('\n');
}
