import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Extension Activation', () => {
	it('should activate the extension', async () => {
		const ext = vscode.extensions.getExtension('saxonbruce.mcp-dashboard');
		assert.ok(ext, 'Extension not found');
		await ext!.activate();
		assert.strictEqual(ext!.isActive, true, 'Extension did not activate');
	});
});

describe('Provider Registration', () => {
	it('should register tree view provider', async () => {
		const ext = vscode.extensions.getExtension('saxonbruce.mcp-dashboard');
		assert.ok(ext, 'Extension not found');
		await ext!.activate();

		const extExports = ext!.exports;
		assert.ok(extExports, 'Extension exports not found');
		assert.ok(extExports.getTreeProvider, 'getTreeProvider function not exported');

		const treeProvider = extExports.getTreeProvider();
		assert.ok(treeProvider, 'Tree provider not found');
		assert.ok(treeProvider.refresh, 'Tree provider should have refresh method');
	});

	it('should register detail webview provider', async () => {
		const ext = vscode.extensions.getExtension('saxonbruce.mcp-dashboard');
		await ext!.activate();

		const extExports = ext!.exports;
		assert.ok(extExports.getDetailProvider, 'getDetailProvider function not exported');

		const detailProvider = extExports.getDetailProvider();
		assert.ok(detailProvider, 'Detail provider not found');
		assert.ok(detailProvider.resolveWebviewView, 'Detail provider should have resolveWebviewView');
	});

	it('should register mcp.selectTool command', async () => {
		const ext = vscode.extensions.getExtension('saxonbruce.mcp-dashboard');
		await ext!.activate();

		// Try to execute the command - should not throw
		try {
			await vscode.commands.executeCommand('mcp.selectTool', {});
			assert.ok(true, 'Command executed without error');
		} catch (error) {
			assert.fail('Command should be registered');
		}
	});

	it('should initially load and refresh tree with tools', async () => {
		const ext = vscode.extensions.getExtension('saxonbruce.mcp-dashboard');
		await ext!.activate();

		const treeProvider = ext!.exports.getTreeProvider();

		// Wait a bit for async tool refresh
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Try to get children (should work even if no tools available)
		const children = await treeProvider.getChildren();
		assert.ok(Array.isArray(children), 'getChildren should return array');
	});

	it('should share TIM instance between providers', async () => {
		const ext = vscode.extensions.getExtension('saxonbruce.mcp-dashboard');
		await ext!.activate();

		const tim1 = ext!.exports.getTIM();
		const tim2 = ext!.exports.getTIM();

		// Should return the same instance (singleton pattern)
		assert.strictEqual(tim1, tim2, 'getTIM should return same instance');

		// Verify the instance has expected methods
		assert.ok(tim1.selectTool, 'TIM should have selectTool method');
		assert.ok(tim1.getSelectedTool, 'TIM should have getSelectedTool method');
		assert.ok(tim1.onSelectionChanged, 'TIM should have onSelectionChanged event');
		assert.ok(tim1.useTool, 'TIM should have useTool method');
	});

	it('should register mcp.refreshTools command', async () => {
		const ext = vscode.extensions.getExtension('saxonbruce.mcp-dashboard');
		await ext!.activate();

		const treeProvider = ext!.exports.getTreeProvider();

		// Execute refresh command
		await vscode.commands.executeCommand('mcp.refreshTools');

		// Wait for async refresh
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify tree can still be queried (refresh didn't break it)
		const children = await treeProvider.getChildren();
		assert.ok(Array.isArray(children), 'Tree should still work after refresh');
	});
});
