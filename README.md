# Bastion CLI

**The AI watching your AI.**

Bastion CLI is a local AI security scanner for LLM applications. It analyzes your codebase for common vulnerabilities, maps results to OWASP LLM Top 10, NIST AI RMF, and MITRE ATLAS, and prints a scored terminal report. Optional JSON and HTML exports and platform upload are supported.

- **Dashboard:** [https://bastion-zeta.vercel.app](https://bastion-zeta.vercel.app)
- **Accent (branding):** `#0B8A5E`

## Requirements

- Node.js >= 18

## Install & usage

```bash
npm install
npm run build
node bin/bastion.js scan ./test-project --logs ./test-project/logs
```

Published usage:

```bash
npx bastion-cli scan <directory>                              # Full scan
npx bastion-cli scan <directory> --prove                      # Scan + attack simulation
npx bastion-cli scan <directory> --logs <logdir>              # Scan + log PII analysis
npx bastion-cli scan <directory> --json                       # Export JSON report
npx bastion-cli scan <directory> --html                       # Export HTML report
npx bastion-cli scan <directory> --upload --api-key <k> --org <id>  # Upload to Bastion
npx bastion-cli scan <directory> --verbose                    # Detailed progress
npx bastion-cli ask <directory>                               # Interactive Q&A (needs OPENAI_API_KEY)
npx bastion-cli fix CRIT-001 --apply                          # Auto-fix from last scan (run from scanned project)
npx bastion-cli version                                       # Version
npx bastion-cli help                                          # Help
```

After a normal scan (not `--json`), the CLI shows benchmark, score history (`.bastion/history.json`), platform comparison, optional email/share/weekly prompts, and a CI/CD suggestion unless you used `--upload`.

## Interactive ask mode

Requires `OPENAI_API_KEY`. Runs a silent scan, then `bastion >` prompt (readline history / up-arrow) calling **gpt-4o-mini** with your findings as context.

## Local scan cache

Each scanned project gets `.bastion/last-scan.json` (for `fix`) and `.bastion/history.json` (score trend). Add `.bastion/` to `.gitignore` in real repos.

## Test project

The `test-project/` directory is intentionally vulnerable and is meant to validate scanner behavior. Its `.env` is **not** gitignored on purpose so `env-security` can flag the misconfiguration.

## CI/CD (GitHub Actions)

```yaml
name: Bastion Security Scan
on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Bastion CLI
        run: npx bastion-cli scan . --upload --api-key ${{ secrets.BASTION_API_KEY }} --org ${{ secrets.BASTION_ORG_ID }}
      - name: Check score
        run: |
          SCORE=$(npx bastion-cli scan . --json | jq '.score')
          if [ "$SCORE" -lt 60 ]; then
            echo "Security score too low: $SCORE/100"
            exit 1
          fi
```

## Bastion platform (API)

The Next.js app in `bastion-platform/` implements `POST /api/cli/lead`, `POST /api/cli/share`, and the public report page. From that folder run `npm run migrate` to print/apply SQL for `leads` and `shared_reports`.

## License

MIT
