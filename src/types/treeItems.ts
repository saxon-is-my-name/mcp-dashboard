import * as vscode from 'vscode';
import { ParsedMCPTool } from './mcpTool';

/**
 * Tree item representing a server node in the tree view
 */
export class ServerTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.iconPath = new vscode.ThemeIcon('server');
		this.contextValue = 'server';
		this.tooltip = label;
	}
}

/**
 * Tree item representing a tool node in the tree view
 */
export class ToolTreeItem extends vscode.TreeItem {
	constructor(
		public readonly tool: ParsedMCPTool,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(tool.name, collapsibleState);
		this.description = tool.description;
		this.iconPath = new vscode.ThemeIcon('tools');
		this.contextValue = 'tool';

		// Set tooltip with tool name and description
		const description = tool.description || 'No description';
		this.tooltip = `${tool.name}\n${description}`;

		// Add command for tool selection
		this.command = {
			command: 'mcp.selectTool',
			title: 'Select Tool',
			arguments: [tool],
		};
	}
}
