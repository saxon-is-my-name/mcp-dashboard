import * as assert from 'assert';
import * as vscode from 'vscode';
import { ToolCoordinationService } from '../../src/services/ToolCoordinationService';
import { ToolTreeProvider } from '../../src/providers/ToolTreeProvider';
import { ToolDetailProvider } from '../../src/providers/ToolDetailProvider';
import { ParsedMCPTool, GroupedMCPTools } from '../../src/types/mcpTool';

describe('Tree-Detail Coordination Integration', () => {
	let coordinationService: ToolCoordinationService;
	let treeProvider: ToolTreeProvider;
	let detailProvider: ToolDetailProvider;
	let mockContext: vscode.ExtensionContext;
	let workspaceState: Map<string, any>;
	let extensionUri: vscode.Uri;

	// Mock tools for testing
	const mockTool1: ParsedMCPTool = {
		fullName: 'server1_tool1',
		name: 'tool1',
		description: 'Test tool 1',
		server: 'server1',
		inputSchema: { type: 'object', properties: {} }
	};

	const mockTool2: ParsedMCPTool = {
		fullName: 'server1_tool2',
		name: 'tool2',
		description: 'Test tool 2',
		server: 'server1',
		inputSchema: { type: 'object', properties: {} }
	};

	const mockTools: GroupedMCPTools = {
		server1: [mockTool1, mockTool2]
	};

	beforeEach(() => {
		// Create mock workspace state
		workspaceState = new Map<string, any>();
		
		mockContext = {
			workspaceState: {
				get: (key: string) => workspaceState.get(key),
				update: async (key: string, value: any) => {
					workspaceState.set(key, value);
				}
			},
			subscriptions: []
		} as any;

		// Use workspace root as extension URI
		extensionUri = vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file('/');

		// Create service and providers
		coordinationService = new ToolCoordinationService(mockContext);
		treeProvider = new ToolTreeProvider(coordinationService);
		detailProvider = new ToolDetailProvider(extensionUri, mockContext, coordinationService);

		// Populate tree with tools
		treeProvider.refresh(mockTools);
	});

	afterEach(() => {
		// Dispose providers to clean up resources
		if (treeProvider) {
			treeProvider.dispose();
		}
		if (coordinationService) {
			coordinationService.dispose();
		}
	});

	it('ToolTreeProvider selection updates coordination service', (done) => {
		coordinationService.onSelectionChanged((tool) => {
			assert.ok(tool, 'Tool should be selected');
			assert.strictEqual(tool?.fullName, mockTool1.fullName);
			assert.strictEqual(tool?.name, mockTool1.name);
			done();
		});

		// Simulate tree item selection via command
		vscode.commands.executeCommand('mcp.selectTool', mockTool1);
	});

	it('ToolDetailProvider receives updated tool from coordination service', async () => {
		let receivedTool: ParsedMCPTool | undefined;

		// Mock showToolDetail to capture what tool is shown
		const originalShowToolDetail = detailProvider.showToolDetail.bind(detailProvider);
		detailProvider.showToolDetail = async (tool?: ParsedMCPTool) => {
			receivedTool = tool;
			return originalShowToolDetail(tool);
		};

		// Select a tool via coordination service
		coordinationService.selectTool(mockTool1);

		// Wait a bit for async updates
		await new Promise(resolve => setTimeout(resolve, 100));

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
		await new Promise(resolve => setTimeout(resolve, 100));

		// Verify detail provider showed the tool
		assert.ok(shownTool, 'Tool should be shown in detail webview');
		assert.strictEqual(shownTool?.fullName, mockTool1.fullName);
	});

	it('Rapid selection changes are handled correctly', async () => {
		const shownTools: (ParsedMCPTool | undefined)[] = [];

		// Mock showToolDetail to track all calls
		const originalShowToolDetail = detailProvider.showToolDetail.bind(detailProvider);
		detailProvider.showToolDetail = async (tool?: ParsedMCPTool) => {
			shownTools.push(tool);
			return originalShowToolDetail(tool);
		};

		// Rapid fire selections
		await vscode.commands.executeCommand('mcp.selectTool', mockTool1);
		await vscode.commands.executeCommand('mcp.selectTool', mockTool2);
		await vscode.commands.executeCommand('mcp.selectTool', undefined);

		// Wait for all async updates
		await new Promise(resolve => setTimeout(resolve, 200));

		// Verify all selections were processed
		assert.ok(shownTools.length >= 3, 'All selections should be processed');
		
		// The last selection should be undefined
		const lastSelection = coordinationService.getSelectedTool();
		assert.strictEqual(lastSelection, undefined);
	});

	it('Selected tool is restored after VS Code restart', async () => {
		// Select a tool
		coordinationService.selectTool(mockTool1);
		
		// Wait for persistence
		await new Promise(resolve => setTimeout(resolve, 100));

		// Create new service instance (simulating VS Code restart)
		const newCoordinationService = new ToolCoordinationService(mockContext);
		const newDetailProvider = new ToolDetailProvider(extensionUri, mockContext, newCoordinationService);

		let restoredTool: ParsedMCPTool | undefined;

		// Mock showToolDetail to capture restored tool
		const originalShowToolDetail = newDetailProvider.showToolDetail.bind(newDetailProvider);
		newDetailProvider.showToolDetail = async (tool?: ParsedMCPTool) => {
			restoredTool = tool;
			return originalShowToolDetail(tool);
		};

		// Trigger restoration by getting the selected tool
		const restored = newCoordinationService.getSelectedTool();

		// Verify tool was restored
		assert.ok(restored, 'Tool should be restored');
		assert.strictEqual(restored?.fullName, mockTool1.fullName);
		assert.strictEqual(restored?.name, mockTool1.name);
	});

	it('Coordination service can clear selection', (done) => {
		// First select a tool
		coordinationService.selectTool(mockTool1);

		// Then clear it
		coordinationService.onSelectionChanged((tool) => {
			if (tool === undefined) {
				assert.strictEqual(coordinationService.getSelectedTool(), undefined);
				done();
			}
		});

		coordinationService.selectTool(undefined);
	});

	it('ToolTreeProvider command is registered', async () => {
		// Verify the command exists
		const commands = await vscode.commands.getCommands();
		assert.ok(commands.includes('mcp.selectTool'), 'mcp.selectTool command should be registered');
	});
});
