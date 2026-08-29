import * as path from 'node:path';
import { readFile, realpath } from 'node:fs/promises';
import { parseMakefile } from '../parser.js';

export interface MakeTargetsResult {
  readonly makefile: string;
  readonly targets: ReturnType<typeof parseMakefile>;
}

export function resolveMakefilePath(root: string, requestedPath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, requestedPath);
  const relativePath = path.relative(resolvedRoot, resolvedPath);

  if (path.isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${path.sep}`)) {
    throw new Error('The Makefile path must stay within the configured workspace root.');
  }

  return resolvedPath;
}

export async function listMakeTargets(root: string, requestedPath: string): Promise<MakeTargetsResult> {
  const resolvedRoot = await realpath(root);
  const requestedMakefilePath = resolveMakefilePath(resolvedRoot, requestedPath);
  const makefilePath = await realpath(requestedMakefilePath);
  resolveMakefilePath(resolvedRoot, makefilePath);
  const content = await readFile(makefilePath, 'utf8');
  const relativePath = path.relative(resolvedRoot, makefilePath) || path.basename(makefilePath);

  return {
    makefile: relativePath.split(path.sep).join('/'),
    targets: parseMakefile(content),
  };
}

