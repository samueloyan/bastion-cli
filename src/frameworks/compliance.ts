import { MITRE_TECHNIQUES } from './mitre';
import { NIST_CONTROLS } from './nist';
import { OWASP_CONTROLS } from './owasp';
import type { Finding, JsonControlCompliance, JsonTechniqueCompliance } from '../types';

export interface FrameworkComplianceBundle {
  owasp: { total: number; failing: number; controls: JsonControlCompliance[] };
  nist: { total: number; failing: number; controls: JsonControlCompliance[] };
  mitre: { total: number; failing: number; techniques: JsonTechniqueCompliance[] };
}

function failingScanners(findings: Finding[]): Set<string> {
  return new Set(findings.map((f) => f.scannerId));
}

function owaspPassing(control: (typeof OWASP_CONTROLS)[0], fail: Set<string>): boolean {
  if (control.scannerIds.length === 0) return true;
  return !control.scannerIds.some((id) => fail.has(id));
}

function nistPassing(control: (typeof NIST_CONTROLS)[0], fail: Set<string>, findings: Finding[]): boolean {
  if (control.id === 'MEASURE 2.3') return findings.length === 0;
  if (control.scannerIds.length === 0) return true;
  return !control.scannerIds.some((id) => fail.has(id));
}

function mitrePassing(tech: (typeof MITRE_TECHNIQUES)[0], fail: Set<string>): boolean {
  if (tech.scannerIds.length === 0) return true;
  return !tech.scannerIds.some((id) => fail.has(id));
}

export function buildFrameworkCompliance(findings: Finding[]): FrameworkComplianceBundle {
  const fail = failingScanners(findings);

  const owaspControls: JsonControlCompliance[] = OWASP_CONTROLS.map((c) => ({
    id: c.id,
    name: c.name,
    passing: owaspPassing(c, fail),
  }));

  const nistControls: JsonControlCompliance[] = NIST_CONTROLS.map((c) => ({
    id: c.id,
    name: c.name,
    passing: nistPassing(c, fail, findings),
  }));

  const mitreTechniques: JsonTechniqueCompliance[] = MITRE_TECHNIQUES.map((t) => ({
    id: t.id,
    name: t.name,
    passing: mitrePassing(t, fail),
  }));

  return {
    owasp: {
      total: owaspControls.length,
      failing: owaspControls.filter((c) => !c.passing).length,
      controls: owaspControls,
    },
    nist: {
      total: nistControls.length,
      failing: nistControls.filter((c) => !c.passing).length,
      controls: nistControls,
    },
    mitre: {
      total: mitreTechniques.length,
      failing: mitreTechniques.filter((t) => !t.passing).length,
      techniques: mitreTechniques,
    },
  };
}
