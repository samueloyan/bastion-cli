const BASE = 'https://bastion-zeta.vercel.app';

export async function postLead(payload: {
  email: string;
  company_domain?: string;
  cli_score: number;
  finding_count: number;
  findings_summary: Record<string, unknown>;
  weekly_scan?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${BASE}/api/cli/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return { ok: false, error: await r.text() };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function postShare(reportData: object): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const r = await fetch(`${BASE}/api/cli/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: reportData }),
    });
    const text = await r.text();
    let j: { url?: string; error?: string };
    try {
      j = JSON.parse(text) as { url?: string; error?: string };
    } catch {
      return { ok: false, error: text.slice(0, 200) };
    }
    if (!r.ok) return { ok: false, error: j.error ?? text };
    if (j.url) return { ok: true, url: j.url };
    return { ok: false, error: 'No URL returned' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function domainFromEmail(email: string): string | undefined {
  const m = email.trim().toLowerCase().match(/@([^@]+)$/);
  return m ? m[1] : undefined;
}
