import * as assert from 'assert';
import * as vscode from 'vscode';
import { ToolCoordinationService } from '../../src/services/ToolCoordinationService';
import { ParsedMCPTool } from '../../src/types/mcpTool';

describe('ToolCoordinationService', () => {
	let service: ToolCoordinationService;
	let mockContext: vscode.ExtensionContext;
	let workspaceState: Map<string, unknown>;

	// Mock tool for testing
	const mockTool: ParsedMCPTool = {
		fullName: 'test_tool',
		name: 'tool',
		description: 'Test tool',
		server: 'test',
		inputSchema: { type: 'object', properties: {} },
	};

	const mockTool2: ParsedMCPTool = {
		fullName: 'test_tool2',
		name: 'tool2',
		description: 'Test tool 2',
		server: 'test',
		inputSchema: { type: 'object', properties: {} },
	};

	beforeEach(() => {
		// Create mock workspace state
		workspaceState = new Map<string, unknown>();

		mockContext = {
			workspaceState: {
				get: (key: string) => workspaceState.get(key),
				update: async (key: string, value: unknown) => {
					workspaceState.set(key, value);
				},
			},
		} as unknown as vscode.ExtensionContext;

		service = new ToolCoordinationService(mockContext);
	});

	it('ToolCoordinationService notifies listeners on selection change', (done) => {
		let notificationCount = 0;

		service.onSelectionChanged((tool) => {
			notificationCount++;
			if (notificationCount === 1) {
				assert.strictEqual(tool, mockTool);
			} else if (notificationCount === 2) {
				assert.strictEqual(tool, mockTool2);
				done();
			}
		});

		service.selectTool(mockTool);
		service.selectTool(mockTool2);
	});

	it('ToolCoordinationService handles null selection', (done) => {
		// First select a tool
		service.selectTool(mockTool);
		assert.strictEqual(service.getSelectedTool(), mockTool);

		// Then deselect (select undefined)
		service.onSelectionChanged((tool) => {
			assert.strictEqual(tool, undefined);
			assert.strictEqual(service.getSelectedTool(), undefined);
			done();
		});

		service.selectTool(undefined);
	});

	it('ToolCoordinationService persists selection to workspace state', async () => {
		service.selectTool(mockTool);

		// Wait a bit for async persistence
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Check workspace state
		const stored = workspaceState.get('mcp.selectedTool') as ParsedMCPTool;
		assert.ok(stored, 'Tool should be stored in workspace state');
		assert.strictEqual(stored.fullName, mockTool.fullName);
		assert.strictEqual(stored.name, mockTool.name);
		assert.strictEqual(stored.description, mockTool.description);
		assert.strictEqual(stored.server, mockTool.server);
	});

	it('ToolCoordinationService restores selection on activation', () => {
		// Pre-populate workspace state
		workspaceState.set('mcp.selectedTool', {
			fullName: mockTool.fullName,
			name: mockTool.name,
			description: mockTool.description,
			server: mockTool.server,
			inputSchema: mockTool.inputSchema,
		});

		// Create new service instance (simulating activation)
		const newService = new ToolCoordinationService(mockContext);

		const restored = newService.getSelectedTool();
		assert.ok(restored, 'Tool should be restored');
		assert.strictEqual(restored?.fullName, mockTool.fullName);
		assert.strictEqual(restored?.name, mockTool.name);
		assert.strictEqual(restored?.server, mockTool.server);
	});

	it('ToolCoordinationService handles missing workspace state gracefully', () => {
		// Create service with empty workspace state
		const newService = new ToolCoordinationService(mockContext);

		const selected = newService.getSelectedTool();
		assert.strictEqual(selected, undefined);
	});

	it('Rapid selection changes are handled correctly', (done) => {
		const selections: (ParsedMCPTool | undefined)[] = [];

		service.onSelectionChanged((tool) => {
			selections.push(tool);

			// After 3 rapid changes, verify all were received
			if (selections.length === 3) {
				assert.strictEqual(selections[0], mockTool);
				assert.strictEqual(selections[1], mockTool2);
				assert.strictEqual(selections[2], undefined);
				assert.strictEqual(service.getSelectedTool(), undefined);
				done();
			}
		});

		// Rapid fire selections
		service.selectTool(mockTool);
		service.selectTool(mockTool2);
		service.selectTool(undefined);
	});

	it('ToolCoordinationService persists undefined selection', async () => {
		// First select a tool
		service.selectTool(mockTool);
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Then deselect
		service.selectTool(undefined);
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Verify undefined is stored
		const stored = workspaceState.get('mcp.selectedTool');
		assert.strictEqual(stored, undefined);
	});
});
