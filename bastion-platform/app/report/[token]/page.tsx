import Link from 'next/link';
import { headers } from 'next/headers';

const ACCENT = '#0B8A5E';
const BG = '#FAFAF8';

export default async function SharedReportPage({ params }: { params: { token: string } }) {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const res = await fetch(`${proto}://${host}/api/cli/share/${params.token}`, { cache: 'no-store' });
  if (!res.ok) {
    return (
      <main style={{ padding: 48, fontFamily: 'system-ui' }}>
        <h1>Report not found</h1>
        <p>This link may have expired (7 days) or is invalid.</p>
      </main>
    );
  }
  const payload = (await res.json()) as {
    report?: {
      score?: number;
      score_label?: string;
      findings?: Array<{ id: string; title: string; severity: string; file: string; line: number }>;
    };
    views?: number;
  };
  const data = payload.report ?? {};
  const views = payload.views ?? 0;

  return (
    <main style={{ background: BG, minHeight: '100vh', fontFamily: 'system-ui', padding: 24 }}>
      <div
        style={{
          background: '#fff',
          border: `1px solid ${ACCENT}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <strong>Protect your AI with Bastion.</strong>{' '}
        <Link href="https://bastion-zeta.vercel.app" style={{ color: ACCENT }}>
          Sign up free →
        </Link>
      </div>
      <article style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ color: ACCENT }}>Bastion shared report</h1>
        <p>
          Score: <strong>{data.score ?? '—'}</strong> ({data.score_label ?? '—'}) · Views: {views}
        </p>
        <h2>Findings</h2>
        <ul>
          {(data.findings ?? []).slice(0, 50).map((f) => (
            <li key={f.id}>
              <strong>{f.id}</strong> {f.title} — {f.file}:{f.line} ({f.severity})
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
