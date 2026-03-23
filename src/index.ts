#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { runScan } from './scanner';
import { buildFrameworkCompliance } from './frameworks/compliance';
import { printTerminalReport, printContinuousProtectionBlock } from './reporter/terminal';
import { buildJsonPayload, printJson } from './reporter/json';
import { writeHtmlReport } from './reporter/html';
import { printAttackProofs } from './prover/attack-simulator';
import { uploadScanResults } from './uploader/bastion-api';
import { createSpinner, failSpinner, stopSpinner } from './utils/spinner';
import { loadHistory, appendHistory, gitignoreSuggestion } from './history/score-history';
import { saveLastScan } from './persist/last-scan';
import { runPostScanPrompts } from './cli/post-scan-prompts';
import { runAskInteractive } from './interactive/ask';
import { runFixCommand } from './fix/runner';

const pkg = require('../package.json') as { version: string };

async function main(): Promise<void> {
  const program = new Command();
  program.name('bastion-cli').description('Bastion CLI — The AI watching your AI.').version(pkg.version, '-V, --version');

  program
    .command('version')
    .description('Print version number')
    .action(() => {
      console.log(pkg.version);
    });

  program
    .command('ask')
    .argument('<directory>', 'Project directory to scan')
    .option('--logs <logdir>', 'Include log directory in scan')
    .description('Interactive Q&A about scan results (requires OPENAI_API_KEY)')
    .action(async (directory: string, opts: { logs?: string }) => {
      const root = path.resolve(directory);
      const logDir = opts.logs ? path.resolve(opts.logs) : undefined;
      await runAskInteractive(root, logDir);
    });

  program
    .command('fix')
    .argument('<id>', 'Finding id, e.g. CRIT-001')
    .option('--apply', 'Apply without confirmation')
    .option('-C, --dir <directory>', 'Scanned project root', process.cwd())
    .description('Apply auto-fix for a finding from the last scan')
    .action(async (id: string, opts: { apply?: boolean; dir?: string }) => {
      const root = path.resolve(opts.dir ?? process.cwd());
      await runFixCommand(id, root, Boolean(opts.apply));
    });

  program
    .command('scan')
    .argument('<directory>', 'Project directory to scan')
    .option('--prove', 'Show static attack-simulation proofs for findings')
    .option('--logs <logdir>', 'Analyze log files in directory for PII patterns')
    .option('--json', 'Print JSON report to stdout')
    .option('--html', 'Write HTML report (bastion-report-YYYY-MM-DD.html)')
    .option('--upload', 'Upload results to Bastion platform')
    .option('--api-key <key>', 'API key for upload (header x-bastion-key)')
    .option('--org <id>', 'Organization id for upload context')
    .option('--verbose', 'Verbose progress (disables spinner)')
    .action(
      async (
        directory: string,
        opts: {
          prove?: boolean;
          logs?: string;
          json?: boolean;
          html?: boolean;
          upload?: boolean;
          apiKey?: string;
          org?: string;
          verbose?: boolean;
        },
      ) => {
        const root = path.resolve(directory);
        const logDir = opts.logs ? path.resolve(opts.logs) : undefined;
        const verbose = Boolean(opts.verbose);

        if (opts.upload && (!opts.apiKey || !opts.org)) {
          console.error(chalk.red('▶ --upload requires --api-key and --org'));
          process.exitCode = 1;
          return;
        }

        const historyBefore = loadHistory(root);

        const spinner = createSpinner('Scanning codebase…', verbose);
        let scan;
        try {
          scan = await runScan(root, { logDir, verbose });
        } catch (e) {
          failSpinner(spinner, 'Scan failed');
          console.error(chalk.red(e instanceof Error ? e.message : String(e)));
          process.exitCode = 1;
          return;
        }
        stopSpinner(spinner, verbose ? undefined : 'Scan complete');

        saveLastScan(scan);
        appendHistory(root, {
          date: scan.scanDate,
          score: scan.score,
          scoreLabel: scan.scoreLabel,
          findingCount: scan.findings.length,
        });

        const compliance = buildFrameworkCompliance(scan.findings);
        const jsonPayload = buildJsonPayload(scan, compliance);
        if (opts.org) {
          (jsonPayload as unknown as Record<string, unknown>).org_id = opts.org;
        }

        if (opts.html) {
          const out = writeHtmlReport(scan, compliance, process.cwd());
          if (!opts.json) {
            console.log(chalk.hex('#0B8A5E')(`\n✓ HTML report written: ${out}`));
          }
        }

        if (opts.json) {
          printJson(jsonPayload);
        } else {
          printTerminalReport(scan, compliance, { historyBefore });
          const tip = gitignoreSuggestion(root);
          if (tip) console.log(tip);
        }

        if (opts.prove) printAttackProofs(scan.findings);

        if (opts.upload && opts.apiKey) {
          const res = await uploadScanResults(jsonPayload, opts.apiKey);
          const log = opts.json ? console.error : console.log;
          if (res.success && res.dashboard_url) {
            log(chalk.green(`✓ Uploaded. Dashboard: ${res.dashboard_url}`));
          } else {
            log(chalk.red(`✗ Upload failed: ${res.error ?? 'unknown'}`));
            process.exitCode = 1;
          }
        }

        if (!opts.json) {
          if (!opts.upload) {
            printContinuousProtectionBlock();
          }
          await runPostScanPrompts(jsonPayload);
        }
      },
    );

  program.showHelpAfterError();
  await program.parseAsync(process.argv);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
