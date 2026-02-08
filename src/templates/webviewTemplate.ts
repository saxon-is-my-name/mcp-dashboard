/**
 * Generate HTML for the main MCP Dashboard webview
 */
export function getWebviewHtml(scriptUri: string, cspSource: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource};">
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
