import { NextResponse } from 'next/server';
import { createShare } from '@/lib/share-store';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { report?: unknown };
    if (!body.report) {
      return NextResponse.json({ error: 'Missing report' }, { status: 400 });
    }
    const token = createShare(body.report);
    const host = req.headers.get('host') ?? 'bastion-zeta.vercel.app';
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const url = `${proto}://${host}/report/${token}`;
    return NextResponse.json({ url, token });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
