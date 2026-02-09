import * as vscode from 'vscode';
import { ParsedMCPTool } from '../types/mcpTool';

/**
 * Service that coordinates tool selection state between TreeView and WebviewProvider
 * Handles persistence to workspace state for restoring selection across sessions
 */
export class ToolCoordinationService {
	private _selectedTool: ParsedMCPTool | undefined;
	private _onSelectionChanged = new vscode.EventEmitter<ParsedMCPTool | undefined>();

	/**
	 * Event fired when the selected tool changes
	 */
	readonly onSelectionChanged = this._onSelectionChanged.event;

	constructor(private readonly _context: vscode.ExtensionContext) {
		// Restore selection from workspace state
		this._restoreSelection();
	}

	/**
	 * Get the currently selected tool
	 */
	getSelectedTool(): ParsedMCPTool | undefined {
		return this._selectedTool;
	}

	/**
	 * Select a tool and notify listeners
	 * @param tool The tool to select, or undefined to clear selection
	 */
	selectTool(tool: ParsedMCPTool | undefined): void {
		this._selectedTool = tool;

		// Persist to workspace state asynchronously
		this._persistSelection(tool);

		// Notify listeners
		this._onSelectionChanged.fire(tool);
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
