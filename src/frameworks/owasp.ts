/** OWASP LLM Top 10 — control id → scanners that must pass (no findings) for that control */
export interface OwaspControl {
  id: string;
  name: string;
  scannerIds: string[];
}

export const OWASP_CONTROLS: OwaspControl[] = [
  {
    id: 'LLM01',
    name: 'Prompt Injection',
    scannerIds: ['prompt-injection', 'system-prompts', 'ai-deep'],
  },
  { id: 'LLM02', name: 'Insecure Output Handling', scannerIds: ['output-handling'] },
  { id: 'LLM03', name: 'Training Data Poisoning', scannerIds: [] },
  { id: 'LLM04', name: 'Model Denial of Service', scannerIds: ['rate-limiting'] },
  { id: 'LLM05', name: 'Supply Chain Vulnerabilities', scannerIds: ['api-keys', 'model-versions', 'env-security'] },
  { id: 'LLM06', name: 'Sensitive Information Disclosure', scannerIds: ['pii-exposure', 'log-analyzer'] },
  { id: 'LLM07', name: 'Insecure Plugin Design', scannerIds: ['tool-permissions'] },
  { id: 'LLM08', name: 'Excessive Agency', scannerIds: ['tool-permissions'] },
  { id: 'LLM09', name: 'Overreliance', scannerIds: [] },
  { id: 'LLM10', name: 'Model Theft', scannerIds: [] },
];

export function owaspIdsForScanner(scannerId: string): string[] {
  return OWASP_CONTROLS.filter((c) => c.scannerIds.includes(scannerId)).map((c) => c.id);
}
