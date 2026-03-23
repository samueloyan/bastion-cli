# Bastion CLI — Complete Build Specification

## What This Is

Bastion CLI is a standalone AI security scanner that analyzes codebases for vulnerabilities in AI/LLM applications. It runs entirely on the user's machine — no data leaves their laptop. It scans source code, finds security issues, maps them to compliance frameworks, and outputs a detailed terminal report with a security score.

It has two modes:
- **Free mode (no account):** Scans locally, prints terminal report, links to bastion.ai to sign up
- **Connected mode (--upload flag):** Sends scan results to the Bastion platform dashboard via API

## Branding

- Product name: Bastion CLI
- Tagline: "The AI watching your AI."
- Dashboard URL: https://bastion-zeta.vercel.app
- Accent color: #0B8A5E (green)
- No emojis anywhere in the output — use Unicode symbols (✓ ✗ ● ■ ▶ ├ └ ─) instead

---

## Tech Stack

- Language: TypeScript
- Runtime: Node.js >= 18
- Build: tsc
- Entry point: bin/bastion.js with shebang #!/usr/bin/env node
- Package manager: npm
- Will be published to npm as "bastion-cli"

### Dependencies

- commander — CLI argument parsing
- chalk — Terminal colors
- ora — Loading spinners
- glob — File pattern matching
- @babel/parser — JavaScript/TypeScript AST parsing
- @babel/traverse — AST traversal
- boxen — Terminal boxes
- cli-table3 — Terminal tables
- figures — Unicode symbols

---

## Project Structure

```
bastion-cli/
├── bin/
│   └── bastion.js                  # Entry point #!/usr/bin/env node
├── src/
│   ├── index.ts                    # Main CLI logic, commander setup
│   ├── scanner/
│   │   ├── index.ts                # Orchestrator — runs all scanners in order
│   │   ├── api-keys.ts             # Finds hardcoded API keys
│   │   ├── prompt-injection.ts     # Finds prompt injection vulnerabilities
│   │   ├── output-handling.ts      # Finds unsanitized output rendering
│   │   ├── pii-exposure.ts         # Finds PII flowing to LLM providers
│   │   ├── system-prompts.ts       # Checks for missing system prompts
│   │   ├── tool-permissions.ts     # Checks agent tool scope and privileges
│   │   ├── rate-limiting.ts        # Checks for missing rate limiting
│   │   ├── audit-logging.ts        # Checks for missing audit logging
│   │   ├── model-versions.ts       # Checks for outdated/deprecated models
│   │   ├── env-security.ts         # Checks .env files for exposed secrets
│   │   └── log-analyzer.ts         # Analyzes log files for PII patterns
│   ├── frameworks/
│   │   ├── owasp.ts                # OWASP LLM Top 10 mapping
│   │   ├── nist.ts                 # NIST AI RMF mapping
│   │   └── mitre.ts                # MITRE ATLAS mapping
│   ├── scoring/
│   │   └── calculator.ts           # Security score 0-100
│   ├── reporter/
│   │   ├── terminal.ts             # Colored terminal output with ASCII art
│   │   ├── json.ts                 # JSON file export
│   │   └── html.ts                 # HTML report generation
│   ├── prover/
│   │   └── attack-simulator.ts     # Simulates attacks for --prove flag
│   ├── uploader/
│   │   └── bastion-api.ts          # Sends results to Bastion platform
│   ├── utils/
│   │   ├── file-walker.ts          # Recursive directory walker
│   │   ├── ast-parser.ts           # JS/TS/Python file parser
│   │   ├── colors.ts               # Chalk color helpers
│   │   └── spinner.ts              # Ora spinner helpers
│   └── types.ts                    # All TypeScript interfaces
├── test-project/                   # Intentionally vulnerable test app
│   ├── src/
│   │   ├── lib/openai.ts           # Hardcoded API key
│   │   ├── routes/chat.ts          # Prompt injection vulnerable
│   │   ├── routes/analyze.ts       # PII flowing to LLM
│   │   ├── components/ChatResponse.tsx  # Unsanitized output
│   │   └── agent/tools.ts          # Overprivileged tools
│   ├── .env                        # Exposed secrets (NOT gitignored on purpose)
│   └── logs/requests.log           # Log file with PII
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## Commands

```bash
npx bastion-cli scan <directory>                              # Full scan
npx bastion-cli scan <directory> --prove                      # Scan + attack simulation
npx bastion-cli scan <directory> --logs <logdir>              # Scan + log PII analysis
npx bastion-cli scan <directory> --json                       # Export JSON report
npx bastion-cli scan <directory> --html                       # Export HTML report
npx bastion-cli scan <directory> --upload --api-key <k> --org <id>  # Upload to Bastion
npx bastion-cli scan <directory> --verbose                    # Detailed progress
npx bastion-cli version                                       # Version
npx bastion-cli help                                          # Help
```

---

## Scanner Specifications

### api-keys.ts
- Files: .ts, .js, .tsx, .jsx, .py, .env, .yml, .yaml, .json, .toml
- Patterns:
  - OpenAI: `sk-[a-zA-Z0-9]{20,}`
  - Anthropic: `sk-ant-[a-zA-Z0-9]{20,}`
  - Google: `AIza[a-zA-Z0-9_-]{35}`
  - AWS: `AKIA[A-Z0-9]{16}`
  - Generic: KEY=, SECRET=, TOKEN= in config files
- Output: file path, line number, masked key (sk-proj-4jK8m...)
- Severity: CRITICAL
- Framework: OWASP LLM05, NIST AI RMF 3.2

### prompt-injection.ts
- Parse JS/TS to AST with @babel/parser
- Find template literals containing ${userInput} or similar user variables inside LLM prompt construction
- Find string concatenation: "prompt" + userInput
- Check if sanitization function exists before input enters prompt
- Show variable flow: userInput → unsanitized → prompt → LLM call
- Severity: CRITICAL
- Framework: OWASP LLM01, NIST AI RMF 2.1, MITRE ATLAS T0051

### output-handling.ts
- Find: dangerouslySetInnerHTML with LLM responses
- Find: v-html with LLM content
- Find: innerHTML assignments with LLM content
- Find: response rendered without DOMPurify/sanitize-html
- Severity: HIGH
- Framework: OWASP LLM02

### pii-exposure.ts
- Find code paths where user data objects (email, phone, ssn fields) flow into prompt construction
- Find database results passed directly into prompts
- Check for PII redaction between data retrieval and prompt
- Severity: HIGH
- Framework: OWASP LLM06, NIST AI RMF 1.3

### system-prompts.ts
- Find all LLM API call sites
- Check for system message presence in messages array
- Check if system prompt is hardcoded vs config/env loaded
- Severity: MEDIUM
- Framework: OWASP LLM01

### tool-permissions.ts
- Find agent tool definitions (LangChain, OpenAI functions, custom)
- List defined vs actually-used tools
- Flag dangerous capabilities: db write, file system, email, code execution, external HTTP
- Flag if tool count > 5 and < 50% used
- Severity: HIGH for dangerous unused tools
- Framework: OWASP LLM07, OWASP LLM08

### rate-limiting.ts
- Check for rate limit middleware on LLM-calling routes
- Look for: express-rate-limit, @nestjs/throttler, rate-limiter-flexible
- Check for token/cost limits per user
- Severity: MEDIUM
- Framework: OWASP LLM04

### audit-logging.ts
- Check if LLM calls are logged (logger/console/winston/pino near LLM invocations)
- Check if agent tool calls are logged
- Check if responses are logged
- Severity: MEDIUM
- Framework: NIST AI RMF 4.1, MITRE ATLAS T0012

### model-versions.ts
- Find model name strings in codebase
- Deprecated list: text-davinci-003, code-davinci-002, old gpt-3.5-turbo versions
- Severity: LOW for outdated, MEDIUM for deprecated
- Framework: OWASP LLM05

### env-security.ts
- Check .env exists with API keys
- Check .env in .gitignore
- Check .env.example exists
- Check git history for committed secrets
- Severity: CRITICAL if .env not gitignored with keys

### log-analyzer.ts (--logs flag only)
- Read log files from specified directory
- Scan for: SSN (XXX-XX-XXXX), email, phone, credit card patterns
- Count occurrences by type
- Report total and breakdown
- Severity: HIGH
- Framework: OWASP LLM06

---

## Scoring

Start at 100 points:
- CRITICAL: -15 each
- HIGH: -10 each
- MEDIUM: -5 each
- LOW: -2 each
- Minimum: 0

Score ranges:
- 80-100: GOOD (green)
- 60-79: MODERATE (yellow)
- 40-59: POOR (orange)
- 0-39: CRITICAL (red)

---

## Framework Mapping

### OWASP LLM Top 10
| Control | Name | Scanners |
|---------|------|----------|
| LLM01 | Prompt Injection | prompt-injection, system-prompts |
| LLM02 | Insecure Output Handling | output-handling |
| LLM04 | Model Denial of Service | rate-limiting |
| LLM05 | Supply Chain Vulnerabilities | api-keys, model-versions, env-security |
| LLM06 | Sensitive Information Disclosure | pii-exposure |
| LLM07 | Insecure Plugin Design | tool-permissions |
| LLM08 | Excessive Agency | tool-permissions |

### NIST AI RMF
| Control | Name | Scanners |
|---------|------|----------|
| GOVERN 1.1 | AI risk management policies | audit-logging |
| MAP 1.3 | Data privacy in AI | pii-exposure |
| MAP 2.1 | Threat identification | prompt-injection |
| MEASURE 2.3 | AI system testing | all |
| MANAGE 3.2 | Access controls | api-keys, tool-permissions |
| MANAGE 4.1 | Monitoring and logging | audit-logging |

### MITRE ATLAS
| Technique | Name | Scanners |
|-----------|------|----------|
| T0001 | Prompt injection | prompt-injection |
| T0012 | Evade ML logging | audit-logging |
| T0024 | Exfiltration via ML | pii-exposure |
| T0040 | ML supply chain | api-keys, env-security |
| T0051 | LLM prompt injection | prompt-injection |

---

## Attack Simulator (--prove flag)

For each vulnerability found, generate a static proof of concept showing what COULD happen. DO NOT make actual API calls. This is static analysis only.

- Prompt injection: show the attack payload and explain the consequence
- PII exposure: show sample PII that would be sent to the provider
- Output handling: show how XSS could be injected through model response
- Tool permissions: show how an attacker could manipulate the agent to use dangerous tools

Each proof displayed in a red-bordered terminal box.

---

## Terminal Output Format

The terminal output has 8 phases displayed in sequence:

1. ASCII banner with product name and version
2. Scanning progress with animated spinner
3. Score box with colored progress bar
4. Findings grouped by severity (CRITICAL → HIGH → MEDIUM → LOW) with code snippets, framework tags, and fix suggestions
5. Summary table with file/finding counts
6. Framework compliance tree showing pass/fail per control
7. Risk assessment box explaining business impact in plain English
8. CTA linking to Bastion platform

Use these Unicode characters throughout:
- ✓ for passing checks
- ✗ for failing checks
- ● for status dots
- ■ for legend items
- ▶ for alerts
- ├ └ ─ for tree structures
- ═ ─ ╔ ╗ ╚ ╝ ║ for boxes

Colors:
- Green (chalk.green): passing, good scores, fixes
- Red (chalk.red): critical findings, failures
- Yellow (chalk.yellow): warnings, medium findings
- Orange (chalk.hex('#E37400')): high findings
- Blue (chalk.blue): info, framework names
- Gray (chalk.gray): secondary text, line numbers
- White bold (chalk.white.bold): headings, emphasis

---

## HTML Report (--html flag)

Self-contained HTML file with embedded CSS matching Bastion design system:
- Background: #FAFAF8
- Font: Instrument Sans (Google Fonts link)
- Monospace: Space Mono
- Accent: #0B8A5E
- Sections: score card, all findings with code blocks, framework compliance, risk assessment
- Professional enough to email to a CTO
- Saved as bastion-report-YYYY-MM-DD.html

---

## JSON Export (--json flag)

```json
{
  "version": "1.0.0",
  "scan_date": "2026-03-17T12:00:00Z",
  "directory": "./my-ai-app",
  "files_scanned": 142,
  "llm_call_sites": 5,
  "agent_configs": 1,
  "score": 37,
  "score_label": "CRITICAL",
  "findings": [
    {
      "id": "CRIT-001",
      "title": "API Key Hardcoded in Source",
      "severity": "critical",
      "file": "src/lib/openai.ts",
      "line": 14,
      "code": "const client = new OpenAI({ apiKey: \"sk-proj-4jK...\" })",
      "description": "...",
      "fix": "...",
      "frameworks": {
        "owasp": ["LLM05"],
        "nist": ["MANAGE 3.2"],
        "mitre": ["T0040"]
      }
    }
  ],
  "framework_compliance": {
    "owasp": { "total": 10, "failing": 4, "controls": [...] },
    "nist": { "total": 17, "failing": 6, "controls": [...] },
    "mitre": { "total": 12, "failing": 3, "techniques": [...] }
  }
}
```

---

## Platform Upload (--upload flag)

When --upload --api-key KEY --org ORG_ID is provided:

POST to https://bastion-zeta.vercel.app/api/cli/scan with:
- Header: x-bastion-key (the API key)
- Body: full scan results JSON
- The API creates findings with source='cli' in the database
- Updates posture score
- Returns dashboard URL

This requires a corresponding API route in the main Bastion project:
- app/api/cli/scan/route.ts
- Validates API key
- Creates findings for the org
- Returns { success: true, dashboard_url: "..." }

---

## Test Project

Create bastion-cli/test-project/ with intentionally vulnerable files:

### test-project/src/lib/openai.ts
```typescript
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: "sk-proj-4jK8mN2xR5tY7uQ9wE1rT3yU5iO7pA9sD1fG3hJ5k" });
export default client;
```

### test-project/src/routes/chat.ts
```typescript
import client from '../lib/openai';

export async function handleChat(userInput: string) {
  const prompt = `You are a helpful assistant. Answer this question: ${userInput}`;
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }]
  });
  return response.choices[0].message.content;
}
```

### test-project/src/routes/analyze.ts
```typescript
import client from '../lib/openai';

interface UserData {
  name: string;
  email: string;
  phone: string;
  ssn: string;
}

export async function analyzeUser(userData: UserData) {
  const prompt = `Analyze this customer profile: Name: ${userData.name}, Email: ${userData.email}, Phone: ${userData.phone}, SSN: ${userData.ssn}`;
  const response = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });
  return response.choices[0].message.content;
}
```

### test-project/src/components/ChatResponse.tsx
```tsx
export function ChatResponse({ response }: { response: string }) {
  return <div dangerouslySetInnerHTML={{ __html: response }} />;
}
```

### test-project/src/agent/tools.ts
```typescript
export const agentTools = [
  { name: "searchDatabase", description: "Search the database", access: "read" },
  { name: "updateRecord", description: "Update a record", access: "write" },
  { name: "deleteDatabase", description: "Delete database tables", access: "write" },
  { name: "sendEmail", description: "Send email to any address", access: "external" },
  { name: "executeCode", description: "Execute arbitrary code", access: "system" },
  { name: "accessFileSystem", description: "Read and write files", access: "system" },
  { name: "makeHttpRequest", description: "Make HTTP requests", access: "external" },
  { name: "getWeather", description: "Get weather data", access: "read" },
  { name: "translateText", description: "Translate text", access: "read" },
  { name: "generateImage", description: "Generate an image", access: "read" },
  { name: "compressFile", description: "Compress a file", access: "system" },
  { name: "deployCode", description: "Deploy to production", access: "system" },
  { name: "modifyPermissions", description: "Change user permissions", access: "admin" },
  { name: "exportData", description: "Export all data", access: "read" }
];

// Only these are actually used in the codebase:
export const usedTools = ["searchDatabase", "getWeather", "translateText"];
```

### test-project/.env
```
OPENAI_API_KEY=sk-proj-4jK8mN2xR5tY7uQ9wE1rT3yU5iO7pA9sD1fG3hJ5k
DATABASE_URL=postgresql://admin:password123@db.example.com:5432/production
SECRET_KEY=my-super-secret-key-12345
```

### test-project/logs/requests.log
```
2026-03-17 14:23:01 POST /api/chat {"prompt": "Hello, my email is john@example.com"}
2026-03-17 14:23:02 POST /api/chat {"prompt": "Can you help me? Call me at 555-123-4567"}
2026-03-17 14:23:03 POST /api/analyze {"prompt": "User SSN: 123-45-6789, analyze spending"}
2026-03-17 14:23:04 POST /api/chat {"prompt": "What is AI?"}
2026-03-17 14:23:05 POST /api/chat {"prompt": "My card is 4111-1111-1111-1111 check balance"}
2026-03-17 14:23:06 POST /api/analyze {"prompt": "Contact sarah@corp.com about account 987-65-4321"}
2026-03-17 14:23:07 POST /api/chat {"prompt": "Tell me about machine learning"}
2026-03-17 14:23:08 POST /api/chat {"prompt": "Email me at test@test.com phone 555-987-6543"}
2026-03-17 14:23:09 POST /api/analyze {"prompt": "SSN 456-78-9012 needs review"}
2026-03-17 14:23:10 POST /api/chat {"prompt": "Process payment for card 5500-0000-0000-0004"}
2026-03-17 14:23:11 POST /api/chat {"prompt": "Normal question about weather"}
2026-03-17 14:23:12 POST /api/analyze {"prompt": "Patient record: SSN 789-01-2345, email doc@hospital.com"}
2026-03-17 14:23:13 POST /api/chat {"prompt": "How do I cook pasta?"}
2026-03-17 14:23:14 POST /api/chat {"prompt": "My number is 555-456-7890 call me back"}
2026-03-17 14:23:15 POST /api/analyze {"prompt": "Employee ID: 321-54-9876, salary review"}
2026-03-17 14:23:16 POST /api/chat {"prompt": "What is the capital of France?"}
2026-03-17 14:23:17 POST /api/chat {"prompt": "Send receipt to billing@company.com"}
2026-03-17 14:23:18 POST /api/analyze {"prompt": "Tax ID: 654-32-1098, filing status"}
2026-03-17 14:23:19 POST /api/chat {"prompt": "Explain quantum computing"}
2026-03-17 14:23:20 POST /api/chat {"prompt": "Credit card 4222-2222-2222-2222 dispute"}
```

NOTE: test-project/.gitignore intentionally does NOT include .env — this is a vulnerability the scanner should catch.

---

## CI/CD Integration Example

For the README, include this GitHub Actions example:

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
