import * as fs from 'fs';
import * as path from 'path';

export const BASTION_DIR = '.bastion';

export function bastionPath(scanRoot: string, ...parts: string[]): string {
  return path.join(scanRoot, BASTION_DIR, ...parts);
}

export function ensureBastionDir(scanRoot: string): string {
  const dir = path.join(scanRoot, BASTION_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
