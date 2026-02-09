import * as vscode from 'vscode';
import { GroupedMCPTools, MCPTool, ParsedMCPTool } from './types/mcpTool';
import { ToolResult } from './types/toolResult';

import { registerFindToolsCommand } from './commands/findTools';
import { ToolDetailProvider } from './providers/ToolDetailProvider';
import { ToolTreeProvider } from './providers/ToolTreeProvider';
import { ToolCoordinationService } from './services/ToolCoordinationService';

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
 * TODO: Try and guess server name if it contains a TLD e.g "mcp_com_atlassian_toolName" -> server: "mcp.com.atlassian", toolName: "toolName"
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

let treeProvider: ToolTreeProvider;
let detailProvider: ToolDetailProvider;
let coordinationService: ToolCoordinationService;

export function activate(context: vscode.ExtensionContext) {
	// Set initial context for filter state
	vscode.commands.executeCommand('setContext', 'mcp.filterActive', false);
	
	// Create coordination service
	coordinationService = new ToolCoordinationService(context);
	context.subscriptions.push(coordinationService);

	// Create tree provider
	treeProvider = new ToolTreeProvider(coordinationService);
	context.subscriptions.push(treeProvider);
	
	// Create tree view with description support
	const treeView = vscode.window.createTreeView('mcpToolTree', {
		treeDataProvider: treeProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(treeView);
	
	// Pass tree view to provider so it can update description
	treeProvider.setTreeView(treeView);

	// Create detail provider
	detailProvider = new ToolDetailProvider(context.extensionUri, context, coordinationService);
	context.subscriptions.push(detailProvider);
	
	// Register detail webview
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('mcpToolDetail', detailProvider)
	);

	// Register find tools command
	context.subscriptions.push(
		registerFindToolsCommand(treeProvider)
	);
	
	// Register clear filter command
	context.subscriptions.push(
		vscode.commands.registerCommand('mcp.clearFilter', async () => {
			await treeProvider.setFilterQuery('');
		})
	);

	// Fetch and refresh tree with tools
	getGroupedTools().then(tools => {
		treeProvider.refresh(tools);
	}).catch(error => {
		console.error('Error loading initial tools:', error);
	});

	// Return API for testing
	extensionApi = {
		getTreeProvider: () => treeProvider,
		getDetailProvider: () => detailProvider,
		getCoordinationService: () => coordinationService,
		getTools: getTools,
		getGroupedTools: getGroupedTools,
		invokeTool: invokeTool,
		formatToolResult: formatToolResult
	};
	
	return extensionApi;
}

export function deactivate() {}
