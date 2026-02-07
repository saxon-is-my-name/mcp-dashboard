import * as vscode from 'vscode';

class MCPViewProvider implements vscode.WebviewViewProvider {
	constructor(private readonly _extensionUri: vscode.Uri) {}

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
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Mock data for servers and commands
		const servers = [
			{ name: 'Server1', host: '127.0.0.1', port: 8080 },
			{ name: 'Server2', host: '192.168.1.1', port: 9090 }
		];

		const commands = {
			'Server1': [
				{ name: 'status', description: 'Get status' },
				{ name: 'restart', description: 'Restart server' }
			],
			'Server2': [
				{ name: 'deploy', description: 'Deploy app' }
			]
		};

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
	<script>
		const servers = ${JSON.stringify(servers)};
		const commands = ${JSON.stringify(commands)};
		
		let selectedServer = servers[0]?.name || '';
		let selectedCommand = '';

		function render() {
			const root = document.getElementById('root');
			root.innerHTML = \`
				<div class="server-list">
					<h2>Servers</h2>
					\${servers.map(s => \`
						<button 
							class="\${selectedServer === s.name ? 'selected' : ''}" 
							onclick="selectServer('\${s.name}')"
						>
							<div class="server-name">\${s.name}</div>
							<div class="server-address">\${s.host}:\${s.port}</div>
						</button>
					\`).join('')}
				</div>
				<div class="command-list">
					<h2>Commands</h2>
					\${commands[selectedServer]?.map(c => \`
						<button 
							class="\${selectedCommand === c.name ? 'selected' : ''}"
							onclick="selectCommand('\${c.name}')"
						>
							<div class="command-name">\${c.name}</div>
							<div class="command-description">\${c.description}</div>
						</button>
					\`).join('') || '<p>No commands available</p>'}
				</div>
			\`;
		}

		function selectServer(name) {
			selectedServer = name;
			selectedCommand = '';
			render();
		}

		function selectCommand(name) {
			selectedCommand = name;
			render();
		}

		render();
	</script>
</body>
</html>`;
	}
}

let viewProvider: MCPViewProvider;

export function activate(context: vscode.ExtensionContext) {
	// Create and register the webview view provider
	viewProvider = new MCPViewProvider(context.extensionUri);
	
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
