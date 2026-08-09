import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

type ExtensionManifest = {
  name: string;
  publisher: string;
};

function extensionIdFromManifest(): string {
  const manifestPath = path.resolve(__dirname, '../../../../package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ExtensionManifest;
  return `${manifest.publisher}.${manifest.name}`;
}

suite('Make Tasks extension', () => {
  test('activates and contributes documented Make Tasks', async () => {
    const extension = vscode.extensions.getExtension(extensionIdFromManifest());
    assert.ok(extension, 'Extension should be available in the development host.');

    await extension.activate();
    await vscode.commands.executeCommand('makefileTasks.refresh');

    const tasks = await vscode.tasks.fetchTasks({ type: 'makefileTarget' });
    assert.ok(tasks.some((task) => task.name === 'build'), 'Expected the documented build target.');
  });

  test('registers the public commands declared by the manifest', async () => {
    const commands = new Set(await vscode.commands.getCommands(true));
    for (const command of [
      'makefileTasks.refresh',
      'makefileTasks.runTarget',
      'makefileTasks.runTargetWithArgs',
      'makefileTasks.runTargetPicker',
      'makefileTasks.openTarget',
    ]) {
      assert.ok(commands.has(command), `Expected command ${command} to be registered.`);
    }
  });
});
