import chalk from 'chalk';
import type { ScanResult } from '../types';

const W = 62;

/** Hardcoded until real aggregate data exists */
const INDUSTRY_AVG = 61;
const TOP_10_PCT = 89;
const BOTTOM_PCT_THRESHOLD = 15;

export function formatBenchmarkBlock(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(chalk.gray('── BENCHMARK ' + '─'.repeat(W - 13)));
  lines.push(` ${chalk.white('Your score:')}     ${chalk.bold(String(result.score))}/100`);
  lines.push(` ${chalk.white('Industry avg:')}   ${INDUSTRY_AVG}/100`);
  lines.push(` ${chalk.white('Top 10%:')}        ${TOP_10_PCT}/100`);
  lines.push('');
  if (result.score < INDUSTRY_AVG) {
    lines.push(
      chalk.hex('#E37400')(
        ` You are in the bottom ${BOTTOM_PCT_THRESHOLD}% of AI applications scanned by Bastion.`,
      ),
    );
  } else if (result.score < TOP_10_PCT) {
    lines.push(chalk.yellow(' You are below the top decile — tightening controls will improve posture.'));
  } else {
    lines.push(chalk.green(' Strong score relative to typical Bastion scans. Keep monitoring in production.'));
  }
  lines.push('');
  return lines.join('\n');
}
