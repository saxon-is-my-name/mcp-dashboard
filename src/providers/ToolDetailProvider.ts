import * as vscode from 'vscode';
import { ParsedMCPTool } from '../types/mcpTool';
import {
	WebviewToExtensionMessage,
	ToolDetailUpdateMessage,
	ExecutionStateUpdateMessage,
} from '../types/webviewMessages';
import { ToolResult } from '../types/toolResult';
import { getToolDetailHtml } from '../templates/toolDetailTemplate';
import { OutputPanelProvider } from './OutputPanelProvider';

/**
 * WebviewViewProvider for displaying tool details
 */
export class ToolDetailProvider implements vscode.WebviewViewProvider, vscode.Disposable {
	private _view?: vscode.WebviewView;
	private _selectionSubscription: vscode.Disposable;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext,
		private readonly onToolChange: vscode.Event<ParsedMCPTool>,
		private readonly invokeTool: (
			tool: ParsedMCPTool,
			parameters: Record<string, unknown>
		) => Promise<ToolResult>,
		private readonly outputPanelProvider: OutputPanelProvider
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
			// Add to extension context subscriptions for proper cleanup
			this._context.subscriptions
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
			const message: ToolDetailUpdateMessage = {
				type: 'toolDetailUpdate',
				tool: undefined,
			};
			this._view.webview.postMessage(message);
			return;
		}

		// Send tool details
		const message: ToolDetailUpdateMessage = {
			type: 'toolDetailUpdate',
			tool: tool,
		};
		this._view.webview.postMessage(message);
	}

	private async _handleExecuteCommand(
		tool: ParsedMCPTool,
		parameters: Record<string, unknown> = {}
	) {
		// Notify webview that execution is starting
		if (this._view) {
			const message: ExecutionStateUpdateMessage = {
				type: 'executionStateUpdate',
				executing: true,
			};
			this._view.webview.postMessage(message);
		}

		// Show output panel and send loading message
		this.outputPanelProvider.showOutputPanel(tool);
		this.outputPanelProvider.sendLoadingMessage(tool);

		const result = await this.invokeTool(tool, parameters);

		// Notify webview that execution is complete
		if (this._view) {
			const message: ExecutionStateUpdateMessage = {
				type: 'executionStateUpdate',
				executing: false,
			};
			this._view.webview.postMessage(message);
		}

		// Send result to output panel
		this.outputPanelProvider.sendResultMessage(tool, result);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the URI for the bundled webview script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'out', 'toolDetail.js')
		);

		return getToolDetailHtml(scriptUri.toString(), webview.cspSource);
	}
}
