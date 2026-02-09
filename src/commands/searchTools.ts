import * as vscode from 'vscode';
import { ToolTreeProvider } from '../providers/ToolTreeProvider';

/**
 * Register the search tools command
 * @param treeProvider The tree provider instance
 * @returns Disposable for the command registration
 */
export function registerSearchCommand(treeProvider: ToolTreeProvider): vscode.Disposable {
	return vscode.commands.registerCommand('mcp.searchTools', async () => {
		const currentFilter = treeProvider.getSearchQuery();
		
		const result = await vscode.window.showInputBox({
			prompt: 'Filter tools by name, description, tags, or server',
			placeHolder: 'Type to filter... (leave empty to show all)',
			value: currentFilter
		});

		// If user cancels (undefined), don't change search
		if (result === undefined) {
			return;
		}

		// Set search query (including empty string to clear)
		treeProvider.setSearchQuery(result);
	});
}
