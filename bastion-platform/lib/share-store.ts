export interface ShareRecord {
  report_data: unknown;
  expires_at: number;
  views: number;
}

const store = new Map<string, ShareRecord>();

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export function createShare(report: unknown): string {
  const token = randomToken();
  const expires_at = Date.now() + 7 * 24 * 60 * 60 * 1000;
  store.set(token, { report_data: report, expires_at, views: 0 });
  return token;
}

export function peekShare(token: string): ShareRecord | null {
  const r = store.get(token);
  if (!r) return null;
  if (Date.now() > r.expires_at) {
    store.delete(token);
    return null;
  }
  return r;
}

export function getShare(token: string): ShareRecord | null {
  const r = peekShare(token);
  if (!r) return null;
  const rec = store.get(token)!;
  rec.views += 1;
  return rec;
}
