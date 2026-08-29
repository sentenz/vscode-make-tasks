import * as os from 'node:os';
import * as path from 'node:path';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { listMakeTargets, resolveMakefilePath } from '../src/mcp/target-service.mjs';

describe('MCP target service', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
  });

  async function createWorkspace(makefile: string): Promise<string> {
    const workspace = await mkdtemp(path.join(os.tmpdir(), 'make-tasks-mcp-'));
    temporaryDirectories.push(workspace);
    await writeFile(path.join(workspace, 'Makefile'), makefile, 'utf8');
    return workspace;
  }

  it('lists documented targets with structured metadata', async () => {
    const workspace = await createWorkspace(`# === Build ===
# Usage: make build MODE=<mode>
## Build the project
build:
`);

    await expect(listMakeTargets(workspace, 'Makefile')).resolves.toEqual({
      makefile: 'Makefile',
      targets: [{
        name: 'build',
        description: 'Build the project',
        usage: 'MODE=<mode>',
        category: 'Build',
        line: 3,
      }],
    });
  });

  it('rejects paths that escape the configured workspace root', () => {
    const workspace = path.resolve('workspace');

    expect(() => resolveMakefilePath(workspace, '../Makefile')).toThrow(
      'The Makefile path must stay within the configured workspace root.',
    );
    expect(() => resolveMakefilePath(workspace, path.parse(workspace).root)).toThrow(
      'The Makefile path must stay within the configured workspace root.',
    );
  });

  it('rejects symbolic links that resolve outside the workspace root', async () => {
    const workspace = await createWorkspace('build: ## Build the project\n');
    const externalDirectory = await mkdtemp(path.join(os.tmpdir(), 'make-tasks-external-'));
    temporaryDirectories.push(externalDirectory);
    await writeFile(path.join(externalDirectory, 'Makefile'), 'external: ## External target\n', 'utf8');
    await symlink(externalDirectory, path.join(workspace, 'external'), 'junction');

    await expect(listMakeTargets(workspace, 'external/Makefile')).rejects.toThrow(
      'The Makefile path must stay within the configured workspace root.',
    );
  });

  it('surfaces file-system errors to the MCP handler boundary', async () => {
    const workspace = await createWorkspace('build: ## Build the project\n');

    await expect(listMakeTargets(workspace, 'missing.mk')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

