import * as parser from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as fs from 'fs';

const traverse: typeof traverseModule = (traverseModule as { default?: typeof traverseModule }).default ?? traverseModule;

export type BabelNode = Parameters<typeof traverse>[0];

export function parseJsTs(filePath: string, code: string): BabelNode | null {
  const isTs = /\.tsx?$/i.test(filePath);
  const isJsx = /\.[jt]sx$/i.test(filePath);
  try {
    return parser.parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      errorRecovery: true,
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'topLevelAwait',
      ],
    }) as BabelNode;
  } catch {
    return null;
  }
}

export function parseFileAst(filePath: string): BabelNode | null {
  let code: string;
  try {
    code = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  return parseJsTs(filePath, code);
}

export { traverse };
