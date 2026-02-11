import * as vscode from 'vscode';
import { ToolResult } from '../types/toolResult';
import { MCPTool } from '../types/mcpTool';

/**
 * Interacts with vscode.lm APIs to find and execute MCP tools
 */
export class Toolbox {
	/**
	 * Invoke an MCP tool using vscode.lm.invokeTool API
	 */
	async invokeTool(toolName: string, parameters: Record<string, unknown>): Promise<ToolResult> {
		const startTime = Date.now();
		const tokenSource = new vscode.CancellationTokenSource();

		try {
			// Check if vscode.lm API is available
			if (!vscode.lm || !vscode.lm.invokeTool) {
				return {
					success: false,
					error: 'vscode.lm.invokeTool API not available',
					toolName: toolName,
					executionTime: Date.now() - startTime,
				};
			}

			// Find the tool to get its invocation options
			const tools = vscode.lm.tools;
			const tool = tools.find((t) => t.name === toolName);

			if (!tool) {
				return {
					success: false,
					error: `Tool '${toolName}' not found`,
					toolName: toolName,
					executionTime: Date.now() - startTime,
				};
			}

			// Create invocation options
			const options = {
				toolInvocationToken: undefined, // Not in a chat context
				input: parameters,
			};

			// Invoke the tool with cancellation token
			const result = await vscode.lm.invokeTool(toolName, options, tokenSource.token);

			// Parse the result
			let data: unknown;
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
				executionTime: Date.now() - startTime,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				toolName: toolName,
				executionTime: Date.now() - startTime,
			};
		} finally {
			tokenSource.dispose();
		}
	}

	/**
	 * Fetch all available MCP tools from vscode.lm.tools
	 */
	async getTools(): Promise<MCPTool[]> {
		try {
			// Check if vscode.lm.tools is available
			if (!vscode.lm || !vscode.lm.tools) {
				const errorMsg =
					'vscode.lm.tools API not available. Please ensure you are using VS Code version 1.109 or higher.';
				console.error(errorMsg);
				vscode.window.showWarningMessage(errorMsg);
				return [];
			}

			const tools = vscode.lm.tools;

			// Convert to our MCPTool interface
			return tools.map((tool) => ({
				name: tool.name,
				description: tool.description || '',
				inputSchema: tool.inputSchema,
				tags: tool.tags,
			}));
		} catch (error) {
			const errorMsg = `Failed to fetch MCP tools: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg, error);
			vscode.window.showErrorMessage(errorMsg);
			return [];
		}
	}
}
