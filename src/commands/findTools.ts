import * as vscode from 'vscode';
import { ToolTreeProvider } from '../providers/ToolTreeProvider';

/**
 * Register the find tools command
 * @param treeProvider The tree provider instance
 * @returns Disposable for the command registration
 */
export function registerFindToolsCommand(treeProvider: ToolTreeProvider): vscode.Disposable {
	return vscode.commands.registerCommand('mcp.findTools', async () => {
		const currentFilter = treeProvider.getFilterQuery();
		
		const result = await vscode.window.showInputBox({
			prompt: 'Filter tools by name, description, tags, or server',
			placeHolder: 'Type to filter... (leave empty to show all)',
			value: currentFilter
		});

		// If user cancels (undefined), don't change filter
		if (result === undefined) {
			return;
		}

		// Set filter query (including empty string to clear)
		treeProvider.setFilterQuery(result);

		// Focus the tree view after filtering
		await vscode.commands.executeCommand('mcpToolTree.focus');
	});
}
