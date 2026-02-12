import * as vscode from 'vscode';
import { ParsedMCPTool } from '../types/mcpTool';
import { ToolResult, ToolLoadingMessage, ToolResultMessage } from '../types/toolResult';
import { getOutputPanelHtml } from '../templates/outputPanelTemplate';

/**
 * Provider for managing the MCP tool output panel.
 * Handles the creation, display, and messaging for tool execution results.
 */
export class OutputPanelProvider implements vscode.Disposable {
	private _outputPanel?: vscode.WebviewPanel;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	/**
	 * Dispose of the output panel if it exists
	 */
	dispose(): void {
		if (this._outputPanel) {
			this._outputPanel.dispose();
			this._outputPanel = undefined;
		}
	}

	/**
	 * Show the output panel for a tool execution.
	 * Creates the panel if it doesn't exist, or reveals it if it does.
	 */
	public showOutputPanel(tool: ParsedMCPTool): void {
		if (!this._outputPanel) {
			this._outputPanel = vscode.window.createWebviewPanel(
				'mcpOutput',
				'MCP Output',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [this._extensionUri],
					retainContextWhenHidden: true,
				}
			);

			this._outputPanel.webview.html = this._getOutputPanelHtml(this._outputPanel.webview);

			// Clear reference when panel is disposed
			this._outputPanel.onDidDispose(() => {
				this._outputPanel = undefined;
			});
		} else {
			// Reveal existing panel
			this._outputPanel.reveal();
		}

		// Update panel title
		this._outputPanel.title = `${tool.server} › ${tool.name}`;
	}

	/**
	 * Send a loading message to the output panel
	 */
	public sendLoadingMessage(tool: ParsedMCPTool): void {
		if (!this._outputPanel) {
			return;
		}

		const loadingMessage: ToolLoadingMessage = {
			type: 'loading',
			server: tool.server,
			command: tool.name,
		};
		this._outputPanel.webview.postMessage(loadingMessage);
	}

	/**
	 * Send a result message to the output panel
	 */
	public sendResultMessage(tool: ParsedMCPTool, result: ToolResult): void {
		if (!this._outputPanel) {
			return;
		}

		const formattedOutput = JSON.stringify(result, null, 2);

		const resultMessage: ToolResultMessage = {
			type: 'result',
			server: tool.server,
			command: tool.name,
			output: formattedOutput,
			result: result,
			timestamp: new Date().toLocaleString(),
		};
		this._outputPanel.webview.postMessage(resultMessage);
	}

	private _getOutputPanelHtml(webview: vscode.Webview): string {
		// Get the URI for the bundled output panel script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'out', 'outputPanel.js')
		);

		return getOutputPanelHtml(scriptUri.toString(), webview.cspSource);
	}
}
