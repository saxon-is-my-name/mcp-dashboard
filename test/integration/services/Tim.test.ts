import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TIM } from '../../../src/services/TIM';
import { ParsedMCPTool } from '../../../src/types/mcpTool';

describe('TIM', () => {
	let service: TIM;
	let mockContext: vscode.ExtensionContext;
	let workspaceState: Map<string, unknown>;
	let sandbox: sinon.SinonSandbox;

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
		sandbox = sinon.createSandbox();

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

		service = new TIM(mockContext);
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('TIM notifies listeners on selection change', (done) => {
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

	it('TIM persists selection to workspace state', async () => {
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

	it('TIM restores selection on activation', () => {
		// Pre-populate workspace state
		workspaceState.set('mcp.selectedTool', {
			fullName: mockTool.fullName,
			name: mockTool.name,
			description: mockTool.description,
			server: mockTool.server,
			inputSchema: mockTool.inputSchema,
		});

		// Create new service instance (simulating activation)
		const newService = new TIM(mockContext);

		const restored = newService.getSelectedTool();
		assert.ok(restored, 'Tool should be restored');
		assert.strictEqual(restored?.fullName, mockTool.fullName);
		assert.strictEqual(restored?.name, mockTool.name);
		assert.strictEqual(restored?.server, mockTool.server);
	});

	it('TIM handles missing workspace state gracefully', () => {
		// Create service with empty workspace state
		const newService = new TIM(mockContext);

		const selected = newService.getSelectedTool();
		assert.strictEqual(selected, undefined);
	});

	describe('Tool Discovery', () => {
		it('should fetch tools from vscode.lm.tools', async () => {
			const mockLmTools = [
				{ name: 'server1_tool1', description: 'Tool 1' },
				{ name: 'server1_tool2', description: 'Tool 2' },
				{ name: 'server2_tool3', description: 'Tool 3' },
			];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const grouped = await service.getTools();

			assert.ok(grouped, 'Should return grouped tools');
			assert.ok(grouped.server1, 'Should have server1 group');
			assert.ok(grouped.server2, 'Should have server2 group');
			assert.strictEqual(grouped.server1.length, 2);
			assert.strictEqual(grouped.server2.length, 1);
		});

		it('should parse tool names correctly', async () => {
			const mockLmTools = [{ name: 'myserver_mytool', description: 'My tool' }];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const grouped = await service.getTools();

			const tool = grouped.myserver[0];
			assert.strictEqual(tool.server, 'myserver');
			assert.strictEqual(tool.name, 'mytool');
			assert.strictEqual(tool.fullName, 'myserver_mytool');
			assert.strictEqual(tool.description, 'My tool');
		});

		it('should handle tool names with multiple underscores', async () => {
			const mockLmTools = [{ name: 'server_tool_with_underscores', description: 'Complex tool' }];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const grouped = await service.getTools();

			const tool = grouped.server[0];
			assert.strictEqual(tool.server, 'server');
			assert.strictEqual(tool.name, 'tool_with_underscores');
		});

		it('should handle empty tool list', async () => {
			sandbox.stub(vscode.lm, 'tools').get(() => []);

			const grouped = await service.getTools();

			assert.ok(grouped, 'Should return empty object');
			assert.strictEqual(Object.keys(grouped).length, 0);
		});

		it('should drop mcp prefix from server names', async () => {
			const mockLmTools = [
				{ name: 'mcp_github_pull_request', description: 'GitHub PR tool' },
				{ name: 'mcp_github_issue', description: 'GitHub issue tool' },
			];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const grouped = await service.getTools();

			assert.ok(grouped.github, 'Should have github group');
			assert.strictEqual(grouped.github.length, 2);
			assert.strictEqual(grouped.github[0].server, 'github');
			assert.strictEqual(grouped.github[0].name, 'pull_request');
		});

		it('should handle TLD in server names', async () => {
			const mockLmTools = [
				{ name: 'mcp_com_atlassian_search', description: 'Atlassian search' },
				{ name: 'mcp_com_atlassian_fetch', description: 'Atlassian fetch' },
			];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const grouped = await service.getTools();

			assert.ok(grouped['atlassian.com'], 'Should have atlassian.com group');
			assert.strictEqual(grouped['atlassian.com'].length, 2);
			assert.strictEqual(grouped['atlassian.com'][0].server, 'atlassian.com');
			assert.strictEqual(grouped['atlassian.com'][0].name, 'search');
		});

		it('should add common prefix to server names when all tools share it', async () => {
			const mockLmTools = [
				{ name: 'mcp_com_atlassian_jira_search', description: 'Jira search' },
				{ name: 'mcp_com_atlassian_jira_create', description: 'Jira create' },
				{ name: 'mcp_com_atlassian_jira_update', description: 'Jira update' },
			];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const grouped = await service.getTools();

			assert.ok(grouped['atlassian.com.jira'], 'Should have atlassian.com.jira group');
			assert.strictEqual(grouped['atlassian.com.jira'].length, 3);
			assert.strictEqual(grouped['atlassian.com.jira'][0].server, 'atlassian.com.jira');
			assert.strictEqual(grouped['atlassian.com.jira'][0].name, 'search');
			assert.strictEqual(grouped['atlassian.com.jira'][1].name, 'create');
		});

		it('should not add prefix when tools do not share common prefix', async () => {
			const mockLmTools = [
				{ name: 'mcp_github_pull_request', description: 'GitHub PR tool' },
				{ name: 'mcp_github_issue', description: 'GitHub issue tool' },
			];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const grouped = await service.getTools();

			assert.ok(grouped.github, 'Should have github group without prefix');
			assert.strictEqual(grouped.github[0].server, 'github');
			assert.strictEqual(grouped.github[0].name, 'pull_request');
			assert.strictEqual(grouped.github[1].name, 'issue');
		});
	});

	describe('Tool Invocation', () => {
		it('should invoke tool using vscode.lm.invokeTool', async () => {
			const mockLmTools = [{ name: 'test_tool', description: 'Test tool' }];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const invokeLmStub = sandbox.stub();
			invokeLmStub.resolves({ result: 'success' });
			(vscode.lm as any).invokeTool = invokeLmStub;

			const result = await service.useTool(mockTool, { param: 'value' });

			assert.ok(invokeLmStub.called, 'Should call vscode.lm.invokeTool');
			assert.strictEqual(result.success, true);
		});

		it('should pass parameters correctly to tool', async () => {
			const mockLmTools = [{ name: 'test_tool', description: 'Test tool' }];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const invokeLmStub = sandbox.stub();
			invokeLmStub.resolves({ result: 'success' });
			(vscode.lm as any).invokeTool = invokeLmStub;

			const params = { key1: 'value1', key2: 42 };
			await service.useTool(mockTool, params);

			assert.ok(invokeLmStub.called);
			const callArgs = invokeLmStub.getCall(0).args;
			assert.strictEqual(callArgs[0], 'test_tool');
			assert.deepStrictEqual(callArgs[1].input, params);
		});

		it('should handle tool invocation errors', async () => {
			const mockLmTools = [{ name: 'test_tool', description: 'Test tool' }];

			sandbox.stub(vscode.lm, 'tools').get(() => mockLmTools);

			const invokeLmStub = sandbox.stub();
			invokeLmStub.rejects(new Error('Tool execution failed'));
			(vscode.lm as any).invokeTool = invokeLmStub;

			const result = await service.useTool(mockTool, {});

			assert.strictEqual(result.success, false);
			assert.ok(result.error);
		});

		it('should handle missing tool', async () => {
			sandbox.stub(vscode.lm, 'tools').get(() => []);

			const result = await service.useTool(mockTool, {});

			assert.strictEqual(result.success, false);
			assert.ok(result.error?.includes('not found'));
		});
	});
});
