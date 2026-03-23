import type { Finding, LogAnalysisSummary, ScanMetrics, ScanResult } from '../types';
import { scoreFromFindings } from '../scoring/calculator';
import { createIdGenerator } from './finding-ids';
import { computeMetrics } from './metrics';
import { scanApiKeys } from './api-keys';
import { scanPromptInjection } from './prompt-injection';
import { scanOutputHandling } from './output-handling';
import { scanPiiExposure } from './pii-exposure';
import { scanSystemPrompts } from './system-prompts';
import { scanToolPermissions } from './tool-permissions';
import { scanRateLimiting } from './rate-limiting';
import { scanAuditLogging } from './audit-logging';
import { scanModelVersions } from './model-versions';
import { scanEnvSecurity } from './env-security';
import { analyzeLogs } from './log-analyzer';

export interface RunScanOptions {
  logDir?: string;
  verbose?: boolean;
}

export async function runScan(rootDir: string, options: RunScanOptions = {}): Promise<ScanResult> {
  const nextId = createIdGenerator();
  const findings: Finding[] = [];

  const runners: Array<() => Promise<Finding[]>> = [
    () => scanApiKeys(rootDir, nextId),
    () => scanPromptInjection(rootDir, nextId),
    () => scanOutputHandling(rootDir, nextId),
    () => scanPiiExposure(rootDir, nextId),
    () => scanSystemPrompts(rootDir, nextId),
    () => scanToolPermissions(rootDir, nextId),
    () => scanRateLimiting(rootDir, nextId),
    () => scanAuditLogging(rootDir, nextId),
    () => scanModelVersions(rootDir, nextId),
    () => scanEnvSecurity(rootDir, nextId),
  ];

  for (const run of runners) {
    const chunk = await run();
    findings.push(...chunk);
  }

  let logAnalysis: LogAnalysisSummary | undefined;
  if (options.logDir) {
    const { findings: logFindings, summary } = await analyzeLogs(options.logDir, nextId);
    findings.push(...logFindings);
    logAnalysis = summary;
  }

  const metrics = await computeMetrics(rootDir);
  const { score, label } = scoreFromFindings(findings);

  return {
    version: '1.0.0',
    scanDate: new Date().toISOString(),
    directory: rootDir,
    findings: sortFindings(findings),
    metrics,
    score,
    scoreLabel: label,
    logAnalysis,
  };
}

function severityOrder(s: Finding['severity']): number {
  switch (s) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    case 'low':
      return 3;
  }
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const sev = severityOrder(a.severity) - severityOrder(b.severity);
    if (sev !== 0) return sev;
    return `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`);
  });
}

