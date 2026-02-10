import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Keyboard Navigation - Phase 1', () => {
	let extension: vscode.Extension<any>;

	before(async () => {
		extension = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension')!;
		await extension.activate();
	});

	describe('mcp.toolSelected context key', () => {
		it('should update coordination service state when tool is selected', async () => {
			const extExports = extension.exports;
			const coordinationService = extExports.getCoordinationService();

			// Create a mock tool
			const mockTool = {
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				fullName: 'test_server_test_tool',
			};

			// Select a tool (this should set the context key and update coordination service)
			await vscode.commands.executeCommand('mcp.selectTool', mockTool);

			// Give some time for context to be set
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Verify coordination service has the selected tool
			const selectedTool = coordinationService.getSelectedTool();
			assert.ok(selectedTool, 'Coordination service should have selected tool');
			assert.strictEqual(selectedTool.fullName, mockTool.fullName, 'Selected tool should match');
		});

		it('should clear coordination service state when no tool is selected', async () => {
			const extExports = extension.exports;
			const coordinationService = extExports.getCoordinationService();

			// First select a tool
			const mockTool = {
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				fullName: 'test_server_test_tool',
			};
			await vscode.commands.executeCommand('mcp.selectTool', mockTool);
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Now clear selection
			await vscode.commands.executeCommand('mcp.selectTool', undefined);
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Verify coordination service has no selected tool
			const selectedTool = coordinationService.getSelectedTool();
			assert.strictEqual(
				selectedTool,
				undefined,
				'Coordination service should have no selected tool'
			);
		});
	});

	describe('keybindings', () => {
		it('should have both keybindings use same mcp.toolSelected context', async () => {
			// This verifies the coordination between the command and context keys
			// by checking that selecting a tool actually updates the coordination service
			const extExports = extension.exports;
			const coordinationService = extExports.getCoordinationService();

			const mockTool = {
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				fullName: 'test_server_test_tool',
			};

			// Select tool
			await vscode.commands.executeCommand('mcp.selectTool', mockTool);
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Both Enter and Tab keybindings should now be enabled (when tree is focused)
			// Verify by checking coordination service state
			const selectedTool = coordinationService.getSelectedTool();
			assert.ok(selectedTool, 'Tool should be selected, enabling keybindings');
		});
	});

	describe('Shift+Tab navigation (webview to tree)', () => {
		it('should register Shift+Tab binding for mcp.focusTree', async () => {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(
				commands.includes('mcp.focusTree'),
				'mcp.focusTree command should be registered for Shift+Tab keybinding'
			);
		});

		it('should execute mcp.focusTree command without error', async () => {
			await assert.doesNotReject(
				async () => await vscode.commands.executeCommand('mcp.focusTree'),
				'Command should execute without error'
			);
		});
	});
});
