import * as vscode from 'vscode';
import { GroupedMCPTools, ParsedMCPTool } from '../types/mcpTool';
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
	private searchQuery: string = '';
	private _treeView: vscode.TreeView<ServerTreeItem | ToolTreeItem> | undefined;

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
	 * Set the tree view instance (called by extension after creating tree view)
	 */
	setTreeView(treeView: vscode.TreeView<ServerTreeItem | ToolTreeItem>): void {
		this._treeView = treeView;
	}

	/**
	 * Refresh the tree view with new tools data
	 */
	refresh(tools: GroupedMCPTools): void {
		this.tools = tools || {};
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Get the current search query
	 */
	getSearchQuery(): string {
		return this.searchQuery;
	}

	/**
	 * Set search query to filter tools
	 * @param query Search query string
	 */
	setSearchQuery(query: string): void {
		this.applySearch(query);
	}

	/**
	 * Apply search filter and refresh tree
	 * @param query Search query string
	 */
	private applySearch(query: string): void {
		this.searchQuery = query;
		
		// Update tree view description to show active filter
		if (this._treeView) {
			if (query) {
				this._treeView.description = `Filter: "${query}"`;
			} else {
				this._treeView.description = undefined;
			}
		}
		
		// Set context key for when clause
		vscode.commands.executeCommand('setContext', 'mcp.filterActive', !!query);
		
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Check if a tool matches the search query
	 * @param tool Tool to check
	 * @returns True if tool matches search query
	 */
	private matchesSearch(tool: ParsedMCPTool): boolean {
		if (!this.searchQuery) {
			return true;
		}

		const query = this.searchQuery.toLowerCase();

		// Match on tool name
		if (tool.name.toLowerCase().includes(query)) {
			return true;
		}

		// Match on tool description
		if (tool.description && tool.description.toLowerCase().includes(query)) {
			return true;
		}

		// Match on server name
		if (tool.server.toLowerCase().includes(query)) {
			return true;
		}

		// Match on fullName
		if (tool.fullName.toLowerCase().includes(query)) {
			return true;
		}

		// Match on tags
		if (tool.tags && Array.isArray(tool.tags)) {
			const tagsString = tool.tags.join(' ').toLowerCase();
			if (tagsString.includes(query)) {
				return true;
			}
		}

		return false;
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

			// If search query is active, filter servers to only show those with matching tools
			if (this.searchQuery) {
				const serversWithMatches: string[] = [];
				
				for (const serverName of Object.keys(this.tools)) {
					const serverTools = this.tools[serverName] || [];
					const hasMatchingTools = serverTools.some(tool => this.matchesSearch(tool));
					
					if (hasMatchingTools) {
						serversWithMatches.push(serverName);
					}
				}

				return serversWithMatches.sort().map(serverName => 
					new ServerTreeItem(serverName, vscode.TreeItemCollapsibleState.Collapsed)
				);
			}

			const serverNames = Object.keys(this.tools).sort();
			return serverNames.map(serverName => 
				new ServerTreeItem(serverName, vscode.TreeItemCollapsibleState.Collapsed)
			);
		}

		// If element is a server, return its tools
		if (element instanceof ServerTreeItem) {
			const serverTools = this.tools[element.label] || [];
			
			// Filter tools based on search query
			const filteredTools = serverTools.filter(tool => this.matchesSearch(tool));
			
			return filteredTools.map(tool => 
				new ToolTreeItem(tool, vscode.TreeItemCollapsibleState.None)
			);
		}

		// Tool nodes have no children
		return [];
	}
}
