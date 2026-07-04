import * as path from 'path';
import * as vscode from 'vscode';

const copyWithContextCommand = 'extension.copyWithContext';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(copyWithContextCommand, copyWithContext)
  );
}

export function deactivate(): void {
  // No resources to dispose.
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
