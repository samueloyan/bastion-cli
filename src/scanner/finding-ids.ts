import type { Severity } from '../types';

function prefix(sev: Severity): string {
  switch (sev) {
    case 'critical':
      return 'CRIT';
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MED';
    case 'low':
      return 'LOW';
  }
}

export function createIdGenerator(): (sev: Severity) => string {
  const counts: Record<string, number> = {};
  return (sev: Severity) => {
    const p = prefix(sev);
    counts[p] = (counts[p] ?? 0) + 1;
    return `${p}-${String(counts[p]).padStart(3, '0')}`;
  };
}
