import * as fs from 'fs';
import type { Finding, ScanResult } from '../types';
import { ensureBastionDir, bastionPath } from '../utils/bastion-local';

export interface LastScanFile {
  directory: string;
  scanDate: string;
  score: number;
  scoreLabel: string;
  findings: Finding[];
}

export function saveLastScan(result: ScanResult): void {
  ensureBastionDir(result.directory);
  const payload: LastScanFile = {
    directory: result.directory,
    scanDate: result.scanDate,
    score: result.score,
    scoreLabel: result.scoreLabel,
    findings: result.findings,
  };
  fs.writeFileSync(bastionPath(result.directory, 'last-scan.json'), JSON.stringify(payload, null, 2), 'utf8');
}

export function loadLastScan(scanRoot: string): LastScanFile | null {
  try {
    const raw = fs.readFileSync(bastionPath(scanRoot, 'last-scan.json'), 'utf8');
    return JSON.parse(raw) as LastScanFile;
  } catch {
    return null;
  }
}
