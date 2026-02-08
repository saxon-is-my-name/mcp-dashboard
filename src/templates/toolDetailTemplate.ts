/**
 * Generate HTML for the Tool Detail webview
 */
export function getToolDetailHtml(scriptUri: string, cspSource: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource};">
	<title>Tool Details</title>
	<style>
		body {
			padding: 10px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-sideBar-background);
			font-size: var(--vscode-font-size);
			font-family: var(--vscode-font-family);
		}
		
		.empty-state, .loading-state {
			padding: 20px;
			text-align: center;
			color: var(--vscode-descriptionForeground);
		}
		
		.tool-header {
			margin-bottom: 15px;
			border-bottom: 1px solid var(--vscode-panel-border);
			padding-bottom: 10px;
		}
		
		.tool-name {
			font-size: 14px;
			font-weight: 600;
			margin-bottom: 5px;
		}
		
		.tool-server {
			font-size: 11px;
			color: var(--vscode-descriptionForeground);
			margin-bottom: 8px;
		}
		
		.tool-description {
			font-size: 12px;
			color: var(--vscode-foreground);
			line-height: 1.4;
		}
		
		.parameters-section {
			margin-top: 15px;
		}
		
		.parameters-section h3 {
			font-size: 12px;
			font-weight: 600;
			margin-bottom: 10px;
			text-transform: uppercase;
		}
		
		label {
			display: block;
			font-size: 11px;
			margin-bottom: 4px;
			color: var(--vscode-foreground);
		}
		
		input[type="text"],
		input[type="number"],
		textarea,
		select {
			width: 100%;
			padding: 4px 8px;
			margin-bottom: 10px;
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			font-size: 12px;
			font-family: var(--vscode-font-family);
			box-sizing: border-box;
		}
		
		input[type="checkbox"] {
			margin-right: 6px;
		}
		
		input:focus,
		textarea:focus,
		select:focus {
			outline: 1px solid var(--vscode-focusBorder);
		}
		
		textarea {
			min-height: 60px;
			resize: vertical;
			font-family: var(--vscode-editor-font-family);
		}
		
		.parameter-description {
			font-size: 10px;
			color: var(--vscode-descriptionForeground);
			margin-top: -8px;
			margin-bottom: 10px;
		}
		
		.validation-error {
			color: var(--vscode-errorForeground);
			font-size: 10px;
			margin-top: -8px;
			margin-bottom: 10px;
		}
		
		button {
			width: 100%;
			padding: 6px 12px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			cursor: pointer;
			font-size: 12px;
			border-radius: 2px;
		}
		
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		
		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	</style>
</head>
<body>
	<div id="root"></div>
	<script src="${scriptUri}"></script>
</body>
</html>`;
}
