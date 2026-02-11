import * as vscode from 'vscode';
import { GroupedMCPTools, MCPTool, ParsedMCPTool } from '../types/mcpTool';
import { Toolbox } from './Toolbox';
import { ToolResult } from '../types/toolResult';

/**
 * This is TIM.
 *    _ _
 *   /o o\    <- TIM (Tool Interaction Manager)
 *   | | |
 *   | _ |
 *   \___/
 *    |||
 *   /| |\
 *  /|   |\
 * / |   | [__]   <- His Toolbox
 *   |___| |🛠️|
 *  _|   |_
 *
 * His full name is Tool Interaction Manager.
 * He has a Toolbox.
 * People talk to TIM and he uses his Toolbox to do things.
 */
export class TIM {
	private _selectedTool: ParsedMCPTool | undefined;
	private _onSelectionChanged = new vscode.EventEmitter<ParsedMCPTool>();
	private readonly toolbox: Toolbox;

	/**
	 * Event fired when the selected tool changes
	 */
	readonly onSelectionChanged = this._onSelectionChanged.event;

	constructor(private readonly _context: vscode.ExtensionContext) {
		// Get TIM's toolbox ready
		this.toolbox = new Toolbox();

		// TIM remembers the last tool he was using
		this._restoreSelection();

		// Bind methods that get passed around so TIM doesn't forget who he is
		this.useTool = this.useTool.bind(this);
	}

	/**
	 * Get the currently selected tool
	 */
	getSelectedTool(): ParsedMCPTool | undefined {
		return this._selectedTool;
	}

	/**
	 * Select a tool and notify listeners
	 * @param tool The tool that user has selected
	 */
	selectTool(tool: ParsedMCPTool): void {
		this._selectedTool = tool;

		// Set context key for keyboard navigation
		vscode.commands.executeCommand('setContext', 'mcp.toolSelected', true);

		// Persist to workspace state asynchronously
		this._persistSelection(tool);

		// Notify listeners
		this._onSelectionChanged.fire(tool);
	}

	async useTool(tool: ParsedMCPTool, parameters: Record<string, unknown>): Promise<ToolResult> {
		return await this.toolbox.invokeTool(tool.fullName, parameters);
	}

	async getTools(): Promise<GroupedMCPTools> {
		const tools = await this.toolbox.getTools();
		const grouped: GroupedMCPTools = {};

		for (const tool of tools) {
			const parsed = this.parseTool(tool);
			if (!grouped[parsed.server]) {
				grouped[parsed.server] = [];
			}
			grouped[parsed.server].push(parsed);
		}

		return grouped;
	}

	/**
	 * Parse a tool name to extract server and tool name
	 * Tool names from vscode.lm.tools follow the pattern "serverName_toolName"
	 * TODO: Try and guess server name if it contains a TLD e.g "mcp_com_atlassian_toolName" -> server: "mcp.com.atlassian", toolName: "toolName"
	 * TIM might have to guess
	 */
	private parseTool(tool: MCPTool): ParsedMCPTool {
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			inputSchema: tool.inputSchema as any,
			tags: tool.tags,
		};
	}

	/**
	 * Restore selection from workspace state
	 */
	private _restoreSelection(): void {
		const stored = this._context.workspaceState.get<ParsedMCPTool | undefined>('mcp.selectedTool');

		if (stored) {
			// Reconstruct the ParsedMCPTool from stored data
			this._selectedTool = {
				fullName: stored.fullName,
				name: stored.name,
				description: stored.description,
				server: stored.server,
				inputSchema: stored.inputSchema,
			};
		}
	}

	/**
	 * Persist selection to workspace state
	 */
	private async _persistSelection(tool: ParsedMCPTool | undefined): Promise<void> {
		if (tool) {
			// Store as JSON object
			await this._context.workspaceState.update('mcp.selectedTool', {
				fullName: tool.fullName,
				name: tool.name,
				description: tool.description,
				server: tool.server,
				inputSchema: tool.inputSchema,
			});
		} else {
			// Clear the selection
			await this._context.workspaceState.update('mcp.selectedTool', undefined);
		}
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this._onSelectionChanged.dispose();
	}
}
