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

		// First pass: parse tools and group by initial server name
		for (const tool of tools) {
			const parsed = this.parseTool(tool);
			if (!grouped[parsed.server]) {
				grouped[parsed.server] = [];
			}
			grouped[parsed.server].push(parsed);
		}

		// Second pass: refine server names based on common prefixes
		return this.refineServerNames(grouped);
	}

	/**
	 * Refine server names by finding common tool prefixes within each server group
	 */
	private refineServerNames(grouped: GroupedMCPTools): GroupedMCPTools {
		const refined: GroupedMCPTools = {};

		for (const [serverName, tools] of Object.entries(grouped)) {
			if (tools.length === 0) continue;

			// Find common prefix among all tool names in this server
			const commonPrefix = this.findCommonPrefix(tools.map(t => t.name));

			// If there's a meaningful common prefix (at least one segment), use it
			if (commonPrefix && commonPrefix.includes('_')) {
				const prefixPart = commonPrefix.replace(/_+$/, ''); // Remove trailing underscores
				const newServerName = serverName + '.' + prefixPart;

				// Update all tools with the new server name and strip prefix from tool names
				refined[newServerName] = tools.map(t => ({
					...t,
					server: newServerName,
					name: t.name.slice(commonPrefix.length), // Remove the common prefix
				}));
			} else {
				refined[serverName] = tools;
			}
		}

		return refined;
	}

	/**
	 * Find common prefix among tool names
	 */
	private findCommonPrefix(names: string[]): string {
		if (names.length === 0) return '';
		if (names.length === 1) {
			// Don't extract prefix from single tool
			return '';
		}

		// Find common prefix across all names
		let prefix = names[0];
		for (let i = 1; i < names.length; i++) {
			while (!names[i].startsWith(prefix)) {
				prefix = prefix.slice(0, -1);
				if (prefix === '') return '';
			}
		}

		// Trim to last underscore to get complete segments
		const lastUnderscore = prefix.lastIndexOf('_');
		if (lastUnderscore > 0) {
			return prefix.slice(0, lastUnderscore + 1);
		}

		return '';
	}

	/**
	 * Parse a tool name to extract server and tool name
	 * Rules:
	 * 1. Drop "mcp" prefix if present
	 * 2. If first token (after mcp) is a TLD (com, io, etc.), include the second token in server name
	 * 3. Common tool prefixes will be detected and added by refineServerNames()
	 */
	private parseTool(tool: MCPTool): ParsedMCPTool {
		const parts = tool.name.split('_');
		let server = 'unknown';
		let toolName = tool.name;
		let startIndex = 0;

		if (parts.length < 2) {
			// Single part name, use as-is
			return {
				name: tool.name,
				description: tool.description,
				server: 'unknown',
				fullName: tool.name,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				inputSchema: tool.inputSchema as any,
				tags: tool.tags,
			};
		}

		// Rule 1: Drop "mcp" prefix
		if (parts[0].toLowerCase() === 'mcp') {
			startIndex = 1;
		}

		if (startIndex >= parts.length) {
			// Nothing left after dropping mcp
			return {
				name: tool.name,
				description: tool.description,
				server: 'unknown',
				fullName: tool.name,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				inputSchema: tool.inputSchema as any,
				tags: tool.tags,
			};
		}

		// Rule 2: Check if first token (after mcp) is a TLD
		const firstToken = parts[startIndex].toLowerCase();
		const tlds = ['com', 'io', 'org', 'net', 'dev', 'app', 'ai', 'co', 'me', 'us', 'uk', 'ca'];

		if (tlds.includes(firstToken) && startIndex + 1 < parts.length) {
			// TLD detected, include next token
			server = parts[startIndex + 1] + '.' + firstToken;
			toolName = parts.slice(startIndex + 2).join('_');
		} else {
			// Regular server name
			server = parts[startIndex];
			toolName = parts.slice(startIndex + 1).join('_');
		}

		// Fallback if toolName is empty
		if (!toolName) {
			toolName = tool.name;
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
