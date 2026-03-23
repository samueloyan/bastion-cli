import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import type { JsonExport } from '../types';
import { postLead, postShare, domainFromEmail } from '../api/platform';

function createRl(): readline.Interface {
  return readline.createInterface({ input, output, terminal: true, historySize: 100 });
}

export async function runPostScanPrompts(jsonPayload: JsonExport): Promise<void> {
  if (!input.isTTY) return;

  const rl = createRl();
  try {
    console.log('');
    console.log(
      chalk.white('Want the full report emailed to you? Enter your email (or press Enter to skip):'),
    );
    const email = (await rl.question(chalk.green('> '))).trim();
    if (email) {
      const res = await postLead({
        email,
        company_domain: domainFromEmail(email),
        cli_score: jsonPayload.score,
        finding_count: jsonPayload.findings.length,
        findings_summary: {
          score_label: jsonPayload.score_label,
          top: jsonPayload.findings.slice(0, 5).map((f) => ({ id: f.id, title: f.title, severity: f.severity })),
        },
      });
      if (res.ok) {
        console.log(chalk.green(`\n✓ Report sent to ${email}`));
        console.log(chalk.gray("We've also created a free Bastion account for you."));
        console.log(chalk.hex('#0B8A5E').underline('Log in at https://bastion-zeta.vercel.app/login\n'));
      } else {
        console.log(chalk.yellow(`\nCould not reach Bastion API: ${res.error ?? 'unknown'}\n`));
      }
    }

    console.log(chalk.white('Share this report with your team? (y/n)'));
    const share = (await rl.question(chalk.green('> '))).trim().toLowerCase();
    if (share === 'y' || share === 'yes') {
      const sr = await postShare(jsonPayload);
      if (sr.ok && sr.url) {
        console.log(chalk.green('\n✓ Report uploaded'));
        console.log(chalk.white(`Share this link: ${chalk.cyan.underline(sr.url)}`));
        console.log(chalk.gray('\nAnyone with this link can view the report (no login required).'));
        console.log(chalk.gray('Link expires in 7 days.\n'));
      } else {
        console.log(chalk.yellow(`\nShare upload failed: ${sr.error ?? 'unknown'}\n`));
      }
    }

    console.log(
      chalk.white('Set up weekly scans? Bastion will email you every Monday with your updated score.'),
    );
    console.log(chalk.gray('Enter your email (or press Enter to skip):'));
    const weekly = (await rl.question(chalk.green('> '))).trim();
    if (weekly) {
      const wr = await postLead({
        email: weekly,
        company_domain: domainFromEmail(weekly),
        cli_score: jsonPayload.score,
        finding_count: jsonPayload.findings.length,
        findings_summary: { weekly_reminder: true },
        weekly_scan: true,
      });
      if (wr.ok) {
        console.log(
          chalk.green(
            '\n✓ Weekly reminder saved. You will get a Monday email to run npx bastion-cli scan.\n',
          ),
        );
      } else {
        console.log(chalk.yellow(`\nCould not save weekly reminder: ${wr.error ?? 'unknown'}\n`));
      }
    }
  } finally {
    rl.close();
  }
}
