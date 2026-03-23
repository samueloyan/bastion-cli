# Bastion platform (Next.js API companion)

API routes used by **bastion-cli** for leads, shared reports, and the public report viewer.

## Setup

```bash
cd bastion-platform
npm install
npm run dev
```

## Database

```bash
npm run migrate
```

Prints SQL for `leads` and `shared_reports`. Apply in Supabase or with `psql`.

Environment variables (optional):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — persist leads
- `RESEND_API_KEY`, `RESEND_FROM` — welcome / report email
- `NEXT_PUBLIC_APP_URL` — links in emails (default bastion-zeta URL)

## Routes

- `POST /api/cli/lead` — email capture from CLI
- `POST /api/cli/share` — create share token (in-memory store unless extended)
- `GET /api/cli/share/[token]` — JSON for shared report + view count
- `GET /report/[token]` — public HTML report + Bastion CTA banner

**Note:** Shared reports use an in-memory `Map` in this scaffold; for production, persist `shared_reports` in Supabase using the migration SQL.

## Auth / magic link

Creating Supabase Auth users and passwordless magic links should be wired in `app/api/cli/lead/route.ts` when your auth policies are ready (not fully implemented in this scaffold).
