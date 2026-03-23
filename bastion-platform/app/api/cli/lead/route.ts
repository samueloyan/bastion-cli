import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';

type LeadBody = {
  email: string;
  company_domain?: string;
  cli_score?: number;
  finding_count?: number;
  findings_summary?: Record<string, unknown>;
  weekly_scan?: boolean;
};

export async function POST(req: Request) {
  let body: LeadBody;
  try {
    body = (await req.json()) as LeadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bastion-zeta.vercel.app';
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase.from('leads').insert({
      email: body.email.toLowerCase(),
      company_domain: body.company_domain ?? null,
      cli_score: body.cli_score ?? null,
      finding_count: body.finding_count ?? null,
      findings_summary: body.findings_summary ?? {},
      weekly_scan: Boolean(body.weekly_scan),
      converted: false,
    });
    if (error) {
      console.error('leads insert', error);
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const top = (body.findings_summary?.top as unknown[]) ?? [];
      const lines = Array.isArray(top)
        ? top.slice(0, 3).map((x) => JSON.stringify(x))
        : [];
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? 'Bastion <onboarding@resend.dev>',
        to: body.email,
        subject: 'Your Bastion CLI scan summary',
        html: `<p>Score: ${body.cli_score ?? '—'}/100</p><p>Findings: ${body.finding_count ?? '—'}</p><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul><p><a href="${url}/login">Open dashboard</a> to set your password (magic link flow TBD).</p>`,
      });
    } catch (e) {
      console.error('resend', e);
    }
  }

  return NextResponse.json({
    success: true,
    dashboard_url: `${url}/login`,
    message:
      'Lead recorded. Configure SUPABASE_* and RESEND_API_KEY for persistence and email.',
  });
}
