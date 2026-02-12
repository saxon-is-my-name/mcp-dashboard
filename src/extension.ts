import * as vscode from 'vscode';
import { ParsedMCPTool } from './types/mcpTool';
import { registerFindToolsCommand } from './commands/findTools';
import { ToolDetailProvider } from './providers/ToolDetailProvider';
import { OutputPanelProvider } from './providers/OutputPanelProvider';
import { ToolTreeProvider } from './providers/ToolTreeProvider';
import { TIM } from './services/TIM';

let treeProvider: ToolTreeProvider;
let detailProvider: ToolDetailProvider;
let outputPanelProvider: OutputPanelProvider;
let tim: TIM;

export function activate(context: vscode.ExtensionContext) {
	// Set initial context for filter state
	vscode.commands.executeCommand('setContext', 'mcp.filterActive', false);
	// Set initial context for tool selected state
	vscode.commands.executeCommand('setContext', 'mcp.toolSelected', false);

	// TIM is unique, there is only one of him! (singleton)
	tim = new TIM(context);
	context.subscriptions.push(tim);

	// Register commands
	const selectToolCommandDisposable = vscode.commands.registerCommand(
		'mcp.selectTool',
		(tool: ParsedMCPTool) => {
			tim.selectTool(tool);
		}
	);
	context.subscriptions.push(selectToolCommandDisposable);

	// Create tree provider
	treeProvider = new ToolTreeProvider();
	context.subscriptions.push(treeProvider);

	// Create tree view with description support
	const treeView = vscode.window.createTreeView('mcpToolTree', {
		treeDataProvider: treeProvider,
		showCollapseAll: true,
	});
	context.subscriptions.push(treeView);

	// Pass tree view to provider so it can update description
	treeProvider.setTreeView(treeView);

	// Create output panel provider
	outputPanelProvider = new OutputPanelProvider(context.extensionUri);
	context.subscriptions.push(outputPanelProvider);

	// Create detail provider
	detailProvider = new ToolDetailProvider(
		context.extensionUri,
		context,
		tim.onSelectionChanged,
		tim.useTool,
		outputPanelProvider
	);
	context.subscriptions.push(detailProvider);

	// Register detail webview
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('mcpToolDetail', detailProvider)
	);

	// Register find tools command
	context.subscriptions.push(registerFindToolsCommand(treeProvider));

	// Register clear filter command
	context.subscriptions.push(
		vscode.commands.registerCommand('mcp.clearFilter', async () => {
			await treeProvider.setFilterQuery('');
		})
	);

	// Register refresh tools command
	context.subscriptions.push(
		vscode.commands.registerCommand('mcp.refreshTools', async () => {
			try {
				const tools = await tim.getTools();
				treeProvider.refresh(tools);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to refresh tools: ${error}`);
			}
		})
	);

	// Fetch and refresh tree with tools
	tim
		.getTools()
		.then((tools) => {
			treeProvider.refresh(tools);
		})
		.catch((error) => {
			console.error('Error loading initial tools:', error);
		});

	// Export minimal API for integration tests only
	return {
		getTreeProvider: () => treeProvider,
		getDetailProvider: () => detailProvider,
		getTIM: () => tim,
	};
}

export function deactivate() {}
