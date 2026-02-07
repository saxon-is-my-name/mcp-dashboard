import * as vscode from 'vscode';

// Store output panel as singleton
let outputPanel: vscode.WebviewPanel | undefined;

class MCPViewProvider implements vscode.WebviewViewProvider {
	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext
	) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Register message handler
		webviewView.webview.onDidReceiveMessage(
			(message) => {
				if (message.type === 'executeCommand') {
					// Fire and forget - don't await
					this._handleExecuteCommand(message.server, message.command);
				}
			},
			undefined,
			this._context.subscriptions
		);
	}

	private async _handleExecuteCommand(server: string, command: string) {
		// Create or show output panel
		if (!outputPanel) {
			outputPanel = vscode.window.createWebviewPanel(
				'mcpOutput',
				'MCP Output',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [this._extensionUri],
					retainContextWhenHidden: true
				}
			);

			outputPanel.webview.html = this._getOutputPanelHtml(outputPanel.webview);

			// Clear reference when panel is disposed
			outputPanel.onDidDispose(() => {
				outputPanel = undefined;
			});
		} else {
			// Reveal existing panel
			outputPanel.reveal();
		}

		// Update panel title
		outputPanel.title = `${server} › ${command}`;

		// Send loading message
		outputPanel.webview.postMessage({
			type: 'loading',
			server: server,
			command: command
		});

		// Simulate command execution with delay
		await this._simulateCommandExecution(server, command);
	}

	private async _simulateCommandExecution(server: string, command: string) {
		// Simulate 2-second delay
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Generate mock output
		const mockOutput = `Command executed successfully!

Server: ${server}
Command: ${command}

Mock Output:
---
Status: OK
Response Time: 1234ms
Data: {
  "result": "success",
  "items": 42,
  "message": "Operation completed"
}`;

		// Send result to output panel
		if (outputPanel) {
			outputPanel.webview.postMessage({
				type: 'result',
				server: server,
				command: command,
				output: mockOutput,
				timestamp: new Date().toLocaleString()
			});
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the URI for the bundled webview script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js')
		);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
	<title>MCP Dashboard</title>
	<style>
		body {
			padding: 10px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-sideBar-background);
			font-size: var(--vscode-font-size);
			font-family: var(--vscode-font-family);
		}
		h2 {
			font-size: 13px;
			font-weight: 600;
			margin: 10px 0 5px 0;
			text-transform: uppercase;
			color: var(--vscode-foreground);
		}
		.server-list, .command-list {
			margin-bottom: 15px;
		}
		button {
			display: block;
			width: 100%;
			margin: 2px 0;
			padding: 6px 8px;
			background: var(--vscode-sideBarSectionHeader-background);
			color: var(--vscode-foreground);
			border: 1px solid transparent;
			cursor: pointer;
			text-align: left;
			border-radius: 2px;
			font-size: 12px;
		}
		button:hover {
			background: var(--vscode-list-hoverBackground);
		}
		button.selected {
			background: var(--vscode-list-activeSelectionBackground);
			color: var(--vscode-list-activeSelectionForeground);
			border-color: var(--vscode-focusBorder);
		}
		.server-name {
			font-weight: 500;
		}
		.server-address {
			font-size: 11px;
			opacity: 0.8;
			margin-top: 2px;
		}
		.command-name {
			font-weight: 500;
		}
		.command-description {
			font-size: 11px;
			opacity: 0.8;
			margin-top: 2px;
		}
	</style>
</head>
<body>
	<div id="root"></div>
	<script src="${scriptUri}"></script>
</body>
</html>`;
	}

	private _getOutputPanelHtml(webview: vscode.Webview) {
		// Get the URI for the bundled output panel script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'out', 'outputPanel.js')
		);

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
	<title>MCP Output</title>
	<style>
		body {
			padding: 20px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			font-size: var(--vscode-font-size);
			font-family: var(--vscode-font-family);
		}
		pre {
			background-color: var(--vscode-textCodeBlock-background);
			padding: 12px;
			border-radius: 4px;
			overflow-x: auto;
			font-family: var(--vscode-editor-font-family);
			font-size: var(--vscode-editor-font-size);
		}
		strong {
			color: var(--vscode-foreground);
			font-weight: 600;
		}
		em {
			color: var(--vscode-descriptionForeground);
			font-style: italic;
			font-size: 0.9em;
		}
	</style>
</head>
<body>
	<div id="root"></div>
	<script src="${scriptUri}"></script>
</body>
</html>`;
	}
}

let viewProvider: MCPViewProvider;

export function activate(context: vscode.ExtensionContext) {
	// Create and register the webview view provider
	viewProvider = new MCPViewProvider(context.extensionUri, context);
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('mcpView', viewProvider)
	);

	// Register command to focus the view
	const disposable = vscode.commands.registerCommand('mcp.showView', () => {
		vscode.commands.executeCommand('mcpView.focus');
	});

	context.subscriptions.push(disposable);

	// Return API for testing
	return {
		getViewProvider: () => viewProvider
	};
}

export function deactivate() {}
