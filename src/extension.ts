import * as vscode from 'vscode';
import { MCPTool, ParsedMCPTool, GroupedMCPTools, ToolsUpdateMessage } from './types/mcpTool';
import { ToolResult, ToolResultSuccess, ToolResultError } from './types/toolResult';
import { WebviewToExtensionMessage } from './types/webviewMessages';
import { getWebviewHtml } from './templates/webviewTemplate';
import { getOutputPanelHtml } from './templates/outputPanelTemplate';

// Store output panel as singleton
let outputPanel: vscode.WebviewPanel | undefined;

// Store extension API for internal use and testing
let extensionApi: any;

/**
 * Fetch all available MCP tools from vscode.lm.tools
 */
async function getTools(): Promise<MCPTool[]> {
	try {
		// Check if vscode.lm.tools is available (VS Code 1.109+)
		if (!vscode.lm || !vscode.lm.tools) {
			console.warn('vscode.lm.tools API not available');
			return [];
		}

		const tools = vscode.lm.tools;
		
		// Convert to our MCPTool interface
		return tools.map((tool: any) => ({
			name: tool.name,
			description: tool.description || '',
			inputSchema: tool.inputSchema,
			tags: tool.tags
		}));
	} catch (error) {
		console.error('Error fetching tools from vscode.lm:', error);
		return [];
	}
}

/**
 * Parse a tool name to extract server and tool name
 * Tool names from vscode.lm.tools follow the pattern "serverName_toolName"
 */
function parseTool(tool: MCPTool): ParsedMCPTool {
	const parts = tool.name.split('_');
	let server = 'unknown';
	let toolName = tool.name;

	if (parts.length >= 2) {
		server = parts[0];
		toolName = parts.slice(1).join('_');
	}

	return {
		name: toolName,
		description: tool.description,
		server: server,
		fullName: tool.name,
		inputSchema: tool.inputSchema,
		tags: tool.tags
	};
}

/**
 * Group tools by server name
 */
async function getGroupedTools(): Promise<GroupedMCPTools> {
	const tools = await getTools();
	const grouped: GroupedMCPTools = {};

	for (const tool of tools) {
		const parsed = parseTool(tool);
		if (!grouped[parsed.server]) {
			grouped[parsed.server] = [];
		}
		grouped[parsed.server].push(parsed);
	}

	return grouped;
}

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

class MCPViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _cachedTools: GroupedMCPTools | null = null;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext
	) {}

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
			(message: WebviewToExtensionMessage) => {
				switch (message.type) {
					case 'executeCommand':
						// Fire and forget - don't await
						this._handleExecuteCommand(
							message.server,
							message.command,
							message.parameters || {}
						);
						break;
					case 'requestTools':
						// Handle tool request from webview (fallback mechanism)
						this._loadAndSendTools();
						break;
				}
			},
			undefined,
			this._context.subscriptions
		);

		// Register visibility change listener
		webviewView.onDidChangeVisibility(
			() => {
				// Only reload tools when webview becomes visible
				if (webviewView.visible && this._view) {
					// Send cached tools immediately if available
					if (this._cachedTools) {
						const message: ToolsUpdateMessage = {
							type: 'toolsUpdate',
							tools: this._cachedTools
						};
						this._view.webview.postMessage(message);
					}
					
					// Then refresh tools asynchronously
					this._loadAndSendTools();
				}
			},
			undefined,
			this._context.subscriptions
		);

		// Load and send tools to webview
		this._loadAndSendTools();
	}

	private async _loadAndSendTools() {
		try {
			const groupedTools = await getGroupedTools();
			
			// Cache the tools
			this._cachedTools = groupedTools;
			
			if (this._view) {
				const message: ToolsUpdateMessage = {
					type: 'toolsUpdate',
					tools: groupedTools
				};
				this._view.webview.postMessage(message);
			}
		} catch (error) {
			console.error('Error loading MCP tools:', error);
		}
	}

	private async _handleExecuteCommand(server: string, command: string, parameters: any = {}) {
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

		// Execute the tool using real VS Code API
		await this._executeToolWithRealAPI(server, command, parameters);
	}

	private async _executeToolWithRealAPI(server: string, command: string, parameters: any) {
		// Reconstruct full tool name (server_command format)
		const fullToolName = `${server}_${command}`;

		// Invoke the tool (use extensionApi if available for testing, otherwise local function)
		const result = await (extensionApi?.invokeTool || invokeTool)(fullToolName, parameters);

		// Format the result
		const formattedOutput = formatToolResult(result);

		// Send result to output panel
		if (outputPanel) {
			outputPanel.webview.postMessage({
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
			vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js')
		);

		return getWebviewHtml(scriptUri.toString(), webview.cspSource);
	}

	private _getOutputPanelHtml(webview: vscode.Webview) {
		// Get the URI for the bundled output panel script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'out', 'outputPanel.js')
		);

		return getOutputPanelHtml(scriptUri.toString(), webview.cspSource);
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
	extensionApi = {
		getViewProvider: () => viewProvider,
		getTools: getTools,
		getGroupedTools: getGroupedTools,
		invokeTool: invokeTool,
		formatToolResult: formatToolResult
	};
	
	return extensionApi;
}

export function deactivate() {}
