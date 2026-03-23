import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import type { ScanResult } from '../types';
import { runScan } from '../scanner';

const MODEL = 'gpt-4o-mini';

function findingsDigest(result: ScanResult): string {
  const lines = result.findings.map(
    (f) =>
      `- ${f.id} [${f.severity.toUpperCase()}] ${f.title} — ${f.file}:${f.line}\n  Code: ${f.code.slice(0, 200)}`,
  );
  const text = lines.join('\n');
  if (text.length > 12000) return text.slice(0, 12000) + '\n…(truncated)';
  return text;
}

function systemPrompt(findingsBlock: string): string {
  return `You are Bastion, an AI security expert. You have scanned the user's codebase and found these security issues:\n${findingsBlock}\n\nAnswer their questions about the findings, suggest fixes, explain risks, and help them improve their AI security posture. Be direct and technical. Reference specific files and line numbers from the scan.`;
}

function printAssistantReply(text: string): void {
  const parts = text.split(/```/);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2 === 1) {
      console.log(chalk.cyan('```'));
      console.log(chalk.cyan(p.trim()));
      console.log(chalk.cyan('```'));
    } else {
      console.log(chalk.white(p.trimEnd()));
    }
  }
  console.log('');
}

export async function runAskInteractive(scanRoot: string, logDir?: string): Promise<void> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error(
      chalk.red('Interactive mode requires OPENAI_API_KEY. Set it to ask questions about your scan results.'),
    );
    process.exitCode = 1;
    return;
  }

  const result = await runScan(scanRoot, { logDir, verbose: false });
  const digest = findingsDigest(result);
  const sys = systemPrompt(digest);

  console.log(
    chalk.gray(
      `Loaded ${result.findings.length} finding(s). Ask questions about this scan, or type ${chalk.white('exit')}.\n`,
    ),
  );

  const rl = readline.createInterface({ input, output, terminal: true, historySize: 200 });

  try {
    for (;;) {
      const q = (await rl.question(chalk.hex('#0B8A5E').bold('bastion > '))).trim();
      if (!q || q.toLowerCase() === 'exit' || q.toLowerCase() === 'quit') break;

      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: q },
            ],
            temperature: 0.3,
          }),
        });
        if (!r.ok) {
          const err = await r.text();
          console.error(chalk.red(`API error: ${r.status} ${err.slice(0, 200)}`));
          continue;
        }
        const data = (await r.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content ?? '';
        printAssistantReply(content);
      } catch (e) {
        console.error(chalk.red(e instanceof Error ? e.message : String(e)));
      }
    }
  } finally {
    rl.close();
  }
}
