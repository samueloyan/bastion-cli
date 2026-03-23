import * as fs from 'fs';
import * as path from 'path';
import type { ScanResult } from '../types';
import type { FrameworkComplianceBundle } from '../frameworks/compliance';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function writeHtmlReport(result: ScanResult, compliance: FrameworkComplianceBundle, outDir: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const filename = `bastion-report-${day}.html`;
  const outPath = path.join(outDir, filename);

  const sevColor: Record<string, string> = {
    critical: '#c62828',
    high: '#E37400',
    medium: '#f9a825',
    low: '#546e7a',
  };

  const findingsHtml = result.findings
    .map(
      (f) => `
      <article class="finding sev-${f.severity}">
        <h3>${esc(f.title)} <span class="badge">${esc(f.severity)}</span></h3>
        <p class="meta">${esc(f.file)}:${f.line} · ${esc(f.id)}</p>
        <pre class="code"><code>${esc(f.code)}</code></pre>
        <p>${esc(f.description)}</p>
        <p class="fix"><strong>Fix:</strong> ${esc(f.fix)}</p>
        <p class="fw">OWASP: ${esc(f.frameworks.owasp.join(', ') || '—')} · NIST: ${esc(f.frameworks.nist.join(', ') || '—')} · MITRE: ${esc(f.frameworks.mitre.join(', ') || '—')}</p>
      </article>`,
    )
    .join('\n');

  const owaspRows = compliance.owasp.controls
    .map(
      (c) =>
        `<tr><td>${esc(c.id)}</td><td>${esc(c.name)}</td><td class="${c.passing ? 'pass' : 'fail'}">${c.passing ? '✓' : '✗'}</td></tr>`,
    )
    .join('');

  const nistRows = compliance.nist.controls
    .map(
      (c) =>
        `<tr><td>${esc(c.id)}</td><td>${esc(c.name)}</td><td class="${c.passing ? 'pass' : 'fail'}">${c.passing ? '✓' : '✗'}</td></tr>`,
    )
    .join('');

  const mitreRows = compliance.mitre.techniques
    .map(
      (t) =>
        `<tr><td>${esc(t.id)}</td><td>${esc(t.name)}</td><td class="${t.passing ? 'pass' : 'fail'}">${t.passing ? '✓' : '✗'}</td></tr>`,
    )
    .join('');

  const scoreColor =
    result.score >= 80 ? '#0B8A5E' : result.score >= 60 ? '#f9a825' : result.score >= 40 ? '#E37400' : '#c62828';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bastion CLI Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg: #FAFAF8; --accent: #0B8A5E; --text: #1a1a1a; --muted: #5c5c5c; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Instrument Sans', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
    main { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
    h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
    .tagline { color: var(--muted); margin: 0 0 2rem; }
    .score-card { border: 1px solid #e8e8e4; border-radius: 12px; padding: 1.5rem 1.75rem; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.04); margin-bottom: 2rem; }
    .score-row { display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap; }
    .score-num { font-size: 3rem; font-weight: 700; color: ${scoreColor}; font-variant-numeric: tabular-nums; }
    .score-label { font-size: 1.1rem; font-weight: 600; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; margin-top: 1rem; font-size: 0.9rem; color: var(--muted); }
    .meta-grid strong { color: var(--text); }
    h2 { font-size: 1.2rem; margin: 2.5rem 0 1rem; color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 0.35rem; }
    .finding { border: 1px solid #e8e8e4; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1rem; background: #fff; border-left: 4px solid var(--accent); }
    .finding.sev-critical { border-left-color: ${sevColor.critical}; }
    .finding.sev-high { border-left-color: ${sevColor.high}; }
    .finding.sev-medium { border-left-color: ${sevColor.medium}; }
    .finding.sev-low { border-left-color: ${sevColor.low}; }
    .badge { display: inline-block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.2rem 0.5rem; border-radius: 4px; background: #eee; margin-left: 0.5rem; vertical-align: middle; }
    pre.code { font-family: 'Space Mono', monospace; font-size: 0.8rem; background: #f4f4f0; padding: 0.75rem 1rem; border-radius: 8px; overflow-x: auto; margin: 0.75rem 0; }
    .fix { color: var(--accent); }
    .fw { font-size: 0.85rem; color: var(--muted); }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 1rem 0 2rem; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e8e8e4; }
    th, td { text-align: left; padding: 0.6rem 0.85rem; border-bottom: 1px solid #eee; }
    th { background: #f4f4f0; font-weight: 600; }
    .pass { color: var(--accent); font-weight: 600; }
    .fail { color: #c62828; font-weight: 600; }
    .risk { border: 1px solid #e8e8e4; border-radius: 10px; padding: 1.25rem 1.5rem; background: #fff; margin-top: 1rem; }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e8e8e4; font-size: 0.9rem; color: var(--muted); }
    a { color: var(--accent); }
  </style>
</head>
<body>
  <main>
    <h1>Bastion CLI Security Report</h1>
    <p class="tagline">The AI watching your AI.</p>
    <section class="score-card">
      <div class="score-row">
        <span class="score-num">${result.score}</span>
        <span class="score-label">${esc(result.scoreLabel)}</span>
      </div>
      <div class="meta-grid">
        <div><strong>Scan date</strong><br />${esc(result.scanDate)}</div>
        <div><strong>Directory</strong><br />${esc(result.directory)}</div>
        <div><strong>Files scanned</strong><br />${result.metrics.filesScanned}</div>
        <div><strong>LLM call sites</strong><br />${result.metrics.llmCallSites}</div>
        <div><strong>Agent configs</strong><br />${result.metrics.agentConfigs}</div>
        <div><strong>Findings</strong><br />${result.findings.length}</div>
      </div>
    </section>
    <h2>Findings</h2>
    ${findingsHtml || '<p>No findings.</p>'}
    <h2>Framework compliance</h2>
    <h3 style="font-size:1rem;margin-top:1.5rem;">OWASP LLM Top 10</h3>
    <table><thead><tr><th>ID</th><th>Control</th><th>Status</th></tr></thead><tbody>${owaspRows}</tbody></table>
    <h3 style="font-size:1rem;">NIST AI RMF</h3>
    <table><thead><tr><th>ID</th><th>Control</th><th>Status</th></tr></thead><tbody>${nistRows}</tbody></table>
    <h3 style="font-size:1rem;">MITRE ATLAS</h3>
    <table><thead><tr><th>ID</th><th>Technique</th><th>Status</th></tr></thead><tbody>${mitreRows}</tbody></table>
    <h2>Risk assessment</h2>
    <div class="risk">
      ${riskParagraph(result)}
    </div>
    <footer>
      Review and track issues in the <a href="https://bastion-zeta.vercel.app">Bastion platform</a>. Generated by Bastion CLI v${esc(result.version)}.
    </footer>
  </main>
</body>
</html>`;

  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

function riskParagraph(result: ScanResult): string {
  const n = result.findings.length;
  const crit = result.findings.filter((f) => f.severity === 'critical').length;
  if (n === 0) {
    return '<p>No automated issues were detected in this pass. Continue defense-in-depth with manual review and testing.</p>';
  }
  return `<p>This scan reported <strong>${n}</strong> issue(s), including <strong>${crit}</strong> critical-severity item(s). Unaddressed credential exposure, prompt injection, and unsafe output handling can lead to data breach, account abuse, and compliance gaps. Prioritize remediation of critical and high findings before expanding production traffic.</p>`;
}
