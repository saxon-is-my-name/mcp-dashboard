import * as vscode from 'vscode';

let currentPanel: vscode.WebviewPanel | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('mcp.showPanel', () => {
		// If we already have a panel, show it
		if (currentPanel) {
			currentPanel.reveal(vscode.ViewColumn.One);
			return;
		}

		// Otherwise, create a new panel
		currentPanel = vscode.window.createWebviewPanel(
			'mcpPanel',
			'MCP Dashboard',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);

		// Set the webview's initial html content
		currentPanel.webview.html = getWebviewContent();

		// Reset when the current panel is closed
		currentPanel.onDidDispose(
			() => {
				currentPanel = undefined;
			},
			null,
			context.subscriptions
		);
	});

	context.subscriptions.push(disposable);

	// Return API for testing
	return {
		getCurrentPanel
	};
}

export function deactivate() {
	if (currentPanel) {
		currentPanel.dispose();
	}
}

export function getCurrentPanel(): vscode.WebviewPanel | undefined {
	return currentPanel;
}

function getWebviewContent(): string {
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
			padding: 20px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
		}
		.server-list, .command-list {
			margin-bottom: 20px;
		}
		button {
			display: block;
			margin: 5px 0;
			padding: 10px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			cursor: pointer;
		}
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		button.selected {
			background: var(--vscode-button-secondaryBackground);
			border: 2px solid var(--vscode-focusBorder);
		}
	</style>
</head>
<body>
	<h1>MCP Dashboard</h1>
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
							<div>\${s.name}</div>
							<div>\${s.host}:\${s.port}</div>
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
							<div>\${c.name}</div>
							<div>\${c.description}</div>
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

