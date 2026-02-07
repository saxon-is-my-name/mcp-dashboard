import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('mcp.showPanel', () => {
		console.log('mcp.showPanel command executed');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
