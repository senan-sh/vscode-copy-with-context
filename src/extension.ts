import * as path from 'path';
import * as vscode from 'vscode';

const copyWithContextCommand = 'extension.copyWithContext';
const supportedDocumentSelectors: vscode.DocumentSelector = [{ scheme: 'file' }, { scheme: 'untitled' }];

export function activate(context: vscode.ExtensionContext): void {
  const statusBarItem = createCopyWithContextStatusBarItem();

  context.subscriptions.push(
    vscode.commands.registerCommand(copyWithContextCommand, copyWithContext),
    vscode.languages.registerCodeActionsProvider(
      supportedDocumentSelectors,
      new CopyWithContextCodeActionProvider(),
      {
        providedCodeActionKinds: CopyWithContextCodeActionProvider.providedCodeActionKinds
      }
    ),
    vscode.languages.registerHoverProvider(supportedDocumentSelectors, new CopyWithContextHoverProvider()),
    vscode.window.onDidChangeTextEditorSelection(() => {
      updateCopyWithContextStatusBarItem(statusBarItem);
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateCopyWithContextStatusBarItem(statusBarItem);
    }),
    statusBarItem
  );

  updateCopyWithContextStatusBarItem(statusBarItem);
}

export function deactivate(): void {
  // No resources to dispose.
}

class CopyWithContextCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.RefactorExtract];

  provideCodeActions(
    _document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): vscode.CodeAction[] {
    if (range.isEmpty) {
      return [];
    }

    const action = new vscode.CodeAction('Copy with context', vscode.CodeActionKind.RefactorExtract);
    action.command = {
      command: copyWithContextCommand,
      title: 'Copy with context'
    };
    action.isPreferred = true;

    return [action];
  }
}

class CopyWithContextHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const editor = vscode.window.activeTextEditor;

    if (
      !editor ||
      editor.document.uri.toString() !== document.uri.toString() ||
      editor.selection.isEmpty ||
      !editor.selection.contains(position)
    ) {
      return undefined;
    }

    const contents = new vscode.MarkdownString(
      `[$(copy) Copy with context](command:${copyWithContextCommand})`
    );
    contents.isTrusted = true;
    contents.supportThemeIcons = true;

    return new vscode.Hover(contents, editor.selection);
  }
}

function createCopyWithContextStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = copyWithContextCommand;
  statusBarItem.text = '$(copy) Copy with context';
  statusBarItem.tooltip = 'Copy selected code with file and line context';
  return statusBarItem;
}

function updateCopyWithContextStatusBarItem(statusBarItem: vscode.StatusBarItem): void {
  const editor = vscode.window.activeTextEditor;

  if (editor && !editor.selection.isEmpty) {
    statusBarItem.show();
    return;
  }

  statusBarItem.hide();
}

async function copyWithContext(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage('Copy with context requires an active editor.');
    return;
  }

  const { document, selection } = editor;

  if (selection.isEmpty) {
    vscode.window.showWarningMessage('Select code before running Copy with context.');
    return;
  }

  const selectedCode = document.getText(selection);
  const formattedText = formatSelectionWithContext(document, selection, selectedCode);

  await vscode.env.clipboard.writeText(formattedText);
  vscode.window.showInformationMessage('Copied selection with file and line context.');
}

function formatSelectionWithContext(
  document: vscode.TextDocument,
  selection: vscode.Selection,
  selectedCode: string
): string {
  const filePath = getDisplayPath(document);
  const { startLine, endLine } = getSelectedLineRange(selection);
  const languageId = document.languageId || 'text';

  return [
    `File: ${filePath}`,
    `Lines: ${startLine}-${endLine}`,
    '',
    `\`\`\`${languageId}`,
    selectedCode,
    '```'
  ].join('\n');
}

function getDisplayPath(document: vscode.TextDocument): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  if (workspaceFolder && document.uri.scheme === 'file') {
    const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath);
    return normalizePathSeparators(relativePath);
  }

  if (document.uri.scheme === 'file' && document.uri.fsPath) {
    return normalizePathSeparators(document.uri.fsPath);
  }

  return document.uri.toString();
}

function getSelectedLineRange(selection: vscode.Selection): { startLine: number; endLine: number } {
  let endLine = selection.end.line;

  if (selection.end.character === 0 && selection.end.line > selection.start.line) {
    endLine -= 1;
  }

  return {
    startLine: selection.start.line + 1,
    endLine: endLine + 1
  };
}

function normalizePathSeparators(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
