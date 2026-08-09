import * as vscode from 'vscode';
import { MakefileDiscovery } from './discovery';
import type { MakefileTarget } from './model';
import { splitArguments } from './parser';
import { createMakeTask, MakefileTaskProvider } from './tasks';
import { MakefileTreeProvider, targetFromArgument, type TargetNode } from './tree';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Make Tasks', { log: true });
  const discovery = new MakefileDiscovery(output);
  const treeProvider = new MakefileTreeProvider(context.extensionUri);
  const treeView = vscode.window.createTreeView('makefileTasks.targets', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  let refreshTimer: NodeJS.Timeout | undefined;
  const refresh = async (): Promise<void> => {
    try {
      const documents = await discovery.discover();
      treeProvider.setDocuments(documents);
      const count = documents.reduce((sum, document) => sum + document.targets.length, 0);
      await vscode.commands.executeCommand('setContext', 'makefileTasks.hasTargets', count > 0);
      treeView.message = count > 0 ? `${count} documented target${count === 1 ? '' : 's'}` : '';
      output.appendLine(`Discovered ${count} documented Makefile target${count === 1 ? '' : 's'}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.error(`Refresh failed: ${message}`);
      void vscode.window.showErrorMessage(`Make Tasks: ${message}`);
    }
  };

  const scheduleRefresh = (): void => {
    if (!vscode.workspace.getConfiguration('makefileTasks').get<boolean>('autoRefresh', true)) {
      return;
    }
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => void refresh(), 150);
  };

  const selectTarget = async (): Promise<MakefileTarget | undefined> => {
    const targets = treeProvider.getDocuments().flatMap((document) => document.targets);
    const sort = vscode.workspace.getConfiguration('makefileTasks').get<'source' | 'name'>('sort', 'source');
    const ordered = sort === 'name' ? [...targets].sort((a, b) => a.name.localeCompare(b.name)) : targets;
    const selected = await vscode.window.showQuickPick(
      ordered.map((target) => ({
        label: `$(play) ${target.name}`,
        description: target.description,
        detail: [
          target.usage ? `make ${target.name} ${target.usage}` : undefined,
          target.category,
          `${target.workspaceFolder.name}/${target.makefileRelativePath}`,
        ]
          .filter((value): value is string => Boolean(value))
          .join(' · '),
        target,
      })),
      { title: 'Run Makefile Target', matchOnDescription: true, matchOnDetail: true },
    );
    return selected?.target;
  };

  const resolveTarget = async (argument?: TargetNode | MakefileTarget): Promise<MakefileTarget | undefined> =>
    targetFromArgument(argument) ?? selectTarget();

  const runTarget = async (argument?: TargetNode | MakefileTarget, extraArgs: readonly string[] = []): Promise<void> => {
    const target = await resolveTarget(argument);
    if (!target) {
      return;
    }
    await vscode.tasks.executeTask(createMakeTask(target, extraArgs));
  };

  context.subscriptions.push(
    new vscode.Disposable(() => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = undefined;
      }
    }),
    output,
    treeView,
    vscode.tasks.registerTaskProvider('makefileTarget', new MakefileTaskProvider(() => treeProvider.getDocuments())),
    vscode.commands.registerCommand('makefileTasks.refresh', refresh),
    vscode.commands.registerCommand('makefileTasks.runTarget', runTarget),
    vscode.commands.registerCommand('makefileTasks.runTargetPicker', () => runTarget()),
    vscode.commands.registerCommand('makefileTasks.runTargetWithArgs', async (argument?: TargetNode | MakefileTarget) => {
      const target = await resolveTarget(argument);
      if (!target) {
        return;
      }
      const usage = target.usage ? `make ${target.name} ${target.usage}` : undefined;
      const input = await vscode.window.showInputBox({
        title: `Run make ${target.name}`,
        prompt: usage ? `Usage: ${usage}` : 'Additional make arguments or variable assignments',
        placeHolder: target.usage ?? 'FILE=path/to/file ENV=development --jobs 4',
      });
      if (input === undefined) {
        return;
      }
      try {
        await runTarget(target, splitArguments(input));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Make Tasks: ${message}`);
      }
    }),
    vscode.commands.registerCommand('makefileTasks.openTarget', async (argument?: TargetNode | MakefileTarget) => {
      const target = await resolveTarget(argument);
      if (!target) {
        return;
      }
      const document = await vscode.workspace.openTextDocument(target.makefileUri);
      const editor = await vscode.window.showTextDocument(document);
      const position = new vscode.Position(target.line, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      const known = treeProvider.getDocuments().some((item) => item.uri.toString() === document.uri.toString());
      if (known) {
        scheduleRefresh();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(scheduleRefresh),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('makefileTasks')) {
        treeProvider.setDocuments(treeProvider.getDocuments());
        void refresh();
      }
    }),
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/{Makefile,makefile,GNUmakefile,*.mk}');
  watcher.onDidChange(scheduleRefresh, undefined, context.subscriptions);
  watcher.onDidCreate(scheduleRefresh, undefined, context.subscriptions);
  watcher.onDidDelete(scheduleRefresh, undefined, context.subscriptions);
  context.subscriptions.push(watcher);

  void refresh();
}

export function deactivate(): void {}
