import * as vscode from 'vscode';
import { ParsedMCPTool } from '../types/mcpTool';
import { WebviewToExtensionMessage } from '../types/webviewMessages';
import { ToolResult } from '../types/toolResult';
import { getToolDetailHtml } from '../templates/toolDetailTemplate';
import { getOutputPanelHtml } from '../templates/outputPanelTemplate';

/**
 * WebviewViewProvider for displaying tool details
 */
export class ToolDetailProvider implements vscode.WebviewViewProvider, vscode.Disposable {
	private _view?: vscode.WebviewView;
	private _outputPanel?: vscode.WebviewPanel;
	private _selectionSubscription: vscode.Disposable;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext,
		private readonly onToolChange: vscode.Event<ParsedMCPTool>,
		private readonly invokeTool: (
			tool: ParsedMCPTool,
			parameters: Record<string, unknown>
		) => Promise<ToolResult>
	) {
		// Subscribe to selection changes from coordination service
		this._selectionSubscription = this.onToolChange((tool) => {
			this.showToolDetail(tool);
		});
	}

	/**
	 * Dispose of resources and clean up subscriptions
	 */
	dispose(): void {
		this._selectionSubscription.dispose();
		if (this._outputPanel) {
			this._outputPanel.dispose();
			this._outputPanel = undefined;
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Register message handler with type-safe message handling
		webviewView.webview.onDidReceiveMessage(
			async (message: WebviewToExtensionMessage) => {
				switch (message.type) {
					case 'executeCommand':
						// Await execution to ensure tests can verify completion
						await this._handleExecuteCommand(message.tool, message.parameters || {});
						break;
					case 'focusTree':
						// Focus the tree view when requested from webview
						vscode.commands.executeCommand('mcpToolTree.focus');
						break;
				}
			},
			undefined,
			this._context.subscriptions //todo should this be the passed context or the this? or should we assign the passed context to this._context in the constructor?
		);
	}

	/**
	 * Show tool details in the webview
	 */
	public async showToolDetail(tool?: ParsedMCPTool) {
		if (!this._view) {
			return;
		}

		// If no tool, send empty state
		if (!tool) {
			this._view.webview.postMessage({
				type: 'toolDetailUpdate',
				tool: undefined,
			});
			return;
		}

		// todo pretty sure this loading stuff is pointless
		// Send loading state first
		this._view.webview.postMessage({
			type: 'toolDetailUpdate',
			tool: tool,
			loading: true,
		});

		// Send final tool details
		this._view.webview.postMessage({
			type: 'toolDetailUpdate',
			tool: tool,
		});
	}

	private async _handleExecuteCommand(
		tool: ParsedMCPTool,
		parameters: Record<string, unknown> = {}
	) {
		// Notify webview that execution is starting
		if (this._view) {
			this._view.webview.postMessage({
				type: 'executionStateUpdate',
				executing: true,
			});
		}

		// Create or show output panel
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

		// Send loading message
		this._outputPanel.webview.postMessage({
			type: 'loading',
			server: tool.server,
			command: tool.name,
		});

		const result = await this.invokeTool(tool, parameters);

		// Notify webview that execution is complete
		if (this._view) {
			this._view.webview.postMessage({
				type: 'executionStateUpdate',
				executing: false,
			});
		}

		// Format the result
		const formattedOutput = JSON.stringify(result, null, 2);

		// Send result to output panel
		if (this._outputPanel) {
			this._outputPanel.webview.postMessage({
				type: 'result',
				server: tool.server,
				command: tool.name,
				output: formattedOutput,
				result: result,
				timestamp: new Date().toLocaleString(),
			});
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the URI for the bundled webview script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'out', 'toolDetail.js')
		);

		return getToolDetailHtml(scriptUri.toString(), webview.cspSource);
	}

	private _getOutputPanelHtml(webview: vscode.Webview) {
		// Get the URI for the bundled output panel script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'out', 'outputPanel.js')
		);

		return getOutputPanelHtml(scriptUri.toString(), webview.cspSource);
	}
}
