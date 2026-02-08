import * as vscode from 'vscode';
import { GroupedMCPTools } from '../types/mcpTool';
import { ServerTreeItem, ToolTreeItem } from '../types/treeItems';
import { ToolCoordinationService } from '../services/ToolCoordinationService';

/**
 * Tree data provider for displaying servers and tools in a two-level hierarchy
 */
export class ToolTreeProvider implements vscode.TreeDataProvider<ServerTreeItem | ToolTreeItem>, vscode.Disposable {
	private _onDidChangeTreeData: vscode.EventEmitter<ServerTreeItem | ToolTreeItem | undefined | null | void> = new vscode.EventEmitter<ServerTreeItem | ToolTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ServerTreeItem | ToolTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private tools: GroupedMCPTools = {};
	private _commandDisposable: vscode.Disposable | undefined;

	constructor(private readonly coordinationService: ToolCoordinationService) {
		// Register the command for selecting tools
		// Wrap in try-catch to handle cases where command is already registered
		try {
			this._commandDisposable = vscode.commands.registerCommand('mcp.selectTool', (tool) => {
				this.coordinationService.selectTool(tool);
			});
		} catch (error) {
			// Command already registered - this is OK in test scenarios
			console.log('mcp.selectTool command already registered');
			this._commandDisposable = undefined;
		}
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		if (this._commandDisposable) {
			this._commandDisposable.dispose();
		}
		this._onDidChangeTreeData.dispose();
	}

	/**
	 * Refresh the tree view with new tools data
	 */
	refresh(tools: GroupedMCPTools): void {
		this.tools = tools || {};
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Get the tree item representation of a node
	 */
	getTreeItem(element: ServerTreeItem | ToolTreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get the children of a node
	 * @param element The parent node (undefined for root)
	 * @returns Array of child nodes
	 */
	async getChildren(element?: ServerTreeItem | ToolTreeItem): Promise<(ServerTreeItem | ToolTreeItem)[]> {
		// If no element provided, return server nodes (root level)
		if (!element) {
			if (!this.tools || Object.keys(this.tools).length === 0) {
				return [];
			}

			const serverNames = Object.keys(this.tools).sort();
			return serverNames.map(serverName => 
				new ServerTreeItem(serverName, vscode.TreeItemCollapsibleState.Collapsed)
			);
		}

		// If element is a server, return its tools
		if (element instanceof ServerTreeItem) {
			const serverTools = this.tools[element.label] || [];
			return serverTools.map(tool => 
				new ToolTreeItem(tool, vscode.TreeItemCollapsibleState.None)
			);
		}

		// Tool nodes have no children
		return [];
	}
}
