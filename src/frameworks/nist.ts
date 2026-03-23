export interface NistControl {
  id: string;
  name: string;
  scannerIds: string[];
}

/** NIST AI RMF-aligned catalog (17 controls) */
export const NIST_CONTROLS: NistControl[] = [
  { id: 'GOVERN 1.1', name: 'AI risk management policies', scannerIds: ['audit-logging'] },
  { id: 'GOVERN 1.2', name: 'Roles and responsibilities', scannerIds: [] },
  { id: 'GOVERN 2.1', name: 'Risk tolerance', scannerIds: [] },
  { id: 'MAP 1.1', name: 'Context and purpose', scannerIds: [] },
  { id: 'MAP 1.2', name: 'Interdependencies', scannerIds: [] },
  { id: 'MAP 1.3', name: 'Data privacy in AI', scannerIds: ['pii-exposure', 'log-analyzer'] },
  { id: 'MAP 2.1', name: 'Threat identification', scannerIds: ['prompt-injection', 'ai-deep'] },
  { id: 'MAP 2.2', name: 'Risks and impacts', scannerIds: [] },
  { id: 'MAP 3.1', name: 'Benefits mapping', scannerIds: [] },
  { id: 'MAP 4.1', name: 'Post-deployment monitoring plan', scannerIds: [] },
  { id: 'MEASURE 1.1', name: 'Appropriate methods', scannerIds: [] },
  { id: 'MEASURE 2.1', name: 'Performance assessment', scannerIds: [] },
  { id: 'MEASURE 2.2', name: 'Human-AI configuration', scannerIds: [] },
  {
    id: 'MEASURE 2.3',
    name: 'AI system testing',
    scannerIds: [
      'api-keys',
      'prompt-injection',
      'output-handling',
      'pii-exposure',
      'system-prompts',
      'tool-permissions',
      'rate-limiting',
      'audit-logging',
      'model-versions',
      'env-security',
      'log-analyzer',
      'ai-deep',
    ],
  },
  { id: 'MANAGE 1.1', name: 'Risk prioritization', scannerIds: [] },
  { id: 'MANAGE 3.2', name: 'Access controls', scannerIds: ['api-keys', 'tool-permissions', 'env-security'] },
  { id: 'MANAGE 4.1', name: 'Monitoring and logging', scannerIds: ['audit-logging'] },
];

export function nistIdsForScanner(scannerId: string): string[] {
  return NIST_CONTROLS.filter((c) => c.scannerIds.includes(scannerId)).map((c) => c.id);
}
