import * as path from 'path';
import type { JsonExport, JsonFinding } from '../types';
import { domainFromEmail } from '../utils/email-domain';

export interface CliLeadFinding {
  id: string;
  title: string;
  severity: string;
  file: string;
  line: number;
  description: string;
  code_fix: string;
}

export interface CliLeadBody {
  email: string;
  company_domain?: string;
  score: number;
  findings: CliLeadFinding[];
  finding_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  framework_compliance: {
    owasp: { total: number; failing: number };
    nist: { total: number; failing: number };
    mitre: { total: number; failing: number };
  };
  risk_assessment: string[];
  files_scanned: number;
  directory: string;
  weekly_scan?: boolean;
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function trimTo500(s: string): string {
  const t = s.trim();
  if (t.length <= 500) return t;
  return `${t.slice(0, 497)}…`;
}

function compareSeverity(a: JsonFinding, b: JsonFinding): number {
  return (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99);
}

function buildRiskAssessment(findings: JsonFinding[]): string[] {
  const bullets: string[] = [];
  const critHigh = findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  for (const f of critHigh.slice(0, 5)) {
    const t = f.title.trim();
    bullets.push(t.length > 140 ? `${t.slice(0, 137)}…` : t);
  }

  const blob = findings.map((f) => `${f.title} ${f.description}`).join(' ').toLowerCase();
  const add = (s: string) => {
    if (!bullets.includes(s)) bullets.push(s);
  };

  if (/(prompt|instruction|injection|jailbreak)/.test(blob)) {
    add('An attacker may be able to override system or developer instructions via prompt injection.');
  }
  if (/(api[\s_-]?key|secret|credential|token|hardcoded)/.test(blob)) {
    add('Secrets or API keys in source or config can be extracted in seconds if the repo or build leaks.');
  }
  if (/(pii|personally identifiable|ssn|social security)/.test(blob)) {
    add('PII may be flowing to third-party LLM providers without adequate redaction or policy controls.');
  }
  if (/(tool|agent|execute|permission|privilege)/.test(blob)) {
    add('Agents or tools may be manipulated to execute unauthorized or high-privilege operations.');
  }
  if (/(xss|html|dangerouslysetinnerhtml|innerhtml)/.test(blob)) {
    add('Model output rendered as HTML without sanitization can enable cross-site scripting.');
  }

  if (bullets.length === 0) {
    add('Review flagged findings and remediate before scaling production traffic.');
  }

  return bullets.slice(0, 10);
}

function displayDirectory(scannedRoot: string): string {
  try {
    const rel = path.relative(process.cwd(), scannedRoot);
    if (rel === '') return '.';
    if (rel && !rel.startsWith('..')) {
      const posix = rel.replace(/\\/g, '/');
      return posix.startsWith('.') ? posix : `./${posix}`;
    }
  } catch {
    /* keep absolute */
  }
  return scannedRoot.replace(/\\/g, '/');
}

export function buildCliLeadBody(
  email: string,
  jsonPayload: JsonExport,
  opts?: { weekly_scan?: boolean },
): CliLeadBody {
  const sorted = [...jsonPayload.findings].sort(compareSeverity);
  const findings: CliLeadFinding[] = sorted.slice(0, 10).map((f) => ({
    id: f.id,
    title: f.title,
    severity: f.severity,
    file: f.file,
    line: f.line,
    description: trimTo500(f.description),
    code_fix: trimTo500(f.fix),
  }));

  const finding_counts = { critical: 0, high: 0, medium: 0, low: 0, total: jsonPayload.findings.length };
  for (const f of jsonPayload.findings) {
    if (f.severity === 'critical') finding_counts.critical += 1;
    else if (f.severity === 'high') finding_counts.high += 1;
    else if (f.severity === 'medium') finding_counts.medium += 1;
    else if (f.severity === 'low') finding_counts.low += 1;
  }

  const fw = jsonPayload.framework_compliance;

  const body: CliLeadBody = {
    email,
    company_domain: domainFromEmail(email),
    score: jsonPayload.score,
    findings,
    finding_counts,
    framework_compliance: {
      owasp: { total: fw.owasp.total, failing: fw.owasp.failing },
      nist: { total: fw.nist.total, failing: fw.nist.failing },
      mitre: { total: fw.mitre.total, failing: fw.mitre.failing },
    },
    risk_assessment: buildRiskAssessment(jsonPayload.findings),
    files_scanned: jsonPayload.files_scanned,
    directory: displayDirectory(jsonPayload.directory),
  };

  if (opts?.weekly_scan) body.weekly_scan = true;

  return body;
}
