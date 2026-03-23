export interface MitreTechnique {
  id: string;
  name: string;
  scannerIds: string[];
}

export const MITRE_TECHNIQUES: MitreTechnique[] = [
  { id: 'T0001', name: 'Prompt injection', scannerIds: ['prompt-injection'] },
  { id: 'T0012', name: 'Evade ML logging', scannerIds: ['audit-logging'] },
  { id: 'T0024', name: 'Exfiltration via ML', scannerIds: ['pii-exposure', 'log-analyzer'] },
  { id: 'T0040', name: 'ML supply chain', scannerIds: ['api-keys', 'env-security'] },
  { id: 'T0051', name: 'LLM prompt injection', scannerIds: ['prompt-injection'] },
  { id: 'T0080', name: 'LLM plugin abuse', scannerIds: ['tool-permissions'] },
  { id: 'T0081', name: 'LLM data leakage', scannerIds: ['pii-exposure'] },
  { id: 'T0082', name: 'Model integrity', scannerIds: ['model-versions'] },
  { id: 'T0083', name: 'Resource exhaustion', scannerIds: ['rate-limiting'] },
  { id: 'T0084', name: 'Unsafe model output', scannerIds: ['output-handling'] },
  { id: 'T0085', name: 'Credential exposure', scannerIds: ['api-keys', 'env-security'] },
  { id: 'T0086', name: 'Agent over-permissioning', scannerIds: ['tool-permissions'] },
];

export function mitreIdsForScanner(scannerId: string): string[] {
  return MITRE_TECHNIQUES.filter((t) => t.scannerIds.includes(scannerId)).map((t) => t.id);
}
