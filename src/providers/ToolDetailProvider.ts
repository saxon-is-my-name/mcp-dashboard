import * as vscode from 'vscode';
import { ParsedMCPTool } from '../types/mcpTool';
import { WebviewToExtensionMessage } from '../types/webviewMessages';
import { ToolResult } from '../types/toolResult';
import { getToolDetailHtml } from '../templates/toolDetailTemplate';
import { getOutputPanelHtml } from '../templates/outputPanelTemplate';
import { ToolCoordinationService } from '../services/ToolCoordinationService';

/**
 * Invoke an MCP tool using vscode.lm.invokeTool API
 */
async function invokeTool(toolName: string, parameters: any): Promise<ToolResult> {
	const startTime = Date.now();
	const tokenSource = new vscode.CancellationTokenSource();
	
	try {
		// Check if vscode.lm API is available
		if (!vscode.lm || !vscode.lm.invokeTool) {
			return {
				success: false,
				error: 'vscode.lm.invokeTool API not available',
				toolName: toolName,
				executionTime: Date.now() - startTime
			};
		}

		// Find the tool to get its invocation options
		const tools = vscode.lm.tools;
		const tool = tools.find((t: any) => t.name === toolName);
		
		if (!tool) {
			return {
				success: false,
				error: `Tool '${toolName}' not found`,
				toolName: toolName,
				executionTime: Date.now() - startTime
			};
		}

		// Create invocation options
		const options = {
			toolInvocationToken: undefined, // Not in a chat context
			input: parameters
		};

		// Invoke the tool with cancellation token
		const result = await vscode.lm.invokeTool(toolName, options, tokenSource.token);

		// Parse the result
		let data: any;
		if (typeof result === 'object' && result !== null) {
			data = result;
		} else if (typeof result === 'string') {
			try {
				data = JSON.parse(result);
			} catch {
				data = result;
			}
		} else {
			data = result;
		}

		return {
			success: true,
			data: data,
			toolName: toolName,
			executionTime: Date.now() - startTime
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
			toolName: toolName,
			executionTime: Date.now() - startTime
		};
	} finally {
		tokenSource.dispose();
	}
}

/**
 * Format a tool result for display
 */
function formatToolResult(result: ToolResult): string {
	const lines: string[] = [];
	
	if (result.success) {
		lines.push('✅ Tool execution successful');
		lines.push('');
		lines.push('Result:');
		lines.push('---');
		
		// Format the data
		if (typeof result.data === 'object' && result.data !== null) {
			lines.push(JSON.stringify(result.data, null, 2));
		} else {
			lines.push(String(result.data));
		}
	} else {
		lines.push('❌ Tool execution failed');
		lines.push('');
		lines.push('Error:');
		lines.push('---');
		lines.push(result.error);
	}
	
	if (result.executionTime !== undefined) {
		lines.push('');
		lines.push(`Execution time: ${result.executionTime}ms`);
	}
	
	return lines.join('\n');
}

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
		private readonly _coordinationService: ToolCoordinationService
	) {
		// Subscribe to selection changes from coordination service
		this._selectionSubscription = this._coordinationService.onSelectionChanged((tool) => {
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
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;
		
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Register message handler with type-safe message handling
		webviewView.webview.onDidReceiveMessage(
			async (message: WebviewToExtensionMessage) => {
				switch (message.type) {
					case 'executeCommand':
						// Await execution to ensure tests can verify completion
						await this._handleExecuteCommand(
							message.server,
							message.command,
							message.parameters || {}
						);
						break;
				}
			},
			undefined,
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
			this._view.webview.postMessage({
				type: 'toolDetailUpdate',
				tool: undefined
			});
			return;
		}

		// Send loading state first
		this._view.webview.postMessage({
			type: 'toolDetailUpdate',
			tool: tool,
			loading: true
		});

		// For now, we already have the full tool details (inputSchema)
		// In a real implementation, we might fetch additional details here
		// Simulate async fetch with a small delay
		await new Promise(resolve => setTimeout(resolve, 100));

		// Send final tool details
		this._view.webview.postMessage({
			type: 'toolDetailUpdate',
			tool: tool
		});
	}

	private async _handleExecuteCommand(server: string, command: string, parameters: any = {}) {
		// Create or show output panel
		if (!this._outputPanel) {
			this._outputPanel = vscode.window.createWebviewPanel(
				'mcpOutput',
				'MCP Output',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [this._extensionUri],
					retainContextWhenHidden: true
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
		this._outputPanel.title = `${server} › ${command}`;

		// Send loading message
		this._outputPanel.webview.postMessage({
			type: 'loading',
			server: server,
			command: command
		});

		// Execute the tool using real VS Code API
		await this._executeToolWithRealAPI(server, command, parameters);
	}

	private async _executeToolWithRealAPI(server: string, command: string, parameters: any) {
		// Reconstruct full tool name (server_command format)
		const fullToolName = `${server}_${command}`;

		// Invoke the tool
		const result = await invokeTool(fullToolName, parameters);

		// Format the result
		const formattedOutput = formatToolResult(result);

		// Send result to output panel
		if (this._outputPanel) {
			this._outputPanel.webview.postMessage({
				type: 'result',
				server: server,
				command: command,
				output: formattedOutput,
				result: result,
				timestamp: new Date().toLocaleString()
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
