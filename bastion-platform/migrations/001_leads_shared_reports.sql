-- Run in Supabase SQL editor or: psql $DATABASE_URL -f migrations/001_leads_shared_reports.sql

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_domain TEXT,
  cli_score INTEGER,
  finding_count INTEGER,
  findings_summary JSONB DEFAULT '{}'::jsonb,
  weekly_scan BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);

CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  report_data JSONB NOT NULL,
  views INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_reports_token_idx ON shared_reports (token);
