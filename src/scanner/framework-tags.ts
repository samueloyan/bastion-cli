import { owaspIdsForScanner } from '../frameworks/owasp';
import { nistIdsForScanner } from '../frameworks/nist';
import { mitreIdsForScanner } from '../frameworks/mitre';
import type { FrameworkRefs } from '../types';

export function frameworksForScanner(scannerId: string): FrameworkRefs {
  return {
    owasp: owaspIdsForScanner(scannerId),
    nist: nistIdsForScanner(scannerId),
    mitre: mitreIdsForScanner(scannerId),
  };
}
