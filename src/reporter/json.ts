import type { Finding, JsonExport, ScanResult } from '../types';
import type { FrameworkComplianceBundle } from '../frameworks/compliance';

function toJsonFinding(f: Finding) {
  return {
    id: f.id,
    title: f.title,
    severity: f.severity,
    file: f.file,
    line: f.line,
    code: f.code,
    description: f.description,
    fix: f.fix,
    frameworks: f.frameworks,
  };
}

export function buildJsonPayload(result: ScanResult, compliance: FrameworkComplianceBundle): JsonExport {
  const payload: JsonExport = {
    version: result.version,
    scan_date: result.scanDate,
    directory: result.directory,
    files_scanned: result.metrics.filesScanned,
    llm_call_sites: result.metrics.llmCallSites,
    agent_configs: result.metrics.agentConfigs,
    score: result.score,
    score_label: result.scoreLabel,
    findings: result.findings.map(toJsonFinding),
    framework_compliance: compliance,
  };
  if (result.logAnalysis) payload.log_analysis = result.logAnalysis;
  return payload;
}

export function printJson(payload: JsonExport): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
