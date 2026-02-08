/**
 * Generate HTML for the MCP Output panel
 */
export function getOutputPanelHtml(scriptUri: string, cspSource: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource};">
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
