import { NextResponse } from 'next/server';
import { getShare } from '@/lib/share-store';

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const rec = getShare(params.token);
  if (!rec) {
    return NextResponse.json({ error: 'Not found or expired' }, { status: 404 });
  }
  return NextResponse.json({
    report: rec.report_data,
    views: rec.views,
  });
}
