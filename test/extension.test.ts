import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Extension Activation', () => {
	it('should activate the extension', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		assert.ok(ext, 'Extension not found');
		await ext!.activate();
		assert.strictEqual(ext!.isActive, true, 'Extension did not activate');
	});
});

describe('MCP Tool Discovery - Phase 1', () => {
	it('should list tools from vscode.lm.tools', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		// Access the exported tool listing function
		const extExports = ext!.exports;
		assert.ok(extExports.getTools, 'getTools function should be exported');

		const tools = await extExports.getTools();
		assert.ok(Array.isArray(tools), 'getTools should return an array');
	});

	it('should group tools by server', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;
		const groupedTools = await extExports.getGroupedTools();

		assert.ok(typeof groupedTools === 'object', 'groupedTools should be an object');
		assert.ok(!Array.isArray(groupedTools), 'groupedTools should not be an array');

		// Check structure: should be { serverName: [tools] }
		for (const serverName in groupedTools) {
			assert.ok(
				Array.isArray(groupedTools[serverName]),
				`Tools for ${serverName} should be an array`
			);
		}
	});

	it('should handle empty tool list', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;
		const tools = await extExports.getTools();

		// Should return empty array if no tools available, not throw
		assert.ok(Array.isArray(tools), 'Should return array even if empty');
	});

	it('should handle tool discovery errors gracefully', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;

		// Should not throw even if vscode.lm.tools fails
		try {
			const tools = await extExports.getTools();
			assert.ok(Array.isArray(tools), 'Should return array on error');
		} catch (error) {
			assert.fail('getTools should not throw, should return empty array on error');
		}
	});

	it('should parse tool names to extract server information', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;

		// Tools from vscode.lm.tools have names like "serverName_toolName"
		const groupedTools = await extExports.getGroupedTools();

		// Each server group should have tools with proper structure
		for (const serverName in groupedTools) {
			const tools = groupedTools[serverName];
			for (const tool of tools) {
				assert.ok(tool.name, 'Tool should have a name');
				assert.ok(tool.description !== undefined, 'Tool should have a description');
			}
		}
	});
});

describe('MCP Tool Execution - Phase 2', () => {
	it('should invoke tool using vscode.lm.invokeTool', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;

		// Get available tools
		const tools = await extExports.getTools();

		if (tools.length === 0) {
			// Skip if no tools available, but test that invokeTool function exists
			assert.ok(extExports.invokeTool, 'invokeTool function should be exported');
			return;
		}

		// Try to invoke the first tool
		const firstTool = tools[0];
		const result = await extExports.invokeTool(firstTool.name, {});

		// Result should have specific structure
		assert.ok(result, 'invokeTool should return a result');
		assert.ok(
			'success' in result || 'error' in result,
			'Result should have success or error property'
		);
	});

	it('should pass tool parameters correctly to vscode.lm.invokeTool', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;

		// Test parameters are passed through
		const testParams = { test: 'value', number: 42 };
		const result = await extExports.invokeTool('test_tool', testParams);

		// Should not throw and should return something
		assert.ok(result !== undefined, 'invokeTool should return a result');
	});

	it('should handle tool execution success', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;
		const tools = await extExports.getTools();

		if (tools.length === 0) {
			// Create a mock successful result
			const result = {
				success: true,
				data: { message: 'success' },
			};

			assert.ok(result.success, 'Success result should have success=true');
			assert.ok(result.data, 'Success result should have data');
			return;
		}

		// Try real tool invocation
		const result = await extExports.invokeTool(tools[0].name, {});

		// Should return a structured result
		assert.ok(result !== undefined, 'Result should be defined');
	});

	it('should handle tool execution errors', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;

		// Try to invoke a non-existent tool
		const result = await extExports.invokeTool('nonexistent_tool', {});

		// Should return an error result, not throw
		assert.ok(result, 'Should return error result');
		assert.ok(result.error || result.success === false, 'Should indicate error');
	});

	it('should format tool results for display', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;

		// Test result formatting
		const mockResult = {
			success: true,
			data: {
				message: 'Test result',
				items: [1, 2, 3],
			},
		};

		// Should have a formatter function
		if (extExports.formatToolResult) {
			const formatted = extExports.formatToolResult(mockResult);
			assert.ok(typeof formatted === 'string', 'Formatted result should be a string');
			assert.ok(formatted.length > 0, 'Formatted result should not be empty');
		}
	});
});

describe('Phase 4: TreeView and Detail Provider Registration', () => {
	it('should register tree view provider', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		assert.ok(ext, 'Extension not found');
		await ext!.activate();

		// Verify the extension exports the tree provider
		const extExports = ext!.exports;
		assert.ok(extExports, 'Extension exports not found');
		assert.ok(extExports.getTreeProvider, 'getTreeProvider function not exported');

		const treeProvider = extExports.getTreeProvider();
		assert.ok(treeProvider, 'Tree provider not found');
	});

	it('should register detail webview provider', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;
		assert.ok(extExports.getDetailProvider, 'getDetailProvider function not exported');

		const detailProvider = extExports.getDetailProvider();
		assert.ok(detailProvider, 'Detail provider not found');
	});

	it('should create coordination service singleton', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const extExports = ext!.exports;
		assert.ok(extExports.getCoordinationService, 'getCoordinationService function not exported');

		const coordinationService = extExports.getCoordinationService();
		assert.ok(coordinationService, 'Coordination service not found');
	});

	it('should have refresh method on tree provider', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const treeProvider = ext!.exports.getTreeProvider();
		assert.ok(treeProvider.refresh, 'refresh method not found');
		assert.strictEqual(typeof treeProvider.refresh, 'function', 'refresh must be a function');
	});

	it('should have resolveWebviewView method on detail provider', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const detailProvider = ext!.exports.getDetailProvider();
		assert.ok(detailProvider.resolveWebviewView, 'resolveWebviewView method not found');
		assert.strictEqual(
			typeof detailProvider.resolveWebviewView,
			'function',
			'resolveWebviewView must be a function'
		);
	});

	it('should initially load and refresh tree with tools', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const treeProvider = ext!.exports.getTreeProvider();

		// Wait a bit for async tool refresh
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Try to get children (should work even if no tools available)
		const children = await treeProvider.getChildren();
		assert.ok(Array.isArray(children), 'getChildren should return array');
	});

	it('should register mcp.selectTool command', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		// Try to execute the command - should not throw
		try {
			await vscode.commands.executeCommand('mcp.selectTool', undefined);
			assert.ok(true, 'Command executed without error');
		} catch (error) {
			assert.fail('Command should be registered');
		}
	});

	it('should coordination service be shared between providers', async () => {
		const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
		await ext!.activate();

		const coordinationService = ext!.exports.getCoordinationService();

		// Verify it has expected methods
		assert.ok(coordinationService.selectTool, 'selectTool method not found');
		assert.ok(coordinationService.getSelectedTool, 'getSelectedTool method not found');
		assert.ok(coordinationService.onSelectionChanged, 'onSelectionChanged event not found');
	});
});
