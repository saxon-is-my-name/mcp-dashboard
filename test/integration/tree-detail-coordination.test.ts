import * as assert from 'assert';
import * as vscode from 'vscode';
import { TIM } from '../../src/services/TIM';
import { ToolTreeProvider } from '../../src/providers/ToolTreeProvider';
import { ToolDetailProvider } from '../../src/providers/ToolDetailProvider';
import { ParsedMCPTool, GroupedMCPTools } from '../../src/types/mcpTool';

describe('Tree-Detail Coordination Integration', () => {
	let tim: TIM;
	let treeProvider: ToolTreeProvider;
	let detailProvider: ToolDetailProvider;

	// Mock tools for testing
	const mockTool1: ParsedMCPTool = {
		fullName: 'server1_tool1',
		name: 'tool1',
		description: 'Test tool 1',
		server: 'server1',
		inputSchema: { type: 'object', properties: {} },
	};

	const mockTool2: ParsedMCPTool = {
		fullName: 'server1_tool2',
		name: 'tool2',
		description: 'Test tool 2',
		server: 'server1',
		inputSchema: { type: 'object', properties: {} },
	};

	const mockTool3: ParsedMCPTool = {
		fullName: 'test_tool3',
		name: 'tool3',
		description: 'Test tool 3',
		server: 'test',
		inputSchema: { type: 'object', properties: {} },
	};

	const mockTools: GroupedMCPTools = {
		server1: [mockTool1, mockTool2, mockTool3],
	};

	beforeEach(async () => {
		// Get the activated extension's providers
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;
		tim = extExports.getTIM();
		treeProvider = extExports.getTreeProvider();
		detailProvider = extExports.getDetailProvider();

		// Populate tree with tools
		treeProvider.refresh(mockTools);
	});

	it('ToolTreeProvider selection updates tim', async () => {
		// Clear any previous selection
		tim.selectTool(mockTool2);
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Simulate tree item selection via command
		await vscode.commands.executeCommand('mcp.selectTool', mockTool1);

		// Wait for selection to propagate
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Verify tool was selected
		const selected = tim.getSelectedTool();
		assert.ok(selected, 'Tool should be selected');
		assert.strictEqual(selected?.fullName, mockTool1.fullName);
		assert.strictEqual(selected?.name, mockTool1.name);
	});

	it('ToolDetailProvider receives updated tool from tim', async () => {
		let receivedTool: ParsedMCPTool | undefined;

		// Mock showToolDetail to capture what tool is shown
		const originalShowToolDetail = detailProvider.showToolDetail.bind(detailProvider);
		detailProvider.showToolDetail = async (tool?: ParsedMCPTool) => {
			receivedTool = tool;
			return originalShowToolDetail(tool);
		};

		// Select a tool via tim
		tim.selectTool(mockTool1);

		// Wait a bit for async updates
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify detail provider received the tool
		assert.ok(receivedTool, 'Tool should be received by detail provider');
		assert.strictEqual(receivedTool?.fullName, mockTool1.fullName);
	});

	it('Selecting tool in tree updates detail webview', async () => {
		let shownTool: ParsedMCPTool | undefined;

		// Mock showToolDetail to capture what tool is shown
		const originalShowToolDetail = detailProvider.showToolDetail.bind(detailProvider);
		detailProvider.showToolDetail = async (tool?: ParsedMCPTool) => {
			shownTool = tool;
			return originalShowToolDetail(tool);
		};

		// Execute the select command (simulates clicking in tree)
		await vscode.commands.executeCommand('mcp.selectTool', mockTool1);

		// Wait for async updates
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify detail provider showed the tool
		assert.ok(shownTool, 'Tool should be shown in detail webview');
		assert.strictEqual(shownTool?.fullName, mockTool1.fullName);
	});

	it('Rapid selection changes are handled correctly', async () => {
		const shownTools: ParsedMCPTool[] = [];

		// Mock showToolDetail to track all calls
		const originalShowToolDetail = detailProvider.showToolDetail.bind(detailProvider);
		detailProvider.showToolDetail = async (tool: ParsedMCPTool) => {
			shownTools.push(tool);
			return originalShowToolDetail(tool);
		};

		// Rapid fire selections
		await vscode.commands.executeCommand('mcp.selectTool', mockTool1);
		await vscode.commands.executeCommand('mcp.selectTool', mockTool2);
		await vscode.commands.executeCommand('mcp.selectTool', mockTool3);

		// Wait for all async updates
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Verify all selections were processed
		assert.ok(shownTools.length >= 3, 'All selections should be processed');

		// The last selection should be mockTool3
		const lastSelection = tim.getSelectedTool();
		assert.strictEqual(lastSelection, mockTool3);
	});

	it('Selected tool is restored after VS Code restart', async () => {
		// Select a tool using the real tim
		tim.selectTool(mockTool1);

		// Wait for persistence to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Get the extension context to access its workspace state
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		const extContext = (ext!.exports.getTIM() as any)._context;

		// Create new service instance with the same context (simulating VS Code restart)
		const newTim = new TIM(extContext);

		// Verify tool was restored from workspace state
		const restored = newTim.getSelectedTool();
		assert.ok(restored, 'Tool should be restored');
		assert.strictEqual(restored?.fullName, mockTool1.fullName);
		assert.strictEqual(restored?.name, mockTool1.name);

		// Clean up
		newTim.dispose();
	});

	it('ToolTreeProvider command is registered', async () => {
		// Verify the command exists
		const commands = await vscode.commands.getCommands();
		assert.ok(commands.includes('mcp.selectTool'), 'mcp.selectTool command should be registered');
	});
});
